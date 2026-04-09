'use client';

import { useState, useMemo } from 'react';
import type { CountryProfile, PlayerInfo } from '@/app/lib/fifa';
import { WORLD_CUP_COUNTRIES, KEY_PLAYERS, CONFEDERATION_COLORS } from '@/app/lib/fifa';
import { useTradeStore } from '@/app/store/tradeStore';

interface HeadToHeadProps {
  profiles: CountryProfile[];
}

const POS_COLORS: Record<string, string> = { GK: 'text-yellow-400', DF: 'text-blue-400', MF: 'text-green-400', FW: 'text-red-400' };
const POS_BG: Record<string, string> = { GK: 'bg-yellow-500/20', DF: 'bg-blue-500/20', MF: 'bg-green-500/20', FW: 'bg-red-500/20' };

function ComparisonBar({ label, leftVal, rightVal, leftLabel, rightLabel, lowerIsBetter }: {
  label: string; leftVal: number; rightVal: number; leftLabel: string; rightLabel: string; lowerIsBetter?: boolean;
}) {
  const total = leftVal + rightVal || 1;
  const leftPct = (leftVal / total) * 100;
  const leftBetter = lowerIsBetter ? leftVal < rightVal : leftVal > rightVal;
  const rightBetter = lowerIsBetter ? rightVal < leftVal : rightVal > leftVal;

  return (
    <div className="space-y-1">
      <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">{label}</div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold font-mono w-12 text-right ${leftBetter ? 'text-[var(--yes)]' : 'text-[var(--on-surface)]'}`}>{leftLabel}</span>
        <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-[var(--surface-container-high)]">
          <div className={`${leftBetter ? 'bg-[var(--yes)]' : 'bg-[var(--surface-container-highest)]'} rounded-l-full transition-all`} style={{ width: `${leftPct}%` }} />
          <div className={`${rightBetter ? 'bg-[var(--yes)]' : 'bg-[var(--surface-container-highest)]'} rounded-r-full transition-all`} style={{ width: `${100 - leftPct}%` }} />
        </div>
        <span className={`text-xs font-bold font-mono w-12 ${rightBetter ? 'text-[var(--yes)]' : 'text-[var(--on-surface)]'}`}>{rightLabel}</span>
      </div>
    </div>
  );
}

export default function HeadToHead({ profiles }: HeadToHeadProps) {
  const openTrade = useTradeStore(s => s.openTrade);

  // Default to top 2 by championship odds
  const sorted = useMemo(() => [...profiles].sort((a, b) => (b.championshipOdds || 0) - (a.championshipOdds || 0)), [profiles]);
  const [leftName, setLeftName] = useState(sorted[0]?.name || '');
  const [rightName, setRightName] = useState(sorted[1]?.name || '');

  const leftProfile = profiles.find(p => p.name === leftName) || null;
  const rightProfile = profiles.find(p => p.name === rightName) || null;

  const leftPlayers = leftName ? (KEY_PLAYERS[leftName] || []) : [];
  const rightPlayers = rightName ? (KEY_PLAYERS[rightName] || []) : [];

  // Find matchup market between the two
  const matchupMarket = useMemo(() => {
    if (!leftProfile || !rightProfile) return null;
    for (const m of [...leftProfile.markets, ...rightProfile.markets]) {
      if (m.fifaMarketType !== 'matchup') continue;
      const t = m.title.toLowerCase();
      if (t.includes(leftName.toLowerCase()) && t.includes(rightName.toLowerCase())) return m;
    }
    return null;
  }, [leftProfile, rightProfile, leftName, rightName]);

  const selectOptions = useMemo(() => {
    // Profiles first (have market data), then remaining WC countries
    const profileNames = new Set(profiles.map(p => p.name));
    const remaining = WORLD_CUP_COUNTRIES.filter(c => !profileNames.has(c.name));
    return [
      ...profiles.map(p => ({ name: p.name, flag: p.country.flag })),
      ...remaining.map(c => ({ name: c.name, flag: c.flag })),
    ];
  }, [profiles]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--primary)]">compare_arrows</span>
        <h3 className="font-heading font-black text-lg text-[var(--on-surface)] uppercase tracking-tight">Head to Head</h3>
      </div>

      {/* Team selectors */}
      <div className="flex items-center gap-3">
        <select
          value={leftName}
          onChange={e => setLeftName(e.target.value)}
          className="flex-1 bg-[var(--surface-container-low)] text-[var(--on-surface)] rounded-lg px-3 py-2.5 text-sm font-bold border border-transparent focus:border-[var(--primary-container)] outline-none cursor-pointer"
        >
          {selectOptions.map(o => <option key={o.name} value={o.name}>{o.flag} {o.name}</option>)}
        </select>
        <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest shrink-0">vs</span>
        <select
          value={rightName}
          onChange={e => setRightName(e.target.value)}
          className="flex-1 bg-[var(--surface-container-low)] text-[var(--on-surface)] rounded-lg px-3 py-2.5 text-sm font-bold border border-transparent focus:border-[var(--primary-container)] outline-none cursor-pointer"
        >
          {selectOptions.map(o => <option key={o.name} value={o.name}>{o.flag} {o.name}</option>)}
        </select>
      </div>

      {/* Comparison card */}
      {leftProfile && rightProfile && (
        <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient overflow-hidden">
          {/* Flags & names */}
          <div className="flex items-center justify-between px-6 py-5 bg-[var(--on-surface)]">
            <div className="text-center flex-1">
              <div className="text-4xl mb-2">{leftProfile.country.flag}</div>
              <h4 className="font-heading font-black text-lg text-white uppercase tracking-tight">{leftProfile.name}</h4>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CONFEDERATION_COLORS[leftProfile.country.confederation] }} />
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">{leftProfile.country.confederation}</span>
              </div>
            </div>
            <div className="px-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">vs</span>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl mb-2">{rightProfile.country.flag}</div>
              <h4 className="font-heading font-black text-lg text-white uppercase tracking-tight">{rightProfile.name}</h4>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CONFEDERATION_COLORS[rightProfile.country.confederation] }} />
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">{rightProfile.country.confederation}</span>
              </div>
            </div>
          </div>

          {/* Championship odds highlight */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--surface-container-high)]">
            <div className="text-center flex-1">
              <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-1">Win World Cup</div>
              <div className={`font-mono text-3xl font-bold ${
                (leftProfile.championshipOdds || 0) >= (rightProfile.championshipOdds || 0) ? 'text-[var(--yes)]' : 'text-[var(--on-surface)]'
              }`}>
                {leftProfile.championshipOdds ? `${Math.round(leftProfile.championshipOdds * 100)}%` : '--'}
              </div>
            </div>
            <span className="material-symbols-outlined text-[var(--secondary)]">compare_arrows</span>
            <div className="text-center flex-1">
              <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-1">Win World Cup</div>
              <div className={`font-mono text-3xl font-bold ${
                (rightProfile.championshipOdds || 0) >= (leftProfile.championshipOdds || 0) ? 'text-[var(--yes)]' : 'text-[var(--on-surface)]'
              }`}>
                {rightProfile.championshipOdds ? `${Math.round(rightProfile.championshipOdds * 100)}%` : '--'}
              </div>
            </div>
          </div>

          {/* Stat bars */}
          <div className="px-6 py-4 space-y-3">
            <ComparisonBar
              label="FIFA Ranking"
              leftVal={100 - leftProfile.country.fifaRanking}
              rightVal={100 - rightProfile.country.fifaRanking}
              leftLabel={`#${leftProfile.country.fifaRanking}`}
              rightLabel={`#${rightProfile.country.fifaRanking}`}
            />
            {leftProfile.championshipOdds && rightProfile.championshipOdds && (
              <ComparisonBar
                label="Championship Odds"
                leftVal={leftProfile.championshipOdds}
                rightVal={rightProfile.championshipOdds}
                leftLabel={`${Math.round(leftProfile.championshipOdds * 100)}%`}
                rightLabel={`${Math.round(rightProfile.championshipOdds * 100)}%`}
              />
            )}
            <ComparisonBar
              label="Group"
              leftVal={leftProfile.country.group.charCodeAt(0)}
              rightVal={rightProfile.country.group.charCodeAt(0)}
              leftLabel={`Grp ${leftProfile.country.group}`}
              rightLabel={`Grp ${rightProfile.country.group}`}
              lowerIsBetter
            />
            {leftPlayers.length > 0 && rightPlayers.length > 0 && (
              <>
                <ComparisonBar
                  label="Squad Caps"
                  leftVal={leftPlayers.reduce((s, p) => s + p.caps, 0)}
                  rightVal={rightPlayers.reduce((s, p) => s + p.caps, 0)}
                  leftLabel={String(leftPlayers.reduce((s, p) => s + p.caps, 0))}
                  rightLabel={String(rightPlayers.reduce((s, p) => s + p.caps, 0))}
                />
                <ComparisonBar
                  label="Squad Goals"
                  leftVal={leftPlayers.reduce((s, p) => s + p.goals, 0)}
                  rightVal={rightPlayers.reduce((s, p) => s + p.goals, 0)}
                  leftLabel={String(leftPlayers.reduce((s, p) => s + p.goals, 0))}
                  rightLabel={String(rightPlayers.reduce((s, p) => s + p.goals, 0))}
                />
              </>
            )}
          </div>

          {/* Key Players */}
          {(leftPlayers.length > 0 || rightPlayers.length > 0) && (
            <div className="px-6 py-4 border-t border-[var(--surface-container-high)]">
              <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-3 text-center">Key Players</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  {leftPlayers.slice(0, 5).map(p => (
                    <div key={p.name} className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${POS_BG[p.position]} ${POS_COLORS[p.position]}`}>{p.position}</span>
                      <span className="text-[10px] font-bold text-[var(--on-surface)] truncate">{p.name}</span>
                      {p.isStar && <span className="material-symbols-outlined text-[10px] text-yellow-400">star</span>}
                      {p.isCaptain && <span className="material-symbols-outlined text-[10px] text-[var(--primary)]">shield</span>}
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {rightPlayers.slice(0, 5).map(p => (
                    <div key={p.name} className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${POS_BG[p.position]} ${POS_COLORS[p.position]}`}>{p.position}</span>
                      <span className="text-[10px] font-bold text-[var(--on-surface)] truncate">{p.name}</span>
                      {p.isStar && <span className="material-symbols-outlined text-[10px] text-yellow-400">star</span>}
                      {p.isCaptain && <span className="material-symbols-outlined text-[10px] text-[var(--primary)]">shield</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Matchup market */}
          {matchupMarket && (
            <div className="px-6 py-4 border-t border-[var(--surface-container-high)] bg-[var(--primary-fixed)]">
              <div className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-widest mb-2 text-center">Direct Matchup Market</div>
              <div className="text-xs font-bold text-[var(--on-surface)] text-center mb-3">{matchupMarket.title}</div>
              <div className="flex gap-3">
                <button
                  onClick={() => openTrade(matchupMarket, 'yes')}
                  className="flex-1 py-2.5 text-xs font-bold rounded-md bg-[var(--yes-bg)] text-[var(--yes)] hover:bg-[var(--yes)] hover:text-white transition-colors cursor-pointer"
                >
                  {leftName} {Math.round(matchupMarket.yesPrice * 100)}c
                </button>
                <button
                  onClick={() => openTrade(matchupMarket, 'no')}
                  className="flex-1 py-2.5 text-xs font-bold rounded-md bg-[var(--no-bg)] text-[var(--no)] hover:bg-[var(--no)] hover:text-white transition-colors cursor-pointer"
                >
                  {rightName} {Math.round(matchupMarket.noPrice * 100)}c
                </button>
              </div>
            </div>
          )}

          {/* Trade buttons */}
          <div className="flex gap-3 px-6 py-4">
            <button
              onClick={() => leftProfile.championshipMarket && openTrade(leftProfile.championshipMarket, 'yes')}
              disabled={!leftProfile.championshipMarket}
              className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-md bg-[var(--yes)] text-white hover:brightness-110 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Trade {leftName}
            </button>
            <button
              onClick={() => rightProfile.championshipMarket && openTrade(rightProfile.championshipMarket, 'yes')}
              disabled={!rightProfile.championshipMarket}
              className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-md bg-[var(--yes)] text-white hover:brightness-110 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Trade {rightName}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
