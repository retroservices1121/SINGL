import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getOrCreatePlayer } from '@/app/lib/oracleServer';
import { fetchMatches } from '@/app/lib/espn';
import { DRAW } from '@/app/lib/oracle';

export const dynamic = 'force-dynamic';

// GET /api/oracle/picks?aggUserId=... — the caller's match picks.
export async function GET(req: NextRequest) {
  const aggUserId = req.nextUrl.searchParams.get('aggUserId');
  if (!aggUserId) return NextResponse.json({ error: 'aggUserId required' }, { status: 400 });

  const player = await prisma.oraclePlayer.findUnique({
    where: { aggUserId },
    select: { id: true },
  });
  if (!player) return NextResponse.json({ picks: [] });

  const picks = await prisma.matchPick.findMany({
    where: { playerId: player.id },
    orderBy: { matchDate: 'desc' },
  });
  return NextResponse.json({ picks });
}

// POST /api/oracle/picks { aggUserId, walletAddress?, matchId, pick }
// Lock or change a pick for a match. Server-validates against the live ESPN
// feed: the match must exist, be one of its two teams (or DRAW), and not yet
// have kicked off. Picks are immutable once the match is live/final.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { aggUserId, walletAddress, matchId, pick } = body as {
    aggUserId?: string;
    walletAddress?: string;
    matchId?: string;
    pick?: string;
  };
  if (!aggUserId || !matchId || !pick) {
    return NextResponse.json({ error: 'aggUserId, matchId, pick required' }, { status: 400 });
  }

  // Find the match in the live feed and validate it's open.
  const matches = await fetchMatches();
  const match = matches.find(m => m.id === matchId);
  if (!match) {
    return NextResponse.json({ error: 'Match not found or not open for picks' }, { status: 404 });
  }
  if (match.status !== 'scheduled' || new Date(match.kickoff).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Picks are locked for this match' }, { status: 409 });
  }
  const valid = [match.home, match.away, DRAW];
  if (!valid.includes(pick)) {
    return NextResponse.json({ error: 'Pick must be one of the two teams or DRAW' }, { status: 400 });
  }

  const player = await getOrCreatePlayer(aggUserId, { walletAddress });

  const saved = await prisma.matchPick.upsert({
    where: { playerId_matchId: { playerId: player.id, matchId } },
    update: { pick, matchDate: match.date },
    create: { playerId: player.id, matchId, matchDate: match.date, pick },
  });

  return NextResponse.json({ pick: saved });
}
