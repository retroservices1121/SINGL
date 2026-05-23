import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { listVenueEvents, mapAggMarket } from '@/app/lib/aggServer';

export const dynamic = 'force-dynamic';

// SYNC-ONLY: keeps the Market table in step with AGG so we know which
// markets belong to the active event (for /admin, /api/depth, etc.).
// Pricing is live via WebSockets — no prices are written here.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = req.nextUrl.searchParams.get('secret');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) return NextResponse.json({ error: 'No active event' }, { status: 404 });

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: { markets: true },
  });
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  let aggMarkets: ReturnType<typeof mapAggMarket>[] = [];
  try {
    const { data: venueEvents } = await listVenueEvents({
      searchTerms: event.searchTerms,
      status: 'open',
      limit: 100,
    });
    const seen = new Set<string>();
    for (const ve of venueEvents) {
      for (const m of (ve.markets || [])) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        aggMarkets.push(mapAggMarket(ve, m));
      }
    }
    aggMarkets = aggMarkets.filter(Boolean);
  } catch (err) {
    console.error('[cron/prices] listVenueEvents error:', err);
    return NextResponse.json({ error: 'AGG fetch failed' }, { status: 502 });
  }

  let newMarketsAdded = 0;
  let updatedMarkets = 0;

  const existingByVenueId = new Map(event.markets.map(m => [m.venueMarketId, m]));

  for (const am of aggMarkets) {
    if (!am) continue;
    const existing = existingByVenueId.get(am.venueMarketId);
    const closeTime = am.closeTime ? new Date(am.closeTime) : null;

    if (existing) {
      // Refresh metadata only — leave yesPrice/noPrice untouched. They
      // exist on Market as a bootstrap value for first paint and have no
      // authority over live WebSocket prices.
      await prisma.market.update({
        where: { id: existing.id },
        data: {
          title: am.title,
          volume: am.volume ?? null,
          yesOutcomeId: am.yesOutcomeId,
          noOutcomeId: am.noOutcomeId,
          tickSize: am.tickSize,
          venue: am.venue ?? null,
          outcomeName: am.outcomeName ?? null,
          outcome2Name: am.outcome2Name ?? null,
          closeTime,
          expirationTime: closeTime,
          rulesPrimary: am.rulesPrimary ?? null,
        },
      });
      updatedMarkets += 1;
    } else {
      await prisma.market.create({
        data: {
          eventId: event.id,
          ticker: am.venueMarketId,
          title: am.title,
          // Initial price bootstrap — overridden by WS the moment client mounts.
          yesPrice: am.yesPrice,
          noPrice: am.noPrice,
          volume: am.volume ?? null,
          venueMarketId: am.venueMarketId,
          yesOutcomeId: am.yesOutcomeId,
          noOutcomeId: am.noOutcomeId,
          tickSize: am.tickSize,
          venue: am.venue ?? null,
          outcomeName: am.outcomeName ?? null,
          outcome2Name: am.outcome2Name ?? null,
          closeTime,
          expirationTime: closeTime,
          rulesPrimary: am.rulesPrimary ?? null,
        },
      });
      newMarketsAdded += 1;
    }
  }

  return NextResponse.json({
    success: true,
    updatedMarkets,
    newMarketsAdded,
    totalMarkets: aggMarkets.length,
    note: 'sync-only — pricing is live via WebSocket from AGG',
  });
}
