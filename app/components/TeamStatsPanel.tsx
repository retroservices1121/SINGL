'use client';

import { useEffect, useState } from 'react';
import { useTradeStore } from '@/app/store/tradeStore';
import type { MarketData } from '@/app/types';

interface TeamStats {
  name: string;
  record: string;
  rank?: number;
  conference: string;
  standing: string;
  stats: {
    ppg: number | null;
    rpg: number | null;
    apg: number | null;
    fgPct: number | null;
    threePtPct: number | null;
    ftPct: number | null;
    spg: number | null;
    bpg: number | null;
    topg: number | null;
  };
  logo?: string;
}

interface TeamStatsPanelProps {
  teamName: string;
  championshipOdds: number | null;
  championshipMarket: MarketData | null;
  onClose: () => void;
}

const STAT_CARDS: { key: keyof TeamStats['stats']; label: string; suffix?: string }[] = [
  { key: 'ppg', label: 'PPG' },
  { key: 'rpg', label: 'RPG' },
  { key: 'apg', label: 'APG' },
  { key: 'fgPct', label: 'FG%', suffix: '%' },
  { key: 'threePtPct', label: '3PT%', suffix: '%' },
  { key: 'ftPct', label: 'FT%', suffix: '%' },
  { key: 'spg', label: 'SPG' },
  { key: 'bpg', label: 'BPG' },
  { key: 'topg', label: 'TOPG' },
];

function StatSkeleton() {
  return (
    <div className="bg-[var(--surface-container-low)] rounded-lg p-3 animate-pulse">
      <div className="h-7 w-16 bg-[var(--surface-container-high)] rounded mb-1.5 mx-auto" />
      <div className="h-3 w-10 bg-[var(--surface-container-high)] rounded mx-auto" />
    </div>
  );
}

export default function TeamStatsPanel({ teamName, championshipOdds, championshipMarket, onClose }: TeamStatsPanelProps) {
  const openTrade = useTradeStore(s => s.openTrade);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/team-stats?team=${encodeURIComponent(teamName)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load stats');
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load stats');
        setLoading(false);
      });
  }, [teamName]);

  const handleTrade = (side: 'yes' | 'no') => {
    if (championshipMarket) {
      onClose();
      openTrade(championshipMarket, side);
    }
  };

  const formatStat = (value: number | null, suffix?: string) => {
    if (value === null || value === undefined) return '\u2014';
    return suffix ? `${value}${suffix}` : value.toString();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-[var(--surface-container-lowest)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-[slide-up_0.25s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-container-lowest)] border-b border-[var(--surface-container)] px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {stats?.logo && (
              <img src={stats.logo} alt="" className="w-10 h-10 object-contain shrink-0" />
            )}
            <div className="min-w-0">
              <h2 className="font-heading font-black text-xl uppercase tracking-tight text-[var(--on-surface)] leading-tight truncate">
                {stats?.name || teamName}
              </h2>
              {!loading && stats && (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {stats.rank && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--primary-container)] text-white">
                      #{stats.rank}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">
                    {stats.record}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--secondary)] hover:text-[var(--on-surface)] transition-colors cursor-pointer shrink-0 mt-1"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 py-4">
          {/* Conference / Standing */}
          {!loading && stats && (
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[var(--surface-container-low)] rounded-lg px-3 py-2 flex-1">
                <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Conference</div>
                <div className="text-sm font-bold text-[var(--on-surface)]">{stats.conference}</div>
              </div>
              <div className="bg-[var(--surface-container-low)] rounded-lg px-3 py-2 flex-1">
                <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Standing</div>
                <div className="text-sm font-bold text-[var(--on-surface)]">{stats.standing}</div>
              </div>
            </div>
          )}

          {/* Championship Odds */}
          {championshipOdds !== null && (
            <div className="bg-[var(--surface-container-low)] rounded-lg p-3 mb-4 text-center">
              <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Championship Odds</div>
              <div className="text-3xl font-black font-heading text-[var(--primary-container)]">
                {Math.round(championshipOdds * 100)}%
              </div>
              <div className="text-[10px] text-[var(--secondary)] mt-0.5">via Polymarket</div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="mb-4">
            <h3 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)] mb-3">
              Season Stats
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {loading ? (
                Array.from({ length: 9 }).map((_, i) => <StatSkeleton key={i} />)
              ) : error ? (
                <div className="col-span-3 text-center py-8 text-[var(--secondary)] text-sm">
                  {error}
                </div>
              ) : stats ? (
                STAT_CARDS.map(({ key, label, suffix }) => (
                  <div key={key} className="bg-[var(--surface-container-low)] rounded-lg p-3 text-center">
                    <div className="text-xl font-black font-heading text-[var(--on-surface)]">
                      {formatStat(stats.stats[key], suffix)}
                    </div>
                    <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mt-0.5">
                      {label}
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </div>

          {/* Trade Button */}
          {championshipMarket && (
            <div className="flex gap-3 pb-2">
              <button
                onClick={() => handleTrade('yes')}
                className="flex-1 py-3.5 text-sm font-black uppercase tracking-widest rounded-lg bg-[var(--yes)] text-white hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-[var(--yes)]/20"
              >
                Buy Yes
              </button>
              <button
                onClick={() => handleTrade('no')}
                className="flex-1 py-3.5 text-sm font-black uppercase tracking-widest rounded-lg bg-[var(--no)] text-white hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-[var(--no)]/20"
              >
                Buy No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
