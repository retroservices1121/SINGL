'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
// AccessGate intentionally not imported — the SINGL early-access gate
// is disabled for now. To re-enable, import AccessGate and wrap the
// children with <AccessGate>{children}</AccessGate>. Also turn the
// "Require early access code" setting back on in the AGG dashboard.

const AggProvider = dynamic(() => import('./AggProvider'), {
  ssr: false,
  loading: () => null,
});

const AggModals = dynamic(() => import('./AggModals'), {
  ssr: false,
  loading: () => null,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AggProvider>
      {children}
      {/* AGG deposit/withdraw modals listen for window events fired by
          <ConnectButton> and <UserProfilePage>. Must be inside AggProvider
          so they can read the auth context. */}
      <AggModals />
    </AggProvider>
  );
}
