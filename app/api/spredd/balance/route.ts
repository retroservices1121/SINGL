import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getLimitlessAllowance } from '@/app/lib/spredd';

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

    if (!account) {
      return NextResponse.json({ error: 'No trading account found.' }, { status: 404 });
    }
    if (!account.walletAddress) {
      return NextResponse.json({ error: 'Wallet not ready.' }, { status: 400 });
    }

    const balance = await getLimitlessAllowance(account.walletAddress);
    return NextResponse.json({ balance });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch balance';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
