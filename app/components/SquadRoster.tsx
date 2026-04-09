'use client';

import { useState, useMemo } from 'react';
import type { CountryProfile, PlayerInfo } from '@/app/lib/fifa';
import { KEY_PLAYERS, WORLD_CUP_COUNTRIES } from '@/app/lib/fifa';

interface SquadRosterProps {
  profiles: CountryProfile[];
}

const POS_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  GK: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', accent: '#eab308' },
  DF: { bg: 'bg-blue-500/20', text: 'text-blue-400', accent: '#3b82f6' },
  MF: { bg: 'bg-green-500/20', text: 'text-green-400', accent: '#22c55e' },
  FW: { bg: 'bg-red-500/20', text: 'text-red-400', accent: '#ef4444' },
};

function PlayerCard({ player }: { player: PlayerInfo }) {
  const pc = POS_COLORS[player.position] || POS_COLORS.MF;

  return (
    <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      <div className="h-1 w-full" style={{ background: pc.accent, opacity: 0.6 }} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${pc.bg} ${pc.text}`}>{player.position}</span>
          {player.isCaptain && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded bg-[var(--primary-container)]/20 text-[var(--primary)]">
              <span className="material-symbols-outlined text-[12px]">shield</span>C
            </span>
          )}
          {player.isStar && (
            <span className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400">
              <span className="material-symbols-outlined text-[12px]">star</span>
            </span>
          )}
        </div>
        <h4 className="font-heading font-black text-base text-[var(--on-surface)] uppercase tracking-tight leading-tight mb-1">{player.name}</h4>
        <div className="flex items-center gap-1 mb-3">
          <span className="material-symbols-outlined text-[14px] text-[var(--secondary)]">sports_soccer</span>
          <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">{player.club}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--surface-container-low)] rounded-lg p-2 text-center">
            <div className="text-lg font-black font-heading text-[var(--on-surface)]">{player.age}</div>
            <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest">Age</div>
          </div>
          <div className="bg-[var(--surface-container-low)] rounded-lg p-2 text-center">
            <div className="text-lg font-black font-heading text-[var(--on-surface)]">{player.caps}</div>
            <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest">Caps</div>
          </div>
          <div className="bg-[var(--surface-container-low)] rounded-lg p-2 text-center">
            <div className="text-lg font-black font-heading text-[var(--on-surface)]">{player.goals}</div>
            <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest">Goals</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SquadRoster({ profiles }: SquadRosterProps) {
  const availableCountries = useMemo(() =>
    WORLD_CUP_COUNTRIES.filter(c => KEY_PLAYERS[c.name]?.length > 0).sort((a, b) => a.fifaRanking - b.fifaRanking),
  []);

  const [selected, setSelected] = useState(availableCountries[0]?.name || '');
  const selectedCountry = availableCountries.find(c => c.name === selected);
  const players = selected ? (KEY_PLAYERS[selected] || []) : [];

  const sortedPlayers = useMemo(() => {
    const posOrder: Record<string, number> = { FW: 1, MF: 2, DF: 3, GK: 4 };
    return [...players].sort((a, b) => {
      if (a.isCaptain && !b.isCaptain) return -1;
      if (!a.isCaptain && b.isCaptain) return 1;
      if (a.isStar && !b.isStar) return -1;
      if (!a.isStar && b.isStar) return 1;
      return (posOrder[a.position] || 5) - (posOrder[b.position] || 5);
    });
  }, [players]);

  const posCounts = useMemo(() => {
    const c = { GK: 0, DF: 0, MF: 0, FW: 0 };
    players.forEach(p => { c[p.position] = (c[p.position] || 0) + 1; });
    return c;
  }, [players]);

  if (availableCountries.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[var(--primary)]">groups</span>
        <h3 className="font-heading font-black text-lg text-[var(--on-surface)] uppercase tracking-tight">Squad Rosters</h3>
      </div>

      {/* Country selector */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4" style={{ scrollbarWidth: 'none' }}>
        {availableCountries.map(c => (
          <button
            key={c.code}
            onClick={() => setSelected(c.name)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              selected === c.name ? 'bg-[var(--primary-container)] text-white shadow-lg' : 'bg-[var(--surface-container-high)] text-[var(--secondary)] hover:bg-[var(--surface-container-highest)]'
            }`}
          >
            <span className="text-sm">{c.flag}</span>{c.code}
          </button>
        ))}
      </div>

      {/* Country header */}
      {selectedCountry && (
        <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-5 mb-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{selectedCountry.flag}</span>
            <div className="flex-1">
              <h2 className="font-heading font-black text-xl text-[var(--on-surface)] uppercase tracking-tight">{selectedCountry.name}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--primary-container)] text-white">FIFA #{selectedCountry.fifaRanking}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--surface-container-high)] text-[var(--secondary)]">Group {selectedCountry.group}</span>
                <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">{selectedCountry.confederation}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player cards */}
      {sortedPlayers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {sortedPlayers.map(p => <PlayerCard key={p.name} player={p} />)}
        </div>
      )}

      {/* Position summary */}
      {players.length > 0 && (
        <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-4">
          <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-3 text-center">Squad Composition</div>
          <div className="flex items-end justify-center gap-6">
            {(['GK', 'DF', 'MF', 'FW'] as const).map(pos => {
              const pc = POS_COLORS[pos];
              return (
                <div key={pos} className="flex flex-col items-center gap-1">
                  <div className="text-xl font-black font-heading text-[var(--on-surface)]">{posCounts[pos]}</div>
                  <div className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${pc.bg} ${pc.text}`}>{pos}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
