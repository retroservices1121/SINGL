import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CLOB_API = 'https://clob.polymarket.com';

/**
 * Server-side proxy for Polymarket CLOB API calls.
 * Builds L2 HMAC auth headers server-side since:
 * 1. CLOB API only allows CORS from polymarket.com
 * 2. Browser can't use Node.js crypto for HMAC signing
 */
function buildL2Headers(
  apiKey: string,
  apiSecret: string,
  passphrase: string,
  method: string,
  path: string,
  body: string,
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = timestamp + method.toUpperCase() + path + body;

  const hmac = crypto.createHmac('sha256', Buffer.from(apiSecret, 'base64'));
  hmac.update(message);
  const signature = hmac.digest('base64');

  return {
    'POLY_API_KEY': apiKey,
    'POLY_TIMESTAMP': timestamp,
    'POLY_PASSPHRASE': passphrase,
    'POLY_SIGNATURE': signature,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, method, data, apiKey, apiSecret, passphrase } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
    }

    const url = `${CLOB_API}${endpoint}`;
    const httpMethod = (method || 'POST').toUpperCase();
    const bodyStr = data ? JSON.stringify(data) : '';

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Build L2 HMAC auth headers if credentials provided
    if (apiKey && apiSecret && passphrase) {
      const authHeaders = buildL2Headers(apiKey, apiSecret, passphrase, httpMethod, endpoint, bodyStr);
      Object.assign(fetchHeaders, authHeaders);
    }

    const res = await fetch(url, {
      method: httpMethod,
      headers: fetchHeaders,
      body: bodyStr || undefined,
    });

    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[clob proxy] Error:', res.status, responseData);
      return NextResponse.json(
        { error: responseData.error || `CLOB API returned ${res.status}`, data: responseData },
        { status: res.status }
      );
    }

    return NextResponse.json(responseData);
  } catch (err) {
    console.error('[clob proxy] Error:', err);
    const msg = err instanceof Error ? err.message : 'Proxy error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
