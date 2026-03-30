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

  // Check CLOB for resolution status on open position markets
  const openTickers = new Set(
    positions.filter(p => p.status === 'open').map(p => p.marketTicker)
  );
  const resolvedMarkets = new Map<string, { yesPrice: number; noPrice: number }>();

  await Promise.all(
    [...openTickers].map(async (ticker) => {
      try {
        const res = await fetch(`https://clob.polymarket.com/markets/${ticker}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.closed || data.resolved) {
          // Market is resolved — determine winning side from tokens
          const tokens = data.tokens || [];
          const yesToken = tokens.find((t: { outcome: string }) => t.outcome === 'Yes');
          const noToken = tokens.find((t: { outcome: string }) => t.outcome === 'No');
          const yesWon = yesToken?.winner === true;
          const noWon = noToken?.winner === true;
          if (yesWon || noWon) {
            resolvedMarkets.set(ticker, {
              yesPrice: yesWon ? 1.0 : 0.0,
              noPrice: noWon ? 1.0 : 0.0,
            });
          }
        }
      } catch { /* skip — use DB prices */ }
    })
  );

  const enriched = positions.map(p => {
    const market = allMarkets.find(m => m.ticker === p.marketTicker)
      || allMarkets.find(m => m.ticker.startsWith(p.marketTicker) || p.marketTicker.startsWith(m.ticker));
    const resolvedTokenId = p.tokenId
      || (p.side?.toLowerCase() === 'yes' ? market?.yesTokenId : market?.noTokenId)
      || null;

    // Use resolved prices if available, otherwise DB prices
    const resolved = resolvedMarkets.get(p.marketTicker);
    const currentYesPrice = resolved?.yesPrice ?? market?.yesPrice ?? null;
    const currentNoPrice = resolved?.noPrice ?? market?.noPrice ?? null;

    return {
      ...p,
      tokenId: resolvedTokenId,
      negRisk: market?.negRisk ?? false,
      tickSize: market?.tickSize ?? '0.01',
      currentYesPrice,
      currentNoPrice,
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
