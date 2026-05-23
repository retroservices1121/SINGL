'use client';

import { useMemo } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, polygon, base } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AggProvider as AggHooksProvider } from '@agg-build/hooks';
import {
  AggAuthProvider,
  createGoogleAuthMethod,
  createTwitterAuthMethod,
  createEmailAuthMethod,
} from '@agg-build/auth';
import { useSiweAuthMethod } from '@agg-build/auth/siwe';
import { getAggClient } from '@/app/lib/agg';

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';
const AUTH_REDIRECT = process.env.NEXT_PUBLIC_AGG_AUTH_REDIRECT || '';

const wagmiConfig = createConfig({
  chains: [mainnet, polygon, base],
  connectors: [
    injected(),
    ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true })] : []),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
  },
});

const queryClient = new QueryClient();

function AuthMethods({ children }: { children: React.ReactNode }) {
  const siwe = useSiweAuthMethod({ statement: 'Sign in to SINGL' });
  const methods = useMemo(
    () => [
      siwe,
      createGoogleAuthMethod({ redirectUrl: AUTH_REDIRECT }),
      createTwitterAuthMethod({ redirectUrl: AUTH_REDIRECT }),
      createEmailAuthMethod({ redirectUrl: AUTH_REDIRECT }),
    ],
    [siwe],
  );
  return <AggAuthProvider methods={methods}>{children}</AggAuthProvider>;
}

export default function AggProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getAggClient(), []);
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AggHooksProvider client={client}>
          <AuthMethods>{children}</AuthMethods>
        </AggHooksProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
