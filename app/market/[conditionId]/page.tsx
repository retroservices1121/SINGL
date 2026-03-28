import Link from 'next/link';
import type { Metadata } from 'next';
import MarketPageClient from './MarketPageClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://singl.market';
const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

interface ClobToken {
  token_id: string;
  outcome: string;
  price: number;
  winner: boolean;
}

async function fetchMarketData(conditionId: string) {
  try {
    const res = await fetch(`${CLOB_API}/markets/${conditionId}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = await res.json();

    const tokens: ClobToken[] = data.tokens || [];
    const token1 = tokens[0];
    const token2 = tokens[1];

    if (!token1) return null;

    const yesPrice = token1?.price ?? 0.5;
    const noPrice = token2?.price ?? (1 - yesPrice);
    const isStandardYesNo = token1?.outcome === 'Yes' || token2?.outcome === 'No';

    return {
      conditionId: data.condition_id || conditionId,
      title: data.question || data.market_slug || conditionId,
      description: data.description || '',
      yesPrice: Math.round(yesPrice * 100),
      noPrice: Math.round(noPrice * 100),
      yesTokenId: token1?.token_id || '',
      noTokenId: token2?.token_id || '',
      volume: null as number | null,
      negRisk: data.neg_risk ?? false,
      tickSize: data.minimum_tick_size || '0.01',
      endDate: data.end_date_iso || null,
      active: data.active ?? true,
      closed: data.closed ?? false,
      outcomeName: !isStandardYesNo ? (token1?.outcome || null) : null,
      outcome2Name: !isStandardYesNo ? (token2?.outcome || null) : null,
    };
  } catch {
    return null;
  }
}

function formatVolumeShort(vol: number | null): string {
  if (!vol) return '';
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ conditionId: string }> }
): Promise<Metadata> {
  const { conditionId } = await params;

  const market = await fetchMarketData(conditionId);

  const title = market ? `${market.title} — SINGL` : 'Market — SINGL';
  const yesLabel = market?.outcomeName || 'Yes';
  const noLabel = market?.outcome2Name || 'No';
  const description = market
    ? `${yesLabel} ${market.yesPrice}¢ / ${noLabel} ${market.noPrice}¢ — Trade on SINGL`
    : 'Trade prediction markets on SINGL';

  const ogParams = new URLSearchParams({
    title: market?.title || conditionId,
    yes: String(market?.yesPrice ?? 50),
    no: String(market?.noPrice ?? 50),
    ...(market?.volume ? { vol: formatVolumeShort(market.volume) } : {}),
    ...(market?.outcomeName ? { yesLabel: market.outcomeName } : {}),
    ...(market?.outcome2Name ? { noLabel: market.outcome2Name } : {}),
  });
  const ogImageUrl = `${SITE_URL}/api/og/market?${ogParams}`;
  const marketUrl = `${SITE_URL}/market/${conditionId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: marketUrl,
      siteName: 'SINGL by Spredd Markets',
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
      site: '@singlmarket',
    },
  };
}

export default async function MarketPage(
  { params }: { params: Promise<{ conditionId: string }> }
) {
  const { conditionId } = await params;

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Nav */}
      <nav className="bg-[var(--paper)] border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <Link href="/" className="font-heading text-xl font-bold text-[var(--orange)]">
              SINGL
            </Link>
            <span className="text-xs font-bold text-[var(--yes)] bg-[var(--yes-bg)] px-2 py-0.5 rounded-full animate-pulse">
              LIVE
            </span>
          </div>
          <div id="wallet-mount" />
        </div>
      </nav>

      <MarketPageClient conditionId={conditionId} />

      {/* Footer */}
      <footer className="bg-[var(--paper)] border-t border-[var(--border)] px-4 py-6 text-center">
        <p className="text-xs text-[var(--text-dim)]">
          <span className="font-heading font-bold text-[var(--orange)]">SINGL</span> by Spredd Markets
        </p>
        <a href="https://x.com/singlmarket" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--text-dim)] hover:text-[var(--orange)] transition-colors mt-1 inline-block">
          Follow us on X @singlmarket
        </a>
      </footer>
    </div>
  );
}
