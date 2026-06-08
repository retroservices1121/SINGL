import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getOrCreatePlayer } from '@/app/lib/oracleServer';
import { readSprddHolding } from '@/app/lib/sprdd';
import { holdLabelForBps } from '@/app/lib/oracle';

export const dynamic = 'force-dynamic';

// POST /api/oracle/sync-balance { aggUserId, walletAddress }
// Reads the player's on-chain SPRDD balance and updates their hold-to-multiply
// tier. Called when a wallet connects and after a player buys to climb tiers.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const aggUserId = body?.aggUserId as string | undefined;
  const walletAddress = body?.walletAddress as string | undefined;
  if (!aggUserId || !walletAddress) {
    return NextResponse.json({ error: 'aggUserId and walletAddress required' }, { status: 400 });
  }

  const { raw, multiplierBps } = await readSprddHolding(walletAddress);
  const player = await getOrCreatePlayer(aggUserId, { walletAddress });

  await prisma.oraclePlayer.update({
    where: { id: player.id },
    data: { sprddBalance: raw, multiplierBps, balanceSyncedAt: new Date() },
  });

  return NextResponse.json({
    sprddBalance: raw,
    multiplierBps,
    holdMultiplier: holdLabelForBps(multiplierBps),
  });
}
