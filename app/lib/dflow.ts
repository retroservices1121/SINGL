import type { MarketData, KYCStatus, TradeParams } from '@/app/types';

// DFlow API base URLs
// Metadata API: market discovery, search, events, prices
// Trade API: quotes, swaps, orders
const METADATA = process.env.NEXT_PUBLIC_DFLOW_METADATA_URL || 'https://c.prediction-markets-api.dflow.net';
const TRADE = process.env.NEXT_PUBLIC_DFLOW_TRADE_URL || 'https://c.quote-api.dflow.net';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.DFLOW_API_KEY) {
    headers['x-api-key'] = process.env.DFLOW_API_KEY;
  }
  return headers;
}

interface DFlowMarket {
  ticker?: string;
  eventTicker?: string;
  title?: string;
  subtitle?: string;
  yesSubTitle?: string;
  noSubTitle?: string;
  volume?: number;
  openInterest?: number;
  yesBid?: string;
  yesAsk?: string;
  noBid?: string;
  noAsk?: string;
  status?: string;
  marketType?: string;
}

interface DFlowEvent {
  ticker?: string;
  title?: string;
  subtitle?: string;
  volume?: number;
  volume24h?: number;
  markets?: DFlowMarket[];
}

interface DFlowSearchResponse {
  cursor?: number;
  events?: DFlowEvent[];
}

function parseMarkets(events: DFlowEvent[]): MarketData[] {
  const seen = new Set<string>();
  const markets: MarketData[] = [];

  for (const event of events) {
    const eventMarkets = event.markets || [];
    for (const m of eventMarkets) {
      const ticker = m.ticker || '';
      if (!ticker || seen.has(ticker)) continue;
      // Skip finalized/settled markets
      if (m.status === 'finalized' || m.status === 'settled') continue;
      seen.add(ticker);

      // DFlow returns prices as bid/ask strings like "0.65"
      const yesBid = parseFloat(m.yesBid || '0') || 0;
      const yesAsk = parseFloat(m.yesAsk || '0') || 0;
      const noBid = parseFloat(m.noBid || '0') || 0;
      const noAsk = parseFloat(m.noAsk || '0') || 0;

      // Use midpoint of bid/ask as the display price
      const yesPrice = yesAsk > 0 && yesBid > 0 ? (yesBid + yesAsk) / 2 : yesAsk || yesBid || 0.5;
      const noPrice = noAsk > 0 && noBid > 0 ? (noBid + noAsk) / 2 : noAsk || noBid || 0.5;

      // Build descriptive title from subtitle fields
      const title = m.yesSubTitle || m.subtitle || m.title || event.title || '';

      markets.push({
        id: ticker,
        eventId: '',
        ticker,
        title,
        yesPrice: Math.round(yesPrice * 100) / 100,
        noPrice: Math.round(noPrice * 100) / 100,
        volume: m.volume ?? event.volume ?? null,
        change24h: null,
        category: m.marketType ?? null,
      });
    }
  }

  return markets;
}

export async function getMarkets(searchTerms: string[]): Promise<MarketData[]> {
  const headers = getHeaders();

  const results = await Promise.all(
    searchTerms.map(term =>
      fetch(
        `${METADATA}/api/v1/search?q=${encodeURIComponent(term)}&limit=10&withNestedMarkets=true`,
        { headers }
      )
        .then(r => {
          if (!r.ok) throw new Error(`DFlow search returned ${r.status}`);
          return r.json() as Promise<DFlowSearchResponse>;
        })
        .catch(err => {
          console.error('DFlow search error:', err);
          return { events: [] } as DFlowSearchResponse;
        })
    )
  );

  const allEvents = results.flatMap(r => r.events || []);
  return parseMarkets(allEvents);
}

export async function getMarketsByEventTicker(eventTicker: string): Promise<MarketData[]> {
  const headers = getHeaders();

  try {
    const res = await fetch(
      `${METADATA}/api/v1/search?q=${encodeURIComponent(eventTicker)}&limit=20&withNestedMarkets=true`,
      { headers }
    );
    if (!res.ok) throw new Error(`DFlow search returned ${res.status}`);
    const data: DFlowSearchResponse = await res.json();

    // Find the exact event by ticker
    const matchingEvent = (data.events || []).find(
      e => e.ticker?.toUpperCase() === eventTicker.toUpperCase()
    );

    if (matchingEvent) {
      return parseMarkets([matchingEvent]);
    }

    // Fallback: return all markets from search
    return parseMarkets(data.events || []);
  } catch (err) {
    console.error('DFlow event ticker search error:', err);
    return [];
  }
}

export async function checkKYCStatus(walletAddress: string): Promise<KYCStatus> {
  try {
    const res = await fetch(`${TRADE}/api/v1/kyc/status`, {
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders(),
      },
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });
    if (!res.ok) return { verified: false };
    return res.json();
  } catch {
    return { verified: false };
  }
}

export async function initiateKYC(walletAddress: string): Promise<string> {
  const res = await fetch(`${TRADE}/api/v1/kyc/initiate`, {
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(),
    },
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  });
  const data = await res.json();
  return data.verificationUrl;
}

export async function buildTradeTransaction({ walletAddress, marketTicker, side, amount }: TradeParams) {
  const res = await fetch(`${TRADE}/swap-instructions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHeaders(),
    },
    body: JSON.stringify({
      userPublicKey: walletAddress,
      ticker: marketTicker,
      side,
      amount,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Trade failed: ${(err as Record<string, string>).msg || res.statusText}`);
  }
  const data = await res.json();
  return data;
}
