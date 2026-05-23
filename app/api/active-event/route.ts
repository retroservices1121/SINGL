import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { listVenueEvents, mapAggMarket } from '@/app/lib/aggServer';
import type { MarketData, MarketOutcome } from '@/app/types';

export const dynamic = 'force-dynamic';

// AGG returns most multi-outcome events as N binary "Will X win?" markets
// (negRisk pattern), one per country. To present them as AGG's own UI
// does — ONE card titled "2026 FIFA World Cup Winner" with all country
// outcomes — group binary siblings by their parent venueEventId and
// synthesize a multi-outcome MarketData from the group.
//
// Single-market parent events (true binary like "Will inflation hit 3%
// in Q3 2026?") pass through unchanged.
function groupMarketsByParentEvent(markets: MarketData[]): MarketData[] {
  // Group by parent eventId. mapAggMarket sets MarketData.eventId from the
  // AGG venueEvent id, so this groups everything that came from the same
  // parent event regardless of which AGG /search result it surfaced under.
  const groups = new Map<string, MarketData[]>();
  for (const m of markets) {
    const key = m.eventId || `solo:${m.venueMarketId}`;
    const arr = groups.get(key);
    if (arr) arr.push(m);
    else groups.set(key, [m]);
  }

  const out: MarketData[] = [];
  for (const [eventId, group] of groups) {
    // Singletons render normally (binary Yes/No card).
    if (group.length <= 1) {
      out.push(...group);
      continue;
    }

    // Sibling cluster — synthesize a multi-outcome card.
    const first = group[0];
    const outcomes: MarketOutcome[] = group
      .map(m => ({
        id: m.yesOutcomeId,
        // Each child market's title IS the outcome label (e.g. "France").
        label: m.title || m.outcomeName || 'Outcome',
        price: m.yesPrice,
        noId: m.noOutcomeId,
        childMarketId: m.venueMarketId,
        venue: typeof m.venue === 'string' ? m.venue : undefined,
      }))
      // Sort by descending YES price — front-runner first, like AGG's UI.
      .sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

    const totalVolume = group.reduce((sum, m) => sum + (m.volume || 0), 0);
    const earliestClose = group
      .map(m => m.closeTime)
      .filter((t): t is string => !!t)
      .sort()[0] ?? null;

    out.push({
      // Use a stable synthetic id so live-price subscription keys stay sticky
      // across refreshes. id/ticker/venueMarketId all match for routing.
      id: `group:${eventId}`,
      eventId,
      ticker: `group:${eventId}`,
      // The synthesized card title IS the parent event title (e.g.
      // "2026 FIFA World Cup Winner"). parentEventTitle stays in sync
      // so the subtitle above the title disappears (avoids duplication).
      title: first.parentEventTitle || 'Multi-Outcome Market',
      yesPrice: outcomes[0]?.price ?? first.yesPrice,
      noPrice: 1 - (outcomes[0]?.price ?? first.yesPrice),
      volume: totalVolume || null,
      change24h: null,
      category: null,
      rulesPrimary: first.rulesPrimary ?? null,
      closeTime: earliestClose,
      expirationTime: earliestClose,
      venueMarketId: `group:${eventId}`,
      // yesOutcomeId/noOutcomeId default to the top-ranked outcome so
      // legacy code paths that don't know about multi-outcome (the home
      // page binary Yes/No buttons, the share link, etc.) still target a
      // sensible default.
      yesOutcomeId: outcomes[0]?.id ?? first.yesOutcomeId,
      noOutcomeId: outcomes[0]?.noId ?? first.noOutcomeId,
      tickSize: first.tickSize,
      // Outcome-name fields hidden — labels live in the outcomes array.
      outcomeName: null,
      outcome2Name: null,
      outcomes,
      venue: first.venue,
      // Equal to title so MarketCard's showEventSubtitle gate hides it.
      parentEventTitle: first.parentEventTitle ?? null,
    });
  }

  return out;
}

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) return NextResponse.json({ event: null });

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: {
      newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      tiktoks: { orderBy: { fetchedAt: 'desc' }, take: 8 },
    },
  });
  if (!event) return NextResponse.json({ event: null });

  let markets: MarketData[] = [];
  try {
    if (event.searchTerms.length > 0) {
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
          const mapped = mapAggMarket(ve, m);
          if (mapped) markets.push(mapped);
        }
      }
    }
  } catch (err) {
    console.error('[active-event] AGG fetch error:', err);
  }

  // Group sibling binary markets into synthesized multi-outcome cards,
  // then sort by volume so the highest-liquidity events surface first.
  const grouped = groupMarketsByParentEvent(markets);
  grouped.sort((a, b) => (b.volume || 0) - (a.volume || 0));

  const totalVolume = grouped.reduce((sum, m) => sum + (m.volume || 0), 0);

  return NextResponse.json({
    event: {
      ...event,
      markets: grouped,
      volume: totalVolume || event.volume,
      liquidity: event.liquidity || 0,
    },
  });
}
