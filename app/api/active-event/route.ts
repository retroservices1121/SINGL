import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getMarketsByEventTicker, getMarkets } from '@/app/lib/dflow';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });

  if (!config) {
    return NextResponse.json({ event: null });
  }

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: {
      newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      tiktoks: { orderBy: { fetchedAt: 'desc' }, take: 8 },
    },
  });

  if (!event) {
    return NextResponse.json({ event: null });
  }

  // Fetch live market data directly from DFlow
  let markets: Awaited<ReturnType<typeof getMarkets>> = [];
  if (event.searchTerms.length > 0) {
    try {
      const eventTicker = event.searchTerms.find(t => t.startsWith('KX')) || event.searchTerms[0];
      markets = eventTicker.startsWith('KX')
        ? await getMarketsByEventTicker(eventTicker)
        : await getMarkets(event.searchTerms);
    } catch (err) {
      console.error('DFlow live price fetch error:', err);
      // Fall back to cached DB markets
      const dbMarkets = await prisma.market.findMany({ where: { eventId: event.id } });
      markets = dbMarkets.map(m => ({
        id: m.id,
        eventId: m.eventId,
        ticker: m.ticker,
        title: m.title,
        yesPrice: m.yesPrice,
        noPrice: m.noPrice,
        volume: m.volume,
        change24h: m.change24h,
        category: m.category,
        rulesPrimary: m.rulesPrimary,
        closeTime: m.closeTime?.toISOString() ?? null,
        expirationTime: m.expirationTime?.toISOString() ?? null,
      }));
    }
  }

  return NextResponse.json({
    event: {
      ...event,
      markets,
    },
  });
}
