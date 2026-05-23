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
    const { data: venueEvents } = await listVenueEvents({
      search: q,
      status: 'open',
      limit: 40,
    });

    const events = venueEvents.map(ve => {
      const activeMarkets = (ve.markets || []).filter(m => m.status === 'open' || m.status === undefined);
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
          const o1 = m.outcomes?.[0];
          const o2 = m.outcomes?.[1];
          const yesPrice = o1?.price ?? 0.5;
          const noPrice = o2?.price ?? (1 - yesPrice);
          return {
            ticker: m.id,
            venueMarketId: m.id,
            title: m.title,
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
            outcomeName: o1?.name !== 'Yes' ? o1?.name : null,
            outcome2Name: o2?.name !== 'No' ? o2?.name : null,
          };
        }),
      };
    });

    events.sort((a, b) => b.activeCount - a.activeCount);
    return NextResponse.json({ events });
  } catch (err) {
    console.error('Admin search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
