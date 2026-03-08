import type { XPostData } from '@/app/types';

/**
 * Twitter/X data collector using Virtuals Protocol G.A.M.E. Framework
 *
 * Uses the GAME Twitter access token for enhanced rate limits (35 calls/5min).
 * Setup:
 * 1. Get GAME API key from https://console.game.virtuals.io/
 * 2. Run: virtuals-tweepy auth -k <GAME_API_KEY>
 * 3. Set env var: GAME_TWITTER_ACCESS_TOKEN=apx-<your_token>
 */

// GAME Framework proxies Twitter API v2 — apx- tokens go here, not to api.twitter.com
const TWITTER_API_BASE = 'https://twitter.game.virtuals.io/2';

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

async function searchRecentTweets(query: string, maxResults: number = 10): Promise<XPostData[]> {
  const accessToken = process.env.GAME_TWITTER_ACCESS_TOKEN;
  if (!accessToken) return [];

  try {
    const params = new URLSearchParams({
      query: `${query} -is:retweet lang:en`,
      max_results: String(Math.min(maxResults, 100)),
      'tweet.fields': 'created_at,public_metrics,author_id',
      expansions: 'author_id',
      'user.fields': 'username,name,public_metrics',
    });

    const res = await fetch(`${TWITTER_API_BASE}/tweets/search/recent?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Twitter search failed:', res.status, errText);
      throw new Error(`Twitter API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data: TwitterSearchResponse = await res.json();
    if (!data.data || data.data.length === 0) return [];

    // Build author lookup
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
  } catch (error) {
    console.error('Twitter search error:', error);
    throw error;
  }
}

export async function fetchEventXPosts(searchTerms: string[]): Promise<XPostData[]> {
  if (!process.env.GAME_TWITTER_ACCESS_TOKEN) {
    // Fallback: try Virtuals API directly
    return fetchViaVirtualsAPI(searchTerms);
  }

  // Search with just the terms — don't over-filter
  const allPosts: XPostData[] = [];
  for (const term of searchTerms) {
    const posts = await searchRecentTweets(term, 10);
    allPosts.push(...posts);
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

async function fetchViaVirtualsAPI(searchTerms: string[]): Promise<XPostData[]> {
  if (!process.env.VIRTUALS_API_KEY) return [];

  try {
    const allPosts: XPostData[] = [];

    for (const query of searchTerms) {
      const res = await fetch('https://api.virtuals.io/api/v1/twitter/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.VIRTUALS_API_KEY,
        },
        body: JSON.stringify({
          query,
          maxResults: 10,
          agentId: process.env.VIRTUALS_AGENT_ID,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const tweets = data.tweets || data.data || [];
        for (const tweet of tweets) {
          allPosts.push({
            id: '',
            eventId: '',
            tweetId: tweet.id || '',
            name: tweet.authorName || tweet.name || 'Unknown',
            handle: tweet.authorHandle || tweet.handle || 'unknown',
            text: tweet.text || tweet.content || '',
            time: tweet.createdAt || tweet.time || '',
            likes: String(tweet.likeCount || tweet.likes || 0),
            retweets: String(tweet.retweetCount || tweet.retweets || 0),
          });
        }
      }
    }

    return allPosts;
  } catch (error) {
    console.error('Virtuals API fetch error:', error);
    return [];
  }
}
