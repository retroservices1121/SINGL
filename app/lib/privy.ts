import type { PrivyClientConfig } from '@privy-io/react-auth';

export const privyConfig: PrivyClientConfig = {
  appearance: {
    theme: 'light',
    accentColor: '#F2841A',
    logo: '/singls-logo.svg',
  },
  loginMethods: ['email', 'wallet', 'google'],
  embeddedWallets: {
    solana: {
      createOnLogin: 'users-without-wallets',
    },
  },
};
