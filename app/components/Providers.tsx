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

  if (!mounted) {
    return <>{children}</>;
  }

  return <PrivyWalletProvider>{children}</PrivyWalletProvider>;
}
