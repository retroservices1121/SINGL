import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/app/lib/db';
import { aggFetch, type AggVenueMarket } from '@/app/lib/aggServer';
import MarketPageClient from './MarketPageClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://singl.market';

interface MarketSummary {
  venueMarketId: string;
  title: string;
  description: string;
  yesPrice: number; // cents
  noPrice: number;  // cents
  yesOutcomeId: string;
  noOutcomeId: string;
  volume: number | null;
  tickSize: string;
  endDate: string | null;
  active: boolean;
  closed: boolean;
  outcomeName: string | null;
  outcome2Name: string | null;
  venue: string | null;
}

async function fetchMarketData(venueMarketId: string): Promise<MarketSummary | null> {
  try {
    const data = await aggFetch<AggVenueMarket>(`/venue-events/markets/${encodeURIComponent(venueMarketId)}`);
    const outcomes = data.outcomes || [];
    const o1 = outcomes[0];
    const o2 = outcomes[1];
    if (!o1) return null;

    const yesPrice = o1.price ?? 0.5;
    const noPrice = o2?.price ?? (1 - yesPrice);
    const isStandardYesNo = (o1.name === 'Yes' || o2?.name === 'No');

    return {
      venueMarketId: data.id,
      title: data.title,
      description: data.description || '',
      yesPrice: Math.round(yesPrice * 100),
      noPrice: Math.round(noPrice * 100),
      yesOutcomeId: o1.id,
      noOutcomeId: o2?.id || '',
      volume: data.volume ?? null,
      tickSize: data.tickSize || '0.01',
      endDate: data.endDate || null,
      active: data.status === 'open',
      closed: data.status === 'closed' || data.status === 'resolved',
      outcomeName: !isStandardYesNo ? (o1?.name || null) : null,
      outcome2Name: !isStandardYesNo ? (o2?.name || null) : null,
      venue: data.venue || null,
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
  const { conditionId: venueMarketId } = await params;

  const market = await fetchMarketData(venueMarketId);

  const title = market ? `${market.title} — SINGL` : 'Market — SINGL';
  const yesLabel = market?.outcomeName || 'Yes';
  const noLabel = market?.outcome2Name || 'No';
  const description = market
    ? `${yesLabel} ${market.yesPrice}¢ / ${noLabel} ${market.noPrice}¢ — Trade on SINGL`
    : 'Trade prediction markets on SINGL';

  let customOgImage: string | null = null;
  try {
    const dbMarket = await prisma.market.findFirst({
      where: { OR: [{ venueMarketId }, { ticker: venueMarketId }] },
      select: { ogImageUrl: true },
    });
    customOgImage = dbMarket?.ogImageUrl || null;
  } catch { /* DB miss is fine */ }

  const ogParams = new URLSearchParams({
    title: market?.title || venueMarketId,
    yes: String(market?.yesPrice ?? 50),
    no: String(market?.noPrice ?? 50),
    ...(market?.volume ? { vol: formatVolumeShort(market.volume) } : {}),
    ...(market?.outcomeName ? { yesLabel: market.outcomeName } : {}),
    ...(market?.outcome2Name ? { noLabel: market.outcome2Name } : {}),
  });
  const generatedOgUrl = `${SITE_URL}/api/og/market?${ogParams}`;
  const ogImageUrl = customOgImage || generatedOgUrl;
  const marketUrl = `${SITE_URL}/market/${venueMarketId}`;

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
  const { conditionId: venueMarketId } = await params;

  return (
    <div className="min-h-screen bg-[var(--surface)]">
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

      <MarketPageClient venueMarketId={venueMarketId} />

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
