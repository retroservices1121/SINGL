'use client';

import { useMemo } from 'react';
import type { CountryProfile, GroupData, GroupStanding } from '@/app/lib/fifa';
import { useTradeStore } from '@/app/store/tradeStore';

interface GroupStageTableProps {
  groups: GroupData[];
  profiles: CountryProfile[];
}

const GROUP_COLORS: Record<string, string> = {
  A: '#1e88e5', B: '#e53935', C: '#7cb342', D: '#ff8f00',
  E: '#8e24aa', F: '#00897b', G: '#d81b60', H: '#3949ab',
  I: '#f4511e', J: '#6d4c41', K: '#546e7a', L: '#c0ca33',
};

function sortStandings(standings: GroupStanding[]): GroupStanding[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.country.fifaRanking - b.country.fifaRanking;
  });
}

function GroupCard({
  group,
  profileMap,
}: {
  group: GroupData;
  profileMap: Map<string, CountryProfile>;
}) {
  const openTrade = useTradeStore(s => s.openTrade);
  const sorted = useMemo(() => sortStandings(group.standings), [group.standings]);
  const color = GROUP_COLORS[group.name] || 'var(--primary-container)';

  return (
    <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient hover:scale-[1.02] transition-all duration-300 flex flex-col overflow-hidden">
      <div className="h-1.5 w-full" style={{ background: color }} />

      <div className="px-4 pt-3 pb-1">
        <h3 className="font-heading font-black text-sm uppercase tracking-tight text-[var(--on-surface)]">
          Group {group.name}
        </h3>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_repeat(5,24px)_40px] items-center gap-0 px-4 py-1.5">
        <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest">Team</span>
        <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">W</span>
        <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">D</span>
        <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">L</span>
        <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">GD</span>
        <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">Pts</span>
        <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">Adv</span>
      </div>

      {/* Team rows */}
      <div className="flex flex-col px-2 pb-3">
        {sorted.map((standing, idx) => {
          const profile = profileMap.get(standing.country.name);
          const isQualifyPos = idx < 2;
          const advOdds = standing.advancementOdds != null
            ? Math.round(standing.advancementOdds * 100)
            : profile?.groupAdvancementOdds != null
              ? Math.round(profile.groupAdvancementOdds * 100)
              : null;

          return (
            <div
              key={standing.country.code}
              className={`grid grid-cols-[1fr_repeat(5,24px)_40px] items-center gap-0 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                isQualifyPos
                  ? 'bg-[var(--yes-bg)]'
                  : 'hover:bg-[var(--surface-container-low)]'
              }`}
              onClick={() => {
                if (profile?.championshipMarket) {
                  openTrade(profile.championshipMarket, 'yes');
                }
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base leading-none shrink-0">{standing.country.flag}</span>
                <span className="text-[11px] font-bold text-[var(--on-surface)] truncate">
                  {standing.country.name}
                </span>
                <span className="shrink-0 text-[8px] font-bold px-1 py-0.5 rounded bg-[var(--surface-container-high)] text-[var(--secondary)]">
                  {standing.country.fifaRanking}
                </span>
              </div>
              <span className="text-[10px] font-bold text-[var(--on-surface)] text-center font-mono">{standing.won}</span>
              <span className="text-[10px] font-bold text-[var(--on-surface)] text-center font-mono">{standing.drawn}</span>
              <span className="text-[10px] font-bold text-[var(--on-surface)] text-center font-mono">{standing.lost}</span>
              <span className={`text-[10px] font-bold text-center font-mono ${
                standing.goalDifference > 0 ? 'text-[var(--yes)]' : standing.goalDifference < 0 ? 'text-[var(--no)]' : 'text-[var(--secondary)]'
              }`}>
                {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
              </span>
              <span className="text-[10px] font-black text-[var(--on-surface)] text-center font-mono">{standing.points}</span>
              <span className={`text-[10px] font-bold text-center rounded px-1 py-0.5 ${
                advOdds != null && advOdds >= 60 ? 'text-[var(--yes)] bg-[var(--yes-bg)]'
                  : advOdds != null && advOdds <= 25 ? 'text-[var(--no)] bg-[var(--no-bg)]'
                  : 'text-[var(--on-surface)] bg-[var(--surface-container-low)]'
              }`}>
                {advOdds != null ? `${advOdds}%` : '--'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GroupStageTable({ groups, profiles }: GroupStageTableProps) {
  const profileMap = useMemo(() => {
    const map = new Map<string, CountryProfile>();
    for (const p of profiles) {
      map.set(p.name, p);
      if (p.country?.name && p.country.name !== p.name) {
        map.set(p.country.name, p);
      }
    }
    return map;
  }, [profiles]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {groups.map(group => (
        <GroupCard key={group.name} group={group} profileMap={profileMap} />
      ))}
    </div>
  );
}
