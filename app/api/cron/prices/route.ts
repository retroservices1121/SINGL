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
