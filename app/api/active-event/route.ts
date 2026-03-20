import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getMarketsByEventTicker, getMarkets } from '@/app/lib/dflow';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });

  if (!config) {
    return NextResponse.json({ event: null });
  }

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: {
      newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      tiktoks: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      gasPrices: { orderBy: { weekOf: 'desc' }, take: 52 },
    },
  });

  if (!event) {
    return NextResponse.json({ event: null });
  }

  // Fetch live market data directly from DFlow — no DB caching
  let markets: Awaited<ReturnType<typeof getMarkets>> = [];
  if (event.searchTerms.length > 0) {
    try {
      const eventTicker = event.searchTerms.find(t => t.startsWith('KX'));
      if (eventTicker) {
        markets = await getMarketsByEventTicker(eventTicker);
      }
      if (markets.length === 0) {
        markets = await getMarkets(event.searchTerms);
      }
    } catch (err) {
      console.error('DFlow live price fetch error:', err);
    }
  }

  return NextResponse.json({
    event: {
      ...event,
      markets,
    },
  });
}
