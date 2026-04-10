import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { placeSpreddOrder, placeLimitlessOrder } from '@/app/lib/spredd';

export const dynamic = 'force-dynamic';

/**
 * POST: Place an order via Spredd.
 * Supports both cross-platform orders and Limitless-specific CLOB orders.
 */
export async function POST(req: NextRequest) {
  try {
    const { privy_user_id, token_id, side, type, amount, units, price, platform } = await req.json();

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
      return NextResponse.json({ error: 'No trading account found. Please connect your wallet first.' }, { status: 404 });
    }
    if (!account.walletAddress) {
      return NextResponse.json({ error: 'Wallet not ready.' }, { status: 400 });
    }

    // Detect platform from market ticker format: "platform:market_id"
    const detectedPlatform = platform || (token_id.includes(':') ? token_id.split(':')[0] : 'polymarket');
    const marketId = token_id.includes(':') ? token_id.split(':')[1] : token_id;

    let result;

    if (detectedPlatform === 'limitless') {
      // Use Limitless CLOB endpoint (Base chain)
      result = await placeLimitlessOrder({
        market_id: marketId,
        outcome: side.toLowerCase() as 'yes' | 'no',
        side: 'buy',
        order_type: type === 'LIMIT' ? 'GTC' : 'FOK',
        amount: Number(amount),
        price: price ? Number(price) : undefined,
        wallet_address: account.walletAddress,
        private_key: account.apiKey,
      });
    } else {
      // Use general Spredd trading endpoint
      result = await placeSpreddOrder({
        platform: detectedPlatform,
        market_id: marketId,
        outcome: (units === 'SHARES' && side.toLowerCase() === 'sell') ? side.toLowerCase() as 'yes' | 'no' : side.toLowerCase() as 'yes' | 'no',
        side: units === 'SHARES' && side.toLowerCase() === 'sell' ? 'sell' : 'buy',
        order_type: type === 'LIMIT' ? 'limit' : 'market',
        amount: Number(amount),
        price: price ? Number(price) : undefined,
        wallet_address: account.walletAddress,
        private_key: account.apiKey,
      });
    }

    return NextResponse.json({
      order_id: result.order_id,
      status: result.status,
      shares: result.shares,
      price: result.executed_price || result.price,
      tx_hash: result.tx_hash,
      platform: result.platform || detectedPlatform,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Order placement failed';
    console.error('[spredd] Order error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
