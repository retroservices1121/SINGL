import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLOB_API = 'https://clob.polymarket.com';

/**
 * Server-side proxy for Polymarket CLOB API calls.
 * The CLOB API only allows CORS from polymarket.com, so all calls
 * from our frontend must be proxied through our server.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, method, headers: clientHeaders, data } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
    }

    const url = `${CLOB_API}${endpoint}`;

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward Polymarket auth headers
    if (clientHeaders) {
      for (const [key, value] of Object.entries(clientHeaders)) {
        if (typeof value === 'string') {
          fetchHeaders[key] = value;
        }
      }
    }

    const res = await fetch(url, {
      method: method || 'POST',
      headers: fetchHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
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
