import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getOrderQuote, type OrderParams } from '@/app/lib/synthesis';

export const dynamic = 'force-dynamic';

/**
 * POST /api/synthesis/quote
 *
 * Gets an order quote (preview) without executing.
 * Body: { privy_user_id, token_id, side, type, amount, units, price? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { privy_user_id, token_id, side, type, amount, units, price } = body;

    if (!privy_user_id) {
      return NextResponse.json({ error: 'privy_user_id is required' }, { status: 400 });
    }
    if (!token_id || !side || !amount) {
      return NextResponse.json({ error: 'token_id, side, and amount are required' }, { status: 400 });
    }

    const account = await prisma.synthesisAccount.findUnique({
      where: { privyUserId: privy_user_id },
    });

    if (!account || !account.walletId) {
      return NextResponse.json({ error: 'Account or wallet not ready' }, { status: 400 });
    }

    const params: OrderParams = {
      tokenId: token_id,
      side: side as 'BUY' | 'SELL',
      type: (type as 'MARKET' | 'LIMIT') || 'MARKET',
      amount: String(amount),
      units: (units as 'USDC' | 'SHARES') || (side === 'BUY' ? 'USDC' : 'SHARES'),
    };

    if (price) {
      params.price = String(price);
    }

    const quote = await getOrderQuote(account.apiKey, account.walletId, params);

    return NextResponse.json({ quote });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get quote';
    console.error('[synthesis] Quote error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
