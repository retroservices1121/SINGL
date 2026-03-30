import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

const SYNTHESIS_ACCOUNT_BASE = 'https://synthesis.trade';

/**
 * GET: Check if a market condition has been resolved.
 */
export async function GET(req: NextRequest) {
  const conditionId = req.nextUrl.searchParams.get('conditionId');

  if (!conditionId) {
    return NextResponse.json({ error: 'conditionId required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://clob.polymarket.com/markets/${conditionId}`);
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
  } catch (err) {
    console.error('[redeem] Error:', err);
    return NextResponse.json({ error: 'Failed to check market status' }, { status: 500 });
  }
}

/**
 * POST: Redeem winning positions via Synthesis.
 * Looks up the user's Synthesis account from DB and calls the Synthesis redeem endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conditionId, walletAddress, privyUserId } = body;

    if (!conditionId) {
      return NextResponse.json({ error: 'conditionId is required' }, { status: 400 });
    }

    if (!walletAddress && !privyUserId) {
      return NextResponse.json({ error: 'walletAddress or privyUserId is required' }, { status: 400 });
    }

    // Look up Synthesis account from DB
    const synthAccount = await prisma.synthesisAccount.findFirst({
      where: privyUserId
        ? { privyUserId }
        : { walletAddress },
    });

    if (!synthAccount || !synthAccount.apiKey || !synthAccount.walletId) {
      return NextResponse.json({ error: 'Synthesis trading account not found. Please ensure your wallet is initialized.' }, { status: 400 });
    }

    // Try Synthesis merge/redeem endpoint
    const redeemRes = await fetch(
      `${SYNTHESIS_ACCOUNT_BASE}/api/v1/wallet/pol/${synthAccount.walletId}/redeem`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': synthAccount.apiKey,
        },
        body: JSON.stringify({ condition_id: conditionId }),
      },
    );

    const redeemData = await redeemRes.json().catch(() => ({}));

    if (!redeemRes.ok) {
      // If Synthesis doesn't support /redeem, try /merge
      const mergeRes = await fetch(
        `${SYNTHESIS_ACCOUNT_BASE}/api/v1/wallet/pol/${synthAccount.walletId}/merge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': synthAccount.apiKey,
          },
          body: JSON.stringify({ condition_id: conditionId }),
        },
      );

      const mergeData = await mergeRes.json().catch(() => ({}));

      if (!mergeRes.ok) {
        console.error('[redeem] Synthesis redeem/merge failed:', redeemRes.status, redeemData, mergeRes.status, mergeData);
        return NextResponse.json(
          { error: mergeData.error || redeemData.error || `Redeem failed. The market may not be resolved yet.`, debug: { redeemStatus: redeemRes.status, mergeStatus: mergeRes.status } },
          { status: 400 },
        );
      }

      return NextResponse.json({ success: true, method: 'merge', ...mergeData });
    }

    return NextResponse.json({ success: true, method: 'redeem', ...redeemData });
  } catch (err) {
    console.error('[redeem] Error:', err);
    const msg = err instanceof Error ? err.message : 'Redeem error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
