'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MatchTeam { name: string; code: string; flag: string; group: string; }
interface MatchMarket {
  id: string;
  group: string;
  home: MatchTeam;
  away: MatchTeam;
  eventId: string;
  eventTitle: string;
  venue: string | null;
}

function MatchCard({ m }: { m: MatchMarket }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/event/${m.eventId}`)}
      className="flex flex-col gap-2 p-3 text-left bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient cursor-pointer hover:scale-[1.02] transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--secondary)]">Group {m.group}</span>
        {m.venue && <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--secondary)]">{m.venue}</span>}
      </div>
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.home.flag} alt={m.home.name} className="w-6 h-4 object-cover rounded-sm shrink-0" />
        <span className="text-[11px] font-bold text-[var(--on-surface)] truncate flex-1">{m.home.name}</span>
      </div>
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.away.flag} alt={m.away.name} className="w-6 h-4 object-cover rounded-sm shrink-0" />
        <span className="text-[11px] font-bold text-[var(--on-surface)] truncate flex-1">{m.away.name}</span>
      </div>
      <div className="py-1 text-center text-[9px] font-bold uppercase tracking-widest rounded-md bg-[var(--primary-fixed)] text-[var(--primary)]">
        Trade
      </div>
    </button>
  );
}

export default function MatchMarkets() {
  const [matches, setMatches] = useState<MatchMarket[] | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    fetch('/api/fifa/matches')
      .then(r => r.json())
      .then(d => { if (live) setMatches(Array.isArray(d.matches) ? d.matches : []); })
      .catch(() => { if (live) setMatches([]); })
      .finally(() => { if (live) setDone(true); });
    return () => { live = false; };
  }, []);

  // Loaded with no markets → hide entirely (nothing to trade yet).
  if (done && (!matches || matches.length === 0)) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[var(--primary-container)]">sports_soccer</span>
        <h2 className="text-sm font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">Match Markets</h2>
        {matches && matches.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[var(--primary-fixed)] text-[var(--primary)] text-[9px] font-bold uppercase tracking-widest">
            {matches.length}
          </span>
        )}
      </div>

      {!done && matches === null ? (
        <div className="text-xs text-[var(--secondary)] font-bold uppercase tracking-widest py-4">
          Loading match markets…
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))',
          }}
        >
          {matches!.map(m => <MatchCard key={m.id} m={m} />)}
        </div>
      )}
    </section>
  );
}
