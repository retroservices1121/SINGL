import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CLOB_API = 'https://clob.polymarket.com';

/**
 * GET: Check if a market condition has been resolved.
 */
export async function GET(req: NextRequest) {
  const conditionId = req.nextUrl.searchParams.get('conditionId');

  if (!conditionId) {
    return NextResponse.json({ error: 'conditionId required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${CLOB_API}/markets/${conditionId}`);
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
 * POST: Redeem winning positions through Polymarket's merge/redeem endpoint.
 * After a market resolves, winning CTF tokens can be redeemed for USDC.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conditionId, apiKey, apiSecret, passphrase, address } = body;

    if (!conditionId || !apiKey || !apiSecret || !passphrase || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Build L2 auth headers
    const timestamp = Math.floor(Date.now() / 1000);
    const endpoint = '/redeem';
    const data = { conditionId };
    const bodyStr = JSON.stringify(data);
    const message = `${timestamp}POST${endpoint}${bodyStr}`;

    const base64Secret = Buffer.from(apiSecret, 'base64');
    const hmac = crypto.createHmac('sha256', base64Secret);
    const sig = hmac.update(message).digest('base64');
    const sigUrlSafe = sig.replace(/\+/g, '-').replace(/\//g, '_');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'POLY_ADDRESS': address,
      'POLY_SIGNATURE': sigUrlSafe,
      'POLY_TIMESTAMP': `${timestamp}`,
      'POLY_API_KEY': apiKey,
      'POLY_PASSPHRASE': passphrase,
    };

    // Try the rewards/redeem endpoint
    const res = await fetch(`${CLOB_API}${endpoint}`, {
      method: 'POST',
      headers,
      body: bodyStr,
    });

    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[redeem] CLOB error:', res.status, responseData);
      return NextResponse.json(
        { error: responseData.error || `Redeem failed: ${res.status}`, data: responseData },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, ...responseData });
  } catch (err) {
    console.error('[redeem] Error:', err);
    const msg = err instanceof Error ? err.message : 'Redeem error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
