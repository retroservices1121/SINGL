import type { XPostData } from '@/app/types';

/**
 * Twitter/X post fetcher using Twitter's public web API
 * (same as what twitter.com uses for logged-out search)
 */

// Twitter's public bearer token — embedded in their web JS, not a secret
const TWITTER_BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

let cachedGuestToken: { token: string; expires: number } | null = null;

async function getGuestToken(): Promise<string> {
  if (cachedGuestToken && cachedGuestToken.expires > Date.now()) {
    return cachedGuestToken.token;
  }

  // Try both domains with browser-like headers
  const urls = [
    'https://api.twitter.com/1.1/guest/activate.json',
    'https://api.x.com/1.1/guest/activate.json',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TWITTER_BEARER}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://x.com',
          'Referer': 'https://x.com/',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.guest_token) {
          cachedGuestToken = {
            token: data.guest_token,
            expires: Date.now() + 30 * 60 * 1000,
          };
          console.log(`[twitter] Guest token obtained via ${url}`);
          return data.guest_token;
        }
      }
      console.log(`[twitter] ${url}: ${res.status}`);
    } catch (err) {
      console.log(`[twitter] ${url}: ${err instanceof Error ? err.message : err}`);
    }
  }

  throw new Error('Guest token failed on all endpoints');
}

interface TweetResult {
  rest_id: string;
  core?: {
    user_results?: {
      result?: {
        legacy?: {
          name?: string;
          screen_name?: string;
        };
      };
    };
  };
  legacy?: {
    full_text?: string;
    created_at?: string;
    favorite_count?: number;
    retweet_count?: number;
    id_str?: string;
  };
}

function parseTweetEntries(data: Record<string, unknown>): XPostData[] {
  const posts: XPostData[] = [];

  try {
    // Navigate the adaptive search response structure
    const globalObjects = data.globalObjects as Record<string, unknown> | undefined;
    if (globalObjects) {
      // V1.1 adaptive search format
      const tweets = globalObjects.tweets as Record<string, Record<string, unknown>> || {};
      const users = globalObjects.users as Record<string, Record<string, unknown>> || {};

      for (const tweetId of Object.keys(tweets)) {
        const tweet = tweets[tweetId];
        const userId = tweet.user_id_str as string;
        const user = users[userId] || {};

        posts.push({
          id: '',
          eventId: '',
          tweetId: tweetId,
          name: (user.name as string) || 'Unknown',
          handle: (user.screen_name as string) || 'unknown',
          text: (tweet.full_text as string) || '',
          time: (tweet.created_at as string) || '',
          likes: String(tweet.favorite_count || 0),
          retweets: String(tweet.retweet_count || 0),
        });
      }
    }

    // Also try timeline/search V2 format
    if (posts.length === 0) {
      const instructions = extractNestedValue(data, 'instructions') as unknown[];
      if (Array.isArray(instructions)) {
        for (const instruction of instructions) {
          const entries = (instruction as Record<string, unknown>).entries as unknown[];
          if (!Array.isArray(entries)) continue;
          for (const entry of entries) {
            const tweet = extractTweetFromEntry(entry as Record<string, unknown>);
            if (tweet) posts.push(tweet);
          }
        }
      }
    }
  } catch (err) {
    console.error('[twitter] Parse error:', err);
  }

  return posts;
}

function extractTweetFromEntry(entry: Record<string, unknown>): XPostData | null {
  try {
    const content = entry.content as Record<string, unknown>;
    if (!content) return null;

    const itemContent = (content.itemContent || content) as Record<string, unknown>;
    const tweetResults = itemContent.tweet_results as Record<string, unknown>;
    if (!tweetResults) return null;

    const result = tweetResults.result as TweetResult;
    if (!result?.legacy) return null;

    const userLegacy = result.core?.user_results?.result?.legacy;

    return {
      id: '',
      eventId: '',
      tweetId: result.legacy.id_str || result.rest_id || '',
      name: userLegacy?.name || 'Unknown',
      handle: userLegacy?.screen_name || 'unknown',
      text: result.legacy.full_text || '',
      time: result.legacy.created_at || '',
      likes: String(result.legacy.favorite_count || 0),
      retweets: String(result.legacy.retweet_count || 0),
    };
  } catch {
    return null;
  }
}

function extractNestedValue(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const record = obj as Record<string, unknown>;
  if (key in record) return record[key];
  for (const k of Object.keys(record)) {
    const found = extractNestedValue(record[k], key);
    if (found !== undefined) return found;
  }
  return undefined;
}

async function searchTwitter(query: string, count: number = 20): Promise<XPostData[]> {
  const guestToken = await getGuestToken();

  const params = new URLSearchParams({
    q: query,
    count: String(count),
    query_source: 'typed_query',
    result_filter: 'latest',
    tweet_mode: 'extended',
    include_entities: 'true',
    include_ext_media_availability: 'false',
  });

  const res = await fetch(
    `https://api.twitter.com/1.1/search/tweets.json?${params}`,
    {
      headers: {
        Authorization: `Bearer ${TWITTER_BEARER}`,
        'x-guest-token': guestToken,
      },
    }
  );

  if (!res.ok) {
    // Try adaptive search endpoint as fallback
    const params2 = new URLSearchParams({
      q: query,
      count: String(count),
      query_source: 'typed_query',
      requestContext: 'launch',
      pc: '1',
      spelling_corrections: '1',
    });

    const res2 = await fetch(
      `https://api.twitter.com/2/search/adaptive.json?${params2}`,
      {
        headers: {
          Authorization: `Bearer ${TWITTER_BEARER}`,
          'x-guest-token': guestToken,
        },
      }
    );

    if (!res2.ok) {
      const errText = await res2.text().catch(() => '');
      throw new Error(`Twitter search ${res.status}/${res2.status}: ${errText.slice(0, 150)}`);
    }

    const data2 = await res2.json();
    return parseTweetEntries(data2);
  }

  // Standard search/tweets.json response
  const data = await res.json();
  const statuses = data.statuses || [];

  return statuses.map((tweet: Record<string, unknown>) => {
    const user = tweet.user as Record<string, unknown> || {};
    return {
      id: '',
      eventId: '',
      tweetId: String(tweet.id_str || ''),
      name: String(user.name || 'Unknown'),
      handle: String(user.screen_name || 'unknown'),
      text: String(tweet.full_text || tweet.text || ''),
      time: String(tweet.created_at || ''),
      likes: String(tweet.favorite_count || 0),
      retweets: String(tweet.retweet_count || 0),
    };
  });
}

export async function fetchEventXPosts(searchTerms: string[]): Promise<XPostData[]> {
  const allPosts: XPostData[] = [];
  const errors: string[] = [];

  for (const term of searchTerms) {
    try {
      const posts = await searchTwitter(term, 15);
      console.log(`[twitter] ${posts.length} tweets for "${term}"`);
      allPosts.push(...posts);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[twitter] Error for "${term}":`, msg);
      errors.push(msg);
    }
  }

  if (allPosts.length === 0 && errors.length > 0) {
    throw new Error(errors.join(' | '));
  }

  // Deduplicate by tweetId
  const seen = new Set<string>();
  const deduped: XPostData[] = [];
  for (const post of allPosts) {
    if (!post.tweetId || seen.has(post.tweetId)) continue;
    seen.add(post.tweetId);
    deduped.push(post);
  }

  // Sort by engagement
  return deduped.sort((a, b) => {
    const engA = parseInt(a.likes || '0') + parseInt(a.retweets || '0');
    const engB = parseInt(b.likes || '0') + parseInt(b.retweets || '0');
    return engB - engA;
  });
}
