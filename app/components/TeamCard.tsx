'use client';

import { useEffect, useState } from 'react';
import type { TeamProfile } from '@/app/lib/ncaa';
import { useTradeStore } from '@/app/store/tradeStore';
import { formatVolume } from '@/app/lib/utils';
import Sparkline from './Sparkline';

interface TeamCardProps {
  team: TeamProfile;
  index: number;
  onSelect?: (team: TeamProfile) => void;
}

const ROUND_LABELS: Record<string, string> = {
  R64: 'Rd of 64',
  R32: 'Rd of 32',
  S16: 'Sweet 16',
  E8: 'Elite 8',
  F4: 'Final Four',
  CHAMP: 'Championship',
  WINNER: 'Champion',
};

const ROUND_ORDER: Record<string, number> = { R64: 1, R32: 2, S16: 3, E8: 4, F4: 5, CHAMP: 6, WINNER: 7 };

function GameCountdown({ closeTime }: { closeTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isSoon, setIsSoon] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const target = new Date(closeTime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('LIVE NOW');
        setIsSoon(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours < 1) {
        setTimeLeft(`${mins}m to tip`);
        setIsSoon(true);
      } else if (hours < 24) {
        setTimeLeft(`${hours}h ${mins}m`);
        setIsSoon(hours < 3);
      } else {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
        setIsSoon(false);
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [closeTime]);

  if (!timeLeft) return null;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${
      isSoon
        ? 'bg-[var(--primary-container)] text-white'
        : 'bg-[var(--surface-container-high)] text-[var(--secondary)]'
    }`}>
      {isSoon && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      {timeLeft}
    </div>
  );
}

function OddsDelta({ market }: { market: { change24h?: number | null } }) {
  const change = market.change24h;
  if (change === null || change === undefined || Math.abs(change) < 0.5) return null;

  const isUp = change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${isUp ? 'text-[var(--yes)]' : 'text-[var(--no)]'}`}>
      <span className="material-symbols-outlined text-[10px]">
        {isUp ? 'arrow_upward' : 'arrow_downward'}
      </span>
      {isUp ? '+' : ''}{change.toFixed(1)}
    </span>
  );
}

export default function TeamCard({ team, index, onSelect }: TeamCardProps) {
  const openTrade = useTradeStore(s => s.openTrade);
  const champOdds = team.championshipOdds ? Math.round(team.championshipOdds * 100) : null;
  const roundOdds = team.currentRoundOdds ? Math.round(team.currentRoundOdds * 100) : null;
  const totalVolume = team.markets.reduce((sum, m) => sum + (m.volume || 0), 0);

  // Get all round odds for the mini breakdown
  const roundBreakdown = team.markets
    .filter(m => m.round && m.marketType === 'advancement')
    .sort((a, b) => (ROUND_ORDER[a.round!] || 0) - (ROUND_ORDER[b.round!] || 0))
    .map(m => ({ round: m.round!, odds: Math.round(m.yesPrice * 100), label: ROUND_LABELS[m.round!] || m.round! }));

  // Find next game close time from matchup markets
  const nextGameMarket = team.markets.find(m => m.marketType === 'matchup' && m.closeTime);

  // Determine rank badge color
  const rankColor = index === 0 ? 'bg-[var(--primary-container)] text-white'
    : index < 4 ? 'bg-[var(--on-surface)] text-white'
    : 'bg-[var(--surface-container-high)] text-[var(--secondary)]';

  return (
    <div
      className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient hover:scale-[1.02] transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={() => onSelect?.(team)}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{
        background: champOdds && champOdds > 10
          ? 'var(--primary-container)'
          : champOdds && champOdds > 3
            ? 'var(--tertiary)'
            : 'var(--surface-container-highest)'
      }} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rankColor}`}>
                #{index + 1}
              </span>
              <h4 className="font-heading font-black text-lg text-[var(--on-surface)] uppercase tracking-tight leading-tight truncate">
                {team.name}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {team.seed && (
                <span className="text-[9px] font-bold text-white bg-[var(--on-surface)] px-1.5 py-0.5 rounded">
                  {team.seed}-seed
                </span>
              )}
              {team.region && (
                <span className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest">
                  {team.region}
                </span>
              )}
            </div>
          </div>
          {/* Sparkline — larger */}
          {team.sparkline && team.sparkline.length > 1 && (
            <Sparkline data={team.sparkline} width={80} height={36} />
          )}
        </div>

        {/* Countdown timer */}
        {nextGameMarket?.closeTime && (
          <div className="mb-3">
            <GameCountdown closeTime={nextGameMarket.closeTime} />
          </div>
        )}

        {/* Main Odds */}
        <div className="flex gap-3 mb-3">
          {champOdds !== null && (
            <div className="flex-1 bg-[var(--surface-container-low)] rounded-lg p-2.5 text-center relative">
              <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Champion</div>
              <div className="text-2xl font-black font-heading text-[var(--on-surface)]">{champOdds}%</div>
              {team.championshipMarket && (
                <div className="absolute top-1 right-1">
                  <OddsDelta market={team.championshipMarket} />
                </div>
              )}
            </div>
          )}
          {roundOdds !== null && team.currentRound && (
            <div className="flex-1 bg-[var(--surface-container-low)] rounded-lg p-2.5 text-center">
              <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">
                {ROUND_LABELS[team.currentRound] || team.currentRound}
              </div>
              <div className="text-2xl font-black font-heading text-[var(--on-surface)]">{roundOdds}%</div>
            </div>
          )}
        </div>

        {/* Round-by-round breakdown (mini pills) */}
        {roundBreakdown.length > 0 && (
          <div className="flex gap-1 mb-3 overflow-x-auto">
            {roundBreakdown.map(r => (
              <div key={r.round} className="shrink-0 text-center px-2 py-1 bg-[var(--surface-container)] rounded">
                <div className="text-[7px] font-bold text-[var(--secondary)] uppercase tracking-widest">{r.label}</div>
                <div className="text-[10px] font-bold font-mono text-[var(--on-surface)]">{r.odds}%</div>
              </div>
            ))}
          </div>
        )}

        {/* Next opponent + volume */}
        <div className="flex items-center justify-between mb-3 text-xs">
          {team.nextOpponent ? (
            <span className="text-[var(--secondary)]">
              Next: <span className="font-bold text-[var(--on-surface)]">{team.nextOpponent}</span>
            </span>
          ) : (
            <span />
          )}
          {totalVolume > 0 && (
            <span className="text-[10px] text-[var(--secondary)]">Vol: {formatVolume(totalVolume)}</span>
          )}
        </div>

        {/* Trade buttons */}
        {team.championshipMarket && (
          <div className="flex gap-2 mt-auto">
            <button
              onClick={(e) => { e.stopPropagation(); openTrade(team.championshipMarket!, 'yes'); }}
              className="flex-1 py-2.5 text-xs font-bold rounded-md bg-[var(--yes-bg)] text-[var(--yes)] hover:bg-[var(--yes)] hover:text-white transition-colors cursor-pointer"
            >
              Buy Yes {champOdds}c
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openTrade(team.championshipMarket!, 'no'); }}
              className="flex-1 py-2.5 text-xs font-bold rounded-md bg-[var(--no-bg)] text-[var(--no)] hover:bg-[var(--no)] hover:text-white transition-colors cursor-pointer"
            >
              Buy No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
