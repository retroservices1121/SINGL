'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useAggAuth,
  useAggBalance,
  useAggClient,
  usePositions,
} from '@agg-build/hooks';
import { getWalletAddressFromUserProfile } from '@agg-build/hooks';

export interface AggQuoteParams {
  outcomeId: string;            // venueMarketOutcomeId
  side: 'BUY' | 'SELL';
  maxSpend?: number;            // USD, for BUY (interpreted as amount)
  sellShares?: number;          // for SELL (interpreted as amount)
  slippageBps?: number;
}

export interface AggQuote {
  quoteId: string;
  status: string;
  totalFilled?: number;
  estimatedCostRaw?: number;
  estimatedPayout?: number;
  estimatedProfit?: number;
  fills?: Array<{ venue: string; price: number; size: number }>;
  raw?: unknown;
}

export interface AggBalanceShape {
  total: number;
  available: number;
  raw?: unknown;
}

export interface AggPosition {
  id: string;
  marketId: string;
  marketTitle?: string;
  outcomeId: string;
  outcomeName?: string;
  shares: number;
  avgPrice: number;
  costBasis: number;
  currentPrice?: number;
  status: string;
  venue?: string;
  resolved?: boolean;
  resolvedOutcome?: string;
}

interface AggTradingState {
  ready: boolean;
  initializing: boolean;
  walletAddress: string | null;
  aggUserId: string | null;
  error: string | null;
}

export function useAggTrading() {
  const { isAuthenticated, user, isLoading } = useAggAuth();
  const client = useAggClient();
  const balanceCtx = useAggBalance();
  const positionsResult = usePositions();
  const [state, setState] = useState<AggTradingState>({
    ready: false,
    initializing: false,
    walletAddress: null,
    aggUserId: null,
    error: null,
  });

  const persistedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setState({ ready: false, initializing: false, walletAddress: null, aggUserId: null, error: null });
      persistedRef.current = false;
      return;
    }
    const wallet = getWalletAddressFromUserProfile(user) ?? null;
    const aggUserId = (user as { id?: string }).id ?? null;
    setState({
      ready: !!wallet,
      initializing: isLoading,
      walletAddress: wallet,
      aggUserId,
      error: null,
    });

    if (!persistedRef.current && aggUserId) {
      persistedRef.current = true;
      fetch('/api/agg/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aggUserId, walletAddress: wallet }),
      }).catch(() => {});
    }
  }, [isAuthenticated, user, isLoading]);

  const getQuote = useCallback(async (params: AggQuoteParams): Promise<AggQuote> => {
    const amount = params.side === 'BUY' ? (params.maxSpend ?? 0) : (params.sellShares ?? 0);
    const resp = await client.quoteManaged({
      venueMarketOutcomeIds: [params.outcomeId],
      side: params.side.toLowerCase() as 'buy' | 'sell',
      amount,
      slippageBps: params.slippageBps,
    });
    // Normalize a few fields for the UI.
    const totalFilled = Array.isArray(resp.splits)
      ? resp.splits.reduce((s, sp) => s + (parseFloat(sp.size) || 0), 0)
      : undefined;
    const estimatedCostRaw = Array.isArray(resp.splits)
      ? resp.splits.reduce((s, sp) => s + (parseFloat(sp.costRaw) || 0), 0) / 1e6
      : amount;
    const estimatedPayout = totalFilled;
    const estimatedProfit = (estimatedPayout ?? 0) - (estimatedCostRaw ?? 0);
    return {
      quoteId: resp.quoteId,
      status: 'ok',
      totalFilled,
      estimatedCostRaw,
      estimatedPayout,
      estimatedProfit,
      fills: (resp.splits || []).map(sp => ({
        venue: sp.venue,
        price: parseFloat(sp.price) || 0,
        size: parseFloat(sp.size) || 0,
      })),
      raw: resp,
    };
  }, [client]);

  const placeOrder = useCallback(async (params: { quoteId: string; fallback?: AggQuoteParams }): Promise<{ orderIds: string[]; status: string }> => {
    const resp = await client.executeManaged({
      quoteId: params.quoteId,
      fallbackToLatest: params.fallback ? {
        outcomeId: params.fallback.outcomeId,
        side: params.fallback.side.toLowerCase() as 'buy' | 'sell',
        maxSpend: params.fallback.maxSpend,
        sellShares: params.fallback.sellShares,
      } : undefined,
    });
    return { orderIds: resp.orderIds, status: resp.status };
  }, [client]);

  const redeem = useCallback(async (outcomeId: string) => {
    return client.redeem({ venueMarketOutcomeIds: [outcomeId] });
  }, [client]);

  const positions: AggPosition[] = (() => {
    const groups = (positionsResult as { positions?: Array<{
      targetMarketId: string;
      status: string;
      redeemStatus: string;
      venueMarket: {
        question: string;
        venueMarketOutcomes: Array<{
          label: string;
          totalSize: number;
          avgEntryPrice: number;
          currentPrice: number;
          winner: boolean | null;
          venueBreakdown: Array<{ venue: string; venueMarketOutcomeId: string }>;
        }>;
      };
    }> }).positions || [];
    const out: AggPosition[] = [];
    for (const g of groups) {
      for (const o of g.venueMarket.venueMarketOutcomes) {
        if (!o.totalSize) continue;
        const venueRow = o.venueBreakdown[0];
        out.push({
          id: `${g.targetMarketId}:${o.label}`,
          marketId: g.targetMarketId,
          marketTitle: g.venueMarket.question,
          outcomeId: venueRow?.venueMarketOutcomeId || '',
          outcomeName: o.label,
          shares: o.totalSize,
          avgPrice: o.avgEntryPrice,
          costBasis: o.totalSize * o.avgEntryPrice,
          currentPrice: o.currentPrice,
          status: g.status === 'closed' ? 'closed' : 'open',
          venue: venueRow?.venue,
          resolved: g.status === 'closed' || o.winner !== null,
          resolvedOutcome: o.winner === true ? venueRow?.venueMarketOutcomeId : undefined,
        });
      }
    }
    return out;
  })();

  const balance: AggBalanceShape = {
    total: balanceCtx?.totalBalance ?? 0,
    available: (balanceCtx?.totalBalance ?? 0) - (balanceCtx?.positionsBalanceTotal ?? 0),
    raw: balanceCtx?.managedBalances,
  };

  const getPositions = useCallback(async () => positions, [positions]);
  const getBalance = useCallback(async () => balance, [balance]);

  return {
    ...state,
    balance,
    getQuote,
    placeOrder,
    redeem,
    getPositions,
    getBalance,
  };
}
