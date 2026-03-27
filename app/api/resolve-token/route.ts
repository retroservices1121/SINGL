import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

const CLOB_URL = 'https://clob.polymarket.com';

async function fetchClobMeta(tokenId: string): Promise<{ neg_risk: boolean; tick_size: string; min_order_size: number } | null> {
  try {
    const res = await fetch(`${CLOB_URL}/book?token_id=${tokenId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      neg_risk: data.neg_risk ?? false,
      tick_size: data.tick_size ?? '0.01',
      min_order_size: parseFloat(data.min_order_size) || 1,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves a conditionId + side to the correct CLOB token ID.
 * First checks the DB, then falls back to the Gamma API.
 * Also fetches min_order_size, negRisk, tickSize from CLOB order book.
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
    const tokenId = side === 'yes' ? market.yesTokenId : market.noTokenId;
    const clobMeta = tokenId ? await fetchClobMeta(tokenId) : null;
    return NextResponse.json({
      tokenId,
      negRisk: clobMeta?.neg_risk ?? market.negRisk,
      tickSize: clobMeta?.tick_size ?? market.tickSize,
      minOrderSize: clobMeta?.min_order_size ?? 1,
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

        const resolvedTokenId = side === 'yes' ? yesTokenId : noTokenId;
        const clobMeta = resolvedTokenId ? await fetchClobMeta(resolvedTokenId) : null;
        return NextResponse.json({
          tokenId: resolvedTokenId,
          negRisk: clobMeta?.neg_risk ?? gm.negRisk ?? false,
          tickSize: clobMeta?.tick_size ?? String(gm.orderPriceMinTickSize || gm.minimum_tick_size || '0.01'),
          minOrderSize: clobMeta?.min_order_size ?? 1,
        });
      }
    }
  } catch (err) {
    console.error('[resolve-token] Gamma lookup failed:', err);
  }

  return NextResponse.json({ error: 'Could not resolve token ID' }, { status: 404 });
}
