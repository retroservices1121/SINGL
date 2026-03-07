import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const METADATA = process.env.NEXT_PUBLIC_DFLOW_METADATA_URL || 'https://c.prediction-markets-api.dflow.net';

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) {
    return NextResponse.json({ events: [] });
  }

  const headers: Record<string, string> = {};
  if (process.env.DFLOW_API_KEY) {
    headers['x-api-key'] = process.env.DFLOW_API_KEY;
  }

  try {
    const res = await fetch(
      `${METADATA}/api/v1/search?q=${encodeURIComponent(q)}&limit=20&withNestedMarkets=true`,
      { headers }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `DFlow returned ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    const events = (data.events || []).map((e: Record<string, unknown>) => ({
      ticker: e.ticker,
      title: e.title,
      subtitle: e.subtitle,
      volume: e.volume,
      marketCount: Array.isArray(e.markets) ? (e.markets as unknown[]).length : 0,
      markets: Array.isArray(e.markets)
        ? (e.markets as Record<string, unknown>[]).slice(0, 10).map(m => ({
            ticker: m.ticker,
            title: m.yesSubTitle || m.subtitle || m.title,
            status: m.status,
            yesBid: m.yesBid,
            yesAsk: m.yesAsk,
          }))
        : [],
    }));

    return NextResponse.json({ events });
  } catch (err) {
    console.error('Admin search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
