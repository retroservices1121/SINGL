// Server-only fetch helper for AGG REST API.
// Injects x-app-id + x-app-api-key on every call so we never expose the
// server key to the browser. User-tier requests pass the user's bearer JWT
// through as Authorization.

const APP_ID = process.env.NEXT_PUBLIC_AGG_APP_ID || '';
const BASE_URL = process.env.NEXT_PUBLIC_AGG_BASE_URL || 'https://api.agg.market';
const SERVER_KEY = process.env.AGG_SERVER_API_KEY || '';

interface AggFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | string[] | undefined>;
  body?: unknown;
  bearer?: string | null;
}

function buildQuery(q?: AggFetchOptions['query']): string {
  if (!q) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) sp.append(k, String(item));
    } else {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function aggFetch<T>(path: string, opts: AggFetchOptions = {}): Promise<T> {
  if (!APP_ID) throw new Error('NEXT_PUBLIC_AGG_APP_ID is not set');
  if (!SERVER_KEY) throw new Error('AGG_SERVER_API_KEY is not set');

  const url = `${BASE_URL}${path}${buildQuery(opts.query)}`;
  const headers: Record<string, string> = {
    'x-app-id': APP_ID,
    'x-app-api-key': SERVER_KEY,
    'Content-Type': 'application/json',
  };
  if (opts.bearer) headers['Authorization'] = `Bearer ${opts.bearer}`;

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }

  if (!res.ok) {
    const msg = (parsed && typeof parsed === 'object' && 'error' in (parsed as Record<string, unknown>))
      ? String((parsed as { error: unknown }).error)
      : `AGG ${res.status}: ${text || res.statusText}`;
    throw new Error(msg);
  }

  return parsed as T;
}

// ── Typed wrappers used across server routes ────────────────────────────────

export interface AggVenueEvent {
  id: string;
  externalIdentifier?: string;
  title: string;
  description?: string;
  image?: string;
  venue?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  volume?: number;
  marketCount?: number;
  venueCount?: number;
  categories?: Array<{ id: string; category?: { id: string; name: string } }>;
  markets?: AggVenueMarket[];
}

export interface AggVenueMarket {
  id: string;
  title: string;
  description?: string;
  venue?: string;
  status?: string;
  outcomes?: AggOutcome[];
  volume?: number;
  liquidity?: number;
  endDate?: string;
  tickSize?: string;
}

export interface AggOutcome {
  id: string;             // venueMarketOutcomeId
  name: string;
  price?: number;
  bid?: number;
  ask?: number;
}

// Map an AGG VenueMarket into our internal MarketData shape. Kept here so all
// server routes produce identical output regardless of which AGG endpoint
// they used to source the data.
export function mapAggMarket(ev: { id: string; venue?: string; endDate?: string }, m: AggVenueMarket): import('@/app/types').MarketData | null {
  const outcomes = m.outcomes || [];
  const o1 = outcomes[0];
  const o2 = outcomes[1];
  if (!o1) return null;

  const isStandardYesNo = o1.name === 'Yes' && o2?.name === 'No';
  const yesPrice = o1.price ?? 0.5;
  const noPrice = o2?.price ?? (1 - yesPrice);

  return {
    id: m.id,
    eventId: ev.id,
    ticker: m.id,
    title: m.title,
    yesPrice,
    noPrice,
    volume: m.volume ?? null,
    change24h: null,
    category: null,
    rulesPrimary: m.description ?? null,
    closeTime: m.endDate ?? ev.endDate ?? null,
    expirationTime: m.endDate ?? ev.endDate ?? null,
    venueMarketId: m.id,
    yesOutcomeId: o1.id,
    noOutcomeId: o2?.id ?? '',
    tickSize: m.tickSize ?? '0.01',
    outcomeName: !isStandardYesNo ? (o1.name || null) : null,
    outcome2Name: !isStandardYesNo ? (o2?.name || null) : null,
    venue: m.venue || ev.venue,
  };
}

export async function listVenueEvents(params: {
  search?: string;
  searchTerms?: string[];
  status?: 'open' | 'closed' | 'resolved' | 'unopened' | 'paused';
  venues?: string[];
  categoryIds?: string[];
  sortBy?: 'volume' | 'volume24hr' | 'createdAt' | 'endDate';
  limit?: number;
  cursor?: string;
}): Promise<{ data: AggVenueEvent[]; nextCursor?: string; hasMore?: boolean }> {
  // If multiple search terms, dedupe results across them.
  const terms = params.searchTerms?.length
    ? params.searchTerms
    : params.search
      ? [params.search]
      : [''];

  const seen = new Map<string, AggVenueEvent>();
  let nextCursor: string | undefined;
  let hasMore = false;

  for (const term of terms) {
    const result = await aggFetch<{ data: AggVenueEvent[]; nextCursor?: string; hasMore?: boolean }>(
      '/venue-events',
      {
        query: {
          search: term || undefined,
          status: params.status,
          venues: params.venues,
          categoryIds: params.categoryIds,
          sortBy: params.sortBy ?? 'volume',
          limit: params.limit ?? 100,
          cursor: params.cursor,
        },
      },
    );
    for (const ev of result.data || []) {
      if (!seen.has(ev.id)) seen.set(ev.id, ev);
    }
    nextCursor = result.nextCursor;
    hasMore = result.hasMore ?? false;
  }

  return { data: [...seen.values()], nextCursor, hasMore };
}

export async function getVenueEvent(id: string): Promise<AggVenueEvent | null> {
  try {
    return await aggFetch<AggVenueEvent>(`/venue-events/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function getMidpoints(outcomeIds: string[]): Promise<Record<string, number>> {
  if (outcomeIds.length === 0) return {};
  const res = await aggFetch<{ midpoints: Record<string, number> }>('/orderbook/midpoints', {
    query: { outcomeIds },
  });
  return res.midpoints || {};
}

export async function getOrderbook(outcomeId: string): Promise<{
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
} | null> {
  try {
    return await aggFetch(`/orderbook/${encodeURIComponent(outcomeId)}`);
  } catch {
    return null;
  }
}

export async function getOrderbooks(outcomeIds: string[]): Promise<Record<string, {
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
}>> {
  if (outcomeIds.length === 0) return {};
  const res = await aggFetch<{ orderbooks: Record<string, { bids: Array<{ price: number; size: number }>; asks: Array<{ price: number; size: number }> }> }>(
    '/orderbooks',
    { query: { venueMarketIds: outcomeIds } },
  );
  return res.orderbooks || {};
}
