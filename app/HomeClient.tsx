'use client';

import { useSearch } from '@agg-build/hooks';
import { EventListItem } from '@agg-build/ui';
import { useRouter } from 'next/navigation';
import type { VenueEvent, VenueEventWithMarkets, VenueMarket, VenueMarketOutcome } from '@agg-build/sdk';
import Spinner from './components/ui/Spinner';

// FIFA-curated home — dodges AGG's broken /venue-events listing
// endpoint by using two known-good endpoints instead:
//   useSearch({ type: 'events', q })       → /search          (200 ✓)
//   <EventListItem eventId={...}>           → /venue-events/{id} (200 ✓)
// Once AGG fixes the listing endpoint, swap this for <HomePage> with
// a one-line change in page.tsx.

// Hardcoded for now — the active event in DB is FIFA. If we later open
// SINGL to multiple sports we can read this from /api/active-event's
// searchTerms or pass it via props.
const SEARCH_QUERY = 'FIFA World Cup';

export default function HomeClient() {
  const router = useRouter();
  const { data: events, isLoading, isError, error } = useSearch<VenueEvent>({
    q: SEARCH_QUERY,
    type: 'events',
    limit: 20,
  });

  // EventListItem takes `href` directly for the card link (no per-item
  // getter like HomePage has). onEventClick fires on body click; the
  // href powers cmd/ctrl-click → new tab.
  const onEventClick = (event?: VenueEventWithMarkets) => {
    if (event) router.push(`/event/${event.id}`);
  };
  const getMarketHref = (event: VenueEventWithMarkets, _m: VenueMarket, _o: VenueMarketOutcome) =>
    `/event/${event.id}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-32 text-center">
        <p className="font-heading text-xl font-black uppercase tracking-tight text-[var(--on-surface)] mb-2">
          Couldn&apos;t load markets
        </p>
        <p className="text-sm text-[var(--secondary)]">{error?.message ?? 'Try refreshing in a moment.'}</p>
      </div>
    );
  }

  if (!events?.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-32 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <p className="font-heading text-xl font-black uppercase tracking-tight text-[var(--on-surface)]">
          No FIFA markets right now
        </p>
        <p className="text-sm text-[var(--secondary)] mt-2">Check back closer to kickoff.</p>
      </div>
    );
  }

  return (
    <main className="max-w-screen-2xl mx-auto px-4 md:px-6 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tight text-[var(--on-surface)]">
            FIFA World Cup 2026
          </h1>
          <p className="text-xs text-[var(--secondary)] font-bold uppercase tracking-widest mt-1">
            {events.length} live market{events.length === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(ev => (
          <EventListItem
            key={ev.id}
            eventId={ev.id}
            href={`/event/${ev.id}`}
            onEventClick={onEventClick}
            getMarketHref={getMarketHref}
          />
        ))}
      </div>
    </main>
  );
}
