'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearch } from '@agg-build/hooks';
import { EventListItem } from '@agg-build/ui';
import { useRouter } from 'next/navigation';
import type { VenueEvent, VenueEventWithMarkets, VenueMarket, VenueMarketOutcome } from '@agg-build/sdk';
import Spinner from './components/ui/Spinner';
import MatchMarkets from './components/MatchMarkets';

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

// Keep the curated home strictly FIFA. AGG's fuzzy search drags in other
// "World Cup"/"Cup" events (esports, cricket, MLS, US leagues); show an
// event only if it reads as FIFA football and matches none of those.
const FIFA_RE = /world cup|fifa/i;
const NOT_FIFA_RE = /esports|league of legends|\blol\b|lol:|dota|\bnba\b|\bnhl\b|\bnfl\b|\bmlb\b|world series|cricket|\bicc\b|\bt20\b|\bmls\b|champions league|europa league|rugby/i;

// Each EventListItem fetches its event from agg.market AND opens a live
// price subscription, so mounting all ~70+ at once fires hundreds of
// slow (~3s) agg.market calls in parallel and chokes the page. Render
// the first batch, then reveal more as the user scrolls.
const BATCH = 12;
const PRELOAD_MARGIN = '600px';

export default function HomeClient() {
  const router = useRouter();
  // AGG's /search caps page size around 100; pull the full slate (not a
  // 20-event sample) so every FIFA market — outright, groups, advancement
  // AND individual games — is available on the trade page.
  const { data: events, isLoading, isError, error } = useSearch<VenueEvent>({
    q: SEARCH_QUERY,
    type: 'events',
    limit: 100,
  });

  const fifaEvents = (events ?? []).filter(
    ev => FIFA_RE.test(ev.title || '') && !NOT_FIFA_RE.test(ev.title || ''),
  );

  // Incremental reveal: only mount `count` cards; a bottom sentinel bumps
  // the count as it scrolls into view, so off-screen cards don't fetch.
  const [count, setCount] = useState(BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) setCount(c => c + BATCH); },
      { rootMargin: PRELOAD_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count, fifaEvents.length]);

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

  if (!fifaEvents.length) {
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
            {fifaEvents.length} live market{fifaEvents.length === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      {/* Individual-game markets (Team vs Team), discovered by matchup
          since AGG titles them by team name, not "World Cup". */}
      <MatchMarkets />

      {/* Same grid template AGG's own EventList uses internally:
          auto-fill columns with a 360px minimum. Inline style bypasses
          both Tailwind builds (ours + @agg-build/ui's) so the rule
          ships regardless of which scan picks up arbitrary classes. */}
      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))',
        }}
      >
        {fifaEvents.slice(0, count).map(ev => (
          <EventListItem
            key={ev.id}
            eventId={ev.id}
            href={`/event/${ev.id}`}
            onEventClick={onEventClick}
            getMarketHref={getMarketHref}
            // Match AGG's own EventList — let each card fill its grid
            // cell so they line up edge-to-edge instead of inheriting
            // some narrower default width.
            classNames={{ root: 'w-full min-w-0 max-w-none' }}
          />
        ))}
      </div>

      {/* Sentinel: scrolling near it mounts the next batch of cards. */}
      {count < fifaEvents.length && <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />}
    </main>
  );
}
