'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveOutcomePrices, findLivePriceById } from '@agg-build/hooks';
import type { MarketData } from '@/app/types';

// Minimal subset of AGG's VenueMarket type — enough for useLiveOutcomePrices
// to compute subscription keys. Cast as `any` at the hook boundary because
// the SDK's full VenueMarket carries 30+ optional fields none of our display
// surfaces touch.
type MinimalVenueMarket = {
  id: string;
  venue: string;
  externalIdentifier: string;
  question: string;
  venueMarketOutcomes: Array<{
    id: string;
    label: string;
    price: number;
    venueMarketId: string;
  }>;
};

function toVenueMarket(m: MarketData): MinimalVenueMarket {
  return {
    id: m.venueMarketId,
    venue: m.venue || 'polymarket',
    externalIdentifier: m.venueMarketId,
    question: m.title,
    venueMarketOutcomes: [
      {
        id: m.yesOutcomeId,
        label: m.outcomeName || 'Yes',
        price: m.yesPrice,
        venueMarketId: m.venueMarketId,
      },
      {
        id: m.noOutcomeId,
        label: m.outcome2Name || 'No',
        price: m.noPrice,
        venueMarketId: m.venueMarketId,
      },
    ],
  };
}

const LivePricesContext = createContext<Map<string, number>>(new Map());

export function LivePricesProvider({ markets, children }: { markets: MarketData[]; children: ReactNode }) {
  const venueMarkets = useMemo(
    () => markets.filter(m => m.yesOutcomeId && m.noOutcomeId).map(toVenueMarket),
    [markets],
  );
  // Hook expects SDK's VenueMarket[]; we pass our minimal subset.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prices = useLiveOutcomePrices(venueMarkets as any);
  return <LivePricesContext.Provider value={prices}>{children}</LivePricesContext.Provider>;
}

// Read a live price for one outcome. Returns the static fallback when the
// WS hasn't pushed a value yet (first paint, market not subscribed, etc.).
export function useLivePrice(outcomeId: string | undefined | null, fallback: number): number {
  const prices = useContext(LivePricesContext);
  if (!outcomeId) return fallback;
  return findLivePriceById(prices, outcomeId) ?? fallback;
}

// Bulk read — useful for components that already loop over markets.
export function useLivePricesMap(): Map<string, number> {
  return useContext(LivePricesContext);
}
