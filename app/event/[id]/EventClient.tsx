'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EventMarketPage } from '@agg-build/ui';

// AGG's EventMarketPage fetches the event itself when given eventId,
// renders the markets accordion, hero, sticky place-order panel, and
// settlement summary. We honor `market` + `outcome` query params so
// deep-links from /countries (and any future Buy Yes/No buttons that
// route here) land with the right side preselected for the user.
export default function EventClient({ eventId }: { eventId: string }) {
  const params = useSearchParams();
  const defaultMarketId = params.get('market') ?? undefined;
  const defaultOutcomeId = params.get('outcome') ?? undefined;

  return (
    <>
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[var(--secondary)] hover:text-[var(--primary-container)] transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to markets
        </Link>
      </div>
      <EventMarketPage
        eventId={eventId}
        showPlaceOrder
        stickyOrderPanel={{ enabled: true, top: 80 }}
        defaultMarketId={defaultMarketId}
        defaultOutcomeId={defaultOutcomeId}
      />
    </>
  );
}
