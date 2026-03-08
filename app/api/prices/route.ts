import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('eventId');
  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  // Get snapshots from the last 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const snapshots = await prisma.priceSnapshot.findMany({
    where: {
      eventId,
      timestamp: { gte: since },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Group by marketTicker
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
