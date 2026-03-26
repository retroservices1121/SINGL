'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { Side } from '@polymarket/clob-client';
import { getCreate2Address, keccak256, encodeAbiParameters } from 'viem';

// Polymarket Safe proxy constants (from docs: https://docs.polymarket.com/builders/overview)
const SAFE_INIT_CODE_HASH = '0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf' as `0x${string}`;
const SAFE_FACTORY = '0xaacfeea03eb1561c4e67d661e40682bd20e3541b' as `0x${string}`;

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
// Server builds L2 HMAC auth headers using the provided credentials
async function clobProxy(
  endpoint: string,
  method: string,
  data: unknown,
  creds?: { apiKey: string; apiSecret: string; passphrase: string },
) {
  const res = await fetch('/api/polymarket/clob', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint,
      method,
      data,
      apiKey: creds?.apiKey,
      apiSecret: creds?.apiSecret,
      passphrase: creds?.passphrase,
    }),
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
        // Validate: if safeAddress was derived with old factory, clear and re-init
        if (session.safeAddress && session.eoaAddress) {
          const expected = deriveSafeAddress(session.eoaAddress);
          if (expected.toLowerCase() !== session.safeAddress.toLowerCase()) {
            console.log('[polymarket] Safe address mismatch (factory updated), clearing session');
            localStorage.removeItem(SESSION_KEY);
            return; // Will trigger auto-init with correct factory
          }
        }
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

    if (!state.session.apiKey) {
      throw new Error('API credentials not available. Please reconnect your wallet.');
    }

    const wallet = wallets[0];
    const rawProvider = await wallet.getEthereumProvider();
    const provider = new ethers.providers.Web3Provider(rawProvider as ethers.providers.ExternalProvider);
    const signer = provider.getSigner();

    const { ClobClient } = await import('@polymarket/clob-client');

    // Create order signature locally (EIP-712 signing happens in browser)
    const clobClient = new ClobClient(
      CLOB_URL,
      137,
      signer as unknown as ethers.Wallet,
      {
        key: state.session.apiKey,
        secret: state.session.apiSecret,
        passphrase: state.session.passphrase,
      },
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

    // Post order through server-side proxy (server builds L2 HMAC headers)
    try {
      const response = await clobProxy('/order', 'POST', order, {
        apiKey: state.session.apiKey,
        apiSecret: state.session.apiSecret,
        passphrase: state.session.passphrase,
      });
      return { orderID: response.orderID || response.orderIds?.[0] || 'submitted' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes('region') || msg.includes('geoblock') || msg.includes('restricted')) {
        throw new Error('Polymarket trading is restricted in your server region. Contact support.');
      }

      throw new Error(`Trade failed: ${msg}`);
    }
  }, [state.session, wallets]);

  return {
    ...state,
    initSession,
    placeMarketOrder,
  };
}
