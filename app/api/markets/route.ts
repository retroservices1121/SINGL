import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { listVenueEvents, mapAggMarket } from '@/app/lib/aggServer';
import type { MarketData } from '@/app/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('event');
  const query = req.nextUrl.searchParams.get('q');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');

  const collect = async (terms: string[]): Promise<MarketData[]> => {
    const { data: venueEvents } = await listVenueEvents({
      searchTerms: terms,
      status: 'open',
      limit: 100,
    });
    const seen = new Set<string>();
    const out: MarketData[] = [];
    for (const ve of venueEvents) {
      for (const m of (ve.markets || [])) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        const mapped = mapAggMarket(ve, m);
        if (mapped) out.push(mapped);
      }
    }
    out.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    return out;
  };

  if (query) {
    try {
      const results = await collect([query]);
      return NextResponse.json({ markets: results.slice(0, limit) });
    } catch {
      return NextResponse.json({ markets: [] });
    }
  }

  if (!slug) {
    return NextResponse.json({ error: 'event slug or q param required' }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    include: { markets: true },
  });

  if (!event) {
    return NextResponse.json({ error: 'event not found' }, { status: 404 });
  }

  if (event.searchTerms.length > 0) {
    try {
      const fresh = await collect(event.searchTerms);
      return NextResponse.json({ markets: fresh });
    } catch {
      return NextResponse.json({ error: 'Failed to fetch live market data' }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'No search terms configured for this event' }, { status: 400 });
}
