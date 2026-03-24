import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getMarketsBySearchTerms } from '@/app/lib/polymarket';
import type { MarketData } from '@/app/types';

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
    },
  });

  if (!event) {
    return NextResponse.json({ event: null });
  }

  // Fetch live market data from Polymarket Gamma API
  let markets: MarketData[] = [];
  if (event.searchTerms.length > 0) {
    try {
      markets = await getMarketsBySearchTerms(event.searchTerms);
    } catch (err) {
      console.error('Polymarket live price fetch error:', err);
    }
  }

  return NextResponse.json({
    event: {
      ...event,
      markets,
    },
  });
}
