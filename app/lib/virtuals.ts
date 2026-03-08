import type { XPostData } from '@/app/types';
import { TwitterApi } from '@virtuals-protocol/game-twitter-node';

/**
 * Twitter/X post fetcher using the official Virtuals GAME Twitter SDK
 * (@virtuals-protocol/game-twitter-node)
 *
 * Uses GAME_TWITTER_ACCESS_TOKEN (apx-...) for authentication.
 */

function getTwitterClient(): TwitterApi | null {
  const token = process.env.GAME_TWITTER_ACCESS_TOKEN;
  if (!token) return null;
  return new TwitterApi({ gameTwitterAccessToken: token });
}

export async function fetchEventXPosts(searchTerms: string[]): Promise<XPostData[]> {
  const client = getTwitterClient();
  if (!client) {
    throw new Error('GAME_TWITTER_ACCESS_TOKEN not set');
  }

  const readOnly = client.readOnly;
  const allPosts: XPostData[] = [];
  const errors: string[] = [];

  for (const term of searchTerms) {
    try {
      const result = await readOnly.v2.search(term, {
        max_results: 10,
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
        expansions: ['author_id'],
        'user.fields': ['name', 'username'],
      });

      const users = new Map<string, { name: string; username: string }>();
      if (result.includes?.users) {
        for (const user of result.includes.users) {
          users.set(user.id, { name: user.name, username: user.username });
        }
      }

      const tweets = result.data ? Array.from(result.data as unknown as Iterable<any>) : [];
      for (const tweet of tweets) {
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

      console.log(`[twitter] ${tweets.length} tweets for "${term}"`);
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
