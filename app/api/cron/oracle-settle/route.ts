import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { fetchMatches } from '@/app/lib/espn';
import { POINTS, applyBps } from '@/app/lib/oracle';

export const dynamic = 'force-dynamic';

// Cron: grade newly-final matches. Run frequently (e.g. every 15–30 min) during
// match days. Idempotent — only settles picks not yet marked settled, and only
// for matches ESPN reports as final.
//
//   curl -H "authorization: Bearer $CRON_SECRET" .../api/cron/oracle-settle
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = req.nextUrl.searchParams.get('secret');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Which days still have unsettled picks?
  const open = await prisma.matchPick.findMany({
    where: { settled: false },
    select: { matchDate: true },
    distinct: ['matchDate'],
  });
  if (open.length === 0) return NextResponse.json({ settled: 0, message: 'nothing to settle' });

  // Build a matchId -> final outcome map from the live + per-day scoreboards.
  const outcomes = new Map<string, string>();
  const dates = [undefined, ...open.map(o => o.matchDate.replace(/-/g, ''))];
  for (const d of dates) {
    const matches = await fetchMatches(d);
    for (const m of matches) {
      if (m.status === 'final' && m.outcome) outcomes.set(m.id, m.outcome);
    }
  }
  if (outcomes.size === 0) return NextResponse.json({ settled: 0, message: 'no finals yet' });

  // Grade every unsettled pick whose match is now final.
  const picks = await prisma.matchPick.findMany({
    where: { settled: false, matchId: { in: [...outcomes.keys()] } },
    include: { player: { select: { id: true, multiplierBps: true } } },
  });

  let settled = 0;
  const pointsByPlayer = new Map<string, number>();

  for (const pick of picks) {
    const result = outcomes.get(pick.matchId)!;
    const correct = pick.pick === result;
    const awarded = correct ? applyBps(POINTS.matchCorrect, pick.player.multiplierBps) : 0;

    await prisma.$transaction([
      prisma.matchPick.update({
        where: { id: pick.id },
        data: { settled: true, correct, result, awardedPoints: awarded },
      }),
      ...(awarded > 0
        ? [
            prisma.pointsLedger.create({
              data: {
                playerId: pick.playerId,
                kind: 'match',
                refId: pick.matchId,
                points: awarded,
                note: `Correct: ${result}`,
              },
            }),
          ]
        : []),
    ]);

    settled++;
    if (awarded > 0) pointsByPlayer.set(pick.playerId, (pointsByPlayer.get(pick.playerId) || 0) + awarded);
  }

  // Roll up cached totals.
  for (const [playerId, pts] of pointsByPlayer) {
    await prisma.oraclePlayer.update({
      where: { id: playerId },
      data: { totalPoints: { increment: pts } },
    });
  }

  return NextResponse.json({
    settled,
    awardedPlayers: pointsByPlayer.size,
    finalsKnown: outcomes.size,
  });
}
