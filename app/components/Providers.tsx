'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const PrivyWalletProvider = dynamic(() => import('./PrivyWalletProvider'), {
  ssr: false,
  loading: () => null,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render children at all until mounted + wrapped in Privy
  // This prevents hooks like usePrivy/useWallets from being called outside the provider
  if (!mounted) {
    return null;
  }

  return <PrivyWalletProvider>{children}</PrivyWalletProvider>;
}
