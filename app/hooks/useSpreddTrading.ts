'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface SpreddState {
  ready: boolean;
  initializing: boolean;
  walletAddress: string | null;
  accountId: string | null;
  balance: Record<string, unknown> | null;
  error: string | null;
}

interface PlaceOrderParams {
  tokenId: string;
  side: 'BUY' | 'SELL';
  amount: number;
  units?: 'USDC' | 'SHARES';
  type?: 'MARKET' | 'LIMIT';
  price?: number;
  platform?: string;
}

interface OrderResult {
  order_id: string;
  status: string;
  shares?: number;
  price?: number;
  executed_price?: number;
  tx_hash?: string;
  [key: string]: unknown;
}

export function useSpreddTrading() {
  const { authenticated, ready: privyReady, user } = usePrivy();
  const [state, setState] = useState<SpreddState>({
    ready: false,
    initializing: false,
    walletAddress: null,
    accountId: null,
    balance: null,
    error: null,
  });

  const initRef = useRef(false);
  const privyUserId = user?.id || null;

  // Initialize: create or retrieve Spredd account on mount
  useEffect(() => {
    if (!authenticated || !privyReady || !privyUserId) {
      setState(s => ({
        ...s,
        ready: false,
        walletAddress: null,
        accountId: null,
        error: null,
      }));
      initRef.current = false;
      return;
    }

    if (initRef.current) return;
    initRef.current = true;

    setState(s => ({ ...s, initializing: true, error: null }));

    fetch('/api/spredd/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privy_user_id: privyUserId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to initialize trading account');
        }
        setState(s => ({
          ...s,
          ready: !!data.wallet_address,
          initializing: false,
          walletAddress: data.wallet_address || null,
          accountId: data.account_id || null,
          error: null,
        }));
      })
      .catch((err) => {
        console.error('[spredd] Init error:', err);
        setState(s => ({
          ...s,
          initializing: false,
          error: err instanceof Error ? err.message : 'Failed to initialize trading',
        }));
      });
  }, [authenticated, privyReady, privyUserId]);

  // Place an order
  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<OrderResult> => {
      if (!privyUserId) throw new Error('Not authenticated');
      if (!state.ready) throw new Error('Trading account not ready');

      const res = await fetch('/api/spredd/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privy_user_id: privyUserId,
          token_id: params.tokenId,
          side: params.side.toLowerCase(),
          type: params.type || 'MARKET',
          amount: params.amount,
          units: params.units || (params.side === 'BUY' ? 'USDC' : 'SHARES'),
          price: params.price,
          platform: params.platform,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Order failed');
      }
      return data as OrderResult;
    },
    [privyUserId, state.ready],
  );

  // Get positions
  const fetchPositions = useCallback(async () => {
    if (!privyUserId) return [];

    const res = await fetch(
      `/api/spredd/positions?privy_user_id=${encodeURIComponent(privyUserId)}`,
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch positions');
    }
    return data.positions || [];
  }, [privyUserId]);

  // Get balance
  const fetchBalance = useCallback(async () => {
    if (!privyUserId) return null;

    const res = await fetch(
      `/api/spredd/balance?privy_user_id=${encodeURIComponent(privyUserId)}`,
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch balance');
    }
    setState(s => ({ ...s, balance: data.balance }));
    return data.balance;
  }, [privyUserId]);

  // Get order quote
  const getQuote = useCallback(
    async (params: PlaceOrderParams) => {
      if (!privyUserId) throw new Error('Not authenticated');

      const res = await fetch('/api/spredd/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privy_user_id: privyUserId,
          token_id: params.tokenId,
          side: params.side.toLowerCase(),
          type: params.type || 'MARKET',
          amount: params.amount,
          units: params.units || (params.side === 'BUY' ? 'USDC' : 'SHARES'),
          price: params.price,
          platform: params.platform,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get quote');
      }
      return data.quote;
    },
    [privyUserId],
  );

  return {
    ready: state.ready,
    initializing: state.initializing,
    walletAddress: state.walletAddress,
    accountId: state.accountId,
    balance: state.balance,
    error: state.error,
    placeOrder,
    getPositions: fetchPositions,
    getBalance: fetchBalance,
    getQuote,
  };
}
