import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

const ONE_YEAR = 60 * 60 * 24 * 365;

function getAllowedCodes(): Set<string> {
  const raw = process.env.AGG_ACCESS_CODES || '';
  return new Set(
    raw
      .split(',')
      .map(c => c.trim())
      .filter(Boolean),
  );
}

// POST /api/access/verify  body: { code: string }
// One-time-use: a code that's in AGG_ACCESS_CODES *and* not yet in
// RedeemedAccessCode unlocks the app and burns the code.
export async function POST(req: Request) {
  let code = '';
  try {
    const body = await req.json();
    code = String(body?.code ?? '').trim();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }

  if (!code) return NextResponse.json({ ok: false, error: 'Code required' }, { status: 400 });

  const allowed = getAllowedCodes();
  if (!allowed.has(code)) {
    return NextResponse.json({ ok: false, error: 'Invalid access code' }, { status: 401 });
  }

  // Race-safe: try to insert; if it already exists, the code was redeemed.
  try {
    await prisma.redeemedAccessCode.create({ data: { code } });
  } catch {
    return NextResponse.json({ ok: false, error: 'Code already used' }, { status: 409 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('agg_access', 'granted', {
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    path: '/',
    // Not httpOnly so the client can read it without an extra round trip.
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

// GET /api/access/verify — convenience for clients to check status when
// localStorage was cleared but the cookie may still be set on this browser.
export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const granted = /(?:^|;\s*)agg_access=granted(?:;|$)/.test(cookie);
  return NextResponse.json({ granted });
}
