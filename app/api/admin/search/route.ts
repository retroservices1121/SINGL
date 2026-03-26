import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GAMMA_API = 'https://gamma-api.polymarket.com';

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

interface PolymarketToken {
  token_id: string;
  outcome: string;
  price?: number;
}

interface PolymarketMarket {
  condition_id: string;
  question: string;
  active?: boolean;
  closed?: boolean;
  tokens: PolymarketToken[];
  volume?: number;
  description?: string;
  end_date_iso?: string;
  neg_risk?: boolean;
  minimum_tick_size?: string;
}

interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  volume?: number;
  volume_24hr?: number;
  liquidity?: number;
  active?: boolean;
  closed?: boolean;
  markets: PolymarketMarket[];
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) {
    return NextResponse.json({ events: [] });
  }

  try {
    const res = await fetch(
      `${GAMMA_API}/public-search?q=${encodeURIComponent(q)}&limit_per_type=40`,
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Polymarket returned ${res.status}` }, { status: 502 });
    }
    const data: { events?: PolymarketEvent[] } = await res.json();

    const events = (data.events || []).map(e => {
      const activeMarkets = (e.markets || []).filter(m => m.active && !m.closed);
      return {
        ticker: e.slug,
        title: e.title,
        subtitle: e.description?.slice(0, 120),
        volume: e.volume,
        volume24h: e.volume_24hr,
        liquidity: e.liquidity,
        marketCount: activeMarkets.length,
        activeCount: activeMarkets.length,
        markets: activeMarkets.slice(0, 50).map(m => {
          const yesToken = m.tokens?.find(t => t.outcome === 'Yes');
          const noToken = m.tokens?.find(t => t.outcome === 'No');
          return {
            ticker: m.condition_id,
            conditionId: m.condition_id,
            title: m.question,
            yesPrice: yesToken?.price ?? 0.5,
            noPrice: noToken?.price ?? 0.5,
            volume: m.volume,
            rulesPrimary: m.description,
            closeTime: m.end_date_iso,
            yesTokenId: yesToken?.token_id || '',
            noTokenId: noToken?.token_id || '',
            negRisk: m.neg_risk ?? false,
            tickSize: m.minimum_tick_size || '0.01',
          };
        }),
      };
    });

    // Sort by active market count descending
    events.sort((a, b) => b.activeCount - a.activeCount);

    return NextResponse.json({ events });
  } catch (err) {
    console.error('Admin search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
