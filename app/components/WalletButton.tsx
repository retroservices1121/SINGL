'use client';

import { useState, useEffect } from 'react';
import { useAggAuth } from '@agg-build/hooks';
import { useAggAuthFlow } from '@agg-build/auth';
import { useAggTrading } from '@/app/hooks/useAggTrading';

export default function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <button className="gradient-cta text-white px-6 py-2 rounded-md font-bold text-sm tracking-tight shadow-lg opacity-50 cursor-default">
        Connect Wallet
      </button>
    );
  }

  return <WalletButtonInner />;
}

function WalletButtonInner() {
  const { isAuthenticated, user, signOut } = useAggAuth();
  const { startMethod } = useAggAuthFlow();
  const { walletAddress, initializing } = useAggTrading();

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => startMethod('siwe')}
        className="gradient-cta text-white px-6 py-2 rounded-md font-bold text-sm tracking-tight shadow-lg shadow-[var(--primary-container)]/20 hover:scale-[1.02] transition-transform cursor-pointer"
      >
        Connect Wallet
      </button>
    );
  }

  const userEmail = (user as { email?: string | null } | undefined)?.email;
  const userName = (user as { displayName?: string | null } | undefined)?.displayName;
  const displayAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : userEmail || userName || 'Connected';

  return (
    <button
      onClick={() => signOut()}
      className="px-4 py-2 text-sm font-bold bg-[var(--surface-container-high)] text-[var(--on-surface)] rounded-md hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer flex items-center gap-2"
    >
      {initializing && (
        <span className="w-2 h-2 rounded-full bg-[var(--primary-container)] animate-pulse" />
      )}
      <span className="font-mono text-xs">{displayAddress}</span>
    </button>
  );
}
