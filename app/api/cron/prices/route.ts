import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getMarketPrices } from '@/app/lib/polymarket';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = req.nextUrl.searchParams.get('secret');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) {
    return NextResponse.json({ error: 'No active event' }, { status: 404 });
  }

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: { markets: true },
  });

  if (!event || event.markets.length === 0) {
    return NextResponse.json({ error: 'Event not found or no markets' }, { status: 404 });
  }

  // Sync markets from Polymarket Gamma API: backfill token IDs + import missing markets
  let newMarketsAdded = 0;
  let tokenIdsBackfilled = 0;
  let syncDebug = '';
  try {
    let gammaEvent: Record<string, unknown> | null = null;

    // 1. Try exact slug
    syncDebug += `slug=${event.slug},title=${event.title}; `;
    const slugRes = await fetch(
      `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(event.slug)}`
    );
    if (slugRes.ok) {
      const slugData = await slugRes.json();
      const found = Array.isArray(slugData) ? slugData[0] : slugData;
      syncDebug += `slugLookup=${(found?.markets as unknown[])?.length ?? 'null'}; `;
      if (found?.markets?.length > 0) gammaEvent = found;
    }

    // 2. Try search by title
    if (!gammaEvent) {
      const searchRes = await fetch(
        `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(event.title)}&limit_per_type=5`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const bestMatch = (searchData.events || [])[0];
        syncDebug += `searchMatch=${bestMatch?.slug ?? 'none'}; `;
        if (bestMatch?.slug) {
          const matchRes = await fetch(
            `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(bestMatch.slug)}`
          );
          if (matchRes.ok) {
            const matchData = await matchRes.json();
            const found = Array.isArray(matchData) ? matchData[0] : matchData;
            syncDebug += `matchMarkets=${(found?.markets as unknown[])?.length ?? 'null'}; `;
            if (found?.markets?.length > 0) gammaEvent = found;
          }
        }
      }
    }

    // 3. Last resort: try known NCAA tournament slug directly
    if (!gammaEvent) {
      const ncaaRes = await fetch(
        'https://gamma-api.polymarket.com/events?slug=2026-ncaa-tournament-winner'
      );
      if (ncaaRes.ok) {
        const ncaaData = await ncaaRes.json();
        const found = Array.isArray(ncaaData) ? ncaaData[0] : ncaaData;
        syncDebug += `hardcoded=${(found?.markets as unknown[])?.length ?? 'null'}; `;
        if (found?.markets?.length > 0) gammaEvent = found;
      }
    }

    syncDebug += `gammaEvent=${gammaEvent ? 'found' : 'null'}; `;

    if (gammaEvent) {
      // Gamma API uses camelCase fields: conditionId, clobTokenIds, negRisk, orderPriceMinTickSize
      // NOT condition_id, tokens, neg_risk, minimum_tick_size
      const rawMarkets = ((gammaEvent as Record<string, unknown>).markets || []) as Array<Record<string, unknown>>;
      const gammaMarkets = rawMarkets.filter(g => g.active && !g.closed);

      const existingTickers = new Set(event.markets.map(m => m.ticker));

      for (const gm of gammaMarkets) {
        const conditionId = (gm.conditionId || gm.condition_id) as string | undefined;
        if (!conditionId) continue;

        // Parse token IDs from clobTokenIds JSON string or tokens array
        let yesTokenId = '';
        let noTokenId = '';
        const outcomes = typeof gm.outcomes === 'string' ? JSON.parse(gm.outcomes) : (gm.outcomes || []);
        const clobTokenIds = typeof gm.clobTokenIds === 'string' ? JSON.parse(gm.clobTokenIds) : (gm.clobTokenIds || []);

        if (clobTokenIds.length >= 2 && outcomes.length >= 2) {
          const yesIdx = outcomes.indexOf('Yes');
          const noIdx = outcomes.indexOf('No');
          if (yesIdx >= 0) yesTokenId = clobTokenIds[yesIdx] || '';
          if (noIdx >= 0) noTokenId = clobTokenIds[noIdx] || '';
        } else if (gm.tokens && Array.isArray(gm.tokens)) {
          // Fallback: old format with tokens array
          const yesToken = (gm.tokens as Array<{ outcome: string; token_id: string }>).find(t => t.outcome === 'Yes');
          const noToken = (gm.tokens as Array<{ outcome: string; token_id: string }>).find(t => t.outcome === 'No');
          yesTokenId = yesToken?.token_id || '';
          noTokenId = noToken?.token_id || '';
        }

        if (!yesTokenId && !noTokenId) continue;

        // Parse prices
        const outcomePrices = typeof gm.outcomePrices === 'string' ? JSON.parse(gm.outcomePrices) : (gm.outcomePrices || []);
        const yesIdx = outcomes.indexOf('Yes');
        const noIdx = outcomes.indexOf('No');
        const yesPrice = yesIdx >= 0 ? parseFloat(outcomePrices[yesIdx] || '0') : 0;
        const noPrice = noIdx >= 0 ? parseFloat(outcomePrices[noIdx] || '0') : 0;

        const negRisk = (gm.negRisk ?? gm.neg_risk ?? false) as boolean;
        const tickSize = String(gm.orderPriceMinTickSize || gm.minimum_tick_size || '0.01');
        if (existingTickers.has(conditionId)) {
          // Update existing market with missing token IDs
          const existing = event.markets.find(m => m.ticker === conditionId);
          if (existing && (!existing.yesTokenId || !existing.noTokenId)) {
            await prisma.market.update({
              where: { id: existing.id },
              data: {
                yesTokenId: yesTokenId || null,
                noTokenId: noTokenId || null,
                conditionId,
                negRisk,
                tickSize,
              },
            });
            existing.yesTokenId = yesTokenId || null;
            existing.noTokenId = noTokenId || null;
            tokenIdsBackfilled++;
            console.log(`[prices] Backfilled token IDs for ${existing.title}`);
          }
        } else {
          // Import new market
          const endDate = gm.endDate as string | undefined;
          const newMarket = await prisma.market.create({
            data: {
              eventId: event.id,
              ticker: conditionId,
              title: (gm.question as string) || conditionId,
              yesPrice: Math.round(yesPrice * 100) / 100,
              noPrice: Math.round(noPrice * 100) / 100,
              volume: gm.volume != null ? parseFloat(String(gm.volume)) || null : null,
              rulesPrimary: (gm.description as string) ?? null,
              closeTime: endDate ? new Date(endDate) : null,
              expirationTime: endDate ? new Date(endDate) : null,
              conditionId,
              yesTokenId: yesTokenId || null,
              noTokenId: noTokenId || null,
              negRisk,
              tickSize,
            },
          });
          event.markets.push(newMarket as typeof event.markets[0]);
          newMarketsAdded++;
          console.log(`[prices] Imported new market: ${gm.question}`);
        }
      }
    }
  } catch (err) {
    console.error('[prices] Market sync error:', err);
  }

  // Fetch live prices from Polymarket CLOB for each market
  let updated = 0;
  let snapshotCount = 0;

  for (const market of event.markets) {
    let yesPrice = market.yesPrice;
    let noPrice = market.noPrice;

    // Fetch live price from CLOB if we have a token ID
    if (market.yesTokenId) {
      try {
        const priceData = await getMarketPrices(market.yesTokenId);
        if (priceData) {
          yesPrice = Math.round(priceData.price * 100) / 100;
          noPrice = Math.round((1 - priceData.price) * 100) / 100;
        }
      } catch (err) {
        console.error(`Polymarket price fetch error for ${market.ticker}:`, err);
      }
    }

    // Update market in DB if live price differs
    if (yesPrice !== market.yesPrice || noPrice !== market.noPrice) {
      await prisma.market.update({
        where: { id: market.id },
        data: { yesPrice, noPrice },
      });
      updated++;
    }

    // Record snapshot
    await prisma.priceSnapshot.create({
      data: {
        eventId: event.id,
        marketTicker: market.ticker,
        yesPrice,
        noPrice,
      },
    });
    snapshotCount++;
  }

  return NextResponse.json({
    success: true,
    snapshots: snapshotCount,
    updatedMarkets: updated,
    totalMarkets: event.markets.length,
    newMarketsAdded,
    tokenIdsBackfilled,
    syncDebug,
  });
}
