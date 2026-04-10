'use client';

import { useEffect, useState, useMemo } from 'react';
import type { EventData } from '@/app/types';
import { useEventStore } from '@/app/store/eventStore';

// NCAA imports (legacy)
import { parseMarkets, buildTeamProfiles } from '@/app/lib/ncaa';
import type { TeamProfile } from '@/app/lib/ncaa';

// FIFA imports
import { parseFIFAMarkets, buildCountryProfiles, getGroups, enrichGroupsWithMarkets } from '@/app/lib/fifa';
import type { CountryProfile } from '@/app/lib/fifa';

// Shared components
import MarketCard from './MarketCard';
import UpsetAlertBanner from './UpsetAlertBanner';
import OddsMovementTracker from './OddsMovementTracker';
import LiveGames from './LiveGames';
import NewsFeed from './NewsFeed';
import XFeed from './XFeed';
import VideoFeed from './VideoFeed';
import StatsBar from './StatsBar';
import TradePanel from './TradePanel';
import MarketDetailOverlay from './MarketDetailOverlay';
import TikTokFeed from './TikTokFeed';

// NCAA components
import TeamCard from './TeamCard';
import TeamStatsPanel from './TeamStatsPanel';
import BracketVisualizer from './BracketVisualizer';

// FIFA components
import CountryCard from './CountryCard';
import CountryStatsPanel from './CountryStatsPanel';
import GroupStageTable from './GroupStageTable';
import WorldCupBracket from './WorldCupBracket';
import MatchSchedule from './MatchSchedule';
import GoldenBootTracker from './GoldenBootTracker';
import HeadToHead from './HeadToHead';
import SquadRoster from './SquadRoster';
import PickEm from './PickEm';

interface EventPageProps {
  event: EventData;
}

const SITE_URL = 'https://singl.market';

// Detect if event is FIFA World Cup
function isFIFAEvent(event: EventData): boolean {
  const terms = [...event.searchTerms, event.title, event.subtitle || ''].map(s => s.toLowerCase());
  return terms.some(t => t.includes('world cup') || t.includes('fifa'));
}

type NCAViewMode = 'teams' | 'markets' | 'bracket';
type FIFAViewMode = 'countries' | 'markets' | 'groups' | 'bracket' | 'schedule' | 'awards' | 'h2h' | 'squads' | 'pickem';

function ShareButton({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/event/${slug}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnX = () => {
    const text = `${title}\n\nTrade on SINGL`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
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

// Soccer pitch SVG for FIFA hero
function SoccerPitchBackground() {
  return (
    <div className="absolute inset-0 opacity-[0.08]">
      <svg viewBox="0 0 1050 680" className="w-full h-full" preserveAspectRatio="xMidYMid slice" fill="none" stroke="white" strokeWidth="2">
        {/* Pitch outline */}
        <rect x="25" y="25" width="1000" height="630" rx="0" />
        {/* Half-way line */}
        <line x1="525" y1="25" x2="525" y2="655" />
        {/* Center circle */}
        <circle cx="525" cy="340" r="91.5" />
        <circle cx="525" cy="340" r="3" fill="white" stroke="none" />
        {/* Left penalty area */}
        <rect x="25" y="138" width="165" height="404" />
        {/* Left goal area */}
        <rect x="25" y="230" width="55" height="220" />
        {/* Left penalty arc */}
        <path d="M 190 277 A 91.5 91.5 0 0 1 190 403" />
        {/* Left penalty spot */}
        <circle cx="135" cy="340" r="3" fill="white" stroke="none" />
        {/* Right penalty area */}
        <rect x="860" y="138" width="165" height="404" />
        {/* Right goal area */}
        <rect x="970" y="230" width="55" height="220" />
        {/* Right penalty arc */}
        <path d="M 860 277 A 91.5 91.5 0 0 0 860 403" />
        {/* Right penalty spot */}
        <circle cx="915" cy="340" r="3" fill="white" stroke="none" />
        {/* Corner arcs */}
        <path d="M 25 35 A 10 10 0 0 1 35 25" />
        <path d="M 1015 25 A 10 10 0 0 1 1025 35" />
        <path d="M 1025 645 A 10 10 0 0 1 1015 655" />
        <path d="M 35 655 A 10 10 0 0 1 25 645" />
      </svg>
    </div>
  );
}

// Basketball court SVG for NCAA hero
function BasketballCourtBackground() {
  return (
    <div className="absolute inset-0 opacity-[0.08]">
      <svg viewBox="0 0 940 500" className="w-full h-full" preserveAspectRatio="xMidYMid slice" fill="none" stroke="white" strokeWidth="2">
        <rect x="20" y="20" width="900" height="460" rx="0" />
        <line x1="470" y1="20" x2="470" y2="480" />
        <circle cx="470" cy="250" r="60" />
        <circle cx="470" cy="250" r="6" fill="white" stroke="none" />
        <rect x="20" y="131" width="190" height="238" />
        <circle cx="210" cy="250" r="60" />
        <path d="M 210 190 A 60 60 0 0 0 210 310" strokeDasharray="6 6" />
        <circle cx="63" cy="250" r="10" />
        <rect x="20" y="220" width="43" height="60" />
        <path d="M 20 91 L 140 91 A 160 160 0 0 1 140 409 L 20 409" />
        <rect x="730" y="131" width="190" height="238" />
        <circle cx="730" cy="250" r="60" />
        <path d="M 730 190 A 60 60 0 0 1 730 310" strokeDasharray="6 6" />
        <circle cx="877" cy="250" r="10" />
        <rect x="877" y="220" width="43" height="60" />
        <path d="M 920 91 L 800 91 A 160 160 0 0 0 800 409 L 920 409" />
      </svg>
    </div>
  );
}

function FIFAViewToggle({ view, setView }: { view: FIFAViewMode; setView: (v: FIFAViewMode) => void }) {
  const modes: { key: FIFAViewMode; label: string; icon: string }[] = [
    { key: 'countries', label: 'Countries', icon: 'flag' },
    { key: 'markets', label: 'Markets', icon: 'grid_view' },
    { key: 'groups', label: 'Groups', icon: 'groups' },
    { key: 'bracket', label: 'Bracket', icon: 'account_tree' },
    { key: 'schedule', label: 'Schedule', icon: 'calendar_month' },
    { key: 'awards', label: 'Awards', icon: 'emoji_events' },
    { key: 'h2h', label: 'H2H', icon: 'compare_arrows' },
    { key: 'squads', label: 'Squads', icon: 'person' },
    { key: 'pickem', label: "Pick'em", icon: 'sports_score' },
  ];

  return (
    <div className="flex gap-1 bg-[var(--surface-container-high)] rounded-lg p-1 overflow-x-auto">
      {modes.map(m => (
        <button
          key={m.key}
          onClick={() => setView(m.key)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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

function NCAAViewToggle({ view, setView }: { view: NCAViewMode; setView: (v: NCAViewMode) => void }) {
  const modes: { key: NCAViewMode; label: string; icon: string }[] = [
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

// ── FIFA Event Page ──────────────────────────────────────────────────────────

function PlatformFilter({ markets, platform, setPlatform }: {
  markets: { platform?: string }[];
  platform: string;
  setPlatform: (p: string) => void;
}) {
  // Count markets per platform
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: markets.length };
    for (const m of markets) {
      const p = m.platform || 'polymarket';
      c[p] = (c[p] || 0) + 1;
    }
    return c;
  }, [markets]);

  const platforms = Object.keys(counts).filter(k => k !== 'all');

  // Don't show filter if only one platform
  if (platforms.length <= 1) return null;

  const pills: { key: string; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    ...platforms.map(p => ({
      key: p,
      label: p.charAt(0).toUpperCase() + p.slice(1),
      count: counts[p],
    })),
  ];

  return (
    <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
      {pills.map(p => (
        <button
          key={p.key}
          onClick={() => setPlatform(p.key)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            platform === p.key
              ? 'bg-[var(--on-surface)] text-white'
              : 'bg-[var(--surface-container-high)] text-[var(--secondary)] hover:bg-[var(--surface-container-highest)]'
          }`}
        >
          {p.label}
          <span className={`text-[10px] font-mono ${platform === p.key ? 'text-white/70' : 'text-[var(--secondary)]'}`}>
            {p.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function FIFAEventPage({ event }: EventPageProps) {
  const [view, setView] = useState<FIFAViewMode>('countries');
  const [showAll, setShowAll] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryProfile | null>(null);
  const [platformFilter, setPlatformFilter] = useState('all');

  const parsedMarkets = useMemo(() => parseFIFAMarkets(event.markets), [event.markets]);
  const countryProfiles = useMemo(() => buildCountryProfiles(parsedMarkets), [parsedMarkets]);
  const groups = useMemo(() => enrichGroupsWithMarkets(getGroups(), countryProfiles), [countryProfiles]);

  const filteredMarkets = useMemo(() => {
    if (platformFilter === 'all') return event.markets;
    return event.markets.filter(m => (m.platform || 'polymarket') === platformFilter);
  }, [event.markets, platformFilter]);

  const visibleMarkets = showAll ? filteredMarkets : filteredMarkets.slice(0, 12);
  const hasMore = filteredMarkets.length > 12;

  const viewTitle = () => {
    switch (view) {
      case 'countries': return `${countryProfiles.length} Countries`;
      case 'markets': return `${filteredMarkets.length} Markets`;
      case 'groups': return '12 Groups';
      case 'bracket': return 'Knockout Bracket';
      case 'schedule': return 'Match Schedule';
      case 'awards': return 'Awards & Golden Boot';
      case 'h2h': return 'Head to Head';
      case 'squads': return 'Squad Rosters';
      case 'pickem': return "Pick'em Challenge";
    }
  };

  return (
    <>
      {/* View toggle + count */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-4 shrink-0">
          <h2 className="text-xl font-black font-heading tracking-tight uppercase">{viewTitle()}</h2>
          <span className="px-3 py-1 rounded-full bg-[var(--primary-fixed)] text-[var(--primary)] text-xs font-bold">LIVE</span>
        </div>
        <FIFAViewToggle view={view} setView={setView} />
      </div>

      {/* Countries View */}
      {view === 'countries' && (
        <section className="mb-8">
          {countryProfiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {countryProfiles.map((profile, i) => (
                <CountryCard key={profile.name} profile={profile} index={i} onSelect={setSelectedCountry} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-[var(--secondary)] text-sm bg-[var(--surface-container-lowest)] rounded-xl">
              No country data available
            </div>
          )}
        </section>
      )}

      {/* Markets View */}
      {view === 'markets' && (
        <section className="mb-8">
          <PlatformFilter markets={event.markets} platform={platformFilter} setPlatform={(p) => { setPlatformFilter(p); setShowAll(false); }} />
          {filteredMarkets.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleMarkets.map((market, i) => (
                  <MarketCard key={market.id || market.ticker || i} market={market} index={i} />
                ))}
              </div>
              {hasMore && !showAll && (
                <div className="text-center mt-6">
                  <button onClick={() => setShowAll(true)} className="px-8 py-3 bg-[var(--surface-container-high)] text-[var(--on-surface)] rounded-md font-heading font-bold uppercase tracking-widest text-sm hover:bg-[var(--surface-container-highest)] transition-all cursor-pointer">
                    Show All {filteredMarkets.length} Markets
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-[var(--secondary)] text-sm bg-[var(--surface-container-lowest)] rounded-xl">No markets found</div>
          )}
        </section>
      )}

      {/* Groups View */}
      {view === 'groups' && (
        <section className="mb-8">
          <GroupStageTable groups={groups} profiles={countryProfiles} />
        </section>
      )}

      {/* Bracket View */}
      {view === 'bracket' && (
        <section className="mb-8">
          <WorldCupBracket profiles={countryProfiles} />
        </section>
      )}

      {/* Schedule View */}
      {view === 'schedule' && (
        <section className="mb-8">
          <MatchSchedule profiles={countryProfiles} />
        </section>
      )}

      {/* Awards View */}
      {view === 'awards' && (
        <section className="mb-8">
          <GoldenBootTracker markets={parsedMarkets} />
        </section>
      )}

      {/* Head to Head View */}
      {view === 'h2h' && (
        <section className="mb-8">
          <HeadToHead profiles={countryProfiles} />
        </section>
      )}

      {/* Squads View */}
      {view === 'squads' && (
        <section className="mb-8">
          <SquadRoster profiles={countryProfiles} />
        </section>
      )}

      {/* Pick'em View */}
      {view === 'pickem' && (
        <section className="mb-8">
          <PickEm profiles={countryProfiles} />
        </section>
      )}

      {selectedCountry && (
        <CountryStatsPanel
          countryName={selectedCountry.name}
          championshipOdds={selectedCountry.championshipOdds}
          championshipMarket={selectedCountry.championshipMarket}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </>
  );
}

// ── NCAA Event Page ──────────────────────────────────────────────────────────

function NCAAEventPage({ event }: EventPageProps) {
  const [view, setView] = useState<NCAViewMode>('teams');
  const [showAll, setShowAll] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamProfile | null>(null);
  const [platformFilter, setPlatformFilter] = useState('all');

  const parsedMarkets = parseMarkets(event.markets);
  const teamProfiles = buildTeamProfiles(parsedMarkets);

  const filteredMarkets = useMemo(() => {
    if (platformFilter === 'all') return event.markets;
    return event.markets.filter(m => (m.platform || 'polymarket') === platformFilter);
  }, [event.markets, platformFilter]);

  const visibleMarkets = showAll ? filteredMarkets : filteredMarkets.slice(0, 12);
  const hasMore = filteredMarkets.length > 12;

  return (
    <>
      <LiveGames markets={parsedMarkets} />
      <UpsetAlertBanner markets={parsedMarkets} />
      <OddsMovementTracker teams={teamProfiles} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black font-heading tracking-tight uppercase">
            {view === 'teams' ? `${teamProfiles.length} Teams` : view === 'bracket' ? 'Tournament Bracket' : `${event.markets.length} Markets`}
          </h2>
          <span className="px-3 py-1 rounded-full bg-[var(--primary-fixed)] text-[var(--primary)] text-xs font-bold">LIVE</span>
        </div>
        <NCAAViewToggle view={view} setView={setView} />
      </div>

      {view === 'teams' && (
        <section className="mb-8">
          {teamProfiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {teamProfiles.map((team, i) => (
                <TeamCard key={team.name} team={team} index={i} onSelect={setSelectedTeam} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-[var(--secondary)] text-sm bg-[var(--surface-container-lowest)] rounded-xl">No team data available</div>
          )}
        </section>
      )}

      {view === 'markets' && (
        <section className="mb-8">
          <PlatformFilter markets={event.markets} platform={platformFilter} setPlatform={(p) => { setPlatformFilter(p); setShowAll(false); }} />
          {filteredMarkets.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleMarkets.map((market, i) => (
                  <MarketCard key={market.id || market.ticker || i} market={market} index={i} />
                ))}
              </div>
              {hasMore && !showAll && (
                <div className="text-center mt-6">
                  <button onClick={() => setShowAll(true)} className="px-8 py-3 bg-[var(--surface-container-high)] text-[var(--on-surface)] rounded-md font-heading font-bold uppercase tracking-widest text-sm hover:bg-[var(--surface-container-highest)] transition-all cursor-pointer">
                    Show All {filteredMarkets.length} Markets
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-[var(--secondary)] text-sm bg-[var(--surface-container-lowest)] rounded-xl">No markets found</div>
          )}
        </section>
      )}

      {view === 'bracket' && (
        <section className="mb-8">
          <BracketVisualizer teams={teamProfiles} />
        </section>
      )}

      {selectedTeam && (
        <TeamStatsPanel
          teamName={selectedTeam.name}
          championshipOdds={selectedTeam.championshipOdds}
          championshipMarket={selectedTeam.championshipMarket}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </>
  );
}

// ── Main EventPage ───────────────────────────────────────────────────────────

export default function EventPage({ event }: EventPageProps) {
  const setCurrentEvent = useEventStore(s => s.setCurrentEvent);
  const fifa = isFIFAEvent(event);

  useEffect(() => {
    setCurrentEvent(event);
  }, [event, setCurrentEvent]);

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--on-surface)] px-6 py-12 mb-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--on-surface)] via-[var(--on-surface)]/90 to-transparent z-[1]" />
        {fifa ? <SoccerPitchBackground /> : <BasketballCourtBackground />}
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
              {fifa && (
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
                  USA &middot; Mexico &middot; Canada &middot; June 11 &ndash; July 19, 2026
                </p>
              )}
              <div className="pt-2">
                <StatsBar markets={event.markets} volume={event.volume} liquidity={event.liquidity} openInterest={event.openInterest} dark />
              </div>
            </div>
            <ShareButton slug={event.slug} title={event.title} />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {fifa ? <FIFAEventPage event={event} /> : <NCAAEventPage event={event} />}

        {/* Two-column: News & X Posts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <NewsFeed news={event.newsItems} />
          <XFeed posts={event.xPosts} />
        </section>

        {event.tiktoks && event.tiktoks.length > 0 && (
          <section className="mb-8">
            <TikTokFeed tiktoks={event.tiktoks} />
          </section>
        )}

        <section className="mb-8">
          <VideoFeed videos={event.videos} />
        </section>
      </div>

      <MarketDetailOverlay />
      <TradePanel />
    </div>
  );
}
