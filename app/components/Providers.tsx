'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AccessGate from './AccessGate';

const AggProvider = dynamic(() => import('./AggProvider'), {
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
      <AccessGate>{children}</AccessGate>
    </AggProvider>
  );
}
