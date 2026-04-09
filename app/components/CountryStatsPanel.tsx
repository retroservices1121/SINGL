'use client';

import { useMemo } from 'react';
import type { MarketData } from '@/app/types';
import type { PlayerInfo } from '@/app/lib/fifa';
import { KEY_PLAYERS, findCountry, CONFEDERATION_COLORS } from '@/app/lib/fifa';
import { useTradeStore } from '@/app/store/tradeStore';

interface CountryStatsPanelProps {
  countryName: string;
  championshipOdds: number | null;
  championshipMarket: MarketData | null;
  onClose: () => void;
}

const POS_COLORS: Record<string, { bg: string; text: string }> = {
  GK: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  DF: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  MF: { bg: 'bg-green-500/20', text: 'text-green-400' },
  FW: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

export default function CountryStatsPanel({ countryName, championshipOdds, championshipMarket, onClose }: CountryStatsPanelProps) {
  const openTrade = useTradeStore(s => s.openTrade);
  const country = useMemo(() => findCountry(countryName), [countryName]);
  const players = KEY_PLAYERS[countryName] || [];
  const confColor = country ? CONFEDERATION_COLORS[country.confederation] || '#666' : '#666';

  const handleTrade = (side: 'yes' | 'no') => {
    if (championshipMarket) { onClose(); openTrade(championshipMarket, side); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-[var(--surface-container-lowest)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-[slide-up_0.25s_ease-out] pb-20 sm:pb-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-container-lowest)] border-b border-[var(--surface-container)] px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {country && <span className="text-3xl">{country.flag}</span>}
            <div className="min-w-0">
              <h2 className="font-heading font-black text-xl uppercase tracking-tight text-[var(--on-surface)] leading-tight truncate">
                {countryName}
              </h2>
              {country && (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--primary-container)] text-white">
                    FIFA #{country.fifaRanking}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: confColor }}>
                    {country.confederation}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">
                    Group {country.group}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--secondary)] hover:text-[var(--on-surface)] transition-colors cursor-pointer shrink-0 mt-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 py-4">
          {/* Championship odds */}
          {championshipOdds !== null && (
            <div className="bg-[var(--surface-container-low)] rounded-lg p-3 mb-4 text-center">
              <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">World Cup Winner Odds</div>
              <div className="text-3xl font-black font-heading text-[var(--primary-container)]">
                {Math.round(championshipOdds * 100)}%
              </div>
              <div className="text-[10px] text-[var(--secondary)] mt-0.5">via Polymarket</div>
            </div>
          )}

          {/* Key players */}
          {players.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)] mb-3">Key Players</h3>
              <div className="space-y-2">
                {players.map(p => {
                  const pc = POS_COLORS[p.position] || POS_COLORS.MF;
                  return (
                    <div key={p.name} className="flex items-center gap-3 p-3 bg-[var(--surface-container-low)] rounded-lg">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${pc.bg} ${pc.text}`}>{p.position}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-[var(--on-surface)] truncate">{p.name}</span>
                          {p.isCaptain && <span className="material-symbols-outlined text-[12px] text-[var(--primary)]">shield</span>}
                          {p.isStar && <span className="material-symbols-outlined text-[12px] text-yellow-400">star</span>}
                        </div>
                        <span className="text-[10px] text-[var(--secondary)]">{p.club}</span>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <div className="text-center">
                          <div className="text-sm font-bold font-mono text-[var(--on-surface)]">{p.caps}</div>
                          <div className="text-[8px] text-[var(--secondary)]">Caps</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold font-mono text-[var(--on-surface)]">{p.goals}</div>
                          <div className="text-[8px] text-[var(--secondary)]">Goals</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trade buttons */}
          {championshipMarket && (
            <div className="flex gap-3 pb-2">
              <button onClick={() => handleTrade('yes')}
                className="flex-1 py-3.5 text-sm font-black uppercase tracking-widest rounded-lg bg-[var(--yes)] text-white hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-[var(--yes)]/20">
                Buy Yes
              </button>
              <button onClick={() => handleTrade('no')}
                className="flex-1 py-3.5 text-sm font-black uppercase tracking-widest rounded-lg bg-[var(--no)] text-white hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-[var(--no)]/20">
                Buy No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
