import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getOrderbooks } from '@/app/lib/aggServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) return NextResponse.json({ markets: [] });

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: { markets: true },
  });
  if (!event) return NextResponse.json({ markets: [] });

  const outcomeIds = event.markets.map(m => m.yesOutcomeId).filter((x): x is string => !!x);
  let books: Record<string, { bids: Array<{ price: number; size: number }>; asks: Array<{ price: number; size: number }> }> = {};
  try {
    books = await getOrderbooks(outcomeIds);
  } catch (err) {
    console.error('[depth] AGG orderbooks error:', err);
  }

  const results = event.markets.map(m => {
    const book = m.yesOutcomeId ? books[m.yesOutcomeId] : null;
    if (book && book.bids[0] && book.asks[0]) {
      const bestBid = book.bids[0].price;
      const bestAsk = book.asks[0].price;
      return {
        ticker: m.ticker,
        title: m.title,
        yesBid: bestBid,
        yesAsk: bestAsk,
        noBid: Math.max(0, 1 - bestAsk),
        noAsk: Math.max(0, 1 - bestBid),
        spread: Math.round(Math.abs(bestAsk - bestBid) * 100),
      };
    }
    // Fallback to DB-cached prices when no live book
    return {
      ticker: m.ticker,
      title: m.title,
      yesBid: Math.max(0, m.yesPrice - 0.01),
      yesAsk: m.yesPrice,
      noBid: Math.max(0, m.noPrice - 0.01),
      noAsk: m.noPrice,
      spread: 1,
    };
  });

  results.sort((a, b) => b.yesBid - a.yesBid);
  return NextResponse.json({ markets: results });
}
