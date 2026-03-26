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
  try {
    // Try by slug first, then search by title if slug doesn't match Polymarket's
    let gammaEvent: Record<string, unknown> | null = null;

    const slugRes = await fetch(
      `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(event.slug)}`
    );
    if (slugRes.ok) {
      const slugData = await slugRes.json();
      const found = Array.isArray(slugData) ? slugData[0] : slugData;
      if (found?.markets?.length > 0) gammaEvent = found;
    }

    if (!gammaEvent) {
      // Slug didn't match — search by event title
      const searchRes = await fetch(
        `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(event.title)}&limit_per_type=5`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const bestMatch = (searchData.events || [])[0];
        if (bestMatch?.slug) {
          const matchRes = await fetch(
            `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(bestMatch.slug)}`
          );
          if (matchRes.ok) {
            const matchData = await matchRes.json();
            gammaEvent = Array.isArray(matchData) ? matchData[0] : matchData;
          }
        }
      }
    }

    if (gammaEvent) {
      const gammaMarkets: Array<{
        condition_id?: string;
        question?: string;
        description?: string;
        tokens?: Array<{ token_id: string; outcome: string; price?: number }>;
        volume?: number;
        end_date_iso?: string;
        neg_risk?: boolean;
        minimum_tick_size?: string;
        active?: boolean;
        closed?: boolean;
      }> = (((gammaEvent as Record<string, unknown>).markets || []) as Array<{ active?: boolean; closed?: boolean }>).filter(g => g.active && !g.closed) as Array<{
        condition_id?: string; question?: string; description?: string;
        tokens?: Array<{ token_id: string; outcome: string; price?: number }>;
        volume?: number; end_date_iso?: string; neg_risk?: boolean;
        minimum_tick_size?: string; active?: boolean; closed?: boolean;
      }>;

      const existingTickers = new Set(event.markets.map(m => m.ticker));

      for (const gm of gammaMarkets) {
        if (!gm.condition_id || !gm.tokens) continue;

        const yesToken = gm.tokens.find(t => t.outcome === 'Yes');
        const noToken = gm.tokens.find(t => t.outcome === 'No');
        if (!yesToken && !noToken) continue;

        if (existingTickers.has(gm.condition_id)) {
          // Update existing market with missing token IDs
          const existing = event.markets.find(m => m.ticker === gm.condition_id);
          if (existing && (!existing.yesTokenId || !existing.noTokenId)) {
            await prisma.market.update({
              where: { id: existing.id },
              data: {
                yesTokenId: yesToken?.token_id || null,
                noTokenId: noToken?.token_id || null,
                conditionId: gm.condition_id,
                negRisk: gm.neg_risk ?? existing.negRisk,
                tickSize: gm.minimum_tick_size || existing.tickSize,
              },
            });
            existing.yesTokenId = yesToken?.token_id || null;
            existing.noTokenId = noToken?.token_id || null;
            tokenIdsBackfilled++;
            console.log(`[prices] Backfilled token IDs for ${existing.title}`);
          }
        } else {
          // Import new market
          const yesPrice = yesToken?.price ?? 0.5;
          const noPrice = noToken?.price ?? 0.5;
          const newMarket = await prisma.market.create({
            data: {
              eventId: event.id,
              ticker: gm.condition_id,
              title: gm.question || gm.condition_id,
              yesPrice: Math.round(yesPrice * 100) / 100,
              noPrice: Math.round(noPrice * 100) / 100,
              volume: gm.volume ?? null,
              rulesPrimary: gm.description ?? null,
              closeTime: gm.end_date_iso ? new Date(gm.end_date_iso) : null,
              expirationTime: gm.end_date_iso ? new Date(gm.end_date_iso) : null,
              conditionId: gm.condition_id,
              yesTokenId: yesToken?.token_id || null,
              noTokenId: noToken?.token_id || null,
              negRisk: gm.neg_risk ?? false,
              tickSize: gm.minimum_tick_size || '0.01',
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
  });
}
