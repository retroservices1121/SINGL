import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { holdLabelForBps } from '@/app/lib/oracle';

export const dynamic = 'force-dynamic';

// GET /api/oracle/leaderboard?limit=100 — players ranked by points. Reads the
// cached `totalPoints` aggregate (kept current by the settle cron), so it's a
// single indexed scan even with thousands of players.
export async function GET(req: NextRequest) {
  const limit = Math.min(500, parseInt(req.nextUrl.searchParams.get('limit') || '100', 10));

  const players = await prisma.oraclePlayer.findMany({
    where: { totalPoints: { gt: 0 } },
    orderBy: [{ totalPoints: 'desc' }, { bestStreak: 'desc' }],
    take: limit,
    select: {
      aggUserId: true,
      walletAddress: true,
      displayName: true,
      avatarUrl: true,
      totalPoints: true,
      currentStreak: true,
      bestStreak: true,
      multiplierBps: true,
    },
  });

  const leaders = players.map((p, i) => ({
    rank: i + 1,
    aggUserId: p.aggUserId,
    walletAddress: p.walletAddress,
    displayName: p.displayName || (p.walletAddress ? `${p.walletAddress.slice(0, 6)}…${p.walletAddress.slice(-4)}` : 'Anon'),
    avatarUrl: p.avatarUrl,
    points: p.totalPoints,
    streak: p.currentStreak,
    bestStreak: p.bestStreak,
    holdMultiplier: holdLabelForBps(p.multiplierBps),
  }));

  return NextResponse.json({ leaders });
}
