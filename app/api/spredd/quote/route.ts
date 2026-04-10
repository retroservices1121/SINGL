import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getSpreddQuote } from '@/app/lib/spredd';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { privy_user_id, token_id, side, amount, platform } = await req.json();

    if (!privy_user_id) {
      return NextResponse.json({ error: 'privy_user_id is required' }, { status: 400 });
    }
    if (!token_id || !side || !amount) {
      return NextResponse.json({ error: 'token_id, side, and amount are required' }, { status: 400 });
    }

    const account = await prisma.spreddAccount.findUnique({
      where: { privyUserId: privy_user_id },
    });

    if (!account) {
      return NextResponse.json({ error: 'No trading account found.' }, { status: 404 });
    }

    const detectedPlatform = platform || (token_id.includes(':') ? token_id.split(':')[0] : 'polymarket');
    const marketId = token_id.includes(':') ? token_id.split(':')[1] : token_id;

    const quote = await getSpreddQuote({
      platform: detectedPlatform,
      market_id: marketId,
      outcome: side.toLowerCase() as 'yes' | 'no',
      side: 'buy',
      amount: Number(amount),
    });

    return NextResponse.json({ quote });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get quote';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
