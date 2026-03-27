import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Resolves a conditionId + side to the correct CLOB token ID.
 * First checks the DB, then falls back to the Gamma API.
 */
export async function GET(req: NextRequest) {
  const conditionId = req.nextUrl.searchParams.get('conditionId');
  const side = req.nextUrl.searchParams.get('side')?.toLowerCase() || 'yes';

  if (!conditionId) {
    return NextResponse.json({ error: 'conditionId required' }, { status: 400 });
  }

  // 1. Try DB — exact match or prefix match
  const allMarkets = await prisma.market.findMany({
    where: {
      OR: [
        { ticker: conditionId },
        { conditionId: conditionId },
      ],
    },
    select: { yesTokenId: true, noTokenId: true, negRisk: true, tickSize: true },
  });

  let market = allMarkets[0];

  // Prefix match fallback
  if (!market) {
    const all = await prisma.market.findMany({
      select: { ticker: true, conditionId: true, yesTokenId: true, noTokenId: true, negRisk: true, tickSize: true },
    });
    const found = all.find(m =>
      m.ticker.startsWith(conditionId) || conditionId.startsWith(m.ticker) ||
      (m.conditionId && (m.conditionId.startsWith(conditionId) || conditionId.startsWith(m.conditionId)))
    );
    if (found) market = found;
  }

  if (market?.yesTokenId) {
    return NextResponse.json({
      tokenId: side === 'yes' ? market.yesTokenId : market.noTokenId,
      negRisk: market.negRisk,
      tickSize: market.tickSize,
    });
  }

  // 2. Fall back to Gamma API — search all markets in the event
  try {
    // Try fetching the specific market by slug (conditionId as slug)
    const gammaRes = await fetch(
      `https://gamma-api.polymarket.com/markets/${conditionId}`
    );
    if (gammaRes.ok) {
      const gm = await gammaRes.json();
      const outcomes = typeof gm.outcomes === 'string' ? JSON.parse(gm.outcomes) : (gm.outcomes || []);
      const clobTokenIds = typeof gm.clobTokenIds === 'string' ? JSON.parse(gm.clobTokenIds) : (gm.clobTokenIds || []);

      if (outcomes.length >= 2 && clobTokenIds.length >= 2) {
        const yesIdx = outcomes.indexOf('Yes');
        const noIdx = outcomes.indexOf('No');
        const yesTokenId = yesIdx >= 0 ? clobTokenIds[yesIdx] : '';
        const noTokenId = noIdx >= 0 ? clobTokenIds[noIdx] : '';

        return NextResponse.json({
          tokenId: side === 'yes' ? yesTokenId : noTokenId,
          negRisk: gm.negRisk ?? false,
          tickSize: String(gm.orderPriceMinTickSize || gm.minimum_tick_size || '0.01'),
        });
      }
    }
  } catch (err) {
    console.error('[resolve-token] Gamma lookup failed:', err);
  }

  return NextResponse.json({ error: 'Could not resolve token ID' }, { status: 404 });
}
