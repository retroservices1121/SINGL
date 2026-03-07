'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const WalletProviders = dynamic(() => import('./WalletProviders'), {
  ssr: false,
  loading: () => null,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <WalletProviders>{children}</WalletProviders>;
}
