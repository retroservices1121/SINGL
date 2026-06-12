import { NextRequest, NextResponse } from 'next/server';
import { creditTradeVolume } from '@/app/lib/oracleServer';

export const dynamic = 'force-dynamic';

// POST /api/oracle/sync-volume
//   headers: Authorization: Bearer $CRON_SECRET   (or ?secret=$CRON_SECRET)
//   body: { aggUserId, volumeUsd, walletAddress? }
//
// Credits trade-to-earn points for a player's CUMULATIVE traded volume.
// Trusted-source only (the AGG trade-event webhook / a server fills reader),
// NOT the client — otherwise volume, and thus reward share, is forgeable.
// `volumeUsd` is cumulative; the engine credits only the new delta × hold tier.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = req.nextUrl.searchParams.get('secret');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const aggUserId = body?.aggUserId as string | undefined;
  const volumeUsd = body?.volumeUsd;
  const walletAddress = body?.walletAddress as string | undefined;

  if (!aggUserId || typeof volumeUsd !== 'number') {
    return NextResponse.json({ error: 'aggUserId and numeric volumeUsd required' }, { status: 400 });
  }

  const result = await creditTradeVolume(aggUserId, volumeUsd, { walletAddress });
  return NextResponse.json({ success: true, ...result });
}
