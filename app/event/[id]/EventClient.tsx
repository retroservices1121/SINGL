'use client';

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
    <EventMarketPage
      eventId={eventId}
      showPlaceOrder
      stickyOrderPanel={{ enabled: true, top: 80 }}
      defaultMarketId={defaultMarketId}
      defaultOutcomeId={defaultOutcomeId}
    />
  );
}
