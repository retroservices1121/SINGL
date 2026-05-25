'use client';

import { HomePage } from '@agg-build/ui';
import { useRouter } from 'next/navigation';
import type { VenueEventWithMarkets, VenueMarket, VenueMarketOutcome } from '@agg-build/sdk';

// AGG's HomePage renders categories, event lists, and the sticky order
// panel. We mount it with withHeader={false} because SinglNav already
// provides the chrome, and route event/market clicks back into our own
// /event/[id] route.
export default function HomeClient() {
  const router = useRouter();

  const getEventHref = (event: VenueEventWithMarkets) => `/event/${event.id}`;
  const getMarketHref = (event: VenueEventWithMarkets, _market: VenueMarket, _outcome: VenueMarketOutcome) =>
    `/event/${event.id}`;
  const onEventClick = (event: VenueEventWithMarkets) => {
    router.push(`/event/${event.id}`);
  };

  return (
    <main className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
      <HomePage
        withHeader={false}
        getEventHref={getEventHref}
        getMarketHref={getMarketHref}
        onEventClick={onEventClick}
        stickyOrderPanel={{ enabled: true, top: 80 }}
      />
    </main>
  );
}
