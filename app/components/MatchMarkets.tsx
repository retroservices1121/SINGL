'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EventListItem } from '@agg-build/ui';
import type { VenueEventWithMarkets, VenueMarket, VenueMarketOutcome } from '@agg-build/sdk';

interface MatchMarket {
  id: string;
  group: string;
  eventId: string;
  eventTitle: string;
  date: string | null;
  status?: 'scheduled' | 'live' | 'final';
}

// Always display kickoff in US Eastern, regardless of the viewer's locale.
const ET = 'America/New_York';
function kickoffLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('en-US', { timeZone: ET });
  const today = new Date().toLocaleDateString('en-US', { timeZone: ET });
  const time = d.toLocaleTimeString('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit' });
  if (day === today) return `Today · ${time} ET`;
  const date = d.toLocaleDateString('en-US', { timeZone: ET, weekday: 'short', month: 'short', day: 'numeric' });
  return `${date} · ${time} ET`;
}

// Each EventListItem fetches its event + opens a live price subscription,
// so mounting all ~72 at once is heavy. Mount nothing until the section
// nears the viewport, then reveal in batches as the user scrolls.
const BATCH = 12;
const PRELOAD_MARGIN = '400px';

export default function MatchMarkets() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchMarket[] | null>(null);
  const [done, setDone] = useState(false);
  const [visible, setVisible] = useState(false); // section reached viewport
  const [count, setCount] = useState(BATCH);      // cards currently mounted

  const sectionRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch the match LIST on mount — light (ids only), no pricing.
  useEffect(() => {
    let live = true;
    fetch('/api/fifa/matches')
      .then(r => r.json())
      .then(d => { if (live) setMatches(Array.isArray(d.matches) ? d.matches : []); })
      .catch(() => { if (live) setMatches([]); })
      .finally(() => { if (live) setDone(true); });
    return () => { live = false; };
  }, []);

  // Start mounting cards only when the section is near the viewport.
  useEffect(() => {
    if (visible) return;
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) { setVisible(true); io.disconnect(); } },
      { rootMargin: PRELOAD_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, done, matches]);

  // Reveal the next batch as the bottom sentinel scrolls into view.
  useEffect(() => {
    if (!visible || !matches) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) setCount(c => Math.min(c + BATCH, matches.length)); },
      { rootMargin: PRELOAD_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, matches, count]);

  const onEventClick = (event?: VenueEventWithMarkets) => {
    if (event) router.push(`/event/${event.id}`);
  };
  const getMarketHref = (event: VenueEventWithMarkets, _m: VenueMarket, _o: VenueMarketOutcome) =>
    `/event/${event.id}`;

  // Loaded with no markets → hide entirely.
  if (done && (!matches || matches.length === 0)) return null;

  const shown = visible && matches ? matches.slice(0, count) : [];
  const hasMore = !!matches && visible && count < matches.length;

  return (
    <section ref={sectionRef} className="mb-8">
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
        // Same grid + EventListItem as the home market grid (identical look
        // and live WS pricing), but only `shown` are mounted at a time.
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))',
          }}
        >
          {shown.map(m => (
            <div key={m.eventId} className="flex flex-col gap-1 min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-widest px-1 flex items-center gap-1.5">
                {m.status === 'live' ? (
                  <span className="inline-flex items-center gap-1 text-[var(--no)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--no)] animate-pulse" />
                    Live · Group {m.group}
                  </span>
                ) : (
                  <span className="text-[var(--secondary)]">Group {m.group} · {kickoffLabel(m.date)}</span>
                )}
              </span>
              <EventListItem
                eventId={m.eventId}
                href={`/event/${m.eventId}`}
                onEventClick={onEventClick}
                getMarketHref={getMarketHref}
                classNames={{ root: 'w-full min-w-0 max-w-none' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Sentinel: scrolling near it mounts the next batch. Kept tall enough
          that the observer fires before the grid bottom is reached. */}
      {hasMore && <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />}
    </section>
  );
}
