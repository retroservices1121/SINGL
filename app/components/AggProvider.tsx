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
import { useSiwsAuthMethod } from '@agg-build/auth/siws';
import { getAggClient, AGG_APP_ID } from '@/app/lib/agg';

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
  const siws = useSiwsAuthMethod({ statement: 'Sign in to SINGL' });
  const methods = useMemo(
    () => [
      siwe,
      siws,
      createGoogleAuthMethod({ redirectUrl: AUTH_REDIRECT }),
      createTwitterAuthMethod({ redirectUrl: AUTH_REDIRECT }),
      createEmailAuthMethod({ redirectUrl: AUTH_REDIRECT }),
    ],
    [siwe, siws],
  );
  return <AggAuthProvider methods={methods}>{children}</AggAuthProvider>;
}

export default function AggProvider({ children }: { children: React.ReactNode }) {
  if (!AGG_APP_ID) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0b0f', color: 'white', padding: 24, fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>AGG config missing</h1>
          <p style={{ fontSize: 14, color: '#bbb', lineHeight: 1.6 }}>
            <code>NEXT_PUBLIC_AGG_APP_ID</code> was empty when this build ran.
            Set it in Railway → Variables and trigger a rebuild —
            <code>NEXT_PUBLIC_*</code> vars are inlined at build time, so a
            redeploy without a fresh build won&apos;t fix it.
          </p>
        </div>
      </div>
    );
  }
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
