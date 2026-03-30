'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { polygon } from 'viem/chains';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

export default function PrivyWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        defaultChain: polygon,
        supportedChains: [polygon],
        appearance: {
          theme: 'light',
          accentColor: '#F2841A',
          logo: '/favicon.ico',
        },
        loginMethods: ['email', 'wallet', 'twitter'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
