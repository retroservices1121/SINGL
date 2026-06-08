import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { etDate } from '@/app/lib/espn';
import {
  REWARD,
  dailyBudgetUsd,
  streakMultiplierBps,
  applyBps,
  splitPool,
} from '@/app/lib/oracle';

export const dynamic = 'force-dynamic';

function authed(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const secret = req.nextUrl.searchParams.get('secret');
  return authHeader === `Bearer ${process.env.CRON_SECRET}` || secret === process.env.CRON_SECRET;
}

// ── GET: daily finalize ───────────────────────────────────────────────────────
// For a completed match day: update every player's streak, award the streak
// bonus, and create that day's reward pool + per-player point shares. Run once
// after midnight ET. Idempotent per day via the RewardPeriod row + lastStreakDay
// guard.
//
//   curl -H "authorization: Bearer $CRON_SECRET" .../api/cron/oracle-rewards
//   (optional ?date=YYYY-MM-DD to backfill a specific day)
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const day = req.nextUrl.searchParams.get('date') || etDate(new Date(Date.now() - 24 * 3600 * 1000).toISOString());

  const existing = await prisma.rewardPeriod.findUnique({ where: { periodKey: day } });
  if (existing?.finalized) {
    return NextResponse.json({ day, message: 'already finalized', skipped: true });
  }

  // Points earned that day, per player (from settled match picks).
  const dayPicks = await prisma.matchPick.findMany({
    where: { matchDate: day, settled: true },
    select: { playerId: true, awardedPoints: true },
  });
  const dayPointsByPlayer = new Map<string, number>();
  for (const p of dayPicks) {
    dayPointsByPlayer.set(p.playerId, (dayPointsByPlayer.get(p.playerId) || 0) + p.awardedPoints);
  }

  // Streak update for every player (a blank/incorrect day resets the streak).
  const players = await prisma.oraclePlayer.findMany({
    select: { id: true, currentStreak: true, bestStreak: true, lastStreakDay: true },
  });

  let streakBonusTotal = 0;
  for (const pl of players) {
    if (pl.lastStreakDay === day) continue; // already processed this day
    const dayPoints = dayPointsByPlayer.get(pl.id) || 0;
    const correctToday = dayPoints > 0;
    const newStreak = correctToday ? pl.currentStreak + 1 : 0;
    const bestStreak = Math.max(pl.bestStreak, newStreak);

    // Streak bonus: scale the day's points by the streak multiplier.
    const bonus = correctToday ? applyBps(dayPoints, streakMultiplierBps(newStreak)) - dayPoints : 0;

    await prisma.$transaction([
      prisma.oraclePlayer.update({
        where: { id: pl.id },
        data: {
          currentStreak: newStreak,
          bestStreak,
          lastStreakDay: day,
          ...(bonus > 0 ? { totalPoints: { increment: bonus } } : {}),
        },
      }),
      ...(bonus > 0
        ? [
            prisma.pointsLedger.create({
              data: { playerId: pl.id, kind: 'streak_bonus', refId: day, points: bonus, note: `Day-${newStreak} streak` },
            }),
          ]
        : []),
    ]);
    streakBonusTotal += bonus;
  }

  // Reward pool: record the day's USD budget + point shares. SPRDD amounts are
  // filled in by POST once the buyback executes on-chain.
  const totalDayPoints = [...dayPointsByPlayer.values()].reduce((a, b) => a + b, 0);
  const usdBudget = dailyBudgetUsd(day);

  await prisma.rewardPeriod.upsert({
    where: { periodKey: day },
    update: { totalPoints: totalDayPoints, usdBudget },
    create: { periodKey: day, kind: 'daily', usdBudget, totalPoints: totalDayPoints },
  });

  const vestStart = new Date();
  const vestEnd = new Date(vestStart.getTime() + REWARD.vestDays * 24 * 3600 * 1000);
  for (const [playerId, points] of dayPointsByPlayer) {
    if (points <= 0) continue;
    await prisma.rewardAllocation.upsert({
      where: { playerId_periodKey: { playerId, periodKey: day } },
      update: { pointsShare: points },
      create: { playerId, periodKey: day, pointsShare: points, vestStart, vestEnd },
    });
  }

  return NextResponse.json({
    day,
    usdBudget,
    totalDayPoints,
    rewardedPlayers: [...dayPointsByPlayer.values()].filter(p => p > 0).length,
    streakBonusAwarded: streakBonusTotal,
    note: 'Point shares recorded. POST with sprddBought to distribute the buyback.',
  });
}

// ── POST: record buyback fill + distribute ────────────────────────────────────
// After the team buys SPRDD for a period's budget, record the realized raw
// amount; this splits it across that period's point shares (largest-remainder)
// and writes each allocation's sprddAmount.
//
//   POST { periodKey: "2026-06-15", sprddBought: "123456...", buybackTx?: "0x..." }
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const periodKey = body?.periodKey as string | undefined;
  const sprddBought = body?.sprddBought as string | undefined;
  const buybackTx = body?.buybackTx as string | undefined;
  if (!periodKey || !sprddBought) {
    return NextResponse.json({ error: 'periodKey and sprddBought (raw) required' }, { status: 400 });
  }

  let pool: bigint;
  try {
    pool = BigInt(sprddBought);
  } catch {
    return NextResponse.json({ error: 'sprddBought must be a raw integer string' }, { status: 400 });
  }

  const allocations = await prisma.rewardAllocation.findMany({ where: { periodKey } });
  if (allocations.length === 0) {
    return NextResponse.json({ error: 'No allocations for that period' }, { status: 404 });
  }

  const split = splitPool(
    pool,
    allocations.map(a => ({ playerId: a.playerId, points: a.pointsShare }))
  );

  for (const a of allocations) {
    await prisma.rewardAllocation.update({
      where: { id: a.id },
      data: { sprddAmount: (split[a.playerId] ?? 0n).toString(), ...(buybackTx ? { txHash: buybackTx } : {}) },
    });
  }

  await prisma.rewardPeriod.update({
    where: { periodKey },
    data: { sprddBought, buybackTx: buybackTx ?? null, finalized: true },
  });

  return NextResponse.json({ periodKey, distributedTo: allocations.length, sprddBought });
}
