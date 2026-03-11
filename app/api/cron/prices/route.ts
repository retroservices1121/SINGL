import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

const METADATA = process.env.NEXT_PUBLIC_DFLOW_METADATA_URL || 'https://c.prediction-markets-api.dflow.net';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.DFLOW_API_KEY) {
    headers['x-api-key'] = process.env.DFLOW_API_KEY;
  }
  return headers;
}

interface DFlowMarket {
  ticker?: string;
  yesBid?: string;
  yesAsk?: string;
  noBid?: string;
  noAsk?: string;
  status?: string;
}

interface DFlowEvent {
  ticker?: string;
  markets?: DFlowMarket[];
}

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

  // Fetch live prices from DFlow for each market ticker
  const tickers = event.markets.map(m => m.ticker);
  const livePrices = new Map<string, { yesPrice: number; noPrice: number }>();

  try {
    // Search DFlow for the event to get fresh market prices
    const res = await fetch(
      `${METADATA}/api/v1/search?q=${encodeURIComponent(event.title)}&limit=20&withNestedMarkets=true`,
      { headers: getHeaders() }
    );

    if (res.ok) {
      const data: { events?: DFlowEvent[] } = await res.json();
      for (const ev of data.events || []) {
        for (const m of ev.markets || []) {
          if (!m.ticker || !tickers.includes(m.ticker)) continue;
          if (m.status === 'finalized' || m.status === 'settled') continue;

          const yesBid = parseFloat(m.yesBid || '0') || 0;
          const yesAsk = parseFloat(m.yesAsk || '0') || 0;
          const noBid = parseFloat(m.noBid || '0') || 0;
          const noAsk = parseFloat(m.noAsk || '0') || 0;

          // Use ask price (live outcome price) matching Kalshi/DFlow display
          const yesPrice = yesAsk || yesBid || 0;
          const noPrice = noAsk || noBid || 0;

          livePrices.set(m.ticker, {
            yesPrice: Math.round(yesPrice * 100) / 100,
            noPrice: Math.round(noPrice * 100) / 100,
          });
        }
      }
    }
  } catch (err) {
    console.error('DFlow price fetch error:', err);
  }

  // Update markets in DB and record snapshots
  let updated = 0;
  let snapshotCount = 0;

  for (const market of event.markets) {
    const live = livePrices.get(market.ticker);

    // Use live price if available, otherwise use stored price
    const yesPrice = live?.yesPrice ?? market.yesPrice;
    const noPrice = live?.noPrice ?? market.noPrice;

    // Update market in DB if live price differs
    if (live && (live.yesPrice !== market.yesPrice || live.noPrice !== market.noPrice)) {
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
    livePricesFound: livePrices.size,
    totalMarkets: event.markets.length,
  });
}
