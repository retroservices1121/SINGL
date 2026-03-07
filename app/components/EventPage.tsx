'use client';

import { useEffect } from 'react';
import type { EventData } from '@/app/types';
import { useEventStore } from '@/app/store/eventStore';
import MarketCard from './MarketCard';
import NewsFeed from './NewsFeed';
import XFeed from './XFeed';
import VideoFeed from './VideoFeed';
import StatsBar from './StatsBar';
import KYCBanner from './KYCBanner';
import TradePanel from './TradePanel';

interface EventPageProps {
  event: EventData;
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
          <div className="flex items-center gap-3 mb-2">
            {event.emoji && <span className="text-4xl">{event.emoji}</span>}
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-[var(--text)]">
                {event.title}
              </h1>
              {event.subtitle && (
                <p className="text-sm text-[var(--text-sec)] mt-1">{event.subtitle}</p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <StatsBar markets={event.markets} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {event.markets.map((market, i) => (
                <MarketCard key={market.id || i} market={market} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-dim)] text-sm bg-[var(--paper)] border border-[var(--border)] rounded-xl">
              No markets found for this event
            </div>
          )}
        </section>

        {/* Two-column: News & X Posts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <NewsFeed news={event.newsItems} />
          <XFeed posts={event.xPosts} />
        </section>

        {/* Video Coverage */}
        <section className="mb-8">
          <VideoFeed videos={event.videos} />
        </section>
      </div>

      {/* Trade Modal */}
      <TradePanel />
    </div>
  );
}
