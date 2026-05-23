import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { listVenueEvents, mapAggMarket } from '@/app/lib/aggServer';
import type { MarketData } from '@/app/types';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let event = await prisma.event.findUnique({
    where: { slug },
    include: {
      newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      tiktoks: { orderBy: { fetchedAt: 'desc' }, take: 8 },
    },
  });

  if (!event) {
    const words = slug.split('-');
    const title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const searchTerms = [title];
    const keyWords = words.filter(w => w.length > 3).join(' ');
    if (keyWords && keyWords !== title.toLowerCase()) searchTerms.push(keyWords);

    event = await prisma.event.create({
      data: { slug, title, searchTerms },
      include: {
        newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
        xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
        videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
        tiktoks: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      },
    });
  }

  let markets: MarketData[] = [];
  if (event.searchTerms.length > 0) {
    try {
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
    } catch (err) {
      console.error('[events/slug] AGG fetch error:', err);
    }
  }

  return NextResponse.json({ ...event, markets });
}
