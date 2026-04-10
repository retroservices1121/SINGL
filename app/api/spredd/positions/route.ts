import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getSpreddPositions, getLimitlessPositions } from '@/app/lib/spredd';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const privyUserId = req.nextUrl.searchParams.get('privy_user_id');
    if (!privyUserId) {
      return NextResponse.json({ error: 'privy_user_id is required' }, { status: 400 });
    }

    const account = await prisma.spreddAccount.findUnique({
      where: { privyUserId },
    });

    if (!account || !account.walletAddress) {
      return NextResponse.json({ positions: [] });
    }

    // Fetch from both general Spredd positions and Limitless-specific positions
    const [spreddPositions, limitlessPositions] = await Promise.all([
      getSpreddPositions(account.walletAddress).catch(() => []),
      getLimitlessPositions(account.walletAddress).catch(() => []),
    ]);

    // Merge and deduplicate
    const seen = new Set<string>();
    const allPositions: Record<string, unknown>[] = [];

    for (const p of [...spreddPositions, ...limitlessPositions]) {
      const key = `${p.platform || 'unknown'}:${p.market_id || p.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        allPositions.push(p);
      }
    }

    return NextResponse.json({ positions: allPositions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch positions';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
