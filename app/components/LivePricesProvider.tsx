'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveOutcomePrices, useMidpoints, findLivePriceById } from '@agg-build/hooks';
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

interface LivePricesValue {
  prices: Map<string, number>;
  venueByOutcome: Map<string, string>;
}

const EMPTY: LivePricesValue = { prices: new Map(), venueByOutcome: new Map() };
const LivePricesContext = createContext<LivePricesValue>(EMPTY);

export function LivePricesProvider({ markets, children }: { markets: MarketData[]; children: ReactNode }) {
  const venueMarkets = useMemo(
    () => markets.filter(m => m.yesOutcomeId && m.noOutcomeId).map(toVenueMarket),
    [markets],
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prices = useLiveOutcomePrices(venueMarkets as any);
  // useMidpoints surfaces venueByOutcomeId so we can show which venue
  // currently offers the best price for each side — even when YES is on
  // Polymarket and NO is on Kalshi.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mid = useMidpoints(venueMarkets as any);
  const value = useMemo<LivePricesValue>(
    () => ({ prices, venueByOutcome: mid.venueByOutcomeId }),
    [prices, mid.venueByOutcomeId],
  );
  return <LivePricesContext.Provider value={value}>{children}</LivePricesContext.Provider>;
}

// Read a live price for one outcome. Returns the static fallback when the
// WS hasn't pushed a value yet (first paint, market not subscribed, etc.).
export function useLivePrice(outcomeId: string | undefined | null, fallback: number): number {
  const { prices } = useContext(LivePricesContext);
  if (!outcomeId) return fallback;
  return findLivePriceById(prices, outcomeId) ?? fallback;
}

// Bulk read of the live prices map — for components that iterate over many
// outcomes (e.g. the outcomes table in MarketDetailOverlay).
export function useLivePricesMap(): Map<string, number> {
  return useContext(LivePricesContext).prices;
}

// Read both the live price and the venue currently offering it for one outcome.
export function useLivePriceInfo(outcomeId: string | undefined | null, fallback: number, fallbackVenue?: string | null) {
  const { prices, venueByOutcome } = useContext(LivePricesContext);
  if (!outcomeId) return { price: fallback, venue: fallbackVenue ?? null };
  const live = findLivePriceById(prices, outcomeId);
  return {
    price: live ?? fallback,
    venue: venueByOutcome.get(outcomeId) ?? fallbackVenue ?? null,
  };
}
