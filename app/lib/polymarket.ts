import type { MarketData } from '@/app/types';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

// Gamma API returns markets in this format from public-search
interface GammaMarket {
  id?: string;
  question: string;
  conditionId?: string;
  condition_id?: string;
  description?: string;
  outcomes?: string; // JSON string like '["Yes","No"]'
  outcomePrices?: string; // JSON string like '["0.5","0.5"]'
  clobTokenIds?: string; // JSON string like '["123","456"]'
  tokens?: Array<{ token_id: string; outcome: string; price?: number }>;
  volume?: number | string;
  volume_24hr?: number | string;
  liquidity?: number | string;
  active?: boolean;
  closed?: boolean;
  endDateIso?: string;
  end_date_iso?: string;
  slug?: string;
  negRisk?: boolean;
  neg_risk?: boolean;
  orderPriceMinTickSize?: number | string;
  minimum_tick_size?: string;
  bestBid?: number | string;
  bestAsk?: number | string;
}

interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  markets: GammaMarket[];
  volume?: number | string;
  volume_24hr?: number | string;
  liquidity?: number | string;
  active?: boolean;
  closed?: boolean;
}

function parseJsonArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function parseNum(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(val) || 0;
}

function mapGammaMarket(m: GammaMarket, eventVolume?: number | string): MarketData | null {
  // Parse outcomes, prices, and token IDs
  const outcomes = parseJsonArray(m.outcomes);
  const prices = parseJsonArray(m.outcomePrices);
  const tokenIds = parseJsonArray(m.clobTokenIds);

  // Also support old format with tokens array
  let yesPrice = 0, noPrice = 0, yesTokenId = '', noTokenId = '';

  if (m.tokens && Array.isArray(m.tokens) && m.tokens.length > 0) {
    const yesToken = m.tokens.find(t => t.outcome === 'Yes');
    const noToken = m.tokens.find(t => t.outcome === 'No');
    if (!yesToken && !noToken) return null;
    yesPrice = yesToken?.price ?? 0.5;
    noPrice = noToken?.price ?? 0.5;
    yesTokenId = yesToken?.token_id ?? '';
    noTokenId = noToken?.token_id ?? '';
  } else if (outcomes.length >= 2 && prices.length >= 2) {
    let yesIdx = outcomes.indexOf('Yes');
    let noIdx = outcomes.indexOf('No');

    // Game matchup markets use team names as outcomes (e.g., ["Illinois", "Iowa"])
    // Treat the first outcome as "Yes" and second as "No"
    if (yesIdx === -1 && noIdx === -1 && outcomes.length === 2) {
      yesIdx = 0;
      noIdx = 1;
    }

    if (yesIdx === -1 && noIdx === -1) return null;
    yesPrice = yesIdx >= 0 ? parseNum(prices[yesIdx]) : 0;
    noPrice = noIdx >= 0 ? parseNum(prices[noIdx]) : 0;
    yesTokenId = yesIdx >= 0 && tokenIds[yesIdx] ? tokenIds[yesIdx] : '';
    noTokenId = noIdx >= 0 && tokenIds[noIdx] ? tokenIds[noIdx] : '';
  } else {
    // No usable price data
    return null;
  }

  const conditionId = m.conditionId || m.condition_id || m.id || '';
  const vol = parseNum(m.volume) || parseNum(eventVolume);

  // For game matchups, pass through the actual outcome names (team names)
  const isStandardYesNo = outcomes.includes('Yes') && outcomes.includes('No');
  const outcomeName = !isStandardYesNo && outcomes.length >= 1 ? outcomes[0] : null;
  const outcome2Name = !isStandardYesNo && outcomes.length >= 2 ? outcomes[1] : null;

  return {
    id: conditionId,
    eventId: '',
    ticker: conditionId,
    title: m.question,
    yesPrice: Math.round(yesPrice * 100) / 100,
    noPrice: Math.round(noPrice * 100) / 100,
    volume: vol || null,
    change24h: null,
    category: null,
    rulesPrimary: m.description ?? null,
    closeTime: m.endDateIso || m.end_date_iso || null,
    expirationTime: m.endDateIso || m.end_date_iso || null,
    conditionId,
    yesTokenId,
    noTokenId,
    negRisk: m.negRisk ?? m.neg_risk ?? false,
    tickSize: String(m.orderPriceMinTickSize || m.minimum_tick_size || '0.01'),
    outcomeName,
    outcome2Name,
  };
}

// --- Public API functions ---

export async function searchMarkets(query: string): Promise<MarketData[]> {
  try {
    const res = await fetch(
      `${GAMMA_API}/public-search?q=${encodeURIComponent(query)}&limit_per_type=50`,
    );
    if (!res.ok) throw new Error(`Gamma search returned ${res.status}`);
    const data = await res.json();

    const markets: MarketData[] = [];

    if (data.events) {
      for (const event of data.events) {
        for (const market of event.markets || []) {
          if (market.closed || !market.active) continue;
          const mapped = mapGammaMarket(market, event.volume);
          if (mapped) markets.push(mapped);
        }
      }
    }

    if (data.markets) {
      for (const market of data.markets) {
        if (market.closed || !market.active) continue;
        const mapped = mapGammaMarket(market);
        if (mapped) markets.push(mapped);
      }
    }

    return markets;
  } catch (err) {
    console.error('Polymarket search error:', err);
    return [];
  }
}

export async function getEventBySlug(slug: string): Promise<{ event: GammaEvent | null; markets: MarketData[] }> {
  try {
    const res = await fetch(`${GAMMA_API}/events/slug/${encodeURIComponent(slug)}`);
    if (!res.ok) return { event: null, markets: [] };
    const event: GammaEvent = await res.json();

    const markets = (event.markets || [])
      .filter(m => m.active && !m.closed)
      .map(m => mapGammaMarket(m, event.volume))
      .filter((m): m is MarketData => m !== null);

    return { event, markets };
  } catch (err) {
    console.error('Polymarket event fetch error:', err);
    return { event: null, markets: [] };
  }
}

/**
 * Fetch ALL active NCAA March Madness markets from Polymarket.
 */
export async function getNCAAMarkets(): Promise<{ markets: MarketData[]; totalVolume: number }> {
  const seen = new Set<string>();
  const allMarkets: MarketData[] = [];

  const searchQueries = [
    'NCAA Tournament 2026',
    'March Madness 2026',
    'NCAA Basketball Championship',
    'Sweet 16 2026',
    'Elite Eight 2026',
    'Final Four 2026',
    'NCAA Tournament Winner',
  ];

  // Individual game event slugs on Polymarket (these don't show up in text
  // searches because their titles are team names, not "NCAA"/"March Madness").
  const gameSlugs = [
    // Elite 8 — Saturday 3/28
    'cbb-ill-iowa-2026-03-28',    // (3) Illinois vs (9) Iowa — South
    'cbb-pur-arz-2026-03-28',     // (2) Purdue vs (1) Arizona — West
    // Elite 8 — Sunday 3/29
    'cbb-uconn-duke-2026-03-29',  // (2) UConn vs (1) Duke — East
    'cbb-tenn-mich-2026-03-29',   // (6) Tennessee vs (1) Michigan — Midwest
  ];

  // 1. Fetch game matchup markets by slug (live from Gamma API)
  for (const slug of gameSlugs) {
    try {
      const { markets } = await getEventBySlug(slug);
      for (const m of markets) {
        if (!seen.has(m.conditionId)) {
          seen.add(m.conditionId);
          allMarkets.push(m);
        }
      }
    } catch (err) {
      console.error(`NCAA game slug fetch error for "${slug}":`, err);
    }
  }

  // 2. Fetch broader tournament markets via text search
  for (const query of searchQueries) {
    try {
      const res = await fetch(
        `${GAMMA_API}/public-search?q=${encodeURIComponent(query)}&limit_per_type=50`,
      );
      if (!res.ok) continue;
      const data = await res.json();

      if (data.events) {
        for (const event of data.events) {
          if (event.closed || !event.active) continue;
          const titleLower = (event.title || '').toLowerCase();
          const isNCAA = titleLower.includes('ncaa') ||
            titleLower.includes('march madness') ||
            titleLower.includes('sweet 16') || titleLower.includes('sweet sixteen') ||
            titleLower.includes('elite eight') || titleLower.includes('elite 8') ||
            titleLower.includes('final four') ||
            titleLower.includes('tournament');

          if (!isNCAA) continue;

          for (const market of event.markets || []) {
            if (market.closed || !market.active) continue;
            const key = market.conditionId || market.condition_id || market.id || market.question;
            if (seen.has(key)) continue;
            seen.add(key);
            const mapped = mapGammaMarket(market, event.volume);
            if (mapped) allMarkets.push(mapped);
          }
        }
      }
    } catch (err) {
      console.error(`NCAA search error for "${query}":`, err);
    }
  }

  // Sort by volume descending
  allMarkets.sort((a, b) => (b.volume || 0) - (a.volume || 0));

  const totalVolume = allMarkets.reduce((sum, m) => sum + (m.volume || 0), 0);

  return { markets: allMarkets, totalVolume };
}

/**
 * Fetch ALL active FIFA World Cup 2026 markets from Polymarket.
 */
export async function getFIFAWorldCupMarkets(): Promise<{ markets: MarketData[]; totalVolume: number }> {
  const seen = new Set<string>();
  const allMarkets: MarketData[] = [];

  const searchQueries = [
    'FIFA World Cup 2026',
    'World Cup Winner 2026',
    'World Cup Group',
    'World Cup Golden Boot',
    'World Cup Golden Ball',
    'World Cup knockout',
    'World Cup quarter-final',
    'World Cup semi-final',
    'World Cup final 2026',
    'FIFA 2026',
  ];

  // Event slugs for specific World Cup markets on Polymarket
  const eventSlugs = [
    'fifa-world-cup-2026-winner',
    'fifa-world-cup-2026',
    'world-cup-2026-winner',
    '2026-world-cup',
  ];

  // 1. Fetch by event slug
  for (const slug of eventSlugs) {
    try {
      const { markets } = await getEventBySlug(slug);
      for (const m of markets) {
        if (!seen.has(m.conditionId)) {
          seen.add(m.conditionId);
          allMarkets.push(m);
        }
      }
    } catch (err) {
      console.error(`FIFA event slug fetch error for "${slug}":`, err);
    }
  }

  // 2. Fetch via text search
  for (const query of searchQueries) {
    try {
      const res = await fetch(
        `${GAMMA_API}/public-search?q=${encodeURIComponent(query)}&limit_per_type=50`,
      );
      if (!res.ok) continue;
      const data = await res.json();

      if (data.events) {
        for (const event of data.events) {
          if (event.closed || !event.active) continue;
          const titleLower = (event.title || '').toLowerCase();
          const isWC = titleLower.includes('world cup') ||
            titleLower.includes('fifa') ||
            titleLower.includes('golden boot') ||
            titleLower.includes('golden ball');

          if (!isWC) continue;

          for (const market of event.markets || []) {
            if (market.closed || !market.active) continue;
            const key = market.conditionId || market.condition_id || market.id || market.question;
            if (seen.has(key)) continue;
            seen.add(key);
            const mapped = mapGammaMarket(market, event.volume);
            if (mapped) allMarkets.push(mapped);
          }
        }
      }

      if (data.markets) {
        for (const market of data.markets) {
          if (market.closed || !market.active) continue;
          const key = market.conditionId || market.condition_id || market.id || market.question;
          if (seen.has(key)) continue;
          seen.add(key);
          const mapped = mapGammaMarket(market);
          if (mapped) allMarkets.push(mapped);
        }
      }
    } catch (err) {
      console.error(`FIFA search error for "${query}":`, err);
    }
  }

  allMarkets.sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const totalVolume = allMarkets.reduce((sum, m) => sum + (m.volume || 0), 0);

  return { markets: allMarkets, totalVolume };
}

export async function getMarketsBySearchTerms(searchTerms: string[]): Promise<MarketData[]> {
  const seen = new Set<string>();
  const allMarkets: MarketData[] = [];

  for (const term of searchTerms) {
    let markets: MarketData[];

    if (term.startsWith('polymarket:')) {
      const slug = term.replace('polymarket:', '');
      const result = await getEventBySlug(slug);
      markets = result.markets;
    } else if (term.toLowerCase().includes('ncaa') || term.toLowerCase().includes('march madness')) {
      const result = await getNCAAMarkets();
      markets = result.markets;
    } else if (term.toLowerCase().includes('world cup') || term.toLowerCase().includes('fifa')) {
      const result = await getFIFAWorldCupMarkets();
      markets = result.markets;
    } else {
      markets = await searchMarkets(term);
    }

    for (const m of markets) {
      if (!seen.has(m.conditionId)) {
        seen.add(m.conditionId);
        allMarkets.push(m);
      }
    }
  }

  return allMarkets;
}

export async function getMarketPrices(tokenId: string): Promise<{ price: number; midpoint: number } | null> {
  try {
    const res = await fetch(`${CLOB_API}/price?token_id=${tokenId}&side=buy`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      price: parseFloat(data.price || '0'),
      midpoint: parseFloat(data.midpoint || '0'),
    };
  } catch {
    return null;
  }
}

export async function getOrderBook(tokenId: string): Promise<{
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
} | null> {
  try {
    const res = await fetch(`${CLOB_API}/book?token_id=${tokenId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      bids: (data.bids || []).map((b: { price: string; size: string }) => ({
        price: parseFloat(b.price),
        size: parseFloat(b.size),
      })),
      asks: (data.asks || []).map((a: { price: string; size: string }) => ({
        price: parseFloat(a.price),
        size: parseFloat(a.size),
      })),
    };
  } catch {
    return null;
  }
}
