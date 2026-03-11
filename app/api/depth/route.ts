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
  yesSubTitle?: string;
  subtitle?: string;
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

  try {
    // Use event ticker from searchTerms for reliable matching
    const searchQuery = event.searchTerms.find(t => t.startsWith('KX')) || event.title;
    const res = await fetch(
      `${METADATA}/api/v1/search?q=${encodeURIComponent(searchQuery)}&limit=20&withNestedMarkets=true`,
      { headers: getHeaders() }
    );

    if (res.ok) {
      const data: { events?: DFlowEvent[] } = await res.json();
      for (const ev of data.events || []) {
        for (const m of ev.markets || []) {
          if (!m.ticker) continue;
          if (m.status === 'finalized' || m.status === 'settled') continue;

          const yesBid = parseFloat(m.yesBid || '0') || 0;
          const yesAsk = parseFloat(m.yesAsk || '0') || 0;
          const noBid = parseFloat(m.noBid || '0') || 0;
          const noAsk = parseFloat(m.noAsk || '0') || 0;
          const spread = Math.round(Math.abs(yesAsk - yesBid) * 100);

          results.push({
            ticker: m.ticker,
            title: m.yesSubTitle || m.subtitle || m.title || m.ticker,
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
  if (results.length === 0 && event.markets.length > 0) {
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

  results.sort((a, b) => b.yesBid - a.yesBid);
  return NextResponse.json({ markets: results });
}
