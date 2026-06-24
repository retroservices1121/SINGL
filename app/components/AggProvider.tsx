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
        {/* config.general.theme drives AGG's *runtime* theming. AGG
            components read `theme` from this UI config (useAggUiConfig →
            isDarkTheme = theme === 'dark') and pick surface/text colors
            in JS — it is NOT derived from the `dark` class on <body>.
            defaultAggUiConfig.general.theme is "light", so without this
            every AGG surface (trade panel, orderbook, market tiles)
            renders white no matter what CSS variables we override. Our
            globals.css partner-theme block only re-skins the CSS custom
            properties; this flips AGG's JS theme switch to match. */}
        <AggHooksProvider client={client} config={{ general: { theme: 'dark' } }}>
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
