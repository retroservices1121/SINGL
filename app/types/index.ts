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

export interface TradeParams {
  walletAddress: string;
  marketTicker: string;
  side: 'yes' | 'no';
  amount: number;
}

export interface FeeBreakdown {
  fee: number;
  netAmount: number;
  feeRate: number;
}

export interface KYCStatus {
  verified: boolean;
  redirectUrl?: string;
}

export interface TrendingEvent {
  slug: string;
  title: string;
  emoji: string;
  color: string;
  subtitle: string;
  marketCount?: number;
}
