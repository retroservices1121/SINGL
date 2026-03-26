import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

// GET: fetch positions for a wallet
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet param required' }, { status: 400 });
  }

  const positions = await prisma.position.findMany({
    where: { walletAddress: wallet },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ positions });
}

// POST: record a confirmed position
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletAddress, marketTicker, marketTitle, eventSlug, eventTitle, side, amount, price, orderId, tokenId } = body;

  if (!walletAddress || !marketTicker || !side || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const shares = amount / (price || 0.5);

  try {
    const position = await prisma.position.create({
      data: {
        walletAddress,
        marketTicker,
        marketTitle: marketTitle || marketTicker,
        eventSlug: eventSlug || '',
        eventTitle: eventTitle || '',
        side,
        shares,
        avgPrice: price || 0.5,
        costBasis: amount,
        orderId: orderId || null,
        tokenId: tokenId || null,
      },
    });

    return NextResponse.json({ position });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to record position';
    console.error('Position record error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH: close/sell a position
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { positionId, closeTxSig, closePrice } = body;

  if (!positionId || !closeTxSig) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    const saleProceeds = position.shares * (closePrice || 0);
    const realizedPnl = saleProceeds - position.costBasis;

    const updated = await prisma.position.update({
      where: { id: positionId },
      data: {
        status: 'closed',
        closeTxSig,
        closePrice,
        realizedPnl,
      },
    });

    return NextResponse.json({ position: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to close position';
    console.error('Position close error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
