import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getMarketsBySearchTerms } from '@/app/lib/polymarket';
import type { MarketData } from '@/app/types';

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

  // Fetch live market data from Polymarket Gamma API
  let markets: MarketData[] = [];
  if (event.searchTerms.length > 0) {
    try {
      markets = await getMarketsBySearchTerms(event.searchTerms);
    } catch (err) {
      console.error('Polymarket market fetch error:', err);
    }
  }

  return NextResponse.json({
    ...event,
    markets,
  });
}
