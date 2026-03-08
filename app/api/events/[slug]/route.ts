import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getMarkets } from '@/app/lib/dflow';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let event = await prisma.event.findUnique({
    where: { slug },
    include: {
      markets: true,
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
        markets: true,
        newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
        xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
        videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      tiktoks: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      },
    });
  }

  // Always fetch fresh market data from DFlow
  if (event.searchTerms.length > 0) {
    try {
      const liveMarkets = await getMarkets(event.searchTerms);

      if (liveMarkets.length > 0) {
        // Update or create markets from live DFlow data
        for (const m of liveMarkets) {
          const existing = await prisma.market.findFirst({
            where: { eventId: event.id, ticker: m.ticker },
          });

          if (existing) {
            await prisma.market.update({
              where: { id: existing.id },
              data: {
                title: m.title,
                yesPrice: m.yesPrice,
                noPrice: m.noPrice,
                volume: m.volume,
                change24h: m.change24h,
                category: m.category,
                rulesPrimary: m.rulesPrimary,
                closeTime: m.closeTime ? new Date(m.closeTime) : null,
                expirationTime: m.expirationTime ? new Date(m.expirationTime) : null,
              },
            });
          } else {
            await prisma.market.create({
              data: {
                eventId: event.id,
                ticker: m.ticker,
                title: m.title,
                yesPrice: m.yesPrice,
                noPrice: m.noPrice,
                volume: m.volume,
                change24h: m.change24h,
                category: m.category,
                rulesPrimary: m.rulesPrimary,
                closeTime: m.closeTime ? new Date(m.closeTime) : null,
                expirationTime: m.expirationTime ? new Date(m.expirationTime) : null,
              },
            });
          }
        }

        // Re-fetch with updated markets
        event = await prisma.event.findUnique({
          where: { slug },
          include: {
            markets: true,
            newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
            xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
            videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      tiktoks: { orderBy: { fetchedAt: 'desc' }, take: 8 },
          },
        }) as typeof event;
      }
    } catch (err) {
      console.error('DFlow market fetch error:', err);
    }
  }

  return NextResponse.json(event);
}
