import type { TikTokData } from '@/app/types';

/**
 * TikTok video fetcher.
 *
 * Discovery: searches Twitter (via GAME proxy) for tweets sharing
 * TikTok links about the event topic.
 * Metadata: uses TikTok's public oEmbed API for thumbnails/titles.
 *
 * No TikTok API key required.
 */

const GAME_TWITTER_BASE = 'https://twitter.game.virtuals.io/tweets/2';

interface TwitterTweet {
  id: string;
  text: string;
  entities?: {
    urls?: Array<{
      expanded_url?: string;
      unwound_url?: string;
    }>;
  };
}

interface TwitterSearchResponse {
  data?: TwitterTweet[];
}

interface TikTokOEmbed {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

function extractTikTokUrls(tweets: TwitterTweet[]): string[] {
  const urls = new Set<string>();

  for (const tweet of tweets) {
    // Check entities for expanded URLs
    if (tweet.entities?.urls) {
      for (const u of tweet.entities.urls) {
        const url = u.unwound_url || u.expanded_url || '';
        if (url.includes('tiktok.com') && url.includes('/video/')) {
          urls.add(url.split('?')[0]);
        }
      }
    }

    // Also check tweet text for TikTok URLs
    const matches = tweet.text.match(/https?:\/\/(?:www\.)?(?:tiktok\.com\/[@\w]+\/video\/\d+|vm\.tiktok\.com\/\w+)/g);
    if (matches) {
      for (const m of matches) {
        urls.add(m.split('?')[0]);
      }
    }
  }

  return Array.from(urls);
}

async function getOEmbed(videoUrl: string): Promise<TikTokOEmbed | null> {
  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code || data.message) return null; // error response
    return data;
  } catch {
    return null;
  }
}

async function searchTwitterForTikToks(query: string): Promise<TwitterTweet[]> {
  const token = process.env.GAME_TWITTER_ACCESS_TOKEN;
  if (!token) return [];

  try {
    const params = new URLSearchParams({
      query: `${query} tiktok.com -is:retweet`,
      max_results: '20',
      'tweet.fields': 'entities',
    });

    const res = await fetch(`${GAME_TWITTER_BASE}/tweets/search/recent?${params}`, {
      headers: { 'x-api-key': token },
    });

    if (!res.ok) {
      console.error(`[tiktok] Twitter search ${res.status}`);
      return [];
    }

    const data: TwitterSearchResponse = await res.json();
    return data.data || [];
  } catch (err) {
    console.error('[tiktok] Twitter search error:', err instanceof Error ? err.message : err);
    return [];
  }
}

export async function fetchEventTikToks(searchTerms: string[]): Promise<TikTokData[]> {
  const allTikToks: TikTokData[] = [];
  const seenVideoIds = new Set<string>();

  for (const term of searchTerms) {
    const tweets = await searchTwitterForTikToks(term);
    const tiktokUrls = extractTikTokUrls(tweets);

    console.log(`[tiktok] Found ${tiktokUrls.length} TikTok URLs for "${term}"`);

    for (const url of tiktokUrls) {
      // Extract video ID from URL
      const videoIdMatch = url.match(/\/video\/(\d+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      if (videoId && seenVideoIds.has(videoId)) continue;
      if (videoId) seenVideoIds.add(videoId);

      const oembed = await getOEmbed(url);

      allTikToks.push({
        id: '',
        eventId: '',
        videoId,
        username: oembed?.author_name || 'unknown',
        caption: oembed?.title || '',
        thumbnail: oembed?.thumbnail_url || null,
        videoUrl: url,
        likes: null,
        views: null,
      });
    }
  }

  return allTikToks;
}
