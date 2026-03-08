import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

const METADATA = process.env.NEXT_PUBLIC_DFLOW_METADATA_URL || 'https://c.prediction-markets-api.dflow.net';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.DFLOW_API_KEY) {
    headers['x-api-key'] = process.env.DFLOW_API_KEY;
  }
  return headers;
}

interface DFlowMarket {
  ticker?: string;
  title?: string;
  yesBid?: string;
  yesAsk?: string;
  noBid?: string;
  noAsk?: string;
  status?: string;
}

interface DFlowEvent {
  ticker?: string;
  markets?: DFlowMarket[];
}

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) {
    return NextResponse.json({ markets: [] });
  }

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: { markets: true },
  });

  if (!event || event.markets.length === 0) {
    return NextResponse.json({ markets: [] });
  }

  const tickers = new Set(event.markets.map(m => m.ticker));
  const results: Array<{
    ticker: string;
    title: string;
    yesBid: number;
    yesAsk: number;
    noBid: number;
    noAsk: number;
    spread: number;
  }> = [];

  try {
    const res = await fetch(
      `${METADATA}/api/v1/search?q=${encodeURIComponent(event.title)}&limit=20&withNestedMarkets=true`,
      { headers: getHeaders() }
    );

    if (res.ok) {
      const data: { events?: DFlowEvent[] } = await res.json();
      for (const ev of data.events || []) {
        for (const m of ev.markets || []) {
          if (!m.ticker || !tickers.has(m.ticker)) continue;
          if (m.status === 'finalized' || m.status === 'settled') continue;

          const yesBid = parseFloat(m.yesBid || '0') || 0;
          const yesAsk = parseFloat(m.yesAsk || '0') || 0;
          const noBid = parseFloat(m.noBid || '0') || 0;
          const noAsk = parseFloat(m.noAsk || '0') || 0;
          const spread = Math.round(Math.abs(yesAsk - yesBid) * 100);

          const dbMarket = event.markets.find(dm => dm.ticker === m.ticker);

          results.push({
            ticker: m.ticker,
            title: m.title || dbMarket?.title || m.ticker,
            yesBid,
            yesAsk,
            noBid,
            noAsk,
            spread,
          });
        }
      }
    }
  } catch (err) {
    console.error('Depth fetch error:', err);
  }

  // Fallback to DB prices if DFlow returned nothing
  if (results.length === 0) {
    for (const m of event.markets) {
      results.push({
        ticker: m.ticker,
        title: m.title,
        yesBid: Math.max(0, m.yesPrice - 0.01),
        yesAsk: m.yesPrice,
        noBid: Math.max(0, m.noPrice - 0.01),
        noAsk: m.noPrice,
        spread: 1,
      });
    }
  }

  return NextResponse.json({ markets: results.slice(0, 6) });
}
