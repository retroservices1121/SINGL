import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getOrCreatePlayer } from '@/app/lib/oracleServer';

export const dynamic = 'force-dynamic';

// The bracket locks at the first group-stage kickoff — after that it's read-only
// and settles for points after the group stage / final.
const BRACKET_LOCK = new Date('2026-06-11T16:00:00Z');

// GET /api/oracle/bracket?aggUserId=... — the caller's bracket pick.
export async function GET(req: NextRequest) {
  const aggUserId = req.nextUrl.searchParams.get('aggUserId');
  if (!aggUserId) return NextResponse.json({ error: 'aggUserId required' }, { status: 400 });

  const player = await prisma.oraclePlayer.findUnique({
    where: { aggUserId },
    select: { id: true },
  });
  if (!player) return NextResponse.json({ bracket: null, locked: Date.now() >= BRACKET_LOCK.getTime() });

  const bracket = await prisma.bracketPick.findUnique({ where: { playerId: player.id } });
  return NextResponse.json({ bracket, locked: Date.now() >= BRACKET_LOCK.getTime() });
}

// POST /api/oracle/bracket { aggUserId, walletAddress?, groupPicks, champion }
// Persist the group-winners + champion bracket. Editable until the tournament
// kicks off.
export async function POST(req: NextRequest) {
  if (Date.now() >= BRACKET_LOCK.getTime()) {
    return NextResponse.json({ error: 'Bracket is locked — the tournament has started' }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { aggUserId, walletAddress, groupPicks, champion } = body as {
    aggUserId?: string;
    walletAddress?: string;
    groupPicks?: unknown;
    champion?: string;
  };
  if (!aggUserId || !groupPicks || !champion) {
    return NextResponse.json({ error: 'aggUserId, groupPicks, champion required' }, { status: 400 });
  }

  const player = await getOrCreatePlayer(aggUserId, { walletAddress });

  const saved = await prisma.bracketPick.upsert({
    where: { playerId: player.id },
    update: { groupPicks: groupPicks as object, champion },
    create: { playerId: player.id, groupPicks: groupPicks as object, champion },
  });

  return NextResponse.json({ bracket: saved });
}
