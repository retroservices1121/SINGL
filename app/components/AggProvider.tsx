'use client';

import { useMemo } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, polygon, base, baseSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AggProvider as AggHooksProvider } from '@agg-build/hooks';
import { ToastProvider } from '@agg-build/ui';
import {
  AggAuthProvider,
  createGoogleAuthMethod,
  createTwitterAuthMethod,
  createEmailAuthMethod,
} from '@agg-build/auth';
import { useSiweAuthMethod } from '@agg-build/auth/siwe';
// SIWS (Solana sign-in) requires a @solana/wallet-adapter-react
// WalletProvider in the tree. Skipped until we wire the Solana
// adapter — including it without the provider crashes the app.
import { getAggClient, AGG_APP_ID } from '@/app/lib/agg';

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';
const AUTH_REDIRECT = process.env.NEXT_PUBLIC_AGG_AUTH_REDIRECT || '';

const wagmiConfig = createConfig({
  // baseSepolia: the Spredd Markets marketplace (on-chain FPMM markets) lives
  // on Base Sepolia for testnet.
  chains: [mainnet, polygon, base, baseSepolia],
  connectors: [
    injected(),
    ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID, showQrModal: true })] : []),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'),
  },
});

// React Query is what the AGG hooks (useSearch, useVenueEvent, EventListItem)
// run on. With the default config (staleTime 0, refetchOnWindowFocus true)
// every component mount, re-render, and tab-focus refires the slow ~3s
// agg.market calls. Cache data for a minute, keep it 10 min for back-nav,
// and stop refetching on focus — cuts redundant agg traffic dramatically.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
        {/* Two-part fix for white/blue AGG surfaces (trade panel, market
            tiles, head-to-head, pick'em, modals, dropdowns):

            1. theme:'dark' — AGG reads this from its UI config
               (useSdkUiConfig → isDarkTheme = theme === 'dark') and picks
               surface/text colors in JS. Default is "light", so without
               it AGG paints surfaces white regardless of CSS variables.

            2. rootClassName:'partner-theme dark' — AGG renders its own
               page/trade/modal/dropdown roots as
               cn(AGG_ROOT_CLASS_NAME='agg-root', rootClassName, …). Those
               nested .agg-root wrappers do NOT carry `partner-theme`, so
               our globals.css `.agg-root.partner-theme.dark` overrides
               never bind to them and AGG's own defaults (blue primary,
               light surfaces, or its #fe8740 dark) win on the AGG subtree.
               Injecting our classes here makes every AGG wrapper read
               `agg-root partner-theme dark` so our brand vars apply. This
               also fixes portaled modals/dropdowns that mount outside the
               themed <body>. */}
        <AggHooksProvider
          client={client}
          config={{ general: { theme: 'dark', rootClassName: 'partner-theme dark' } }}
        >
          {/* ToastProvider surfaces AGG's internal validation /
              save errors (e.g. ProfileModal's "username must be ≥ 3
              chars") as visible toasts. Without it, those errors fall
              through to console.error and the user sees nothing. */}
          <ToastProvider>
            <AuthMethods>{children}</AuthMethods>
          </ToastProvider>
        </AggHooksProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
