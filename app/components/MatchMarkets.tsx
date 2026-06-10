'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MatchTeam { name: string; code: string; flag: string; group: string; }
interface MatchOdds { home: number | null; draw: number | null; away: number | null; }
interface MatchMarket {
  id: string;
  group: string;
  home: MatchTeam;
  away: MatchTeam;
  eventId: string;
  eventTitle: string;
  venue: string | null;
  closeTime: string | null;
  odds: MatchOdds;
}

function pct(p: number | null): string {
  return p == null ? '—' : `${Math.round(p * 100)}%`;
}

function kickoff(iso: string | null): string {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function MatchCard({ m }: { m: MatchMarket }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/event/${m.eventId}`)}
      className="shrink-0 w-72 text-left bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient overflow-hidden cursor-pointer hover:scale-[1.02] transition-all"
    >
      <div className="flex items-center justify-between px-4 py-1.5 bg-[var(--surface-container-high)]">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--secondary)]">
          Group {m.group}
        </span>
        <span className="text-[9px] font-bold font-mono text-[var(--secondary)]">{kickoff(m.closeTime)}</span>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.home.flag} alt={m.home.name} className="w-8 h-5 mx-auto mb-1 object-cover rounded-sm" />
            <div className="font-heading font-black text-xs uppercase tracking-tight text-[var(--on-surface)] truncate">{m.home.name}</div>
            <div className="font-mono text-lg font-bold text-[var(--on-surface)]">{pct(m.odds.home)}</div>
          </div>
          <div className="px-1 text-center">
            <div className="text-[9px] font-bold text-[var(--secondary)] uppercase">Draw</div>
            <div className="font-mono text-sm font-bold text-[var(--secondary)]">{pct(m.odds.draw)}</div>
          </div>
          <div className="flex-1 min-w-0 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.away.flag} alt={m.away.name} className="w-8 h-5 mx-auto mb-1 object-cover rounded-sm" />
            <div className="font-heading font-black text-xs uppercase tracking-tight text-[var(--on-surface)] truncate">{m.away.name}</div>
            <div className="font-mono text-lg font-bold text-[var(--on-surface)]">{pct(m.odds.away)}</div>
          </div>
        </div>

        <div className="mt-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest rounded-md bg-[var(--primary-fixed)] text-[var(--primary)]">
          Trade{m.venue ? ` · ${m.venue}` : ''}
        </div>
      </div>
    </button>
  );
}

export default function MatchMarkets() {
  const [matches, setMatches] = useState<MatchMarket[] | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/fifa/matches')
      .then(r => r.json())
      .then(d => { if (live) setMatches(Array.isArray(d.matches) ? d.matches : []); })
      .catch(() => { if (live) setMatches([]); });
    return () => { live = false; };
  }, []);

  // Loading or genuinely empty → render nothing rather than an empty shell.
  // (Match markets post per match day; until a venue lists one there's
  // nothing to show.)
  if (!matches || matches.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[var(--primary-container)]">sports_soccer</span>
        <h2 className="text-sm font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
          Match Markets
        </h2>
        <span className="px-2 py-0.5 rounded-full bg-[var(--primary-fixed)] text-[var(--primary)] text-[9px] font-bold uppercase tracking-widest">
          {matches.length}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        {matches.map(m => <MatchCard key={m.id} m={m} />)}
      </div>
    </section>
  );
}
