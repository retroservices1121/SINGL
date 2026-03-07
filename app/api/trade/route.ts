import { NextRequest, NextResponse } from 'next/server';
import { buildTradeTransaction } from '@/app/lib/dflow';
import { calculateFee } from '@/app/lib/fees';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletAddress, marketTicker, marketTitle, eventSlug, eventTitle, side, amount, price } = body;

  if (!walletAddress || !marketTicker || !side || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { fee, netAmount } = calculateFee(amount);

  try {
    const transaction = await buildTradeTransaction({
      walletAddress,
      marketTicker,
      side,
      amount: netAmount,
    });

    // Log the fee
    await prisma.tradeFee.create({
      data: {
        walletAddress,
        marketTicker,
        side,
        grossAmount: amount,
        feeAmount: fee,
        netAmount,
      },
    });

    // Record position
    const shares = netAmount / (price || 0.5);
    await prisma.position.create({
      data: {
        walletAddress,
        marketTicker,
        marketTitle: marketTitle || marketTicker,
        eventSlug: eventSlug || '',
        eventTitle: eventTitle || '',
        side,
        shares,
        avgPrice: price || 0.5,
        costBasis: netAmount,
      },
    });

    return NextResponse.json({ transaction, fee, netAmount });
  } catch (err) {
    console.error('Trade build error:', err);
    return NextResponse.json({ error: 'Failed to build transaction' }, { status: 500 });
  }
}
