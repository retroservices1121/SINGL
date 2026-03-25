'use client';

import { useEffect, useState } from 'react';
import type { EventData } from '@/app/types';
import { useEventStore } from '@/app/store/eventStore';
import { parseMarkets, buildTeamProfiles } from '@/app/lib/ncaa';
import MarketCard from './MarketCard';
import TeamCard from './TeamCard';
import BracketVisualizer from './BracketVisualizer';
import UpsetAlertBanner from './UpsetAlertBanner';
import OddsMovementTracker from './OddsMovementTracker';
import NewsFeed from './NewsFeed';
import XFeed from './XFeed';
import VideoFeed from './VideoFeed';
import StatsBar from './StatsBar';
import TradePanel from './TradePanel';
import MarketDetailOverlay from './MarketDetailOverlay';
import TikTokFeed from './TikTokFeed';

interface EventPageProps {
  event: EventData;
}

const SITE_URL = 'https://singl.spredd.markets';

type ViewMode = 'teams' | 'markets' | 'bracket';

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
      <button onClick={shareOnX} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--on-surface)] text-white rounded-md hover:opacity-90 transition-all cursor-pointer">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
        Share
      </button>
      <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--surface-container-high)] text-[var(--secondary)] rounded-md hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

function ViewToggle({ view, setView }: { view: ViewMode; setView: (v: ViewMode) => void }) {
  const modes: { key: ViewMode; label: string; icon: string }[] = [
    { key: 'teams', label: 'Teams', icon: 'groups' },
    { key: 'markets', label: 'Markets', icon: 'grid_view' },
    { key: 'bracket', label: 'Bracket', icon: 'account_tree' },
  ];

  return (
    <div className="flex gap-1 bg-[var(--surface-container-high)] rounded-lg p-1">
      {modes.map(m => (
        <button
          key={m.key}
          onClick={() => setView(m.key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all cursor-pointer ${
            view === m.key
              ? 'bg-[var(--primary-container)] text-white'
              : 'text-[var(--secondary)] hover:text-[var(--on-surface)]'
          }`}
        >
          <span className="material-symbols-outlined text-sm">{m.icon}</span>
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function EventPage({ event }: EventPageProps) {
  const setCurrentEvent = useEventStore(s => s.setCurrentEvent);
  const [view, setView] = useState<ViewMode>('teams');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setCurrentEvent(event);
  }, [event, setCurrentEvent]);

  // Parse markets into structured data
  const parsedMarkets = parseMarkets(event.markets);
  const teamProfiles = buildTeamProfiles(parsedMarkets);

  const visibleMarkets = showAll ? event.markets : event.markets.slice(0, 12);
  const hasMore = event.markets.length > 12;

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--on-surface)] px-6 py-12 mb-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--on-surface)] via-[var(--on-surface)]/90 to-transparent z-[1]" />
        {/* Basketball court background */}
        <div className="absolute inset-0 opacity-[0.08]">
          <svg viewBox="0 0 940 500" className="w-full h-full" preserveAspectRatio="xMidYMid slice" fill="none" stroke="white" strokeWidth="2">
            {/* Court outline */}
            <rect x="20" y="20" width="900" height="460" rx="0" />
            {/* Half court line */}
            <line x1="470" y1="20" x2="470" y2="480" />
            {/* Center circle */}
            <circle cx="470" cy="250" r="60" />
            <circle cx="470" cy="250" r="6" fill="white" stroke="none" />
            {/* Left key / paint */}
            <rect x="20" y="131" width="190" height="238" />
            <circle cx="210" cy="250" r="60" />
            {/* Left free throw arc (dashed, bottom half) */}
            <path d="M 210 190 A 60 60 0 0 0 210 310" strokeDasharray="6 6" />
            {/* Left basket */}
            <circle cx="63" cy="250" r="10" />
            <rect x="20" y="220" width="43" height="60" />
            {/* Left three-point arc */}
            <path d="M 20 91 L 140 91 A 160 160 0 0 1 140 409 L 20 409" />
            {/* Right key / paint */}
            <rect x="730" y="131" width="190" height="238" />
            <circle cx="730" cy="250" r="60" />
            {/* Right free throw arc (dashed, top half) */}
            <path d="M 730 190 A 60 60 0 0 1 730 310" strokeDasharray="6 6" />
            {/* Right basket */}
            <circle cx="877" cy="250" r="10" />
            <rect x="877" y="220" width="43" height="60" />
            {/* Right three-point arc */}
            <path d="M 920 91 L 800 91 A 160 160 0 0 0 800 409 L 920 409" />
          </svg>
        </div>
        {event.imageUrl && (
          <div className="absolute inset-0 opacity-20">
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
              <div className="pt-2">
                <StatsBar markets={event.markets} volume={event.volume} liquidity={event.liquidity} openInterest={event.openInterest} dark />
              </div>
            </div>
            <ShareButton slug={event.slug} title={event.title} />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Upset Alerts */}
        <UpsetAlertBanner markets={parsedMarkets} />

        {/* Odds Movement Tracker */}
        <OddsMovementTracker teams={teamProfiles} />

        {/* View toggle + count */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black font-heading tracking-tight uppercase">
              {view === 'teams' ? `${teamProfiles.length} Teams` : view === 'bracket' ? 'Tournament Bracket' : `${event.markets.length} Markets`}
            </h2>
            <span className="px-3 py-1 rounded-full bg-[var(--primary-fixed)] text-[var(--primary)] text-xs font-bold">
              LIVE
            </span>
          </div>
          <ViewToggle view={view} setView={setView} />
        </div>

        {/* Teams View */}
        {view === 'teams' && (
          <section className="mb-8">
            {teamProfiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {teamProfiles.map((team, i) => (
                  <TeamCard key={team.name} team={team} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[var(--secondary)] text-sm bg-[var(--surface-container-lowest)] rounded-xl">
                No team data available
              </div>
            )}
          </section>
        )}

        {/* Markets View */}
        {view === 'markets' && (
          <section className="mb-8">
            {event.markets.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visibleMarkets.map((market, i) => (
                    <MarketCard key={market.id || market.ticker || i} market={market} index={i} />
                  ))}
                </div>
                {hasMore && !showAll && (
                  <div className="text-center mt-6">
                    <button onClick={() => setShowAll(true)} className="px-8 py-3 bg-[var(--surface-container-high)] text-[var(--on-surface)] rounded-md font-heading font-bold uppercase tracking-widest text-sm hover:bg-[var(--surface-container-highest)] transition-all cursor-pointer">
                      Show All {event.markets.length} Markets
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-[var(--secondary)] text-sm bg-[var(--surface-container-lowest)] rounded-xl">
                No markets found
              </div>
            )}
          </section>
        )}

        {/* Bracket View */}
        {view === 'bracket' && (
          <section className="mb-8">
            <BracketVisualizer teams={teamProfiles} />
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

        {/* Video */}
        <section className="mb-8">
          <VideoFeed videos={event.videos} />
        </section>
      </div>

      <MarketDetailOverlay />
      <TradePanel />
    </div>
  );
}
