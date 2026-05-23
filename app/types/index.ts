export interface EventData {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  emoji?: string | null;
  color?: string | null;
  imageUrl?: string | null;
  searchTerms: string[];
  volume?: number | null;
  liquidity?: number | null;
  openInterest?: number | null;
  markets: MarketData[];
  newsItems: NewsItemData[];
  xPosts: XPostData[];
  videos: VideoData[];
  tiktoks: TikTokData[];
}

export type AggVenue =
  | 'polymarket'
  | 'kalshi'
  | 'limitless'
  | 'opinion'
  | 'predict'
  | 'probable'
  | 'myriad'
  | 'hyperliquid';

// One outcome in a (possibly multi-outcome) market — e.g. "Spain" in
// "Nation to Reach Final" or "Yes" in "Will inflation drop below 3%".
export interface MarketOutcome {
  id: string;        // venueMarketOutcomeId for the YES side
  label: string;     // human label, e.g. "Spain" or "Yes"
  price: number;     // 0..1 midpoint at fetch time (live overrides via WS hook)
  imageUrl?: string | null;
  // For synthesized multi-outcome cards (where each outcome row is its own
  // underlying binary market), the NO-side outcome id and the per-child
  // market id used to build /api/agg/route quotes. Optional — undefined on
  // truly multi-outcome AGG markets where there's only one parent market.
  noId?: string;
  childMarketId?: string;
  venue?: string;
}

export interface MarketData {
  id: string;
  eventId: string;
  ticker: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  volume?: number | null;
  change24h?: number | null;
  category?: string | null;
  rulesPrimary?: string | null;
  closeTime?: string | null;
  expirationTime?: string | null;
  venueMarketId: string;
  yesOutcomeId: string;
  noOutcomeId: string;
  tickSize: string;
  // First two outcome labels kept for legacy binary-market display paths.
  outcomeName?: string | null;  // first outcome label (null = "Yes")
  outcome2Name?: string | null; // second outcome label (null = "No")
  // Full outcomes list (>= 2 entries when populated). Empty/undefined for
  // legacy data; populated by mapAggMarket for new server-fetched markets.
  outcomes?: MarketOutcome[];
  venue?: AggVenue | string;
  chain?: string;
  // Title of the AGG parent event this market belongs to. SINGL flattens
  // many AGG events into one active-event payload, so each market carries
  // its own parent context for display ("FIFA World Cup 2026 → USA").
  parentEventTitle?: string | null;
}

export interface NewsItemData {
  id: string;
  eventId: string;
  title: string;
  summary: string;
  source: string;
  sentiment: string;
  time: string;
  url?: string | null;
}

export interface XPostData {
  id: string;
  eventId: string;
  name: string;
  handle: string;
  text: string;
  time: string;
  likes?: string | null;
  retweets?: string | null;
  tweetId?: string | null;
}

export interface VideoData {
  id: string;
  eventId: string;
  title: string;
  channel: string;
  youtubeUrl: string;
  youtubeId?: string | null;
  duration?: string | null;
  views?: string | null;
  thumbnail?: string | null;
}

export interface TikTokData {
  id: string;
  eventId: string;
  videoId?: string | null;
  username: string;
  caption: string;
  thumbnail?: string | null;
  videoUrl: string;
  likes?: string | null;
  views?: string | null;
}

export interface TrendingEvent {
  slug: string;
  title: string;
  emoji: string;
  color: string;
  subtitle: string;
  marketCount?: number;
}
