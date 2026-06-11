'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EventListItem } from '@agg-build/ui';
import type { VenueEventWithMarkets, VenueMarket, VenueMarketOutcome } from '@agg-build/sdk';

interface MatchMarket {
  id: string;
  group: string;
  eventId: string;
  eventTitle: string;
}

export default function MatchMarkets() {
  const router = useRouter();
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

  // Same handlers the home grid uses, so match cards route identically.
  const onEventClick = (event?: VenueEventWithMarkets) => {
    if (event) router.push(`/event/${event.id}`);
  };
  const getMarketHref = (event: VenueEventWithMarkets, _m: VenueMarket, _o: VenueMarketOutcome) =>
    `/event/${event.id}`;

  // Loaded with no markets → hide entirely.
  if (done && (!matches || matches.length === 0)) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
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
        // Same grid template + EventListItem the home market grid uses, so
        // match cards look identical and get the same live WS pricing.
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))',
          }}
        >
          {matches!.map(m => (
            <EventListItem
              key={m.eventId}
              eventId={m.eventId}
              href={`/event/${m.eventId}`}
              onEventClick={onEventClick}
              getMarketHref={getMarketHref}
              classNames={{ root: 'w-full min-w-0 max-w-none' }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
