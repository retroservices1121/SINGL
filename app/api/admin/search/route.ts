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
      `${METADATA}/api/v1/search?q=${encodeURIComponent(q)}&limit=40&withNestedMarkets=true`,
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
      imageUrl: e.imageUrl,
      volume: e.volume,
      volume24h: e.volume24h,
      liquidity: e.liquidity,
      openInterest: e.openInterest,
      competition: e.competition,
      marketCount: Array.isArray(e.markets) ? (e.markets as unknown[]).length : 0,
      markets: Array.isArray(e.markets)
        ? (e.markets as Record<string, unknown>[]).slice(0, 50).map(m => ({
            ticker: m.ticker,
            title: m.yesSubTitle || m.subtitle || m.title,
            status: m.status,
            yesBid: m.yesBid,
            yesAsk: m.yesAsk,
            noBid: m.noBid,
            noAsk: m.noAsk,
            volume: m.volume,
            openInterest: m.openInterest,
            rulesPrimary: m.rulesPrimary,
            closeTime: m.closeTime,
            expirationTime: m.expirationTime,
          }))
        : [],
    }));

    // Sort: events with active markets first, then by active count descending
    interface MappedEvent {
      ticker: string;
      title: string;
      marketCount: number;
      markets: { status: string }[];
      [key: string]: unknown;
    }

    const sorted = (events as MappedEvent[])
      .map(e => {
        const activeCount = e.markets.filter(m => m.status !== 'finalized' && m.status !== 'settled').length;
        return { ...e, activeCount };
      })
      .sort((a, b) => b.activeCount - a.activeCount);

    return NextResponse.json({ events: sorted });
  } catch (err) {
    console.error('Admin search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
