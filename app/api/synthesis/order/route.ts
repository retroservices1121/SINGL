import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { placeOrder, type OrderParams } from '@/app/lib/synthesis';

export const dynamic = 'force-dynamic';

/**
 * POST /api/synthesis/order
 *
 * Places an order via Synthesis for the authenticated Privy user.
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

    // Look up the user's Synthesis account
    const account = await prisma.synthesisAccount.findUnique({
      where: { privyUserId: privy_user_id },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'No trading account found. Please set up your account first.' },
        { status: 404 },
      );
    }

    if (!account.walletId) {
      return NextResponse.json(
        { error: 'Wallet not ready. Please try again in a moment.' },
        { status: 400 },
      );
    }

    const orderParams: OrderParams = {
      tokenId: token_id,
      side: side as 'BUY' | 'SELL',
      type: (type as 'MARKET' | 'LIMIT') || 'MARKET',
      amount: String(amount),
      units: (units as 'USDC' | 'SHARES') || (side === 'BUY' ? 'USDC' : 'SHARES'),
    };

    if (price) {
      orderParams.price = String(price);
    }

    console.log('[synthesis] Placing order:', orderParams, 'wallet:', account.walletId);

    const result = await placeOrder(account.apiKey, account.walletId, orderParams);

    console.log('[synthesis] Order result:', result);

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Order placement failed';
    console.error('[synthesis] Order error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
