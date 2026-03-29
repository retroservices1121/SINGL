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

  // Enrich positions with market metadata (negRisk, tickSize) needed for sell orders
  // Position tickers may be truncated conditionIds, so fetch all event markets and match by prefix
  const allMarkets = await prisma.market.findMany({
    select: { ticker: true, negRisk: true, tickSize: true, yesPrice: true, noPrice: true, yesTokenId: true, noTokenId: true, outcomeName: true, outcome2Name: true },
  });

  const enriched = positions.map(p => {
    // Match by exact ticker first, then by prefix (position ticker may be truncated)
    const market = allMarkets.find(m => m.ticker === p.marketTicker)
      || allMarkets.find(m => m.ticker.startsWith(p.marketTicker) || p.marketTicker.startsWith(m.ticker));
    // Resolve the correct CLOB token ID: use stored tokenId, or look up from market based on side
    const resolvedTokenId = p.tokenId
      || (p.side?.toLowerCase() === 'yes' ? market?.yesTokenId : market?.noTokenId)
      || null;
    return {
      ...p,
      tokenId: resolvedTokenId,
      negRisk: market?.negRisk ?? false,
      tickSize: market?.tickSize ?? '0.01',
      currentYesPrice: market?.yesPrice ?? null,
      currentNoPrice: market?.noPrice ?? null,
      outcomeName: market?.outcomeName ?? null,
      outcome2Name: market?.outcome2Name ?? null,
    };
  });

  return NextResponse.json({ positions: enriched });
}

// POST: record a confirmed position
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletAddress, marketTicker, marketTitle, eventSlug, eventTitle, side, amount, price, orderId, tokenId, shares: providedShares } = body;

  if (!walletAddress || !marketTicker || !side || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Use shares from Synthesis response if provided, otherwise calculate
  const shares = providedShares || (amount / (price || 0.5));

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
