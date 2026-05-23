import { NextRequest, NextResponse } from 'next/server';
import { listVenueEvents } from '@/app/lib/aggServer';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) return NextResponse.json({ events: [] });

  try {
    // Minimal params — AGG returned 500 on the kitchen-sink query
    // (search + status + sortBy + limit). Drop everything except `search`
    // and let AGG default the rest.
    const { data: venueEvents } = await listVenueEvents({ search: q });

    const events = venueEvents.map(ve => {
      const markets = ve.markets || [];
      // AGG market status enum: open|closed|resolved|unopened|paused
      // — treat anything other than closed/resolved as tradable.
      const activeMarkets = markets.filter(m =>
        !m.status || ['open', 'unopened', 'paused'].includes(m.status as string),
      );
      return {
        ticker: ve.externalIdentifier || ve.id,
        title: ve.title,
        subtitle: ve.description?.slice(0, 120),
        imageUrl: ve.image,
        volume: ve.volume,
        volume24h: undefined,
        liquidity: undefined,
        marketCount: ve.marketCount ?? activeMarkets.length,
        activeCount: activeMarkets.length,
        competition: undefined,
        markets: activeMarkets.slice(0, 50).map(m => {
          const outcomes = m.venueMarketOutcomes ?? m.outcomes ?? [];
          const o1 = outcomes[0];
          const o2 = outcomes[1];
          const l1 = (o1?.label ?? o1?.name ?? '').trim();
          const l2 = (o2?.label ?? o2?.name ?? '').trim();
          const yesPrice = o1?.price ?? 0.5;
          const noPrice = o2?.price ?? (1 - yesPrice);
          return {
            ticker: m.id,
            venueMarketId: m.id,
            title: m.question || m.title || '',
            yesPrice,
            noPrice,
            yesBid: String(yesPrice),
            yesAsk: String(yesPrice),
            noBid: String(noPrice),
            noAsk: String(noPrice),
            volume: m.volume,
            openInterest: m.liquidity,
            rulesPrimary: m.description,
            closeTime: m.endDate,
            expirationTime: m.endDate,
            status: m.status,
            yesOutcomeId: o1?.id,
            noOutcomeId: o2?.id,
            tickSize: m.tickSize || '0.01',
            venue: m.venue || ve.venue,
            outcomeName: l1 && l1 !== 'Yes' ? l1 : null,
            outcome2Name: l2 && l2 !== 'No' ? l2 : null,
          };
        }),
      };
    });

    events.sort((a, b) => b.activeCount - a.activeCount);
    return NextResponse.json({ events });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Admin search error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
