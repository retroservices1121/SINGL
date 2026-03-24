import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { searchMarkets, getMarketsBySearchTerms } from '@/app/lib/polymarket';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('event');
  const query = req.nextUrl.searchParams.get('q');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');

  // Search Polymarket directly by query
  if (query) {
    try {
      const results = await searchMarkets(query);
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

  // Always fetch live from Polymarket
  if (event.searchTerms.length > 0) {
    try {
      const fresh = await getMarketsBySearchTerms(event.searchTerms);
      return NextResponse.json({ markets: fresh });
    } catch {
      return NextResponse.json({ error: 'Failed to fetch live market data' }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'No search terms configured for this event' }, { status: 400 });
}
