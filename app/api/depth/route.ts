import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getOrderBook } from '@/app/lib/polymarket';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) {
    return NextResponse.json({ markets: [] });
  }

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: { markets: true },
  });

  if (!event) {
    return NextResponse.json({ markets: [] });
  }

  const results: Array<{
    ticker: string;
    title: string;
    yesBid: number;
    yesAsk: number;
    noBid: number;
    noAsk: number;
    spread: number;
  }> = [];

  // Fetch order book data from Polymarket CLOB for each market
  for (const m of event.markets) {
    const tokenId = m.yesTokenId;
    if (!tokenId) {
      // Fallback to DB prices
      results.push({
        ticker: m.ticker,
        title: m.title,
        yesBid: Math.max(0, m.yesPrice - 0.01),
        yesAsk: m.yesPrice,
        noBid: Math.max(0, m.noPrice - 0.01),
        noAsk: m.noPrice,
        spread: 1,
      });
      continue;
    }

    try {
      const book = await getOrderBook(tokenId);
      if (book) {
        const bestBid = book.bids[0]?.price ?? 0;
        const bestAsk = book.asks[0]?.price ?? 1;
        const spread = Math.round(Math.abs(bestAsk - bestBid) * 100);

        results.push({
          ticker: m.ticker,
          title: m.title,
          yesBid: bestBid,
          yesAsk: bestAsk,
          noBid: Math.max(0, 1 - bestAsk),
          noAsk: Math.max(0, 1 - bestBid),
          spread,
        });
      }
    } catch (err) {
      console.error(`Depth fetch error for ${m.ticker}:`, err);
    }
  }

  results.sort((a, b) => b.yesBid - a.yesBid);
  return NextResponse.json({ markets: results });
}
