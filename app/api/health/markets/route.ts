import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { aggFetch, listVenueEvents } from '@/app/lib/aggServer';

export const dynamic = 'force-dynamic';

// GET /api/health/markets?secret=<CRON_SECRET>
// Shows the outcome-count distribution for the active event's markets,
// plus samples of the largest multi-outcome markets. Tells us whether
// AGG is splitting 'Nation to Reach Final' into 32 binary markets or
// returning it as one 32-outcome market.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) return NextResponse.json({ error: 'No active event' }, { status: 404 });

  const event = await prisma.event.findUnique({ where: { slug: config.value } });
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Walk the same path /api/active-event uses so we see what the home
  // page actually receives.
  const { data: venueEvents } = await listVenueEvents({
    searchTerms: event.searchTerms,
    status: 'open',
    limit: 100,
  });

  // Histogram of outcome counts across every market we'd render.
  const distribution: Record<number, number> = {};
  const samples: Array<{ eventTitle: string; marketTitle: string; outcomeCount: number; outcomeLabels: string[]; marketId: string | null; venue: string | undefined }> = [];

  for (const ve of venueEvents) {
    for (const m of (ve.markets || [])) {
      const outcomes = (m.venueMarketOutcomes ?? m.outcomes ?? []);
      const n = outcomes.length;
      distribution[n] = (distribution[n] || 0) + 1;
      if (n > 2 && samples.length < 5) {
        samples.push({
          eventTitle: ve.title || '',
          marketTitle: m.question || m.title || '',
          outcomeCount: n,
          outcomeLabels: outcomes.slice(0, 8).map(o => (o.label ?? o.name ?? '')),
          marketId: (m as { marketId?: string | null }).marketId ?? null,
          venue: m.venue,
        });
      }
    }
  }

  // For comparison: also probe /venue-markets directly with a small limit
  // for the first matched AGG event to see the raw shape.
  let rawSample: unknown = null;
  if (venueEvents[0]) {
    try {
      rawSample = await aggFetch<unknown>('/venue-markets', {
        query: { venueEventId: venueEvents[0].id, limit: 2 },
      });
    } catch (err) {
      rawSample = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({
    activeEvent: { slug: config.value, title: event.title, searchTerms: event.searchTerms },
    venueEventsMatched: venueEvents.length,
    totalMarkets: Object.values(distribution).reduce((a, b) => a + b, 0),
    outcomeCountDistribution: distribution,
    multiOutcomeSamples: samples,
    rawVenueMarketsResponseSample: rawSample,
  });
}
