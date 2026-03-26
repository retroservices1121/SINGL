import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CLOB_API = 'https://clob.polymarket.com';

/**
 * Builds L2 HMAC auth headers matching Polymarket's SDK format.
 * Signature must be URL-safe base64: '+' → '-', '/' → '_'
 */
function buildL2Headers(
  apiKey: string,
  apiSecret: string,
  passphrase: string,
  address: string,
  method: string,
  path: string,
  body: string,
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  // Message format: timestamp (number) + METHOD + path + body
  let message = `${timestamp}${method.toUpperCase()}${path}`;
  if (body) {
    message += body;
  }

  const base64Secret = Buffer.from(apiSecret, 'base64');
  const hmac = crypto.createHmac('sha256', base64Secret);
  const sig = hmac.update(message).digest('base64');

  // URL-safe base64 (keep '=' padding)
  const sigUrlSafe = sig.replace(/\+/g, '-').replace(/\//g, '_');

  return {
    'POLY_ADDRESS': address,
    'POLY_SIGNATURE': sigUrlSafe,
    'POLY_TIMESTAMP': `${timestamp}`,
    'POLY_API_KEY': apiKey,
    'POLY_PASSPHRASE': passphrase,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, method, data, apiKey, apiSecret, passphrase, address } = body;

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
    if (apiKey && apiSecret && passphrase && address) {
      const authHeaders = buildL2Headers(apiKey, apiSecret, passphrase, address, httpMethod, endpoint, bodyStr);
      Object.assign(fetchHeaders, authHeaders);
    }

    console.log(`[clob proxy] ${httpMethod} ${endpoint} (body: ${bodyStr.length} bytes)`);

    const res = await fetch(url, {
      method: httpMethod,
      headers: fetchHeaders,
      body: bodyStr || undefined,
    });

    const responseText = await res.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!res.ok) {
      console.error('[clob proxy] Error:', res.status, responseData);
      return NextResponse.json(
        { error: responseData.error || responseData.raw || `CLOB API returned ${res.status}`, data: responseData },
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
