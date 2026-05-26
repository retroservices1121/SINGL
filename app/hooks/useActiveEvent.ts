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

// Single source of truth for the active FIFA event across the SINGL
// pages (countries / groups / schedule / bracket / h2h / squads /
// pickem / news / videos). Each page calls this hook independently;
// any polling is per-page (15s) and `/api/active-event` is already
// cached server-side so duplicate page mounts don't fan out.
export function useActiveEvent(): State {
  const [state, setState] = useState<State>(EMPTY_STATE);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const res = await fetch('/api/active-event');
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (!data.event) {
          setState({ ...EMPTY_STATE, loading: false });
          return;
        }
        const parsedMarkets = parseFIFAMarkets(data.event.markets);
        const profiles = buildCountryProfiles(parsedMarkets);
        setState({
          event: data.event,
          parsedMarkets,
          profiles,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          ...EMPTY_STATE,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load',
        });
      }
    };
    fetchOnce();
    const t = setInterval(fetchOnce, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return state;
}
