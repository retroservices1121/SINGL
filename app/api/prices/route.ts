import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId');
  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  // Support time range: 1d, 1w, 1m, all (default: all)
  const range = req.nextUrl.searchParams.get('range') || 'all';
  const rangeMs: Record<string, number> = {
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000,
  };

  const since = rangeMs[range]
    ? new Date(Date.now() - rangeMs[range])
    : new Date(0);

  const snapshots = await prisma.priceSnapshot.findMany({
    where: {
      eventId,
      timestamp: { gte: since },
    },
    orderBy: { timestamp: 'asc' },
  });

  const byMarket: Record<string, { timestamp: string; yesPrice: number }[]> = {};
  for (const s of snapshots) {
    if (!byMarket[s.marketTicker]) byMarket[s.marketTicker] = [];
    byMarket[s.marketTicker].push({
      timestamp: s.timestamp.toISOString(),
      yesPrice: s.yesPrice,
    });
  }

  return NextResponse.json({ snapshots: byMarket });
}
