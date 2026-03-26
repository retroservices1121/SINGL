import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLOB_API = 'https://clob.polymarket.com';

/**
 * Check if a market condition has been resolved and get redemption info.
 * Users can redeem winning shares after a market resolves.
 */
export async function GET(req: NextRequest) {
  const conditionId = req.nextUrl.searchParams.get('conditionId');

  if (!conditionId) {
    return NextResponse.json({ error: 'conditionId required' }, { status: 400 });
  }

  try {
    // Check market status from Polymarket
    const res = await fetch(`${CLOB_API}/markets/${conditionId}`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    const market = await res.json();

    return NextResponse.json({
      conditionId,
      resolved: market.closed || market.end_date_iso ? new Date(market.end_date_iso) < new Date() : false,
      active: market.active,
      closed: market.closed,
      endDate: market.end_date_iso,
    });
  } catch (err) {
    console.error('[redeem] Error:', err);
    return NextResponse.json({ error: 'Failed to check market status' }, { status: 500 });
  }
}
