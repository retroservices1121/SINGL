import { NextRequest, NextResponse } from 'next/server';
import { buildTradeTransaction, buildSellTransaction } from '@/app/lib/dflow';
import { calculateFee } from '@/app/lib/fees';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletAddress, marketTicker, side, amount, action } = body;

  if (!walletAddress || !marketTicker || !side || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    if (action === 'sell') {
      // Sell: no fee, amount is in shares (outcome tokens)
      const transaction = await buildSellTransaction({
        walletAddress,
        marketTicker,
        side,
        amount,
      });
      return NextResponse.json({ transaction });
    }

    // Buy: apply fee
    const { fee, netAmount } = calculateFee(amount);

    const transaction = await buildTradeTransaction({
      walletAddress,
      marketTicker,
      side,
      amount: netAmount,
    });

    return NextResponse.json({ transaction, fee, netAmount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to build transaction';
    console.error('Trade build error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
