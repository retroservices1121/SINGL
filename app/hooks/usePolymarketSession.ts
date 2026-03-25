'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { Side } from '@polymarket/clob-client';
import { getCreate2Address, keccak256, encodeAbiParameters } from 'viem';

// Polymarket Safe proxy constants
const SAFE_INIT_CODE_HASH = '0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf' as `0x${string}`;
const SAFE_FACTORY = '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2' as `0x${string}`;

const CLOB_URL = 'https://clob.polymarket.com';

const SESSION_KEY = 'polymarket_session';

function deriveSafeAddress(eoaAddress: string): string {
  return getCreate2Address({
    bytecodeHash: SAFE_INIT_CODE_HASH,
    from: SAFE_FACTORY,
    salt: keccak256(encodeAbiParameters([{ name: 'address', type: 'address' }], [eoaAddress as `0x${string}`])),
  });
}

// Proxy CLOB API calls through our server to avoid CORS
async function clobProxy(endpoint: string, method: string, headers: Record<string, string>, data?: unknown) {
  const res = await fetch('/api/polymarket/clob', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, method, headers, data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `CLOB proxy error ${res.status}`);
  return json;
}

interface PolymarketSession {
  eoaAddress: string;
  safeAddress: string;
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

interface SessionState {
  safeAddress: string | null;
  eoaAddress: string | null;
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
    eoaAddress: null,
    clobReady: false,
    initializing: false,
    error: null,
    session: null,
  });

  const initializingRef = useRef(false);
  const restoredRef = useRef(false);

  // Try to restore session from localStorage (synchronously check on first render too)
  useEffect(() => {
    if (!authenticated) {
      setState(s => ({ ...s, safeAddress: null, eoaAddress: null, clobReady: false, session: null }));
      restoredRef.current = false;
      return;
    }

    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const session: PolymarketSession = JSON.parse(stored);
        restoredRef.current = true;
        setState(s => ({
          ...s,
          safeAddress: session.safeAddress,
          eoaAddress: session.eoaAddress,
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
      const eoaAddress = await signer.getAddress();

      // Derive Safe address from EOA (deterministic CREATE2)
      const safeAddress = deriveSafeAddress(eoaAddress);
      console.log('[polymarket] Derived Safe address:', safeAddress);

      // Step 1: Derive CLOB API credentials
      // We use the ClobClient to sign the auth message, then proxy the HTTP call
      const { ClobClient } = await import('@polymarket/clob-client');

      const clobClient = new ClobClient(
        CLOB_URL,
        137,
        signer as unknown as ethers.Wallet,
        undefined,
        2, // SignatureType.POLY_GNOSIS_SAFE
        safeAddress,
      );

      let creds: { key: string; secret: string; passphrase: string };
      try {
        creds = await clobClient.deriveApiKey();
        console.log('[polymarket] Derived API key');
      } catch {
        try {
          creds = await clobClient.createApiKey();
          console.log('[polymarket] Created API key');
        } catch (err) {
          console.warn('[polymarket] Direct API key creation failed, trying proxy...', err);
          // If direct call fails (CORS), try creating via sign + proxy
          // For now, create a session without API creds — trades will go through proxy
          const session: PolymarketSession = {
            eoaAddress,
            safeAddress,
            apiKey: '',
            apiSecret: '',
            passphrase: '',
          };

          localStorage.setItem(SESSION_KEY, JSON.stringify(session));

          setState({
            safeAddress,
            eoaAddress,
            clobReady: true,
            initializing: false,
            error: null,
            session,
          });

          console.log('[polymarket] Session initialized (no API key), Safe:', safeAddress);
          return;
        }
      }

      // Step 2: Save session
      const session: PolymarketSession = {
        eoaAddress,
        safeAddress,
        apiKey: creds.key,
        apiSecret: creds.secret,
        passphrase: creds.passphrase,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      setState({
        safeAddress,
        eoaAddress,
        clobReady: true,
        initializing: false,
        error: null,
        session,
      });

      console.log('[polymarket] Session initialized, Safe:', safeAddress);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize Polymarket session';
      console.error('[polymarket] Init error:', err);
      setState(s => ({ ...s, initializing: false, error: msg }));
    } finally {
      initializingRef.current = false;
    }
  }, [authenticated, ready, wallets]);

  // Auto-initialize when wallet connects and no session exists
  // Skip if we already restored from localStorage
  useEffect(() => {
    if (authenticated && ready && wallets.length > 0 && !state.clobReady && !state.initializing && !restoredRef.current) {
      // Check localStorage one more time to avoid race
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const session: PolymarketSession = JSON.parse(stored);
          restoredRef.current = true;
          setState(s => ({ ...s, safeAddress: session.safeAddress, eoaAddress: session.eoaAddress, clobReady: true, session }));
          return;
        } catch { /* ignore */ }
      }
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

    // Create order signature locally (this doesn't need CORS)
    const clobClient = new ClobClient(
      CLOB_URL,
      137,
      signer as unknown as ethers.Wallet,
      state.session.apiKey ? {
        key: state.session.apiKey,
        secret: state.session.apiSecret,
        passphrase: state.session.passphrase,
      } : undefined,
      2, // SignatureType.POLY_GNOSIS_SAFE
      state.session.safeAddress,
    );

    // Create the signed order locally
    const order = await clobClient.createMarketOrder({
      tokenID: params.tokenId,
      price: params.price,
      amount: params.amount,
      side: params.side === 'BUY' ? Side.BUY : Side.SELL,
    });

    // Post the order through our server-side proxy to avoid CORS
    const authHeaders: Record<string, string> = {};
    if (state.session.apiKey) {
      // Build HMAC auth headers for the CLOB API
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const { createHmac } = await import('crypto');
      const message = timestamp + 'POST' + '/order' + JSON.stringify(order);

      // Use the API secret to sign
      let signature = '';
      try {
        const hmac = createHmac('sha256', Buffer.from(state.session.apiSecret, 'base64'));
        hmac.update(message);
        signature = hmac.digest('base64');
      } catch {
        // crypto might not be available in browser, skip auth headers
      }

      if (signature) {
        authHeaders['POLY_API_KEY'] = state.session.apiKey;
        authHeaders['POLY_TIMESTAMP'] = timestamp;
        authHeaders['POLY_PASSPHRASE'] = state.session.passphrase;
        authHeaders['POLY_SIGNATURE'] = signature;
      }
    }

    try {
      const response = await clobProxy('/order', 'POST', authHeaders, order);
      return { orderID: response.orderID || response.orderIds?.[0] || 'submitted' };
    } catch (err) {
      // Fallback: try direct post (will fail on CORS but worth trying)
      console.warn('[polymarket] Proxy order failed, trying direct...', err);
      const response = await clobClient.postOrder(order);
      return { orderID: response.orderID || response.orderIds?.[0] || 'unknown' };
    }
  }, [state.session, wallets]);

  return {
    ...state,
    initSession,
    placeMarketOrder,
  };
}
