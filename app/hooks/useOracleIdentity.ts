'use client';

import { useEffect, useState } from 'react';
import { useAggAuth, getWalletAddressFromUserProfile } from '@agg-build/hooks';

export interface OracleIdentity {
  aggUserId: string | null;
  walletAddress: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Centralizes how the Oracle game reads the signed-in identity (AGG user id +
// wallet). Also kicks a one-shot SPRDD balance sync so the hold-to-multiply
// tier is fresh whenever a wallet is connected.
export function useOracleIdentity(): OracleIdentity {
  const { isAuthenticated, user, isLoading } = useAggAuth();
  const [synced, setSynced] = useState<string | null>(null);

  const walletAddress = user ? getWalletAddressFromUserProfile(user) ?? null : null;
  const aggUserId = user ? (user as { id?: string }).id ?? null : null;

  useEffect(() => {
    if (!aggUserId || !walletAddress || synced === walletAddress) return;
    setSynced(walletAddress);
    fetch('/api/oracle/sync-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aggUserId, walletAddress }),
    }).catch(() => {});
  }, [aggUserId, walletAddress, synced]);

  return { aggUserId, walletAddress, isAuthenticated, loading: isLoading };
}
