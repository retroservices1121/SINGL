import type { XPostData } from '@/app/types';

/**
 * Twitter/X post fetcher using the Virtuals G.A.M.E. Twitter proxy.
 *
 * The GAME proxy at twitter.game.virtuals.io provides access to
 * Twitter API v2 search using x-api-key authentication with an
 * apx-... access token.
 *
 * Auth: x-api-key header (NOT Authorization: Bearer)
 * Base URL: https://twitter.game.virtuals.io/tweets/2/tweets/search/recent
 */

const GAME_TWITTER_BASE = 'https://twitter.game.virtuals.io/tweets/2';

interface TwitterUser {
  id: string;
  name: string;
  username: string;
}

interface TwitterMetrics {
  like_count?: number;
  retweet_count?: number;
  reply_count?: number;
  quote_count?: number;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: TwitterMetrics;
}

interface TwitterSearchResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
  };
  meta?: {
    result_count?: number;
    next_token?: string;
  };
}

export async function fetchEventXPosts(searchTerms: string[]): Promise<XPostData[]> {
  const token = process.env.GAME_TWITTER_ACCESS_TOKEN;
  if (!token) {
    throw new Error('GAME_TWITTER_ACCESS_TOKEN not set');
  }

  const allPosts: XPostData[] = [];
  const errors: string[] = [];

  for (const term of searchTerms) {
    try {
      const query = `${term} -is:retweet lang:en`;
      const params = new URLSearchParams({
        query,
        max_results: '10',
        'tweet.fields': 'created_at,public_metrics,author_id',
        expansions: 'author_id',
        'user.fields': 'name,username',
      });

      const res = await fetch(`${GAME_TWITTER_BASE}/tweets/search/recent?${params}`, {
        headers: {
          'x-api-key': token,
        },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`GAME proxy ${res.status}: ${body.slice(0, 200)}`);
      }

      const data: TwitterSearchResponse = await res.json();

      // Build user lookup
      const users = new Map<string, { name: string; username: string }>();
      if (data.includes?.users) {
        for (const user of data.includes.users) {
          users.set(user.id, { name: user.name, username: user.username });
        }
      }

      for (const tweet of data.data || []) {
        const author = users.get(tweet.author_id || '');
        const metrics = tweet.public_metrics;

        allPosts.push({
          id: '',
          eventId: '',
          tweetId: tweet.id,
          name: author?.name || 'Unknown',
          handle: author?.username || 'unknown',
          text: tweet.text,
          time: tweet.created_at || '',
          likes: String(metrics?.like_count || 0),
          retweets: String(metrics?.retweet_count || 0),
        });
      }

      console.log(`[twitter] ${data.data?.length || 0} tweets for "${term}"`);
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
