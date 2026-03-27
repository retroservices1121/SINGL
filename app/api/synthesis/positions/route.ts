import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getPositions } from '@/app/lib/synthesis';

export const dynamic = 'force-dynamic';

/**
 * GET /api/synthesis/positions?privy_user_id=...
 *
 * Returns positions from Synthesis for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const privyUserId = req.nextUrl.searchParams.get('privy_user_id');

    if (!privyUserId) {
      return NextResponse.json({ error: 'privy_user_id is required' }, { status: 400 });
    }

    const account = await prisma.synthesisAccount.findUnique({
      where: { privyUserId },
    });

    if (!account) {
      return NextResponse.json({ positions: [] });
    }

    if (!account.walletId) {
      return NextResponse.json({ positions: [] });
    }

    const positions = await getPositions(account.apiKey, account.walletId);

    return NextResponse.json({ positions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch positions';
    console.error('[synthesis] Positions error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
