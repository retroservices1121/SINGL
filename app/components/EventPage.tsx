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
import TradePanel from './TradePanel';
import OrderBookDepth from './OrderBookDepth';
import RelatedMarkets from './RelatedMarkets';
import TikTokFeed from './TikTokFeed';

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
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--on-surface)] text-white rounded-md hover:opacity-90 transition-all cursor-pointer"
        title="Share on X"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Share
      </button>
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--surface-container-high)] text-[var(--secondary)] rounded-md hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer"
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
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Hero — deep navy with tonal layering */}
      <section className="relative overflow-hidden bg-[var(--on-surface)] px-6 py-12 mb-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--on-surface)] via-[var(--on-surface)]/90 to-transparent z-[1]" />
        {event.imageUrl && (
          <div className="absolute inset-0 opacity-30">
            <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-container)] text-white text-xs font-bold tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-white" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
                Live Event
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white font-heading leading-[0.95] tracking-tighter uppercase">
                {event.title}
              </h1>
              {event.subtitle && (
                <p className="text-base text-[var(--surface-dim)] max-w-lg">{event.subtitle}</p>
              )}
              <div className="pt-2">
                <StatsBar
                  markets={event.markets}
                  volume={event.volume}
                  liquidity={event.liquidity}
                  openInterest={event.openInterest}
                  dark
                />
              </div>
            </div>
            <ShareButton slug={event.slug} title={event.title} />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Two-column: Markets + Active Slip */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
          {/* Prediction Markets — main area */}
          <div className="xl:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black font-heading tracking-tight uppercase">
                Prediction Markets
              </h2>
              <span className="px-3 py-1 rounded-full bg-[var(--primary-fixed)] text-[var(--primary)] text-xs font-bold">
                {event.markets.length} OUTCOMES
              </span>
            </div>
            {event.markets.length > 0 ? (
              <OutcomeList markets={event.markets} />
            ) : (
              <div className="text-center py-12 text-[var(--secondary)] text-sm bg-[var(--surface-container-lowest)] rounded-xl">
                No markets found for this event
              </div>
            )}
          </div>

          {/* Sidebar: Order Book */}
          <div className="xl:col-span-4 space-y-6">
            <OrderBookDepth markets={event.markets} />
          </div>
        </section>

        {/* Market Rules */}
        <section className="mb-8">
          <MarketRules markets={event.markets} />
        </section>

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
