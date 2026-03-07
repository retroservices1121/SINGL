'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { truncateAddress } from '@/app/lib/utils';
import Button from './ui/Button';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function WalletButtonInner() {
  const { login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  if (!ready) {
    return <div className="w-32 h-9 bg-[var(--sand)] rounded-lg animate-pulse" />;
  }

  if (!authenticated) {
    return (
      <Button variant="primary" size="sm" onClick={login}>
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {wallet && (
        <span className="text-xs font-mono text-[var(--text-sec)] bg-[var(--sand)] px-2 py-1 rounded">
          {truncateAddress(wallet.address)}
        </span>
      )}
      <Button variant="ghost" size="sm" onClick={logout}>
        Disconnect
      </Button>
    </div>
  );
}

export default function WalletButton() {
  if (!PRIVY_APP_ID) {
    return (
      <Button variant="primary" size="sm" disabled>
        Connect Wallet
      </Button>
    );
  }

  return <WalletButtonInner />;
}
