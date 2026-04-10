import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { redeemSpreddPosition } from '@/app/lib/spredd';

export const dynamic = 'force-dynamic';

/**
 * GET: Check if a market condition has been resolved.
 */
export async function GET(req: NextRequest) {
  const conditionId = req.nextUrl.searchParams.get('conditionId');

  if (!conditionId) {
    return NextResponse.json({ error: 'conditionId required' }, { status: 400 });
  }

  try {
    // Parse platform:market_id format
    const isCompound = conditionId.includes(':');
    const platform = isCompound ? conditionId.split(':')[0] : 'polymarket';
    const marketId = isCompound ? conditionId.split(':')[1] : conditionId;

    if (platform === 'polymarket') {
      const res = await fetch(`https://clob.polymarket.com/markets/${marketId}`);
      if (!res.ok) {
        return NextResponse.json({ error: 'Market not found' }, { status: 404 });
      }
      const market = await res.json();
      return NextResponse.json({
        conditionId,
        resolved: market.closed === true,
        active: market.active,
        closed: market.closed,
        endDate: market.end_date_iso,
      });
    }

    // For other platforms, return unknown status
    return NextResponse.json({
      conditionId,
      resolved: false,
      active: true,
      closed: false,
    });
  } catch (err) {
    console.error('[redeem] Error:', err);
    return NextResponse.json({ error: 'Failed to check market status' }, { status: 500 });
  }
}

/**
 * POST: Redeem winning positions via Spredd.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conditionId, walletAddress, privyUserId, outcome } = body;

    if (!conditionId) {
      return NextResponse.json({ error: 'conditionId is required' }, { status: 400 });
    }

    if (!walletAddress && !privyUserId) {
      return NextResponse.json({ error: 'walletAddress or privyUserId is required' }, { status: 400 });
    }

    // Look up Spredd account from DB
    const spreddAccount = await prisma.spreddAccount.findFirst({
      where: privyUserId
        ? { privyUserId }
        : { walletAddress },
    });

    if (!spreddAccount || !spreddAccount.apiKey || !spreddAccount.walletAddress) {
      return NextResponse.json({ error: 'Spredd trading account not found. Please ensure your wallet is initialized.' }, { status: 400 });
    }

    // Parse platform:market_id format
    const isCompound = conditionId.includes(':');
    const platform = isCompound ? conditionId.split(':')[0] : 'polymarket';
    const marketId = isCompound ? conditionId.split(':')[1] : conditionId;

    const result = await redeemSpreddPosition({
      platform,
      market_id: marketId,
      outcome: outcome || 'yes',
      wallet_address: spreddAccount.walletAddress,
      private_key: spreddAccount.apiKey,
    });

    return NextResponse.json({ success: true, method: 'redeem', ...result });
  } catch (err) {
    console.error('[redeem] Error:', err);
    const msg = err instanceof Error ? err.message : 'Redeem error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
