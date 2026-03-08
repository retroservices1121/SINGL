import type { XPostData } from '@/app/types';

/**
 * Twitter/X data collector
 *
 * Tries multiple approaches:
 * 1. GAME Twitter proxy (POST) with apx- token
 * 2. Nitter RSS scraping (no auth needed)
 */

const GAME_PROXY = 'https://twitter.game.virtuals.io';

interface TwitterSearchResponse {
  data?: TwitterTweet[];
  includes?: { users?: TwitterUser[] };
  meta?: { result_count: number };
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

// Try every possible GAME proxy endpoint/method combination
async function searchViaGameProxy(query: string, maxResults: number = 10): Promise<XPostData[]> {
  const accessToken = process.env.GAME_TWITTER_ACCESS_TOKEN;
  if (!accessToken) throw new Error('No GAME_TWITTER_ACCESS_TOKEN');

  const searchParams = {
    query: `${query} -is:retweet lang:en`,
    max_results: maxResults,
    'tweet.fields': 'created_at,public_metrics,author_id',
    expansions: 'author_id',
    'user.fields': 'username,name,public_metrics',
  };

  const qsParams = new URLSearchParams({
    query: `${query} -is:retweet lang:en`,
    max_results: String(maxResults),
    'tweet.fields': 'created_at,public_metrics,author_id',
    expansions: 'author_id',
    'user.fields': 'username,name,public_metrics',
  });

  // Try various path + method combinations
  const attempts: { url: string; method: string; body?: string; headers: Record<string, string> }[] = [
    // POST with JSON body
    { url: `${GAME_PROXY}/tweets/search/recent`, method: 'POST', body: JSON.stringify(searchParams), headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    { url: `${GAME_PROXY}/2/tweets/search/recent`, method: 'POST', body: JSON.stringify(searchParams), headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    { url: `${GAME_PROXY}/search`, method: 'POST', body: JSON.stringify(searchParams), headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    // GET with query string
    { url: `${GAME_PROXY}/2/tweets/search/recent?${qsParams}`, method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } },
    // With x-access-token header
    { url: `${GAME_PROXY}/tweets/search/recent?${qsParams}`, method: 'GET', headers: { 'x-access-token': accessToken } },
    { url: `${GAME_PROXY}/2/tweets/search/recent?${qsParams}`, method: 'GET', headers: { 'x-access-token': accessToken } },
  ];

  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: attempt.method,
        headers: attempt.headers,
        ...(attempt.body ? { body: attempt.body } : {}),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`GAME proxy SUCCESS: ${attempt.method} ${attempt.url}`);
        // Handle both Twitter API v2 format and custom formats
        if (data.data) return parseTweetsFromResponse(data);
        if (Array.isArray(data)) {
          return data.map((t: Record<string, unknown>) => ({
            id: '', eventId: '',
            tweetId: String(t.id || ''),
            name: String(t.name || t.author_name || 'Unknown'),
            handle: String(t.handle || t.username || t.screen_name || 'unknown'),
            text: String(t.text || t.full_text || t.content || ''),
            time: String(t.created_at || t.time || ''),
            likes: String(t.like_count || t.likes || 0),
            retweets: String(t.retweet_count || t.retweets || 0),
          }));
        }
        // If response is ok but format is unexpected, log it
        console.log('GAME proxy unexpected format:', JSON.stringify(data).slice(0, 300));
      }

      errors.push(`${attempt.method} ${new URL(attempt.url).pathname}: ${res.status}`);
    } catch (err) {
      errors.push(`${attempt.method} ${attempt.url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`All GAME proxy attempts failed: ${errors.join(' | ')}`);
}

// Fallback: scrape Nitter RSS for tweets (no auth needed)
async function searchViaNitter(query: string): Promise<XPostData[]> {
  const nitterInstances = [
    'https://nitter.net',
    'https://nitter.privacydev.net',
    'https://nitter.poast.org',
  ];

  for (const nitter of nitterInstances) {
    try {
      const url = `${nitter}/search/rss?f=tweets&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const posts: XPostData[] = [];

      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && posts.length < 10) {
        const item = match[1];
        const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || '';
        const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || '';
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || '';
        const creator = item.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || '';
        const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim() || '';

        // Extract handle from link (e.g. /username/status/123)
        const handleMatch = link.match(/\/([^/]+)\/status/);
        const handle = handleMatch?.[1] || creator?.replace('@', '') || 'unknown';
        const tweetIdMatch = link.match(/status\/(\d+)/);

        posts.push({
          id: '',
          eventId: '',
          tweetId: tweetIdMatch?.[1] || '',
          name: creator || handle,
          handle,
          text: description || title,
          time: pubDate,
          likes: '0',
          retweets: '0',
        });
      }

      if (posts.length > 0) {
        console.log(`Nitter (${nitter}): ${posts.length} tweets for "${query}"`);
        return posts;
      }
    } catch {
      // Try next instance
    }
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
        const posts = await searchViaGameProxy(term, 10);
        if (posts.length > 0) {
          allPosts.push(...posts);
          continue;
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    // Fallback: Nitter
    try {
      const posts = await searchViaNitter(term);
      if (posts.length > 0) {
        allPosts.push(...posts);
        continue;
      }
    } catch {}
  }

  if (allPosts.length === 0 && errors.length > 0) {
    throw new Error(errors.join(' | '));
  }

  // Deduplicate by tweetId
  const seen = new Set<string>();
  const deduped: XPostData[] = [];
  for (const post of allPosts) {
    const key = post.tweetId || post.text.slice(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(post);
  }

  return deduped.sort((a, b) => {
    const engA = parseInt(a.likes || '0') + parseInt(a.retweets || '0');
    const engB = parseInt(b.likes || '0') + parseInt(b.retweets || '0');
    return engB - engA;
  });
}
