import type { MarketData } from '@/app/types';

/**
 * Spredd Terminal API client
 * Aggregates markets from multiple platforms including Limitless
 * Docs: https://docs.spreddterminal.com
 */

const SPREDD_API = 'https://api.spreddterminal.com/v1';

function getApiKey(): string {
  return process.env.SPREDD_API_KEY || '';
}

function headers(): Record<string, string> {
  const key = getApiKey();
  return {
    'X-API-Key': key,
    'Content-Type': 'application/json',
  };
}

// ── Types from Spredd API ────────────────────────────────────────────────────

interface SpreddMarket {
  market_id: string;
  platform: string;
  title: string;
  description?: string;
  category?: string;
  yes_price: number;
  no_price: number;
  volume?: number;
  volume_24h?: number;
  liquidity?: number;
  end_date?: string;
  is_active?: boolean;
  chain?: string;
  collateral_token?: string;
  outcomes?: Record<string, number>;
  url?: string;
}

interface SpreddMarketsResponse {
  data?: SpreddMarket[];
  markets?: SpreddMarket[];
  // Feed endpoint format
  data_timestamp?: string;
}

// ── Mapping ──────────────────────────────────────────────────────────────────

function mapSpreddMarket(m: SpreddMarket): MarketData {
  // Parse outcomes if available — for multi-outcome markets
  let outcomeName: string | null = null;
  let outcome2Name: string | null = null;
  if (m.outcomes) {
    const keys = Object.keys(m.outcomes);
    if (keys.length >= 2 && !keys.includes('Yes') && !keys.includes('No')) {
      outcomeName = keys[0];
      outcome2Name = keys[1];
    }
  }

  return {
    id: `${m.platform}:${m.market_id}`,
    eventId: '',
    ticker: `${m.platform}:${m.market_id}`,
    title: m.title,
    yesPrice: Math.round(m.yes_price * 100) / 100,
    noPrice: Math.round(m.no_price * 100) / 100,
    volume: m.volume || m.volume_24h || null,
    change24h: null,
    category: m.category || null,
    rulesPrimary: m.description ?? null,
    closeTime: m.end_date || null,
    expirationTime: m.end_date || null,
    conditionId: `${m.platform}:${m.market_id}`,
    yesTokenId: '',
    noTokenId: '',
    negRisk: false,
    tickSize: '0.01',
    outcomeName,
    outcome2Name,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Search markets across all Spredd-supported platforms
 */
export async function searchSpreddMarkets(query: string, platform?: string): Promise<MarketData[]> {
  const key = getApiKey();
  if (!key) return []; // No API key configured, skip silently

  try {
    const params = new URLSearchParams({
      search: query,
      active: 'true',
      limit: '100',
    });
    if (platform) params.set('platform', platform);

    const res = await fetch(`${SPREDD_API}/markets?${params}`, { headers: headers() });
    if (!res.ok) {
      console.error(`Spredd search returned ${res.status}`);
      return [];
    }

    const data: SpreddMarketsResponse = await res.json();
    const markets = data.data || data.markets || [];

    return markets
      .filter(m => m.is_active !== false)
      .map(mapSpreddMarket);
  } catch (err) {
    console.error('Spredd search error:', err);
    return [];
  }
}

/**
 * Get a specific market from a specific platform
 */
export async function getSpreddMarket(platform: string, marketId: string): Promise<MarketData | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const res = await fetch(`${SPREDD_API}/markets/${platform}/${marketId}`, { headers: headers() });
    if (!res.ok) return null;
    const m: SpreddMarket = await res.json();
    return mapSpreddMarket(m);
  } catch {
    return null;
  }
}

/**
 * Get order book for a market
 */
export async function getSpreddOrderBook(platform: string, marketId: string, outcome: 'yes' | 'no' = 'yes'): Promise<{
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  spread: number;
} | null> {
  const key = getApiKey();
  if (!key) return null;

  try {
    const res = await fetch(`${SPREDD_API}/markets/${platform}/${marketId}/orderbook?outcome=${outcome}`, { headers: headers() });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Get price history for sparkline
 */
export async function getSpreddPriceHistory(platform: string, marketId: string, interval: '1h' | '6h' | '1d' | '1w' | '1m' = '1d'): Promise<number[]> {
  const key = getApiKey();
  if (!key) return [];

  try {
    const res = await fetch(`${SPREDD_API}/markets/${platform}/${marketId}/price-history?interval=${interval}`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json();
    // Extract yes prices from history
    if (Array.isArray(data)) {
      return data.map((d: { yes_price?: number; price?: number }) => d.yes_price || d.price || 0);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch World Cup markets from Limitless via Spredd
 */
export async function getLimitlessWorldCupMarkets(): Promise<{ markets: MarketData[]; totalVolume: number }> {
  const key = getApiKey();
  if (!key) return { markets: [], totalVolume: 0 };

  const seen = new Set<string>();
  const allMarkets: MarketData[] = [];

  const queries = [
    'World Cup',
    'FIFA 2026',
    'World Cup Winner',
    'World Cup Group',
    'Golden Boot',
    'World Cup Final',
  ];

  // Search Limitless platform specifically
  for (const query of queries) {
    try {
      const markets = await searchSpreddMarkets(query, 'limitless');
      for (const m of markets) {
        if (!seen.has(m.conditionId)) {
          seen.add(m.conditionId);
          allMarkets.push(m);
        }
      }
    } catch (err) {
      console.error(`Limitless search error for "${query}":`, err);
    }
  }

  // Also search across all platforms for World Cup markets
  for (const query of ['FIFA World Cup 2026', 'World Cup Winner 2026']) {
    try {
      const markets = await searchSpreddMarkets(query);
      for (const m of markets) {
        if (!seen.has(m.conditionId)) {
          seen.add(m.conditionId);
          allMarkets.push(m);
        }
      }
    } catch (err) {
      console.error(`Spredd all-platform search error for "${query}":`, err);
    }
  }

  allMarkets.sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const totalVolume = allMarkets.reduce((sum, m) => sum + (m.volume || 0), 0);

  return { markets: allMarkets, totalVolume };
}

/**
 * Find arbitrage opportunities across platforms for World Cup markets
 */
export async function getWorldCupArbitrage(): Promise<Array<{
  title: string;
  outcome: string;
  buyPlatform: string;
  buyPrice: number;
  sellPlatform: string;
  sellPrice: number;
  spread: number;
  spreadPct: number;
}>> {
  const key = getApiKey();
  if (!key) return [];

  try {
    const res = await fetch(`${SPREDD_API}/arbitrage?min_spread=0.02&limit=50`, { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json();

    // Filter for World Cup related
    const wcKeywords = ['world cup', 'fifa', 'golden boot', 'golden ball'];
    return (data || [])
      .filter((a: { market_title: string }) =>
        wcKeywords.some(k => a.market_title.toLowerCase().includes(k))
      )
      .map((a: {
        market_title: string; outcome: string;
        buy_platform: string; buy_price: number;
        sell_platform: string; sell_price: number;
        spread: number; spread_pct: number;
      }) => ({
        title: a.market_title,
        outcome: a.outcome,
        buyPlatform: a.buy_platform,
        buyPrice: a.buy_price,
        sellPlatform: a.sell_platform,
        sellPrice: a.sell_price,
        spread: a.spread,
        spreadPct: a.spread_pct,
      }));
  } catch {
    return [];
  }
}
