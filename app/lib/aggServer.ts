// Server-only fetch helper for AGG REST API.
// Injects x-app-id + x-app-api-key on every call so we never expose the
// server key to the browser. User-tier requests pass the user's bearer JWT
// through as Authorization.

const APP_ID = process.env.NEXT_PUBLIC_AGG_APP_ID || '';
const BASE_URL = process.env.NEXT_PUBLIC_AGG_BASE_URL || 'https://api.agg.market';
const SERVER_KEY = process.env.AGG_SERVER_API_KEY || '';
// AGG /venue-events 500s when our app has most category presets disabled
// and no categoryIds filter is passed. Default to the comma-separated
// list in AGG_DEFAULT_CATEGORY_IDS so every call scopes itself to
// enabled categories. Override per call by passing categoryIds.
const DEFAULT_CATEGORY_IDS = (process.env.AGG_DEFAULT_CATEGORY_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

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
    const bodyExcerpt = text.slice(0, 500);
    const detail = (parsed && typeof parsed === 'object')
      ? JSON.stringify(parsed).slice(0, 500)
      : bodyExcerpt;
    console.error(`[aggFetch] ${opts.method ?? 'GET'} ${path} → ${res.status} ${res.statusText} :: ${detail}`);
    const msg = (parsed && typeof parsed === 'object' && 'error' in (parsed as Record<string, unknown>))
      ? String((parsed as { error: unknown }).error)
      : `AGG ${res.status}: ${bodyExcerpt || res.statusText}`;
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

// Wire format from AGG /venue-markets, /search?type=markets.
export interface AggVenueMarket {
  id: string;
  // AGG returns `question`; some responses include `title` too. We normalize
  // to whichever is present.
  question?: string;
  title?: string;
  description?: string;
  venue?: string;
  status?: string;
  // AGG returns outcomes at `venueMarketOutcomes`; our legacy code path
  // referenced `outcomes`. Support both.
  venueMarketOutcomes?: AggOutcome[];
  outcomes?: AggOutcome[];
  volume?: number;
  liquidity?: number;
  endDate?: string;
  tickSize?: string;
}

export interface AggOutcome {
  id: string;             // venueMarketOutcomeId
  // AGG uses `label`; older snippets used `name`. Accept both.
  label?: string;
  name?: string;
  price?: number;
  bid?: number;
  ask?: number;
}

// Map an AGG VenueMarket into our internal MarketData shape. Kept here so all
// server routes produce identical output regardless of which AGG endpoint
// they used to source the data.
function outcomeLabel(o?: AggOutcome): string {
  return (o?.label ?? o?.name ?? '').trim();
}

export function mapAggMarket(ev: { id: string; venue?: string; endDate?: string }, m: AggVenueMarket): import('@/app/types').MarketData | null {
  const outcomes = (m.venueMarketOutcomes ?? m.outcomes) || [];
  const o1 = outcomes[0];
  const o2 = outcomes[1];
  if (!o1) return null;

  const l1 = outcomeLabel(o1);
  const l2 = outcomeLabel(o2);
  const isStandardYesNo = l1 === 'Yes' && l2 === 'No';
  const yesPrice = o1.price ?? 0.5;
  const noPrice = o2?.price ?? (1 - yesPrice);
  const title = m.question || m.title || '';

  return {
    id: m.id,
    eventId: ev.id,
    ticker: m.id,
    title,
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
    outcomeName: !isStandardYesNo ? (l1 || null) : null,
    outcome2Name: !isStandardYesNo ? (l2 || null) : null,
    venue: m.venue || ev.venue,
  };
}

// AGG's /venue-events/{id} returns the event metadata WITHOUT nested markets.
// Markets live at /venue-markets?venueEventId=<id>. This helper paginates
// until exhausted (AGG caps page size around 100).
export async function getVenueMarketsByEventId(eventId: string): Promise<AggVenueMarket[]> {
  const out: AggVenueMarket[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) { // safety cap
    let resp: { data?: AggVenueMarket[]; nextCursor?: string | null };
    try {
      resp = await aggFetch<{ data?: AggVenueMarket[]; nextCursor?: string | null }>(
        '/venue-markets',
        { query: { venueEventId: eventId, limit: 100, ...(cursor ? { cursor } : {}) } },
      );
    } catch (err) {
      console.error(`[getVenueMarketsByEventId] ${eventId}:`, err);
      break;
    }
    for (const m of resp.data || []) out.push(m);
    if (!resp.nextCursor) break;
    cursor = resp.nextCursor;
  }
  return out;
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
  // AGG's /venue-events listing endpoint 500s for our app config. Pivot to
  // /search?type=events for discovery, then enrich each event with its
  // markets via the single-event lookup. Same overall shape — same
  // {data, nextCursor, hasMore} contract — so all callers are unchanged.

  const terms = params.searchTerms?.length
    ? params.searchTerms
    : params.search
      ? [params.search]
      : [];

  // /search requires a non-empty q. Without one, return empty.
  if (terms.length === 0) return { data: [] };

  const categoryIds = params.categoryIds ?? (DEFAULT_CATEGORY_IDS.length ? DEFAULT_CATEGORY_IDS : undefined);
  const perTermLimit = params.limit ?? 25;

  const seen = new Map<string, AggVenueEvent>();

  for (const term of terms) {
    if (!term) continue;
    let brief: { data?: AggVenueEvent[] };
    try {
      brief = await aggFetch<{ data?: AggVenueEvent[] }>('/search', {
        query: {
          q: term,
          type: 'events',
          ...(categoryIds ? { categoryIds } : {}),
          limit: perTermLimit,
        },
      });
    } catch (err) {
      console.error(`[listVenueEvents] /search failed for "${term}":`, err);
      continue;
    }

    for (const ev of brief.data || []) {
      if (seen.has(ev.id)) continue;
      // Enrich with the full event payload (which includes nested markets).
      // Falls back to the bare /search result if the single-event lookup
      // also errors so the caller at least sees the event title/metadata.
      const full = await getVenueEvent(ev.id);
      seen.set(ev.id, full ?? ev);
    }
  }

  return { data: [...seen.values()] };
}

export async function getVenueEvent(id: string): Promise<AggVenueEvent | null> {
  try {
    const ev = await aggFetch<AggVenueEvent & { venueMarkets?: AggVenueMarket[] }>(
      `/venue-events/${encodeURIComponent(id)}`,
    );
    // Single-event endpoint returns metadata only — fetch markets separately
    // and normalize onto `markets` for downstream code.
    const inline = ev.venueMarkets ?? ev.markets;
    const markets = inline?.length ? inline : await getVenueMarketsByEventId(id);
    return { ...ev, markets };
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
