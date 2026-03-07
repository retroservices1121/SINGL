import type { PrivyClientConfig } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';

const solanaConnectors = toSolanaWalletConnectors();

export const privyConfig: PrivyClientConfig = {
  appearance: {
    theme: 'light',
    accentColor: '#F2841A',
    logo: '/singls-logo.svg',
  },
  loginMethods: ['email', 'wallet', 'google'],
  externalWallets: {
    solana: {
      connectors: solanaConnectors,
    },
  },
  embeddedWallets: {
    solana: {
      createOnLogin: 'users-without-wallets',
    },
  },
};
