'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { MARKETS_CHAIN_ID } from '@/app/lib/marketsAbi';

// Connect an EVM wallet + ensure it's on Base Sepolia. The marketplace trades
// directly on-chain (not via AGG), so it needs its own wallet connection.
export default function MarketWalletBar() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const injected = connectors.find(c => c.type === 'injected') ?? connectors[0];
  const wrongChain = isConnected && chainId !== MARKETS_CHAIN_ID;

  if (!isConnected) {
    return (
      <button
        type="button"
        onClick={() => injected && connect({ connector: injected })}
        disabled={isPending || !injected}
        className="px-4 py-2 rounded-lg bg-[var(--primary-container)] text-white text-xs font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
      >
        {isPending ? 'Connecting…' : 'Connect Wallet'}
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: MARKETS_CHAIN_ID })}
        className="px-4 py-2 rounded-lg bg-[var(--no)] text-white text-xs font-bold uppercase tracking-widest cursor-pointer"
      >
        Switch to Base Sepolia
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => disconnect()}
      className="px-3 py-2 rounded-lg bg-[var(--surface-container-high)] text-[var(--on-surface)] text-xs font-bold font-mono cursor-pointer"
      title="Disconnect"
    >
      {address?.slice(0, 6)}…{address?.slice(-4)}
    </button>
  );
}
