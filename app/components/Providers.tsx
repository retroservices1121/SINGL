'use client';

import dynamic from 'next/dynamic';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

const PrivyWrapper = dynamic(
  () => import('./PrivyWrapper'),
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  return <PrivyWrapper appId={PRIVY_APP_ID}>{children}</PrivyWrapper>;
}
