'use client';

import { useEffect, useState } from 'react';
import type { EventData } from '@/app/types';
import { useEventStore } from '@/app/store/eventStore';
import OutcomeList from './OutcomeList';
import MarketRules from './MarketRules';
import NewsFeed from './NewsFeed';
import XFeed from './XFeed';
import VideoFeed from './VideoFeed';
import StatsBar from './StatsBar';
import KYCBanner from './KYCBanner';
import TradePanel from './TradePanel';
import OrderBookDepth from './OrderBookDepth';
import RelatedMarkets from './RelatedMarkets';
import TikTokFeed from './TikTokFeed';
import GasPriceChart from './GasPriceChart';

interface EventPageProps {
  event: EventData;
}

const SITE_URL = 'https://singl.spredd.markets';

function ShareButton({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/event/${slug}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnX = () => {
    const text = `${title}\n\nTrade the outcome on SINGL by @spreddterminal`;
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={shareOnX}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        title="Share on X"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Share
      </button>
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[var(--border)] text-[var(--text-sec)] rounded-lg hover:bg-[var(--sand)] transition-colors cursor-pointer"
        title="Copy link"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export default function EventPage({ event }: EventPageProps) {
  const setCurrentEvent = useEventStore(s => s.setCurrentEvent);

  useEffect(() => {
    setCurrentEvent(event);
  }, [event, setCurrentEvent]);

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      {/* Hero */}
      <div className="bg-[var(--paper)] border-b border-[var(--border)] px-4 py-8 mb-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            {event.imageUrl ? (
              <img src={event.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
            ) : event.emoji ? (
              <span className="text-4xl">{event.emoji}</span>
            ) : null}
            <div className="flex-1">
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-[var(--text)]">
                {event.title}
              </h1>
              {event.subtitle && (
                <p className="text-sm text-[var(--text-sec)] mt-1">{event.subtitle}</p>
              )}
            </div>
            <ShareButton slug={event.slug} title={event.title} />
          </div>
          <div className="mt-4">
            <StatsBar
              markets={event.markets}
              volume={event.volume}
              liquidity={event.liquidity}
              openInterest={event.openInterest}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        {/* KYC Banner */}
        <div className="mb-6">
          <KYCBanner />
        </div>

        {/* Prediction Markets */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Prediction Markets
            </h2>
            <span className="text-xs font-bold text-[var(--orange)] bg-[var(--orange-lt)] px-2 py-0.5 rounded-full">
              {event.markets.length}
            </span>
          </div>
          {event.markets.length > 0 ? (
            <OutcomeList markets={event.markets} />
          ) : (
            <div className="text-center py-8 text-[var(--text-dim)] text-sm bg-[var(--paper)] border border-[var(--border)] rounded-xl">
              No markets found for this event
            </div>
          )}
        </section>

        {/* Market Rules & Order Book */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MarketRules markets={event.markets} />
          <OrderBookDepth markets={event.markets} />
        </section>

        {/* Oil & Gas Prices */}
        {event.gasPrices && event.gasPrices.length > 0 && (
          <section className="mb-8">
            <GasPriceChart gasPrices={event.gasPrices} />
          </section>
        )}

        {/* Two-column: News & X Posts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <NewsFeed news={event.newsItems} />
          <XFeed posts={event.xPosts} />
        </section>

        {/* TikTok */}
        {event.tiktoks && event.tiktoks.length > 0 && (
          <section className="mb-8">
            <TikTokFeed tiktoks={event.tiktoks} />
          </section>
        )}

        {/* Video & Related */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <VideoFeed videos={event.videos} />
          </div>
          <RelatedMarkets
            eventTitle={event.title}
            currentTickers={event.markets.map(m => m.ticker)}
          />
        </section>
      </div>

      {/* Trade Modal */}
      <TradePanel />
    </div>
  );
}
