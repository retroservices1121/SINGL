import { NextRequest, NextResponse } from 'next/server';
import { discoverAndPersist } from '@/app/lib/fifaMatches';

export const dynamic = 'force-dynamic';
// The discovery scan runs ~100s; give it headroom.
export const maxDuration = 300;

// Warms the shared World Cup match-market cache (SiteConfig: fifaMatches)
// so /api/fifa/matches is always an instant DB read for visitors. Schedule
// every ~20-30 min: GET /api/cron/fifa-matches?secret=$CRON_SECRET
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = req.nextUrl.searchParams.get('secret');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const matches = await discoverAndPersist(Date.now());
    return NextResponse.json({ success: true, matches: matches.length });
  } catch (err) {
    console.error('[cron/fifa-matches]', err);
    return NextResponse.json({ error: 'discovery failed' }, { status: 502 });
  }
}
