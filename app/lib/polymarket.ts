import type { MarketData } from '@/app/types';

// Polymarket API base URLs
const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

// --- Gamma API types ---

interface PolymarketToken {
  token_id: string;
  outcome: string; // "Yes" or "No"
  price?: number;
  winner?: boolean;
}

interface PolymarketMarket {
  condition_id: string;
  question: string;
  description?: string;
  tokens?: PolymarketToken[];
  volume?: number;
  volume_24hr?: number;
  liquidity?: number;
  active?: boolean;
  closed?: boolean;
  end_date_iso?: string;
  slug?: string;
  neg_risk?: boolean;
  minimum_tick_size?: string;
  market_slug?: string;
}

interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  markets: PolymarketMarket[];
  volume?: number;
  volume_24hr?: number;
  liquidity?: number;
  active?: boolean;
  closed?: boolean;
  end_date_iso?: string;
}

interface GammaSearchResult {
  events?: PolymarketEvent[];
  markets?: PolymarketMarket[];
}

// --- Market data mapping ---

function mapMarketToData(market: PolymarketMarket, eventVolume?: number): MarketData | null {
  // Skip markets without tokens (multi-outcome markets without standard Yes/No)
  if (!market.tokens || !Array.isArray(market.tokens) || market.tokens.length === 0) {
    return null;
  }

  const yesToken = market.tokens.find(t => t.outcome === 'Yes');
  const noToken = market.tokens.find(t => t.outcome === 'No');

  // If no Yes/No tokens, skip (e.g. multi-outcome with named outcomes)
  if (!yesToken && !noToken) return null;

  const yesPrice = yesToken?.price ?? 0.5;
  const noPrice = noToken?.price ?? 0.5;

  return {
    id: market.condition_id,
    eventId: '',
    ticker: market.condition_id,
    title: market.question,
    yesPrice: Math.round(yesPrice * 100) / 100,
    noPrice: Math.round(noPrice * 100) / 100,
    volume: typeof market.volume === 'string' ? parseFloat(market.volume) : (market.volume ?? eventVolume ?? null),
    change24h: null,
    category: null,
    rulesPrimary: market.description ?? null,
    closeTime: market.end_date_iso ?? null,
    expirationTime: market.end_date_iso ?? null,
    conditionId: market.condition_id,
    yesTokenId: yesToken?.token_id ?? '',
    noTokenId: noToken?.token_id ?? '',
    negRisk: market.neg_risk ?? false,
    tickSize: market.minimum_tick_size ?? '0.01',
  };
}

// --- Public API functions ---

export async function searchMarkets(query: string): Promise<MarketData[]> {
  try {
    const res = await fetch(
      `${GAMMA_API}/public-search?q=${encodeURIComponent(query)}&limit_per_type=20`,
    );
    if (!res.ok) throw new Error(`Gamma search returned ${res.status}`);
    const data: GammaSearchResult = await res.json();

    const markets: MarketData[] = [];

    // Map event markets
    if (data.events) {
      for (const event of data.events) {
        for (const market of event.markets || []) {
          if (market.closed || !market.active) continue;
          const mapped = mapMarketToData(market, event.volume);
          if (mapped) markets.push(mapped);
        }
      }
    }

    // Map standalone markets
    if (data.markets) {
      for (const market of data.markets) {
        if (market.closed || !market.active) continue;
        const mapped = mapMarketToData(market);
        if (mapped) markets.push(mapped);
      }
    }

    return markets;
  } catch (err) {
    console.error('Polymarket search error:', err);
    return [];
  }
}

export async function getEventBySlug(slug: string): Promise<{ event: PolymarketEvent | null; markets: MarketData[] }> {
  try {
    const res = await fetch(`${GAMMA_API}/events/slug/${encodeURIComponent(slug)}`);
    if (!res.ok) return { event: null, markets: [] };
    const event: PolymarketEvent = await res.json();

    const markets = (event.markets || [])
      .filter(m => m.active && !m.closed)
      .map(m => mapMarketToData(m, event.volume))
      .filter((m): m is MarketData => m !== null);

    return { event, markets };
  } catch (err) {
    console.error('Polymarket event fetch error:', err);
    return { event: null, markets: [] };
  }
}

/**
 * Fetch ALL active NCAA March Madness markets from Polymarket.
 * Uses multiple search strategies to get comprehensive coverage.
 */
export async function getNCAAMarkets(): Promise<{ markets: MarketData[]; events: PolymarketEvent[] }> {
  const allEvents: PolymarketEvent[] = [];
  const seen = new Set<string>();
  const allMarkets: MarketData[] = [];

  // Strategy 1: Search for NCAA tournament markets
  const searchQueries = [
    'NCAA Tournament 2026',
    'March Madness',
    'NCAA Basketball',
    'Sweet 16',
    'Elite Eight',
    'Final Four',
  ];

  for (const query of searchQueries) {
    try {
      const res = await fetch(
        `${GAMMA_API}/public-search?q=${encodeURIComponent(query)}&limit_per_type=50`,
      );
      if (!res.ok) continue;
      const data: GammaSearchResult = await res.json();

      if (data.events) {
        for (const event of data.events) {
          if (event.closed || !event.active) continue;
          // Check if this is actually NCAA-related
          const titleLower = event.title.toLowerCase();
          const isNCAA = titleLower.includes('ncaa') ||
            titleLower.includes('march madness') ||
            titleLower.includes('sweet 16') || titleLower.includes('sweet sixteen') ||
            titleLower.includes('elite eight') || titleLower.includes('elite 8') ||
            titleLower.includes('final four') ||
            titleLower.includes('tournament winner') ||
            titleLower.includes('championship');

          if (!isNCAA) continue;

          allEvents.push(event);
          for (const market of event.markets || []) {
            if (market.closed || !market.active) continue;
            if (seen.has(market.condition_id)) continue;
            seen.add(market.condition_id);
            const mapped = mapMarketToData(market, event.volume);
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

  return { markets: allMarkets, events: allEvents };
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
    } else if (term === 'NCAA' || term === 'ncaab' || term.toLowerCase().includes('march madness') || term.toLowerCase().includes('ncaa')) {
      const result = await getNCAAMarkets();
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
