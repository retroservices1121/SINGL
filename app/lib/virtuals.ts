import type { XPostData } from '@/app/types';

/**
 * Twitter/X data collector using Virtuals Protocol G.A.M.E. Framework
 *
 * The GAME Twitter plugin proxies Twitter API v2 through:
 *   https://twitter.game.virtuals.io/tweets/...
 *
 * The apx- token from `twitter-plugin-gamesdk auth` is the Bearer token.
 */

// GAME Twitter proxy — virtuals_tweepy routes tweepy calls through this
const GAME_PROXY_BASE = 'https://twitter.game.virtuals.io/tweets';

interface TwitterSearchResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
  };
  meta?: {
    result_count: number;
  };
}

interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  public_metrics?: {
    followers_count: number;
  };
}

function parseTweetsFromResponse(data: TwitterSearchResponse): XPostData[] {
  if (!data.data || data.data.length === 0) return [];

  const authors = new Map<string, TwitterUser>();
  if (data.includes?.users) {
    for (const user of data.includes.users) {
      authors.set(user.id, user);
    }
  }

  return data.data.map(tweet => {
    const author = authors.get(tweet.author_id);
    const metrics = tweet.public_metrics;
    return {
      id: '',
      eventId: '',
      tweetId: tweet.id,
      name: author?.name || 'Unknown',
      handle: author?.username || 'unknown',
      text: tweet.text,
      time: tweet.created_at || '',
      likes: String(metrics?.like_count || 0),
      retweets: String(metrics?.retweet_count || 0),
    };
  });
}

async function searchViaGameProxy(query: string, maxResults: number = 10): Promise<XPostData[]> {
  const accessToken = process.env.GAME_TWITTER_ACCESS_TOKEN;
  if (!accessToken) throw new Error('No GAME_TWITTER_ACCESS_TOKEN');

  const params = new URLSearchParams({
    query: `${query} -is:retweet lang:en`,
    max_results: String(Math.min(maxResults, 100)),
    'tweet.fields': 'created_at,public_metrics,author_id',
    expansions: 'author_id',
    'user.fields': 'username,name,public_metrics',
  });

  const url = `${GAME_PROXY_BASE}/search/recent?${params}`;
  console.log(`GAME Twitter proxy: ${url}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('GAME proxy failed:', res.status, errText);
    throw new Error(`GAME proxy ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data: TwitterSearchResponse = await res.json();
  return parseTweetsFromResponse(data);
}

export async function fetchEventXPosts(searchTerms: string[]): Promise<XPostData[]> {
  const allPosts: XPostData[] = [];
  const errors: string[] = [];

  for (const term of searchTerms) {
    try {
      const posts = await searchViaGameProxy(term, 10);
      console.log(`Twitter: ${posts.length} tweets for "${term}"`);
      allPosts.push(...posts);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (allPosts.length === 0 && errors.length > 0) {
    throw new Error(`Twitter fetch failed: ${errors.join(' | ')}`);
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
