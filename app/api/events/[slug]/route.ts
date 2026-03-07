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
    },
  });

  if (!event) {
    // Auto-create event from slug
    const title = slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    event = await prisma.event.create({
      data: {
        slug,
        title,
        searchTerms: [title],
      },
      include: {
        markets: true,
        newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
        xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
        videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
      },
    });
  }

  // Fetch fresh markets from DFlow if none cached
  if (event.markets.length === 0 && event.searchTerms.length > 0) {
    try {
      const dflowMarkets = await getMarkets(event.searchTerms);
      if (dflowMarkets.length > 0) {
        await Promise.all(
          dflowMarkets.map(m =>
            prisma.market.create({
              data: {
                eventId: event!.id,
                ticker: m.ticker,
                title: m.title,
                yesPrice: m.yesPrice,
                noPrice: m.noPrice,
                volume: m.volume,
                change24h: m.change24h,
                category: m.category,
              },
            })
          )
        );

        // Re-fetch with new markets
        event = await prisma.event.findUnique({
          where: { slug },
          include: {
            markets: true,
            newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
            xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
            videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
          },
        });
      }
    } catch (err) {
      console.error('DFlow market fetch error:', err);
    }
  }

  return NextResponse.json(event);
}
