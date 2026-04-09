import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getMarketsBySearchTerms, getNCAAMarkets, getFIFAWorldCupMarkets } from '@/app/lib/polymarket';
import { getLimitlessWorldCupMarkets } from '@/app/lib/spredd';
import type { MarketData } from '@/app/types';

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

  // Fetch live market data from Polymarket
  let markets: MarketData[] = [];
  try {
    // Check if this is a FIFA World Cup event
    const isFIFA = event.searchTerms.some(t => {
      const lower = t.toLowerCase();
      return lower.includes('world cup') || lower.includes('fifa');
    });

    // Check if this is an NCAA tournament event
    const isNCAA = !isFIFA && event.searchTerms.some(t => {
      const lower = t.toLowerCase();
      return lower.includes('ncaa') || lower.includes('march madness') || lower === 'ncaab';
    });

    if (isFIFA) {
      // Fetch from both Polymarket and Limitless (via Spredd) in parallel
      const [polyResult, limitlessResult] = await Promise.all([
        getFIFAWorldCupMarkets(),
        getLimitlessWorldCupMarkets().catch(() => ({ markets: [], totalVolume: 0 })),
      ]);

      // Merge and deduplicate by title similarity
      const seen = new Set<string>();
      markets = [];
      for (const m of polyResult.markets) {
        seen.add(m.conditionId);
        markets.push(m);
      }
      for (const m of limitlessResult.markets) {
        if (!seen.has(m.conditionId)) {
          seen.add(m.conditionId);
          markets.push(m);
        }
      }
      // Re-sort by volume
      markets.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    } else if (isNCAA) {
      const result = await getNCAAMarkets();
      markets = result.markets;
    } else if (event.searchTerms.length > 0) {
      markets = await getMarketsBySearchTerms(event.searchTerms);
    }
  } catch (err) {
    console.error('Polymarket live price fetch error:', err);
  }

  // Calculate aggregate stats from all markets
  const totalVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0);
  const totalLiquidity = event.liquidity || 0;

  return NextResponse.json({
    event: {
      ...event,
      markets,
      volume: totalVolume || event.volume,
      liquidity: totalLiquidity,
    },
  });
}
