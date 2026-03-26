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

  // Backfill missing token IDs from Polymarket Gamma API
  const marketsNeedingTokenIds = event.markets.filter(m => !m.yesTokenId || !m.noTokenId);
  if (marketsNeedingTokenIds.length > 0) {
    try {
      const gammaRes = await fetch(
        `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(event.slug)}`
      );
      if (gammaRes.ok) {
        const gammaEvents = await gammaRes.json();
        const gammaEvent = Array.isArray(gammaEvents) ? gammaEvents[0] : gammaEvents;
        const gammaMarkets = gammaEvent?.markets || [];

        for (const market of marketsNeedingTokenIds) {
          // Match by condition_id (stored as ticker in our DB)
          const gm = gammaMarkets.find((g: { condition_id?: string }) => g.condition_id === market.ticker);
          if (!gm?.tokens) continue;

          const yesToken = gm.tokens.find((t: { outcome: string }) => t.outcome === 'Yes');
          const noToken = gm.tokens.find((t: { outcome: string }) => t.outcome === 'No');

          if (yesToken?.token_id || noToken?.token_id) {
            await prisma.market.update({
              where: { id: market.id },
              data: {
                yesTokenId: yesToken?.token_id || null,
                noTokenId: noToken?.token_id || null,
                conditionId: gm.condition_id || market.ticker,
                negRisk: gm.neg_risk ?? market.negRisk,
                tickSize: gm.minimum_tick_size || market.tickSize,
              },
            });
            // Update in-memory too so price fetch works below
            market.yesTokenId = yesToken?.token_id || null;
            market.noTokenId = noToken?.token_id || null;
            console.log(`[prices] Backfilled token IDs for ${market.title}`);
          }
        }
      }
    } catch (err) {
      console.error('[prices] Token ID backfill error:', err);
    }
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
  });
}
