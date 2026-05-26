'use client';

import { useEffect, useState } from 'react';
import type { EventData } from '@/app/types';
import { parseFIFAMarkets, buildCountryProfiles } from '@/app/lib/fifa';
import type { CountryProfile, ParsedFIFAMarket } from '@/app/lib/fifa';

interface State {
  event: EventData | null;
  parsedMarkets: ParsedFIFAMarket[];
  profiles: CountryProfile[];
  loading: boolean;
  error: string | null;
}

const EMPTY_STATE: State = {
  event: null,
  parsedMarkets: [],
  profiles: [],
  loading: true,
  error: null,
};

// ──────────────────────────────────────────────────────────────────
// Module-level singleton cache.
//
// Every SINGL FIFA-tab page (countries / groups / schedule / bracket /
// h2h / squads / pickem / news) calls useActiveEvent on mount. Without
// a shared cache, each page navigation would refire /api/active-event,
// re-parse markets, and re-build profiles — visibly slow on every
// click. The state below lives for the entire SPA session: the first
// mount kicks off a fetch, subsequent mounts read the cached state
// instantly, and a single shared interval refreshes for everyone.
// ──────────────────────────────────────────────────────────────────
let cached: State = EMPTY_STATE;
let lastFetchAt = 0;
let inflight: Promise<void> | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<(s: State) => void>();
const REFRESH_MS = 15_000;

function emit() {
  subscribers.forEach(fn => fn(cached));
}

async function fetchOnce(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch('/api/active-event');
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      if (!data.event) {
        cached = { ...EMPTY_STATE, loading: false };
        lastFetchAt = Date.now();
        emit();
        return;
      }
      const parsedMarkets = parseFIFAMarkets(data.event.markets);
      const profiles = buildCountryProfiles(parsedMarkets);
      cached = {
        event: data.event,
        parsedMarkets,
        profiles,
        loading: false,
        error: null,
      };
      lastFetchAt = Date.now();
      emit();
    } catch (err) {
      cached = {
        ...cached,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load',
      };
      lastFetchAt = Date.now();
      emit();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function ensureRefreshTimer() {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    // Only refresh while at least one component is listening — pauses
    // network chatter when the user leaves all FIFA pages.
    if (subscribers.size === 0) {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      return;
    }
    fetchOnce();
  }, REFRESH_MS);
}

export function useActiveEvent(): State {
  const [state, setState] = useState<State>(cached);

  useEffect(() => {
    subscribers.add(setState);
    // Trigger a fresh fetch if the cache is stale or never populated.
    // Otherwise the cached value renders immediately — page navigation
    // between FIFA tabs feels instant.
    const isStale = !cached.event && !cached.error && cached.loading;
    const isExpired = Date.now() - lastFetchAt > REFRESH_MS;
    if (isStale || isExpired) {
      fetchOnce();
    }
    ensureRefreshTimer();
    return () => {
      subscribers.delete(setState);
    };
  }, []);

  return state;
}
