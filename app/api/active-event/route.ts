import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { listVenueEvents, mapAggMarket } from '@/app/lib/aggServer';
import type { MarketData } from '@/app/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) return NextResponse.json({ event: null });

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: {
      newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      tiktoks: { orderBy: { fetchedAt: 'desc' }, take: 8 },
    },
  });
  if (!event) return NextResponse.json({ event: null });

  let markets: MarketData[] = [];
  try {
    if (event.searchTerms.length > 0) {
      const { data: venueEvents } = await listVenueEvents({
        searchTerms: event.searchTerms,
        status: 'open',
        limit: 100,
      });
      const seen = new Set<string>();
      for (const ve of venueEvents) {
        for (const m of (ve.markets || [])) {
          if (seen.has(m.id)) continue;
          seen.add(m.id);
          const mapped = mapAggMarket(ve, m);
          if (mapped) markets.push(mapped);
        }
      }
      markets.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    }
  } catch (err) {
    console.error('[active-event] AGG fetch error:', err);
  }

  const totalVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0);

  return NextResponse.json({
    event: {
      ...event,
      markets,
      volume: totalVolume || event.volume,
      liquidity: event.liquidity || 0,
    },
  });
}
