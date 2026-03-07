import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getMarkets } from '@/app/lib/dflow';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('event');
  if (!slug) {
    return NextResponse.json({ error: 'event slug required' }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    include: { markets: true },
  });

  if (!event) {
    return NextResponse.json({ error: 'event not found' }, { status: 404 });
  }

  // Refresh from DFlow
  if (event.searchTerms.length > 0) {
    try {
      const fresh = await getMarkets(event.searchTerms);
      return NextResponse.json({ markets: fresh, cached: event.markets });
    } catch {
      // Fall back to cached
    }
  }

  return NextResponse.json({ markets: event.markets });
}
