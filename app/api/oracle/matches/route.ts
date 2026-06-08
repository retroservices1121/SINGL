import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { fetchMatches } from '@/app/lib/espn';

export const dynamic = 'force-dynamic';

// GET /api/oracle/matches?date=YYYYMMDD&aggUserId=...
// Pickable matches for a day (defaults to ESPN's current scoreboard), each
// merged with the caller's existing pick and whether it's still open (locks at
// kickoff). This is the daily-loop surface for the Oracle game.
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || undefined; // YYYYMMDD
  const aggUserId = req.nextUrl.searchParams.get('aggUserId');

  const matches = await fetchMatches(date);

  let picksByMatch: Record<string, string> = {};
  if (aggUserId) {
    const player = await prisma.oraclePlayer.findUnique({
      where: { aggUserId },
      select: { id: true },
    });
    if (player) {
      const picks = await prisma.matchPick.findMany({
        where: { playerId: player.id, matchId: { in: matches.map(m => m.id) } },
        select: { matchId: true, pick: true },
      });
      picksByMatch = Object.fromEntries(picks.map(p => [p.matchId, p.pick]));
    }
  }

  const now = Date.now();
  return NextResponse.json({
    matches: matches.map(m => ({
      ...m,
      open: m.status === 'scheduled' && new Date(m.kickoff).getTime() > now,
      yourPick: picksByMatch[m.id] ?? null,
    })),
  });
}
