'use client';

import { EventMarketPage } from '@agg-build/ui';

// AGG's EventMarketPage fetches the event itself when given eventId,
// renders the markets accordion, hero, sticky place-order panel, and
// settlement summary. Our id route param is the AGG event id directly,
// produced by HomeClient's getEventHref.
export default function EventClient({ eventId }: { eventId: string }) {
  return (
    <EventMarketPage
      eventId={eventId}
      showPlaceOrder
      stickyOrderPanel={{ enabled: true, top: 80 }}
    />
  );
}
