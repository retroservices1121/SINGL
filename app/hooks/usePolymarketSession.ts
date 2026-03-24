'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { Side } from '@polymarket/clob-client';

const CLOB_URL = 'https://clob.polymarket.com';

const SESSION_KEY = 'polymarket_session';

interface PolymarketSession {
  address: string;
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

interface SessionState {
  safeAddress: string | null;
  clobReady: boolean;
  initializing: boolean;
  error: string | null;
  session: PolymarketSession | null;
}

export function usePolymarketSession(): SessionState & {
  initSession: () => Promise<void>;
  placeMarketOrder: (params: {
    tokenId: string;
    side: 'BUY' | 'SELL';
    amount: number;
    price: number;
    negRisk: boolean;
    tickSize: string;
  }) => Promise<{ orderID: string }>;
} {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const [state, setState] = useState<SessionState>({
    safeAddress: null,
    clobReady: false,
    initializing: false,
    error: null,
    session: null,
  });

  const initializingRef = useRef(false);

  // Try to restore session from localStorage
  useEffect(() => {
    if (!authenticated) {
      setState(s => ({ ...s, safeAddress: null, clobReady: false, session: null }));
      return;
    }

    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const session: PolymarketSession = JSON.parse(stored);
        setState(s => ({
          ...s,
          safeAddress: session.address,
          clobReady: true,
          session,
        }));
      }
    } catch {
      // Ignore parse errors
    }
  }, [authenticated]);

  const initSession = useCallback(async () => {
    if (initializingRef.current) return;
    if (!authenticated || !ready || wallets.length === 0) return;

    initializingRef.current = true;
    setState(s => ({ ...s, initializing: true, error: null }));

    try {
      const wallet = wallets[0];
      await wallet.switchChain(137); // Polygon

      const rawProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(rawProvider as ethers.providers.ExternalProvider);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      // Initialize ClobClient with EOA signature type for API key derivation
      const { ClobClient } = await import('@polymarket/clob-client');

      const clobClient = new ClobClient(
        CLOB_URL,
        137,
        signer as unknown as ethers.Wallet,
        undefined, // no creds yet
        0, // SignatureType.EOA
      );

      // Derive or create API key
      let creds;
      try {
        creds = await clobClient.deriveApiKey();
      } catch {
        creds = await clobClient.createApiKey();
      }

      // Save session
      const session: PolymarketSession = {
        address,
        apiKey: creds.key,
        apiSecret: creds.secret,
        passphrase: creds.passphrase,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      setState({
        safeAddress: address,
        clobReady: true,
        initializing: false,
        error: null,
        session,
      });

      console.log('[polymarket] Session initialized for:', address);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize Polymarket session';
      console.error('[polymarket] Init error:', err);
      setState(s => ({ ...s, initializing: false, error: msg }));
    } finally {
      initializingRef.current = false;
    }
  }, [authenticated, ready, wallets]);

  // Auto-initialize when wallet connects and no session exists
  useEffect(() => {
    if (authenticated && ready && wallets.length > 0 && !state.clobReady && !state.initializing) {
      initSession();
    }
  }, [authenticated, ready, wallets, state.clobReady, state.initializing, initSession]);

  const placeMarketOrder = useCallback(async (params: {
    tokenId: string;
    side: 'BUY' | 'SELL';
    amount: number;
    price: number;
    negRisk: boolean;
    tickSize: string;
  }) => {
    if (!state.session || wallets.length === 0) {
      throw new Error('Session not initialized');
    }

    const wallet = wallets[0];
    const rawProvider = await wallet.getEthereumProvider();
    const provider = new ethers.providers.Web3Provider(rawProvider as ethers.providers.ExternalProvider);
    const signer = provider.getSigner();

    const { ClobClient } = await import('@polymarket/clob-client');

    const clobClient = new ClobClient(
      CLOB_URL,
      137,
      signer as unknown as ethers.Wallet,
      {
        key: state.session.apiKey,
        secret: state.session.apiSecret,
        passphrase: state.session.passphrase,
      },
      0, // SignatureType.EOA
    );

    // Create and post a market order (FOK for instant fill)
    const order = await clobClient.createMarketOrder({
      tokenID: params.tokenId,
      price: params.price,
      amount: params.amount,
      side: params.side === 'BUY' ? Side.BUY : Side.SELL,
    });

    const response = await clobClient.postOrder(order);

    return { orderID: response.orderID || response.orderIds?.[0] || 'unknown' };
  }, [state.session, wallets]);

  return {
    ...state,
    initSession,
    placeMarketOrder,
  };
}
