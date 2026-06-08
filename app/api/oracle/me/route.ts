import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getOrCreatePlayer } from '@/app/lib/oracleServer';
import { holdLabelForBps, streakMultiplierBps } from '@/app/lib/oracle';

export const dynamic = 'force-dynamic';

// GET /api/oracle/me?aggUserId=...&wallet=... — the player's Oracle profile:
// points, streak, hold multiplier, and reward allocations. Creates the player
// row on first call so the game has zero onboarding friction.
export async function GET(req: NextRequest) {
  const aggUserId = req.nextUrl.searchParams.get('aggUserId');
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!aggUserId) {
    return NextResponse.json({ error: 'aggUserId required' }, { status: 400 });
  }

  const player = await getOrCreatePlayer(aggUserId, { walletAddress: wallet });

  const [rank, rewards, bracket] = await Promise.all([
    prisma.oraclePlayer.count({ where: { totalPoints: { gt: player.totalPoints } } }),
    prisma.rewardAllocation.findMany({
      where: { playerId: player.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bracketPick.findUnique({ where: { playerId: player.id } }),
  ]);

  const streakBps = streakMultiplierBps(player.currentStreak);

  return NextResponse.json({
    player: {
      aggUserId: player.aggUserId,
      walletAddress: player.walletAddress,
      displayName: player.displayName,
      totalPoints: player.totalPoints,
      currentStreak: player.currentStreak,
      bestStreak: player.bestStreak,
      rank: rank + 1,
      holdMultiplier: holdLabelForBps(player.multiplierBps),
      holdMultiplierBps: player.multiplierBps,
      streakMultiplierBps: streakBps,
      sprddBalance: player.sprddBalance,
      hasBracket: !!bracket,
    },
    rewards: rewards.map(r => ({
      periodKey: r.periodKey,
      pointsShare: r.pointsShare,
      sprddAmount: r.sprddAmount,
      claimedRaw: r.claimedRaw,
      vestStart: r.vestStart,
      vestEnd: r.vestEnd,
      txHash: r.txHash,
    })),
  });
}
