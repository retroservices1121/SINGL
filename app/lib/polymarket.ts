import type { MarketData } from '@/app/types';

// Polymarket API base URLs
const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

// NCAA Basketball tag IDs from Polymarket sports metadata
const NCAAB_TAGS = '1,100149,100639';
const NCAAB_SERIES = '39';

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
  tokens: PolymarketToken[];
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

function mapMarketToData(market: PolymarketMarket, eventVolume?: number): MarketData {
  const yesToken = market.tokens.find(t => t.outcome === 'Yes');
  const noToken = market.tokens.find(t => t.outcome === 'No');

  const yesPrice = yesToken?.price ?? 0.5;
  const noPrice = noToken?.price ?? 0.5;

  return {
    id: market.condition_id,
    eventId: '',
    ticker: market.condition_id,
    title: market.question,
    yesPrice: Math.round(yesPrice * 100) / 100,
    noPrice: Math.round(noPrice * 100) / 100,
    volume: market.volume ?? eventVolume ?? null,
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
          markets.push(mapMarketToData(market, event.volume));
        }
      }
    }

    // Map standalone markets
    if (data.markets) {
      for (const market of data.markets) {
        if (market.closed || !market.active) continue;
        markets.push(mapMarketToData(market));
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
      .map(m => mapMarketToData(m, event.volume));

    return { event, markets };
  } catch (err) {
    console.error('Polymarket event fetch error:', err);
    return { event: null, markets: [] };
  }
}

export async function getNCAAMarkets(): Promise<MarketData[]> {
  try {
    // Fetch active NCAA basketball events from Gamma API
    const params = new URLSearchParams({
      tag_id: NCAAB_TAGS.split(',')[0], // primary tag
      active: 'true',
      closed: 'false',
      order: 'volume_24hr',
      ascending: 'false',
      limit: '100',
    });

    const res = await fetch(`${GAMMA_API}/events?${params}`);
    if (!res.ok) throw new Error(`Gamma NCAA fetch returned ${res.status}`);
    const events: PolymarketEvent[] = await res.json();

    const markets: MarketData[] = [];
    for (const event of events) {
      for (const market of event.markets || []) {
        if (market.closed || !market.active) continue;
        markets.push(mapMarketToData(market, event.volume));
      }
    }

    // If tag-based search returns nothing, fall back to keyword search
    if (markets.length === 0) {
      return searchMarkets('NCAA March Madness basketball');
    }

    return markets;
  } catch (err) {
    console.error('Polymarket NCAA fetch error:', err);
    // Fall back to keyword search
    return searchMarkets('NCAA March Madness basketball');
  }
}

export async function getMarketsBySearchTerms(searchTerms: string[]): Promise<MarketData[]> {
  // Try each search term and collect unique markets
  const seen = new Set<string>();
  const allMarkets: MarketData[] = [];

  for (const term of searchTerms) {
    let markets: MarketData[];

    // Check if term looks like a Polymarket event slug
    if (term.startsWith('polymarket:')) {
      const slug = term.replace('polymarket:', '');
      const result = await getEventBySlug(slug);
      markets = result.markets;
    } else if (term === 'NCAA' || term === 'ncaab' || term.toLowerCase().includes('march madness')) {
      markets = await getNCAAMarkets();
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
