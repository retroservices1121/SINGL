'use client';

import type { CountryProfile } from '@/app/lib/fifa';
import { ROUND_LABELS, ROUND_ORDER, CONFEDERATION_COLORS } from '@/app/lib/fifa';
import { useTradeStore } from '@/app/store/tradeStore';
import { formatVolume } from '@/app/lib/utils';
import Sparkline from './Sparkline';

interface CountryCardProps {
  profile: CountryProfile;
  index: number;
  onSelect?: (profile: CountryProfile) => void;
}

export default function CountryCard({ profile, index, onSelect }: CountryCardProps) {
  const openTrade = useTradeStore(s => s.openTrade);
  const champOdds = profile.championshipOdds ? Math.round(profile.championshipOdds * 100) : null;
  const groupWinOdds = profile.groupWinOdds ? Math.round(profile.groupWinOdds * 100) : null;
  const totalVolume = profile.markets.reduce((sum, m) => sum + (m.volume || 0), 0);

  const roundBreakdown = profile.markets
    .filter(m => m.round && (m.fifaMarketType === 'advancement' || m.fifaMarketType === 'winner'))
    .sort((a, b) => (ROUND_ORDER[a.round!] || 0) - (ROUND_ORDER[b.round!] || 0))
    .map(m => ({ round: m.round!, odds: Math.round(m.yesPrice * 100), label: ROUND_LABELS[m.round!] || m.round! }));

  const nextGameMarket = profile.markets.find(m => m.fifaMarketType === 'matchup' && m.closeTime);
  const confColor = CONFEDERATION_COLORS[profile.country.confederation] || '#666';

  const rankColor = index === 0 ? 'bg-[var(--primary-container)] text-white'
    : index < 4 ? 'bg-[var(--on-surface)] text-white'
    : 'bg-[var(--surface-container-high)] text-[var(--secondary)]';

  return (
    <div
      className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient hover:scale-[1.02] transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={() => onSelect?.(profile)}
    >
      {/* Accent bar */}
      <div className="h-1 w-full" style={{
        background: champOdds && champOdds > 10 ? 'var(--primary-container)'
          : champOdds && champOdds > 3 ? 'var(--tertiary)' : 'var(--surface-container-highest)'
      }} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rankColor}`}>#{index + 1}</span>
              <span className="text-2xl leading-none">{profile.country.flag}</span>
              <h4 className="font-heading font-black text-lg text-[var(--on-surface)] uppercase tracking-tight leading-tight truncate">
                {profile.name}
              </h4>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: confColor }}>
                {profile.country.confederation}
              </span>
              <span className="text-[9px] font-bold text-[var(--secondary)] bg-[var(--surface-container-high)] px-1.5 py-0.5 rounded">
                FIFA #{profile.country.fifaRanking}
              </span>
              <span className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest">
                Group {profile.country.group}
              </span>
            </div>
          </div>
          {profile.sparkline && profile.sparkline.length > 1 && (
            <Sparkline data={profile.sparkline} width={80} height={36} />
          )}
        </div>

        {/* Main odds */}
        <div className="flex gap-3 mb-3">
          {champOdds !== null && (
            <div className="flex-1 bg-[var(--surface-container-low)] rounded-lg p-2.5 text-center relative">
              <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Win World Cup</div>
              <div className="text-2xl font-black font-heading text-[var(--on-surface)]">{champOdds}%</div>
            </div>
          )}
          {groupWinOdds !== null && (
            <div className="flex-1 bg-[var(--surface-container-low)] rounded-lg p-2.5 text-center">
              <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Win Group</div>
              <div className="text-2xl font-black font-heading text-[var(--on-surface)]">{groupWinOdds}%</div>
            </div>
          )}
        </div>

        {/* Round breakdown pills */}
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
          {profile.nextOpponent ? (
            <span className="text-[var(--secondary)]">
              Next: <span className="font-bold text-[var(--on-surface)]">{profile.nextOpponent}</span>
            </span>
          ) : <span />}
          {totalVolume > 0 && (
            <span className="text-[10px] text-[var(--secondary)]">Vol: {formatVolume(totalVolume)}</span>
          )}
        </div>

        {/* Trade buttons */}
        {profile.championshipMarket && (
          <div className="flex gap-2 mt-auto">
            <button
              onClick={(e) => { e.stopPropagation(); openTrade(profile.championshipMarket!, 'yes'); }}
              className="flex-1 py-2.5 text-xs font-bold rounded-md bg-[var(--yes-bg)] text-[var(--yes)] hover:bg-[var(--yes)] hover:text-white transition-colors cursor-pointer"
            >
              Buy Yes {champOdds}c
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openTrade(profile.championshipMarket!, 'no'); }}
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
