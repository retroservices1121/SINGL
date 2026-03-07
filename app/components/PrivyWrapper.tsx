'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { privyConfig } from '@/app/lib/privy';

const solanaConnectors = toSolanaWalletConnectors();

const config = {
  ...privyConfig,
  externalWallets: {
    solana: {
      connectors: solanaConnectors,
    },
  },
};

export default function PrivyWrapper({
  appId,
  children,
}: {
  appId: string;
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider appId={appId} config={config}>
      {children}
    </PrivyProvider>
  );
}
