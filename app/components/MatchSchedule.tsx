'use client';

import { useState, useMemo, useEffect } from 'react';
import type { CountryProfile, MatchFixture, FIFARound } from '@/app/lib/fifa';
import { getFullSchedule, ROUND_LABELS, WORLD_CUP_COUNTRIES } from '@/app/lib/fifa';
import { useTradeStore } from '@/app/store/tradeStore';

interface MatchScheduleProps {
  profiles: CountryProfile[];
}

const ALL_ROUNDS: (FIFARound | 'ALL')[] = ['ALL', 'GROUP', 'R32', 'R16', 'QF', 'SF', 'FINAL'];
const ROUND_ICONS: Record<string, string> = {
  ALL: 'calendar_month', GROUP: 'groups', R32: 'grid_view', R16: 'view_comfy_alt', QF: 'trophy', SF: 'social_leaderboard', FINAL: 'emoji_events',
};

function Countdown({ date, time }: { date: string; time: string }) {
  const [label, setLabel] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const hourStr = time.replace(' ET', '').replace(' CT', '');
      const target = new Date(`${date}T${hourStr}:00-04:00`).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0 && diff > -4 * 60 * 60 * 1000) {
        setLabel('LIVE'); setUrgent(true); return;
      }
      if (diff <= 0) { setLabel('FINAL'); setUrgent(false); return; }

      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);

      if (hours < 1) { setLabel(`${mins}m`); setUrgent(true); }
      else if (hours < 24) { setLabel(`${hours}h ${mins}m`); setUrgent(hours < 3); }
      else { const days = Math.floor(hours / 24); setLabel(`${days}d`); setUrgent(false); }
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [date, time]);

  if (!label) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
      urgent ? 'bg-[var(--primary-container)] text-white' : label === 'FINAL' ? 'bg-[var(--surface-container-high)] text-[var(--secondary)]' : 'bg-[var(--surface-container-high)] text-[var(--secondary)]'
    }`}>
      {urgent && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
      {label}
    </span>
  );
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function MatchRow({ fixture, profiles }: { fixture: MatchFixture; profiles: CountryProfile[] }) {
  const openTrade = useTradeStore(s => s.openTrade);

  const homeProfile = fixture.home ? profiles.find(p => p.country.code === fixture.home!.code) : null;
  const awayProfile = fixture.away ? profiles.find(p => p.country.code === fixture.away!.code) : null;
  const market = homeProfile?.championshipMarket || awayProfile?.championshipMarket;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        isToday(fixture.date) ? 'bg-[var(--primary-fixed)]' : 'bg-[var(--surface-container-lowest)] hover:bg-[var(--surface-container-low)]'
      } ${market ? 'cursor-pointer' : ''}`}
      onClick={() => market && openTrade(market, 'yes')}
    >
      {/* Match number */}
      <span className="text-[9px] font-bold text-[var(--secondary)] bg-[var(--surface-container-high)] px-1.5 py-0.5 rounded shrink-0">
        #{fixture.matchNumber}
      </span>

      {/* Time */}
      <span className="text-[10px] font-bold font-mono text-[var(--on-surface)] w-16 shrink-0">
        {fixture.time}
      </span>

      {/* Home */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className="text-[11px] font-bold text-[var(--on-surface)] truncate text-right">
          {fixture.home ? fixture.home.name : fixture.homeLabel}
        </span>
        {fixture.home && <span className="text-base shrink-0">{fixture.home.flag}</span>}
      </div>

      {/* VS */}
      <span className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest shrink-0 px-1">vs</span>

      {/* Away */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {fixture.away && <span className="text-base shrink-0">{fixture.away.flag}</span>}
        <span className="text-[11px] font-bold text-[var(--on-surface)] truncate">
          {fixture.away ? fixture.away.name : fixture.awayLabel}
        </span>
      </div>

      {/* Group badge */}
      {fixture.group && (
        <span className="text-[8px] font-bold text-[var(--secondary)] bg-[var(--surface-container-high)] px-1.5 py-0.5 rounded shrink-0">
          Grp {fixture.group}
        </span>
      )}

      {/* Countdown */}
      <div className="shrink-0">
        <Countdown date={fixture.date} time={fixture.time} />
      </div>

      {/* Trade arrow */}
      {market && (
        <span className="material-symbols-outlined text-[12px] text-[var(--secondary)] shrink-0">arrow_forward</span>
      )}
    </div>
  );
}

export default function MatchSchedule({ profiles }: MatchScheduleProps) {
  const [roundFilter, setRoundFilter] = useState<FIFARound | 'ALL'>('ALL');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const allFixtures = useMemo(() => getFullSchedule(), []);

  const filtered = useMemo(() => {
    let result = allFixtures;

    if (roundFilter !== 'ALL') {
      result = result.filter(f => f.round === roundFilter);
    }

    if (groupFilter && roundFilter === 'GROUP') {
      result = result.filter(f => f.group === groupFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        f.homeLabel.toLowerCase().includes(q) || f.awayLabel.toLowerCase().includes(q) ||
        f.home?.name.toLowerCase().includes(q) || f.away?.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allFixtures, roundFilter, groupFilter, search]);

  // Group by date
  const dateGroups = useMemo(() => {
    const groups = new Map<string, MatchFixture[]>();
    for (const f of filtered) {
      const arr = groups.get(f.date) || [];
      arr.push(f);
      groups.set(f.date, arr);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[var(--primary)]">calendar_month</span>
        <h3 className="font-heading font-black text-lg text-[var(--on-surface)] uppercase tracking-tight">Match Schedule</h3>
        <span className="px-2 py-0.5 rounded-full bg-[var(--surface-container-high)] text-[9px] font-bold text-[var(--secondary)]">
          {filtered.length} matches
        </span>
      </div>

      {/* Round filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {ALL_ROUNDS.map(r => (
          <button
            key={r}
            onClick={() => { setRoundFilter(r); if (r !== 'GROUP') setGroupFilter(null); }}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              roundFilter === r ? 'bg-[var(--primary-container)] text-white' : 'bg-[var(--surface-container-high)] text-[var(--secondary)] hover:text-[var(--on-surface)]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{ROUND_ICONS[r]}</span>
            {r === 'ALL' ? 'All' : ROUND_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Group filter (only for group stage) */}
      {roundFilter === 'GROUP' && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setGroupFilter(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest cursor-pointer ${
              !groupFilter ? 'bg-[var(--on-surface)] text-white' : 'bg-[var(--surface-container-high)] text-[var(--secondary)]'
            }`}
          >All Groups</button>
          {'ABCDEFGHIJKL'.split('').map(g => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                groupFilter === g ? 'bg-[var(--on-surface)] text-white' : 'bg-[var(--surface-container-high)] text-[var(--secondary)]'
              }`}
            >{g}</button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--secondary)] text-sm">search</span>
        <input
          type="text"
          placeholder="Search by country..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-[var(--surface-container-low)] rounded-lg text-xs text-[var(--on-surface)] placeholder:text-[var(--secondary)] outline-none border border-transparent focus:border-[var(--primary-container)]"
        />
      </div>

      {/* Date-grouped matches */}
      <div className="space-y-4">
        {dateGroups.map(([date, fixtures]) => (
          <div key={date}>
            <div className={`sticky top-0 z-10 flex items-center gap-2 px-2 py-2 mb-2 rounded-lg ${
              isToday(date) ? 'bg-[var(--primary-container)] text-white' : 'bg-[var(--surface-container-high)]'
            }`}>
              {isToday(date) && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              <span className={`text-[10px] font-black uppercase tracking-widest ${isToday(date) ? 'text-white' : 'text-[var(--on-surface)]'}`}>
                {isToday(date) ? 'TODAY' : ''} {formatDateHeader(date)}
              </span>
              <span className={`text-[9px] font-bold ${isToday(date) ? 'text-white/70' : 'text-[var(--secondary)]'}`}>
                {fixtures.length} match{fixtures.length > 1 ? 'es' : ''}
              </span>
            </div>
            <div className="space-y-1.5">
              {fixtures.map(f => <MatchRow key={f.id} fixture={f} profiles={profiles} />)}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[var(--secondary)] text-sm bg-[var(--surface-container-lowest)] rounded-xl">
          No matches found
        </div>
      )}
    </div>
  );
}
