'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { formatUSD, formatPercent } from '@/app/lib/utils';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

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
  txSignature: string | null;
  closeTxSig: string | null;
  closePrice: number | null;
  realizedPnl: number | null;
  createdAt: string;
}

export default function ProfileClient() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selling, setSelling] = useState<string | null>(null);

  const fetchPositions = useCallback(() => {
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

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const handleSell = async (pos: Position) => {
    if (!connected || !publicKey || !signTransaction) return;

    setSelling(pos.id);
    try {
      // Build sell transaction
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          marketTicker: pos.marketTicker,
          side: pos.side,
          amount: pos.shares,
          action: 'sell',
        }),
      });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
        setSelling(null);
        return;
      }

      if (!data.transaction?.transaction) {
        alert('No transaction returned for sell order.');
        setSelling(null);
        return;
      }

      const { VersionedTransaction } = await import('@solana/web3.js');
      const txBuffer = Buffer.from(data.transaction.transaction, 'base64');
      const tx = VersionedTransaction.deserialize(txBuffer);

      const signedTx = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction(signature, 'confirmed');

      // Record the close
      await fetch('/api/positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: pos.id,
          closeTxSig: signature,
          closePrice: pos.avgPrice, // approximate — real price comes from on-chain
        }),
      });

      fetchPositions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sell failed';
      if (!msg.includes('rejected')) {
        alert(msg);
      }
    }
    setSelling(null);
  };

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

  // Portfolio summary
  const totalCost = openPositions.reduce((sum, p) => sum + p.costBasis, 0);
  const totalPotentialPayout = openPositions.reduce((sum, p) => sum + p.shares, 0);
  const totalUnrealizedPnl = totalPotentialPayout - totalCost;
  const totalRealizedPnl = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);

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
      {/* Portfolio Summary */}
      <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-3">Portfolio Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-[var(--text-dim)]">Invested</span>
            <div className="font-mono font-bold text-lg">{formatUSD(totalCost)}</div>
          </div>
          <div>
            <span className="text-xs text-[var(--text-dim)]">Potential Payout</span>
            <div className="font-mono font-bold text-lg">{formatUSD(totalPotentialPayout)}</div>
          </div>
          <div>
            <span className="text-xs text-[var(--text-dim)]">Unrealized P&L</span>
            <div className={`font-mono font-bold text-lg ${totalUnrealizedPnl >= 0 ? 'text-[var(--yes)]' : 'text-[var(--no)]'}`}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}{formatUSD(totalUnrealizedPnl)}
            </div>
          </div>
          <div>
            <span className="text-xs text-[var(--text-dim)]">Realized P&L</span>
            <div className={`font-mono font-bold text-lg ${totalRealizedPnl >= 0 ? 'text-[var(--yes)]' : 'text-[var(--no)]'}`}>
              {totalRealizedPnl >= 0 ? '+' : ''}{formatUSD(totalRealizedPnl)}
            </div>
          </div>
        </div>
      </div>

      {/* Open Positions */}
      {openPositions.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)] mb-3">
            Open Positions ({openPositions.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {openPositions.map(pos => (
              <PositionCard
                key={pos.id}
                position={pos}
                expanded={expandedId === pos.id}
                onToggle={() => setExpandedId(expandedId === pos.id ? null : pos.id)}
                onSell={() => handleSell(pos)}
                selling={selling === pos.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Closed Positions */}
      {closedPositions.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)] mb-3">
            Closed Positions ({closedPositions.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {closedPositions.map(pos => (
              <PositionCard
                key={pos.id}
                position={pos}
                expanded={expandedId === pos.id}
                onToggle={() => setExpandedId(expandedId === pos.id ? null : pos.id)}
                selling={false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PositionCard({ position, expanded, onToggle, onSell, selling }: {
  position: Position;
  expanded: boolean;
  onToggle: () => void;
  onSell?: () => void;
  selling: boolean;
}) {
  const isOpen = position.status === 'open';
  const potentialPayout = position.shares;
  const unrealizedPnl = potentialPayout - position.costBasis;
  const pnlPercent = position.costBasis > 0 ? (unrealizedPnl / position.costBasis) * 100 : 0;

  const date = new Date(position.createdAt);
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`bg-[var(--paper)] border border-[var(--border)] rounded-lg overflow-hidden transition-all ${
        !isOpen ? 'opacity-60' : ''
      } ${expanded ? 'ring-1 ring-[var(--orange)]' : ''}`}
    >
      {/* Main row — clickable */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 text-left cursor-pointer hover:bg-[var(--sand)] transition-colors"
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
              position.side === 'yes'
                ? 'bg-[var(--yes-bg)] text-[var(--yes)]'
                : 'bg-[var(--no-bg)] text-[var(--no)]'
            }`}>
              {position.side.toUpperCase()}
            </span>
            <h4 className="text-xs font-semibold text-[var(--text)] leading-tight truncate">
              {position.marketTitle}
            </h4>
          </div>
          <div className={`font-mono font-bold text-xs shrink-0 ml-2 ${
            isOpen
              ? unrealizedPnl >= 0 ? 'text-[var(--yes)]' : 'text-[var(--no)]'
              : (position.realizedPnl || 0) >= 0 ? 'text-[var(--yes)]' : 'text-[var(--no)]'
          }`}>
            {isOpen
              ? `${unrealizedPnl >= 0 ? '+' : ''}${formatUSD(unrealizedPnl)}`
              : `${(position.realizedPnl || 0) >= 0 ? '+' : ''}${formatUSD(position.realizedPnl || 0)}`
            }
            <span className="text-[var(--text-dim)] font-normal ml-1">
              ({isOpen ? `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(1)}%` : 'Closed'})
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--text-dim)]">{dateStr} {timeStr}</span>
          <div className="flex gap-3 font-mono text-[var(--text-sec)]">
            <span>{position.shares.toFixed(1)} shares</span>
            <span>@ {formatPercent(position.avgPrice)}</span>
            <span>{formatUSD(position.costBasis)}</span>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-3 py-2 bg-[var(--cream)]">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 text-[11px]">
              {position.txSignature && (
                <div>
                  <span className="text-[var(--text-dim)]">Buy Tx: </span>
                  <a
                    href={`https://solscan.io/tx/${position.txSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--orange)] hover:underline font-mono"
                  >
                    {position.txSignature.slice(0, 8)}...{position.txSignature.slice(-8)}
                  </a>
                </div>
              )}
              {position.closeTxSig && (
                <div>
                  <span className="text-[var(--text-dim)]">Sell Tx: </span>
                  <a
                    href={`https://solscan.io/tx/${position.closeTxSig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--orange)] hover:underline font-mono"
                  >
                    {position.closeTxSig.slice(0, 8)}...{position.closeTxSig.slice(-8)}
                  </a>
                </div>
              )}
            </div>

            {isOpen && onSell && (
              <Button
                variant="no"
                size="sm"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onSell(); }}
                disabled={selling}
                className="flex items-center gap-1.5"
              >
                {selling ? <><Spinner size="sm" /> Selling...</> : 'Sell Position'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
