'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { usePolymarketSession } from '@/app/hooks/usePolymarketSession';
import { formatUSD, formatPercent } from '@/app/lib/utils';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

function CopyableAddress({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);
  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">{label}</span>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer"
        title={`Click to copy: ${address}`}
      >
        <span className="font-mono text-xs text-[var(--on-surface)]">{truncated}</span>
        <span className="material-symbols-outlined text-xs text-[var(--secondary)]">
          {copied ? 'check' : 'content_copy'}
        </span>
      </button>
    </div>
  );
}

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
  orderId: string | null;
  txSignature: string | null;
  closeTxSig: string | null;
  closePrice: number | null;
  realizedPnl: number | null;
  createdAt: string;
}

export default function ProfileClient() {
  const { login, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { safeAddress, eoaAddress, clobReady, initializing, error: sessionError, initSession, placeMarketOrder } = usePolymarketSession();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);

  const walletAddr = eoaAddress || wallets[0]?.address || safeAddress;

  // Fetch USDC balance for the trading wallet (Safe or EOA)
  const balanceAddr = safeAddress || walletAddr;
  useEffect(() => {
    if (!balanceAddr) {
      setUsdcBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        // USDC on Polygon: bridged + native
        const usdcAddresses = [
          '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        ];

        let totalBalance = 0;
        for (const usdcAddr of usdcAddresses) {
          try {
            const res = await fetch('https://polygon-bor-rpc.publicnode.com', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [
                  {
                    to: usdcAddr,
                    data: `0x70a08231000000000000000000000000${balanceAddr.slice(2)}`,
                  },
                  'latest',
                ],
              }),
            });
            const data = await res.json();
            if (data.result && data.result !== '0x' && data.result !== '0x0') {
              const raw = BigInt(data.result);
              totalBalance += Number(raw) / 1e6;
            }
          } catch {
            // Skip this contract if it fails
          }
        }
        setUsdcBalance(totalBalance.toFixed(2));
      } catch {
        setUsdcBalance(null);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [balanceAddr]);

  const fetchPositions = useCallback(() => {
    if (!authenticated || !walletAddr) {
      setLoading(false);
      return;
    }
    fetch(`/api/positions?wallet=${walletAddr}`)
      .then(r => r.json())
      .then(data => {
        setPositions(data.positions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authenticated, walletAddr]);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 15000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const handleSell = async (pos: Position) => {
    if (!authenticated || !safeAddress || !clobReady) return;

    setSelling(pos.id);
    try {
      const result = await placeMarketOrder({
        tokenId: pos.marketTicker,
        side: 'SELL',
        amount: pos.shares,
        price: pos.avgPrice,
        negRisk: false,
        tickSize: '0.01',
      });

      await fetch('/api/positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: pos.id,
          closeTxSig: result.orderID,
          closePrice: pos.avgPrice,
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

  if (!authenticated) {
    return (
      <div className="text-center py-24">
        <div className="w-20 h-20 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-4xl text-[var(--secondary)]">account_balance_wallet</span>
        </div>
        <h2 className="font-heading text-2xl font-black uppercase tracking-tight text-[var(--on-surface)] mb-2">
          Connect to View Portfolio
        </h2>
        <p className="text-[var(--secondary)] text-sm mb-6">Connect your wallet to view your positions and performance</p>
        <Button variant="primary" size="lg" onClick={login}>
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status !== 'open');

  const totalCost = openPositions.reduce((sum, p) => sum + p.costBasis, 0);
  const totalPotentialPayout = openPositions.reduce((sum, p) => sum + p.shares, 0);
  const totalUnrealizedPnl = totalPotentialPayout - totalCost;
  const totalRealizedPnl = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
  const totalBalance = totalCost + totalUnrealizedPnl + totalRealizedPnl;
  const winCount = closedPositions.filter(p => (p.realizedPnl || 0) > 0).length;
  const winRate = closedPositions.length > 0 ? (winCount / closedPositions.length) * 100 : 0;

  const filteredOpen = filter
    ? openPositions.filter(p => p.marketTitle.toLowerCase().includes(filter.toLowerCase()) || p.eventTitle.toLowerCase().includes(filter.toLowerCase()))
    : openPositions;

  return (
    <>
      {/* Header Summary */}
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-heading text-5xl font-black uppercase tracking-tighter text-[var(--on-surface)] mb-3">
              Portfolio Overview
            </h1>
            <div className="space-y-1.5">
              {(() => {
                const primaryWallet = eoaAddress || wallets[0]?.address || null;
                const email = user?.email?.address;
                return (
                  <>
                    {email && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">Email</span>
                        <span className="text-xs text-[var(--on-surface)]">{email}</span>
                      </div>
                    )}
                    {primaryWallet && (
                      <CopyableAddress label="EOA Wallet" address={primaryWallet} />
                    )}
                    {safeAddress && (
                      <CopyableAddress label="Safe (Trading)" address={safeAddress} />
                    )}
                    {!safeAddress && !initializing && authenticated && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">Safe Wallet</span>
                        <button
                          onClick={() => initSession()}
                          className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary-fixed)] px-2 py-0.5 rounded hover:bg-[var(--primary-fixed-dim)] transition-colors cursor-pointer"
                        >
                          Initialize Trading
                        </button>
                      </div>
                    )}
                    {!safeAddress && initializing && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">Safe Wallet</span>
                        <span className="text-xs text-[var(--secondary)] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-container)] animate-pulse" />
                          Initializing...
                        </span>
                      </div>
                    )}
                    {sessionError && (
                      <div className="text-[10px] text-red-500 mt-1">
                        Session error: {sessionError}
                      </div>
                    )}
                    {!primaryWallet && !safeAddress && !email && (
                      <p className="text-[var(--secondary)] font-medium tracking-wide">Connected</p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {/* USDC Balance */}
            {balanceAddr && (
              <div className="bg-[var(--on-surface)] p-5 rounded-xl text-white relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-20 h-20 bg-[var(--primary-container)]/20 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">USDC Balance</span>
                    <span className="text-[8px] font-bold text-slate-500 bg-white/10 px-1.5 py-0.5 rounded">Polygon</span>
                    {!safeAddress && (
                      <span className="text-[8px] font-bold text-amber-400 bg-white/10 px-1.5 py-0.5 rounded">EOA</span>
                    )}
                  </div>
                  <span className="font-heading text-3xl font-bold">
                    {usdcBalance !== null ? `$${usdcBalance}` : '...'}
                  </span>
                </div>
              </div>
            )}
            {/* Position Value */}
            <div className="bg-[var(--surface-container-lowest)] p-5 rounded-xl shadow-ambient border-l-4 border-[var(--primary-container)]">
              <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-[0.2em] mb-1 block">Position Value</span>
              <span className="font-heading text-3xl font-bold text-[var(--on-surface)]">{formatUSD(totalBalance)}</span>
              {totalUnrealizedPnl !== 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`flex items-center font-bold text-sm ${totalUnrealizedPnl >= 0 ? 'text-[var(--primary)]' : 'text-[var(--error)]'}`}>
                    <span className="material-symbols-outlined text-sm mr-1">
                      {totalUnrealizedPnl >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {totalUnrealizedPnl >= 0 ? '+' : ''}{totalCost > 0 ? ((totalUnrealizedPnl / totalCost) * 100).toFixed(1) : '0'}%
                  </span>
                  <span className="text-[var(--secondary)] text-xs font-medium">unrealized</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {positions.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient">
          <span className="material-symbols-outlined text-5xl text-[var(--surface-container-highest)] mb-4 block">monitoring</span>
          <h2 className="font-heading text-xl font-black uppercase tracking-tight text-[var(--on-surface)] mb-2">
            No positions yet
          </h2>
          <p className="text-sm text-[var(--secondary)]">Start trading to see your positions here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Performance Chart placeholder */}
          <div className="col-span-12 lg:col-span-8 bg-[var(--surface-container-lowest)] p-8 rounded-xl relative overflow-hidden shadow-ambient">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-heading text-xl font-bold uppercase tracking-tight text-[var(--on-surface)]">Performance Velocity</h3>
                <p className="text-[var(--secondary)] text-xs">Dynamic PnL aggregation across all positions</p>
              </div>
            </div>
            <div className="h-48 w-full flex items-end gap-1">
              {/* Simple bar chart from position data */}
              {openPositions.slice(0, 12).map((pos, i) => {
                const pnlRatio = pos.costBasis > 0 ? (pos.shares - pos.costBasis) / pos.costBasis : 0;
                const height = Math.max(10, Math.min(100, 50 + pnlRatio * 200));
                return (
                  <div key={pos.id} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t ${pnlRatio >= 0 ? 'bg-[var(--primary-container)]/20' : 'bg-[var(--error)]/20'}`}
                      style={{ height: `${height}%` }}
                    >
                      <div
                        className={`w-full rounded-t ${pnlRatio >= 0 ? 'bg-[var(--primary-container)]' : 'bg-[var(--error)]'}`}
                        style={{ height: `${Math.abs(pnlRatio) * 100}%`, minHeight: '4px' }}
                      />
                    </div>
                  </div>
                );
              })}
              {openPositions.length === 0 && (
                <div className="w-full text-center text-[var(--secondary)] text-sm py-12">No active positions to chart</div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Active Stakes — dark card */}
            <div className="flex-1 bg-[var(--on-surface)] p-6 rounded-xl text-white relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-[var(--primary-container)]/20 rounded-full blur-3xl" />
              <h4 className="font-heading text-sm font-bold uppercase tracking-widest text-[var(--primary-container)] mb-6">
                Active Stakes
              </h4>
              <div className="space-y-6">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Total Committed</span>
                  <span className="text-2xl font-heading font-bold">{formatUSD(totalCost)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Win Rate</span>
                    <span className="text-lg font-heading font-bold">{winRate.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Positions</span>
                    <span className="text-lg font-heading font-bold">{openPositions.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* P&L Summary */}
            <div className="flex-1 bg-[var(--surface-container-high)] p-6 rounded-xl">
              <h4 className="font-heading text-sm font-bold uppercase tracking-widest text-[var(--on-surface)] mb-4">
                P&L Summary
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--secondary)]">Unrealized</span>
                  <span className={`font-mono font-bold ${totalUnrealizedPnl >= 0 ? 'text-[var(--tertiary)]' : 'text-[var(--error)]'}`}>
                    {totalUnrealizedPnl >= 0 ? '+' : ''}{formatUSD(totalUnrealizedPnl)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--secondary)]">Realized</span>
                  <span className={`font-mono font-bold ${totalRealizedPnl >= 0 ? 'text-[var(--tertiary)]' : 'text-[var(--error)]'}`}>
                    {totalRealizedPnl >= 0 ? '+' : ''}{formatUSD(totalRealizedPnl)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[var(--surface-container-highest)]">
                  <span className="text-xs font-bold text-[var(--on-surface)]">Potential Payout</span>
                  <span className="font-mono font-bold text-lg text-[var(--on-surface)]">{formatUSD(totalPotentialPayout)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Open Positions Table */}
          <div className="col-span-12 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-2xl font-black uppercase tracking-tight text-[var(--on-surface)]">
                Active Predictions
              </h3>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input
                  className="pl-10 pr-4 py-2 bg-[var(--surface-container-low)] border-none rounded-md text-xs font-medium focus:ring-1 focus:ring-[var(--primary-container)] outline-none"
                  placeholder="Filter markets..."
                  type="text"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
              </div>
            </div>

            {filteredOpen.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-[0.2em] text-left">
                      <th className="px-6 py-2">Event / Position</th>
                      <th className="px-6 py-2">Side</th>
                      <th className="px-6 py-2">Stake</th>
                      <th className="px-6 py-2">Current Value</th>
                      <th className="px-6 py-2">Pot. Payout</th>
                      <th className="px-6 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpen.map(pos => {
                      const currentValue = pos.shares * pos.avgPrice;
                      const pnlPercent = pos.costBasis > 0 ? ((currentValue - pos.costBasis) / pos.costBasis) * 100 : 0;
                      const potPayout = pos.shares;

                      return (
                        <tr key={pos.id} className="bg-[var(--surface-container-lowest)] shadow-sm hover:shadow-md transition-shadow group">
                          <td className="px-6 py-5 rounded-l-xl">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 flex items-center justify-center rounded-md font-heading font-bold text-sm ${
                                pos.side === 'yes'
                                  ? 'bg-[var(--yes-bg)] text-[var(--yes)]'
                                  : 'bg-[var(--no-bg)] text-[var(--no)]'
                              }`}>
                                {pos.eventTitle.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-heading font-bold text-sm text-[var(--on-surface)]">{pos.marketTitle}</p>
                                <p className="text-[10px] text-[var(--secondary)] font-medium">{pos.eventTitle}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`text-xs font-bold uppercase ${pos.side === 'yes' ? 'text-[var(--yes)]' : 'text-[var(--no)]'}`}>
                              {pos.side}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-sm font-medium text-[var(--on-surface)] font-mono">{formatUSD(pos.costBasis)}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[var(--on-surface)] font-mono">{formatUSD(currentValue)}</span>
                              <span className={`text-[10px] font-bold ${pnlPercent >= 0 ? 'text-[var(--primary)]' : 'text-[var(--secondary)]'}`}>
                                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-sm font-bold text-[var(--on-surface)] font-mono">{formatUSD(potPayout)}</span>
                          </td>
                          <td className="px-6 py-5 rounded-r-xl text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 bg-[var(--primary-container)] rounded-full animate-pulse" />
                                In Play
                              </span>
                              <button
                                onClick={() => handleSell(pos)}
                                disabled={selling === pos.id || !clobReady}
                                className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--no-bg)] text-[var(--no)] rounded-full hover:bg-[var(--no)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {selling === pos.id ? 'Selling...' : 'Sell'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-[var(--secondary)] text-sm bg-[var(--surface-container-lowest)] rounded-xl">
                {filter ? 'No positions match your filter.' : 'No active positions.'}
              </div>
            )}
          </div>

          {/* Closed Positions */}
          {closedPositions.length > 0 && (
            <div className="col-span-12 mt-2">
              <h3 className="font-heading text-lg font-bold uppercase tracking-tight text-[var(--secondary)] mb-4">
                Closed Positions ({closedPositions.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                  <tbody>
                    {closedPositions.map(pos => (
                      <tr key={pos.id} className="bg-[var(--surface-container-lowest)] opacity-70 hover:opacity-100 transition-opacity">
                        <td className="px-6 py-4 rounded-l-xl">
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              pos.side === 'yes' ? 'bg-[var(--yes-bg)] text-[var(--yes)]' : 'bg-[var(--no-bg)] text-[var(--no)]'
                            }`}>
                              {pos.side.toUpperCase()}
                            </span>
                            <span className="font-heading font-bold text-sm">{pos.marketTitle}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm">{formatUSD(pos.costBasis)}</td>
                        <td className="px-6 py-4">
                          <span className={`font-mono font-bold text-sm ${(pos.realizedPnl || 0) >= 0 ? 'text-[var(--tertiary)]' : 'text-[var(--error)]'}`}>
                            {(pos.realizedPnl || 0) >= 0 ? '+' : ''}{formatUSD(pos.realizedPnl || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 rounded-r-xl text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            Closed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
