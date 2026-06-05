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
  // Cover image — Polymarket FIFA per-country markets use country flags
  // here; other venues may use team logos / candidate photos.
  image?: string | null;
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

export function mapAggMarket(ev: { id: string; venue?: string; endDate?: string; title?: string }, m: AggVenueMarket): import('@/app/types').MarketData | null {
  const outcomes = (m.venueMarketOutcomes ?? m.outcomes) || [];
  if (outcomes.length === 0) return null;

  // CRITICAL: AGG returns outcomes in arbitrary order. Diagnostic showed
  // [{label:'No',price:0.82},{label:'Yes',price:0.18}] for France. Index
  // 0 ≠ Yes side. Look up by label and fall back to positional order
  // only when labels aren't standard Yes/No (e.g. team-vs-team markets).
  const yesByLabel = outcomes.find(o => outcomeLabel(o).toLowerCase() === 'yes');
  const noByLabel  = outcomes.find(o => outcomeLabel(o).toLowerCase() === 'no');
  const yesSide = yesByLabel ?? outcomes[0];
  const noSide  = noByLabel  ?? outcomes.find(o => o.id !== yesSide.id) ?? outcomes[1];
  if (!yesSide) return null;

  const yesLabel = outcomeLabel(yesSide);
  const noLabel = outcomeLabel(noSide);
  const isStandardYesNo = yesLabel.toLowerCase() === 'yes' && noLabel.toLowerCase() === 'no';
  const yesPrice = yesSide.price ?? 0.5;
  const noPrice = noSide?.price ?? (1 - yesPrice);
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
    yesOutcomeId: yesSide.id,
    noOutcomeId: noSide?.id ?? '',
    tickSize: m.tickSize ?? '0.01',
    outcomeName: !isStandardYesNo ? (yesLabel || null) : null,
    outcome2Name: !isStandardYesNo ? (noLabel || null) : null,
    // Preserve the full outcomes list for multi-outcome markets (e.g.
    // "Nation to Reach Final" with 32 country outcomes). MarketCard /
    // detail overlay can iterate over this when length > 2.
    outcomes: outcomes
      .filter(o => o && o.id)
      .map(o => ({
        id: o.id,
        label: outcomeLabel(o) || 'Outcome',
        price: o.price ?? 0,
      })),
    venue: m.venue || ev.venue,
    parentEventTitle: ev.title || null,
    image: m.image ?? null,
  };
}

// AGG's /venue-events/{id} returns the event metadata WITHOUT nested markets.
// Markets live at /venue-markets?venueEventId=<id>. This helper paginates
// until exhausted (AGG caps page size around 100).
export async function getVenueMarketsByEventId(eventId: string): Promise<AggVenueMarket[]> {
  const out: AggVenueMarket[] = [];
  // Single 100-market page is enough for every prediction-market event
  // we've seen (FIFA Winner has 32 outcomes, biggest other groups are
  // similar). Skip pagination — extra pages were costing 5–10s per page
  // on slow events and contributing the bulk of the 30s page-refresh
  // latency. Callers that genuinely need more can paginate themselves.
  try {
    const resp = await aggFetch<{ data?: AggVenueMarket[]; nextCursor?: string | null }>(
      '/venue-markets',
      { query: { venueEventId: eventId, limit: 100 } },
    );
    for (const m of resp.data || []) out.push(m);
  } catch (err) {
    console.error(`[getVenueMarketsByEventId] ${eventId}:`, err);
  }
  return out;
}

// Run `fn` over `items` with at most `limit` in flight at once. Used to
// enrich many events without firing hundreds of simultaneous AGG calls
// (which AGG rate-limits and which blow out cold-load latency).
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
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

    // Enrich every NEW event in parallel — sequential awaits here were
    // the dominant cost in active-event refresh (100 events × ~200ms =
    // 20s+). Promise.all collapses to ~1 roundtrip latency.
    const newOnes = (brief.data || []).filter(ev => !seen.has(ev.id));
    const fulls = await mapPool(newOnes, 12, ev =>
      getVenueEvent(ev.id).then(f => f ?? ev).catch(() => ev),
    );
    for (const f of fulls) seen.set(f.id, f);
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
