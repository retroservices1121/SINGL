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

// Convert one MarketData into the VenueMarket subset the AGG hooks expect.
// IMPORTANT: synthesized group cards (id starts with `group:`) hold real
// child markets under `outcomes[].childMarketId`. AGG rejects synthetic
// `group:xxx` ids with 401 on /midpoints, so we must use the REAL
// underlying venueMarketId.
//
// For the LIST view we only need the LEADER outcome per grouped card —
// that's the price the card displays. Expanding all N children for every
// card on a 1900-market event (FIFA) builds a /midpoints URL that
// exceeds ~100KB and gets rejected by the browser/CDN as ERR_FAILED,
// breaking every market on the page. The MarketDetailOverlay subscribes
// locally via `useMarketLivePrices` to the FULL child list when opened.
function toListVenueMarkets(m: MarketData): MinimalVenueMarket[] {
  const isGrouped = m.venueMarketId.startsWith('group:');

  if (isGrouped && m.outcomes && m.outcomes.length > 0) {
    const leader = m.outcomes.find(o => o.childMarketId && o.id);
    if (!leader) return [];
    return [{
      id: leader.childMarketId!,
      venue: (leader.venue ?? m.venue ?? 'polymarket') as string,
      externalIdentifier: leader.childMarketId!,
      question: leader.label,
      venueMarketOutcomes: [
        { id: leader.id, label: 'Yes', price: leader.price, venueMarketId: leader.childMarketId! },
        ...(leader.noId
          ? [{ id: leader.noId, label: 'No', price: 1 - leader.price, venueMarketId: leader.childMarketId! }]
          : []),
      ],
    }];
  }

  return [{
    id: m.venueMarketId,
    venue: (m.venue ?? 'polymarket') as string,
    externalIdentifier: m.venueMarketId,
    question: m.title,
    venueMarketOutcomes: [
      { id: m.yesOutcomeId, label: m.outcomeName || 'Yes', price: m.yesPrice, venueMarketId: m.venueMarketId },
      { id: m.noOutcomeId, label: m.outcome2Name || 'No', price: m.noPrice, venueMarketId: m.venueMarketId },
    ],
  }];
}

// Expand ALL outcomes for one market — used by the detail-scoped provider
// so every row in the outcomes table gets a live tick.
function toDetailVenueMarkets(m: MarketData): MinimalVenueMarket[] {
  const isGrouped = m.venueMarketId.startsWith('group:');

  if (isGrouped && m.outcomes && m.outcomes.length > 0) {
    return m.outcomes
      .filter(o => o.childMarketId && o.id)
      .map(o => ({
        id: o.childMarketId!,
        venue: (o.venue ?? m.venue ?? 'polymarket') as string,
        externalIdentifier: o.childMarketId!,
        question: o.label,
        venueMarketOutcomes: [
          { id: o.id, label: 'Yes', price: o.price, venueMarketId: o.childMarketId! },
          ...(o.noId
            ? [{ id: o.noId, label: 'No', price: 1 - o.price, venueMarketId: o.childMarketId! }]
            : []),
        ],
      }));
  }

  return [{
    id: m.venueMarketId,
    venue: (m.venue ?? 'polymarket') as string,
    externalIdentifier: m.venueMarketId,
    question: m.title,
    venueMarketOutcomes: [
      { id: m.yesOutcomeId, label: m.outcomeName || 'Yes', price: m.yesPrice, venueMarketId: m.venueMarketId },
      { id: m.noOutcomeId, label: m.outcome2Name || 'No', price: m.noPrice, venueMarketId: m.venueMarketId },
    ],
  }];
}

interface LivePricesValue {
  prices: Map<string, number>;
  venueByOutcome: Map<string, string>;
}

const EMPTY: LivePricesValue = { prices: new Map(), venueByOutcome: new Map() };
const LivePricesContext = createContext<LivePricesValue>(EMPTY);

export function LivePricesProvider({ markets, children }: { markets: MarketData[]; children: ReactNode }) {
  const venueMarkets = useMemo(
    () => markets
      .filter(m => m.yesOutcomeId)
      .flatMap(toListVenueMarkets),
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

// Detail-scoped provider — subscribes to every outcome of one open market
// and merges those live prices on top of whatever the global list-view
// provider already has. Use this inside MarketDetailOverlay so every
// row in the outcomes table animates without bloating the home-page
// subscription.
export function MarketDetailLivePrices({ market, children }: { market: MarketData; children: ReactNode }) {
  const venueMarkets = useMemo(() => toDetailVenueMarkets(market), [market]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localPrices = useLiveOutcomePrices(venueMarkets as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const localMid = useMidpoints(venueMarkets as any);
  const parent = useContext(LivePricesContext);

  const value = useMemo<LivePricesValue>(() => {
    const mergedPrices = new Map(parent.prices);
    localPrices.forEach((v, k) => mergedPrices.set(k, v));
    const mergedVenues = new Map(parent.venueByOutcome);
    localMid.venueByOutcomeId?.forEach((v, k) => mergedVenues.set(k, v));
    return { prices: mergedPrices, venueByOutcome: mergedVenues };
  }, [parent, localPrices, localMid.venueByOutcomeId]);

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
