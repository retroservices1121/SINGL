'use client';

import { useState, useEffect } from 'react';
import { usePolymarketSession } from '@/app/hooks/usePolymarketSession';

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
  let authenticated = false;
  let login = () => {};
  let logout = () => {};
  let user: { email?: { address: string } } | null = null;

  try {
    const privy = require('@privy-io/react-auth');
    const result = privy.usePrivy();
    authenticated = result.authenticated;
    login = result.login;
    logout = result.logout;
    user = result.user;
  } catch {
    // Not inside PrivyProvider yet
  }

  const { safeAddress, initializing } = usePolymarketSession();

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="gradient-cta text-white px-6 py-2 rounded-md font-bold text-sm tracking-tight shadow-lg shadow-[var(--primary-container)]/20 hover:scale-[1.02] transition-transform cursor-pointer"
      >
        Connect Wallet
      </button>
    );
  }

  const displayAddress = safeAddress
    ? `${safeAddress.slice(0, 6)}...${safeAddress.slice(-4)}`
    : user?.email?.address || 'Connected';

  return (
    <button
      onClick={logout}
      className="px-4 py-2 text-sm font-bold bg-[var(--surface-container-high)] text-[var(--on-surface)] rounded-md hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer flex items-center gap-2"
    >
      {initializing && (
        <span className="w-2 h-2 rounded-full bg-[var(--primary-container)] animate-pulse" />
      )}
      <span className="font-mono text-xs">{displayAddress}</span>
    </button>
  );
}
