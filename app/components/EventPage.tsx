'use client';

import { useEffect } from 'react';
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
import LivePulse from './LivePulse';
import RelatedMarkets from './RelatedMarkets';
import InstaFeed from './InstaFeed';

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
          <div className="flex items-center gap-4 mb-2">
            {event.imageUrl ? (
              <img src={event.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
            ) : event.emoji ? (
              <span className="text-4xl">{event.emoji}</span>
            ) : null}
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
            <div className="space-y-6">
              <OutcomeList markets={event.markets} />
              <MarketRules markets={event.markets} />
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-dim)] text-sm bg-[var(--paper)] border border-[var(--border)] rounded-xl">
              No markets found for this event
            </div>
          )}
        </section>

        {/* Pulse & Order Book */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <LivePulse posts={event.xPosts} markets={event.markets} />
          <div className="lg:col-span-2">
            <OrderBookDepth markets={event.markets} />
          </div>
        </section>

        {/* Two-column: News & X Posts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <NewsFeed news={event.newsItems} />
          <XFeed posts={event.xPosts} />
        </section>

        {/* Instagram */}
        {event.instaPosts && event.instaPosts.length > 0 && (
          <section className="mb-8">
            <InstaFeed posts={event.instaPosts} />
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
