import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getMarkets } from '@/app/lib/dflow';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let event = await prisma.event.findUnique({
    where: { slug },
    include: {
      newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      tiktoks: { orderBy: { fetchedAt: 'desc' }, take: 8 },
    },
  });

  if (!event) {
    // Auto-create event from slug
    const words = slug.split('-');
    const title = words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const searchTerms = [title];
    const keyWords = words.filter(w => w.length > 3).join(' ');
    if (keyWords && keyWords !== title.toLowerCase()) {
      searchTerms.push(keyWords);
    }

    event = await prisma.event.create({
      data: { slug, title, searchTerms },
      include: {
        newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
        xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
        videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
        tiktoks: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      },
    });
  }

  // Fetch live market data directly from DFlow
  let markets: Awaited<ReturnType<typeof getMarkets>> = [];
  if (event.searchTerms.length > 0) {
    try {
      markets = await getMarkets(event.searchTerms);
    } catch (err) {
      console.error('DFlow market fetch error:', err);
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
    ...event,
    markets,
  });
}
