'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
// import { usePolymarketSession } from '@/app/hooks/usePolymarketSession';
import { useSynthesisTrading } from '@/app/hooks/useSynthesisTrading';
import { formatVolume, formatUSD } from '@/app/lib/utils';
import Spinner from '@/app/components/ui/Spinner';
import Link from 'next/link';

interface LeaderEntry {
  rank: number;
  walletAddress: string;
  totalVolume: number;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
}

export default function LeaderboardClient() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const { authenticated } = usePrivy();
  const { walletAddress } = useSynthesisTrading();

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        setLeaders(data.leaders || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  const visible = showAll ? leaders : leaders.slice(0, 7);
  const top3 = leaders.slice(0, 3);
  const userEntry = walletAddress
    ? leaders.find(l => l.walletAddress.toLowerCase() === walletAddress.toLowerCase())
    : null;

  return (
    <>
      {/* Header */}
      <div className="mb-12">
        <h1 className="font-heading font-extrabold text-5xl md:text-7xl uppercase tracking-tighter text-[var(--on-surface)] mb-2">
          Global Ranking
        </h1>
        <p className="text-[var(--secondary)] max-w-2xl text-lg">
          Real-time market analytics and high-volume traders. Clinical precision.
        </p>
      </div>

      {/* Prize Pool Banner */}
      <div className="mb-8 bg-[var(--surface-container-lowest)] rounded-xl p-6 shadow-ambient border border-[var(--primary-fixed)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[var(--primary-container)]">emoji_events</span>
          <h3 className="text-sm font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
            $250 USDC Prize Pool
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-[var(--primary-container)] text-white text-[9px] font-bold uppercase tracking-widest">
            Live
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[var(--primary-fixed)] rounded-lg p-3 text-center">
            <div className="text-[9px] font-bold text-[var(--primary-container)] uppercase tracking-widest mb-1">1st Place</div>
            <div className="font-mono text-2xl font-bold text-[var(--on-surface)]">$125</div>
            <div className="text-[9px] text-[var(--secondary)] mt-0.5">USDC</div>
          </div>
          <div className="bg-[var(--surface-container-low)] rounded-lg p-3 text-center">
            <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-1">2nd Place</div>
            <div className="font-mono text-2xl font-bold text-[var(--on-surface)]">$75</div>
            <div className="text-[9px] text-[var(--secondary)] mt-0.5">USDC</div>
          </div>
          <div className="bg-[var(--surface-container-low)] rounded-lg p-3 text-center">
            <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-1">3rd Place</div>
            <div className="font-mono text-2xl font-bold text-[var(--on-surface)]">$50</div>
            <div className="text-[9px] text-[var(--secondary)] mt-0.5">USDC</div>
          </div>
        </div>
        <p className="text-[10px] text-[var(--secondary)] mt-3">Minimum $1,000 total volume required to qualify.</p>
      </div>

      {leaders.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient">
          <span className="material-symbols-outlined text-5xl text-[var(--surface-container-highest)] mb-4 block">leaderboard</span>
          <h2 className="font-heading text-xl font-black uppercase tracking-tight text-[var(--on-surface)] mb-2">
            No traders yet
          </h2>
          <p className="text-sm text-[var(--secondary)]">
            Be the first to trade and claim the top spot.
          </p>
        </div>
      ) : (
        <>
          {/* Podium — Top 3 Asymmetric Grid */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 items-end">
              {/* Rank 2 */}
              {top3[1] ? (
                <PodiumCard leader={top3[1]} className="order-2 md:order-1" />
              ) : (
                <div className="order-2 md:order-1" />
              )}

              {/* Rank 1 — Featured */}
              <div className="order-1 md:order-2 bg-white p-10 rounded-xl relative border-t-4 border-[var(--primary-container)] shadow-2xl shadow-orange-500/10 scale-105 z-10">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--primary-container)] text-white font-heading font-black px-6 py-2 text-3xl">
                  #01
                </div>
                <div className="flex flex-col items-center gap-6 pt-4">
                  <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[var(--primary-container)] to-orange-300">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-[var(--primary-container)]">person</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="font-heading font-black text-3xl tracking-tight">
                      {top3[0].walletAddress.slice(0, 6)}...{top3[0].walletAddress.slice(-4)}
                    </h3>
                    <p className="text-[var(--primary-container)] text-sm font-bold uppercase tracking-[0.2em] mt-1">
                      Top Trader
                    </p>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-8 border-t border-slate-50 pt-6">
                    <div className="text-center">
                      <span className="block text-[10px] text-[var(--secondary)] font-bold uppercase">Total Volume</span>
                      <span className="font-mono text-2xl font-bold">{formatVolume(top3[0].totalVolume)}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] text-[var(--secondary)] font-bold uppercase">Total Profit</span>
                      <span className={`font-mono text-2xl font-bold ${top3[0].totalPnl >= 0 ? 'text-[var(--tertiary)]' : 'text-[var(--error)]'}`}>
                        {top3[0].totalPnl >= 0 ? '+' : ''}{formatUSD(top3[0].totalPnl)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rank 3 */}
              {top3[2] ? (
                <PodiumCard leader={top3[2]} className="order-3" rank3 />
              ) : (
                <div className="order-3" />
              )}
            </div>
          )}

          {/* Table */}
          <div className="bg-[var(--on-surface)] text-white px-8 py-4 rounded-t-lg flex justify-between items-center font-heading font-bold uppercase text-xs tracking-[0.2em]">
            <div className="w-16">Rank</div>
            <div className="flex-1 px-4">User Identity</div>
            <div className="w-48 text-right">Volume (USD)</div>
            <div className="w-48 text-right">Net Profit</div>
          </div>

          <div className="flex flex-col bg-white">
            {visible.slice(top3.length > 0 ? top3.length : 0).map((leader) => (
              <div
                key={leader.walletAddress}
                className="px-8 py-6 flex justify-between items-center border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
              >
                <div className="w-16 font-heading font-black text-2xl text-[var(--secondary)]/30 group-hover:text-[var(--primary-container)] transition-colors">
                  {String(leader.rank).padStart(2, '0')}
                </div>
                <div className="flex-1 px-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[var(--secondary)]">person</span>
                  </div>
                  <span className="font-heading font-bold text-lg">
                    {leader.walletAddress.slice(0, 6)}...{leader.walletAddress.slice(-4)}
                  </span>
                </div>
                <div className="w-48 text-right font-mono text-lg text-[var(--secondary)]">
                  {formatVolume(leader.totalVolume)}
                </div>
                <div className={`w-48 text-right font-mono text-lg ${leader.totalPnl >= 0 ? 'text-[var(--tertiary)]' : 'text-[var(--error)]'}`}>
                  {leader.totalPnl >= 0 ? '+' : ''}{formatUSD(leader.totalPnl)}
                </div>
              </div>
            ))}

            {/* Load more */}
            {!showAll && leaders.length > 7 && (
              <div className="p-8 flex justify-center border-t border-slate-100 bg-slate-50/30">
                <button
                  onClick={() => setShowAll(true)}
                  className="bg-[var(--surface-container-high)] text-[var(--on-surface)] px-8 py-3 rounded-md font-heading font-bold uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-[var(--surface-container-highest)] transition-all cursor-pointer"
                >
                  Load Full Rankings
                  <span className="material-symbols-outlined text-sm">keyboard_double_arrow_down</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Your Rank Sticky Bar */}
      {authenticated && walletAddress && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] glass-card border-t border-[var(--primary-container)]/20 hidden md:block">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--secondary)] uppercase tracking-widest">Your Identity</span>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary-container)]/10 flex items-center justify-center text-[var(--primary-container)]">
                    <span className="material-symbols-outlined text-sm">person</span>
                  </div>
                  <span className="font-heading font-bold text-lg">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--secondary)] uppercase tracking-widest">Global Rank</span>
                <span className="font-heading font-black text-2xl text-[var(--primary-container)]">
                  #{userEntry ? userEntry.rank.toLocaleString() : '—'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-12">
              {userEntry && (
                <>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold text-[var(--secondary)] uppercase">Personal Volume</span>
                    <span className="font-mono text-lg">{formatVolume(userEntry.totalVolume)}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold text-[var(--secondary)] uppercase">Net Profit</span>
                    <span className={`font-mono text-lg ${userEntry.totalPnl >= 0 ? 'text-[var(--tertiary)]' : 'text-[var(--error)]'}`}>
                      {userEntry.totalPnl >= 0 ? '+' : ''}{formatUSD(userEntry.totalPnl)}
                    </span>
                  </div>
                </>
              )}
              <Link
                href="/profile"
                className="bg-[var(--on-surface)] text-white px-8 py-3 rounded-md font-heading font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                View My History
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PodiumCard({ leader, className = '', rank3 }: { leader: LeaderEntry; className?: string; rank3?: boolean }) {
  const rankNum = rank3 ? '#03' : '#02';
  const badgeBg = rank3
    ? 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]'
    : 'bg-[var(--secondary)] text-white';

  return (
    <div className={`bg-[var(--surface-container-low)] p-8 rounded-xl relative group hover:bg-[var(--surface-container)] transition-all ${className}`}>
      <div className={`absolute -top-4 left-6 font-heading font-black px-4 py-1 text-xl ${badgeBg}`}>
        {rankNum}
      </div>
      <div className="flex flex-col gap-4 pt-4">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-container-highest)] flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl text-[var(--secondary)]">person</span>
        </div>
        <div>
          <h3 className="font-heading font-bold text-2xl">
            {leader.walletAddress.slice(0, 6)}...{leader.walletAddress.slice(-4)}
          </h3>
          <p className="text-[var(--secondary)] text-sm uppercase tracking-widest">
            {leader.tradeCount} trades
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <span className="block text-[10px] text-[var(--secondary)] font-bold uppercase">Volume</span>
            <span className="font-mono text-lg">{formatVolume(leader.totalVolume)}</span>
          </div>
          <div>
            <span className="block text-[10px] text-[var(--secondary)] font-bold uppercase">Profit</span>
            <span className={`font-mono text-lg ${leader.totalPnl >= 0 ? 'text-[var(--tertiary)]' : 'text-[var(--error)]'}`}>
              {leader.totalPnl >= 0 ? '+' : ''}{formatUSD(leader.totalPnl)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
