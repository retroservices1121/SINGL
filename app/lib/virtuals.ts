import type { XPostData } from '@/app/types';

/**
 * Twitter/X data collector using Virtuals Protocol G.A.M.E. Framework
 *
 * GAME_TWITTER_ACCESS_TOKEN (apx-...) — tried against known GAME proxy URLs
 * VIRTUALS_API_KEY (apt-...) — used with Virtuals API as fallback
 */

// Known GAME Twitter proxy base URLs to try (virtuals-tweepy routes through these)
const GAME_PROXY_BASES = [
  'https://twitter-proxy.virtuals.io/2',
  'https://api.game.virtuals.io/twitter/2',
  'https://api.game.virtuals.io/api/twitter/2',
];

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

async function searchViaGameProxy(query: string, maxResults: number = 10): Promise<{ posts: XPostData[]; base: string }> {
  const accessToken = process.env.GAME_TWITTER_ACCESS_TOKEN;
  if (!accessToken) throw new Error('No GAME_TWITTER_ACCESS_TOKEN');

  const params = new URLSearchParams({
    query: `${query} -is:retweet lang:en`,
    max_results: String(Math.min(maxResults, 100)),
    'tweet.fields': 'created_at,public_metrics,author_id',
    expansions: 'author_id',
    'user.fields': 'username,name,public_metrics',
  });

  const errors: string[] = [];

  for (const base of GAME_PROXY_BASES) {
    const url = `${base}/tweets/search/recent?${params}`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const data: TwitterSearchResponse = await res.json();
        return { posts: parseTweetsFromResponse(data), base };
      }

      const errText = await res.text();
      errors.push(`${base}: ${res.status} ${errText.slice(0, 100)}`);
    } catch (err) {
      errors.push(`${base}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Also try with x-api-key header instead of Bearer
  for (const base of GAME_PROXY_BASES) {
    const url = `${base}/tweets/search/recent?${params}`;
    try {
      const res = await fetch(url, {
        headers: { 'x-api-key': accessToken },
      });

      if (res.ok) {
        const data: TwitterSearchResponse = await res.json();
        return { posts: parseTweetsFromResponse(data), base: `${base} (x-api-key)` };
      }
    } catch {}
  }

  throw new Error(`All GAME proxy URLs failed: ${errors.join(' | ')}`);
}

async function searchViaVirtualsAPI(query: string, maxResults: number = 10): Promise<XPostData[]> {
  const apiKey = process.env.VIRTUALS_API_KEY;
  if (!apiKey) return [];

  // Try multiple Virtuals API endpoint patterns
  const endpoints = [
    { url: 'https://api.game.virtuals.io/api/v1/twitter/search', method: 'POST' },
    { url: 'https://api.virtuals.io/api/v1/twitter/search', method: 'POST' },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query, maxResults }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const tweets = data.tweets || data.data || data.results || [];
      if (!Array.isArray(tweets) || tweets.length === 0) continue;

      return tweets.map((tweet: Record<string, unknown>) => ({
        id: '',
        eventId: '',
        tweetId: String(tweet.id || tweet.tweetId || ''),
        name: String(tweet.authorName || tweet.name || tweet.author_name || 'Unknown'),
        handle: String(tweet.authorHandle || tweet.handle || tweet.username || tweet.author_handle || 'unknown'),
        text: String(tweet.text || tweet.content || tweet.full_text || ''),
        time: String(tweet.createdAt || tweet.time || tweet.created_at || ''),
        likes: String(tweet.likeCount || tweet.likes || tweet.like_count || 0),
        retweets: String(tweet.retweetCount || tweet.retweets || tweet.retweet_count || 0),
      }));
    } catch {}
  }

  return [];
}

export async function fetchEventXPosts(searchTerms: string[]): Promise<XPostData[]> {
  const allPosts: XPostData[] = [];
  const errors: string[] = [];

  for (const term of searchTerms) {
    // Try GAME proxy first
    if (process.env.GAME_TWITTER_ACCESS_TOKEN) {
      try {
        const { posts, base } = await searchViaGameProxy(term, 10);
        console.log(`GAME proxy success via ${base}: ${posts.length} tweets for "${term}"`);
        allPosts.push(...posts);
        continue;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    // Fallback to Virtuals API
    if (process.env.VIRTUALS_API_KEY) {
      try {
        const posts = await searchViaVirtualsAPI(term, 10);
        if (posts.length > 0) {
          console.log(`Virtuals API: ${posts.length} tweets for "${term}"`);
          allPosts.push(...posts);
          continue;
        }
      } catch (err) {
        errors.push(`Virtuals: ${err instanceof Error ? err.message : String(err)}`);
      }
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
