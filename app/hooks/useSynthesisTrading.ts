'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface SynthesisState {
  ready: boolean;
  initializing: boolean;
  walletAddress: string | null;
  walletId: string | null;
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
}

interface OrderResult {
  order_id: string;
  status: string;
  [key: string]: unknown;
}

export function useSynthesisTrading() {
  const { authenticated, ready: privyReady, user } = usePrivy();
  const [state, setState] = useState<SynthesisState>({
    ready: false,
    initializing: false,
    walletAddress: null,
    walletId: null,
    accountId: null,
    balance: null,
    error: null,
  });

  const initRef = useRef(false);

  // Get the Privy user ID
  const privyUserId = user?.id || null;

  // Initialize: create or retrieve Synthesis account on mount
  useEffect(() => {
    if (!authenticated || !privyReady || !privyUserId) {
      setState(s => ({
        ...s,
        ready: false,
        walletAddress: null,
        walletId: null,
        accountId: null,
        error: null,
      }));
      initRef.current = false;
      return;
    }

    if (initRef.current) return;
    initRef.current = true;

    setState(s => ({ ...s, initializing: true, error: null }));

    fetch('/api/synthesis/account', {
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
          ready: !!data.wallet_id,
          initializing: false,
          walletAddress: data.wallet_address || null,
          walletId: data.wallet_id || null,
          accountId: data.account_id || null,
          error: null,
        }));
      })
      .catch((err) => {
        console.error('[synthesis] Init error:', err);
        setState(s => ({
          ...s,
          initializing: false,
          error: err instanceof Error ? err.message : 'Failed to initialize trading',
        }));
        // Don't reset initRef — prevent retry spam. User can reload to retry.
      });
  }, [authenticated, privyReady, privyUserId]);

  // Place an order
  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<OrderResult> => {
      if (!privyUserId) throw new Error('Not authenticated');
      if (!state.ready) throw new Error('Trading account not ready');

      const res = await fetch('/api/synthesis/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privy_user_id: privyUserId,
          token_id: params.tokenId,
          side: params.side,
          type: params.type || 'MARKET',
          amount: params.amount,
          units: params.units || (params.side === 'BUY' ? 'USDC' : 'SHARES'),
          price: params.price,
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
      `/api/synthesis/positions?privy_user_id=${encodeURIComponent(privyUserId)}`,
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
      `/api/synthesis/balance?privy_user_id=${encodeURIComponent(privyUserId)}`,
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

      const res = await fetch('/api/synthesis/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privy_user_id: privyUserId,
          token_id: params.tokenId,
          side: params.side,
          type: params.type || 'MARKET',
          amount: params.amount,
          units: params.units || (params.side === 'BUY' ? 'USDC' : 'SHARES'),
          price: params.price,
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
    walletId: state.walletId,
    accountId: state.accountId,
    balance: state.balance,
    error: state.error,
    placeOrder,
    getPositions: fetchPositions,
    getBalance: fetchBalance,
    getQuote,
  };
}
