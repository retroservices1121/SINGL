'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { formatUSD, formatPercent } from '@/app/lib/utils';
import Button from '../components/ui/Button';

interface Position {
  id: string;
  marketTicker: string;
  marketTitle: string;
  eventSlug: string;
  eventTitle: string;
  side: string;
  shares: number;
  avgPrice: number;
  costBasis: number;
  status: string;
  createdAt: string;
}

export default function ProfileClient() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !publicKey) {
      setLoading(false);
      return;
    }

    fetch(`/api/positions?wallet=${publicKey.toBase58()}`)
      .then(r => r.json())
      .then(data => {
        setPositions(data.positions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [connected, publicKey]);

  if (!connected) {
    return (
      <div className="text-center py-16 bg-[var(--paper)] border border-[var(--border)] rounded-xl">
        <div className="text-4xl mb-3">👛</div>
        <p className="text-[var(--text-sec)] text-sm mb-4">Connect your wallet to view positions</p>
        <Button variant="primary" size="md" onClick={() => setVisible(true)}>
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-[var(--text-dim)]">Loading positions...</div>
    );
  }

  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status !== 'open');

  if (positions.length === 0) {
    return (
      <div className="text-center py-16 bg-[var(--paper)] border border-[var(--border)] rounded-xl">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-[var(--text-sec)] text-sm">No positions yet. Start trading to see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {openPositions.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)] mb-3">
            Open Positions ({openPositions.length})
          </h2>
          <div className="space-y-3">
            {openPositions.map(pos => (
              <PositionCard key={pos.id} position={pos} />
            ))}
          </div>
        </section>
      )}

      {closedPositions.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)] mb-3">
            Closed Positions ({closedPositions.length})
          </h2>
          <div className="space-y-3">
            {closedPositions.map(pos => (
              <PositionCard key={pos.id} position={pos} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PositionCard({ position }: { position: Position }) {
  const potentialPayout = position.shares;
  const potentialProfit = potentialPayout - position.costBasis;
  const isOpen = position.status === 'open';

  return (
    <div className={`bg-[var(--paper)] border border-[var(--border)] rounded-xl p-4 ${!isOpen ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-heading text-sm font-semibold text-[var(--text)] leading-tight">
            {position.marketTitle}
          </h4>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">{position.eventTitle}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          position.side === 'yes'
            ? 'bg-[var(--yes-bg)] text-[var(--yes)]'
            : 'bg-[var(--no-bg)] text-[var(--no)]'
        }`}>
          {position.side.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[var(--text-dim)]">Shares</span>
          <div className="font-mono font-semibold">{position.shares.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-[var(--text-dim)]">Avg Price</span>
          <div className="font-mono font-semibold">{formatPercent(position.avgPrice)}</div>
        </div>
        <div>
          <span className="text-[var(--text-dim)]">Cost</span>
          <div className="font-mono font-semibold">{formatUSD(position.costBasis)}</div>
        </div>
        <div>
          <span className="text-[var(--text-dim)]">{isOpen ? 'Potential' : 'Result'}</span>
          <div className={`font-mono font-semibold ${potentialProfit >= 0 ? 'text-[var(--yes)]' : 'text-[var(--no)]'}`}>
            {potentialProfit >= 0 ? '+' : ''}{formatUSD(potentialProfit)}
          </div>
        </div>
      </div>
    </div>
  );
}
