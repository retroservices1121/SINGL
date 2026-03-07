'use client';

import { useState, useEffect } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { privyConfig } from '@/app/lib/privy';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!PRIVY_APP_ID || !mounted) {
    return <>{children}</>;
  }

  const solanaConnectors = toSolanaWalletConnectors();
  const config = {
    ...privyConfig,
    externalWallets: {
      solana: { connectors: solanaConnectors },
    },
  };

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={config}>
      {children}
    </PrivyProvider>
  );
}
