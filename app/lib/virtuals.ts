import type { XPostData } from '@/app/types';

/**
 * Twitter/X post fetcher
 *
 * The GAME apx- token only works with the Python virtuals_tweepy library,
 * not via raw HTTP. Instead we use free alternatives:
 * 1. Nitter/Xcancel RSS feeds (Twitter mirrors)
 * 2. Google News RSS filtered to x.com/twitter.com
 */

const NITTER_INSTANCES = [
  'https://xcancel.com',
  'https://nitter.poast.org',
  'https://nitter.privacydev.net',
  'https://nitter.net',
  'https://nitter.cz',
];

function parseRSSItems(xml: string): XPostData[] {
  const posts: XPostData[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && posts.length < 15) {
    const item = match[1];
    const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]
      ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || '';
    const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || '';
    const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || '';
    const creator = item.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/)?.[1]
      ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || '';
    const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1]
      ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim() || '';

    const handleMatch = link.match(/\/([^/]+)\/status/);
    const handle = handleMatch?.[1] || creator?.replace('@', '') || 'unknown';
    const tweetIdMatch = link.match(/status\/(\d+)/);

    const text = description || title;
    if (!text) continue;

    posts.push({
      id: '',
      eventId: '',
      tweetId: tweetIdMatch?.[1] || '',
      name: creator || handle,
      handle,
      text,
      time: pubDate,
      likes: '0',
      retweets: '0',
    });
  }

  return posts;
}

async function searchViaNitter(query: string): Promise<XPostData[]> {
  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `${instance}/search/rss?f=tweets&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const posts = parseRSSItems(xml);

      if (posts.length > 0) {
        console.log(`[twitter] ${instance}: ${posts.length} tweets for "${query}"`);
        return posts;
      }
    } catch {
      // Try next instance
    }
  }

  return [];
}

// Fallback: Google News RSS filtered to twitter.com / x.com
async function searchViaGoogle(query: string): Promise<XPostData[]> {
  try {
    const googleQuery = `${query} site:x.com OR site:twitter.com`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(googleQuery)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const posts: XPostData[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && posts.length < 10) {
      const item = match[1];
      const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]
        ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || '';
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || '';
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || '';

      // Extract handle from x.com or twitter.com URLs
      const handleMatch = link.match(/(?:x\.com|twitter\.com)\/([^/]+)/);
      const handle = handleMatch?.[1] || 'unknown';
      const tweetIdMatch = link.match(/status\/(\d+)/);

      if (!title) continue;

      posts.push({
        id: '',
        eventId: '',
        tweetId: tweetIdMatch?.[1] || `google-${posts.length}`,
        name: handle,
        handle,
        text: title,
        time: pubDate,
        likes: '0',
        retweets: '0',
      });
    }

    if (posts.length > 0) {
      console.log(`[twitter] Google News: ${posts.length} tweets for "${query}"`);
    }
    return posts;
  } catch {
    return [];
  }
}

export async function fetchEventXPosts(searchTerms: string[]): Promise<XPostData[]> {
  const allPosts: XPostData[] = [];

  for (const term of searchTerms) {
    // Try Nitter instances first
    const nitterPosts = await searchViaNitter(term);
    if (nitterPosts.length > 0) {
      allPosts.push(...nitterPosts);
      continue;
    }

    // Fallback: Google News filtered to Twitter
    const googlePosts = await searchViaGoogle(term);
    if (googlePosts.length > 0) {
      allPosts.push(...googlePosts);
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const deduped: XPostData[] = [];
  for (const post of allPosts) {
    const key = post.tweetId || post.text.slice(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(post);
  }

  return deduped;
}
