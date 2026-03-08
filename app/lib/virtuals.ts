import type { XPostData } from '@/app/types';

/**
 * Twitter/X post fetcher using the public syndication timeline API.
 *
 * Fetches timelines from major news accounts and filters tweets
 * matching the event search terms. No API key required.
 */

const NEWS_ACCOUNTS = [
  '60Minutes', 'CBSNews', 'CNN', 'FoxNews', 'MSNBC',
  'AP', 'Reuters', 'BBCWorld', 'nikicohen_', 'POTUS',
  'ABC', 'NBCNews', 'WSJ', 'NYTimes', 'washingtonpost',
  'thehill', 'politabordeaux', 'CSPAN', 'pbsnewshour',
];

interface SyndicationTweet {
  id_str?: string;
  text?: string;
  created_at?: string;
  user?: {
    name?: string;
    screen_name?: string;
  };
  favorite_count?: number;
  retweet_count?: number;
  retweeted_tweet?: SyndicationTweet;
}

async function fetchUserTimeline(username: string): Promise<SyndicationTweet[]> {
  try {
    const res = await fetch(
      `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
      }
    );
    if (!res.ok) return [];

    const html = await res.text();

    // Extract the __NEXT_DATA__ JSON from the HTML
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return [];

    const nextData = JSON.parse(match[1]);
    const entries = nextData?.props?.pageProps?.timeline?.entries || [];

    const tweets: SyndicationTweet[] = [];
    for (const entry of entries) {
      if (entry.type !== 'tweet') continue;
      const tweet = entry.content?.tweet;
      if (!tweet) continue;
      tweets.push(tweet);
    }
    return tweets;
  } catch (err) {
    console.error(`[twitter] Failed to fetch @${username}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

function matchesSearchTerms(text: string, searchTerms: string[]): boolean {
  const lower = text.toLowerCase();
  for (const term of searchTerms) {
    // Split term into keywords and check if most match
    const words = term.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const matched = words.filter(w => lower.includes(w));
    if (matched.length >= Math.ceil(words.length * 0.5)) return true;
  }
  return false;
}

export async function fetchEventXPosts(searchTerms: string[]): Promise<XPostData[]> {
  if (searchTerms.length === 0) {
    throw new Error('No search terms provided');
  }

  const allPosts: XPostData[] = [];

  // Fetch timelines in parallel batches of 5
  for (let i = 0; i < NEWS_ACCOUNTS.length; i += 5) {
    const batch = NEWS_ACCOUNTS.slice(i, i + 5);
    const results = await Promise.all(batch.map(u => fetchUserTimeline(u)));

    for (const tweets of results) {
      for (const tweet of tweets) {
        // Use the original tweet text for retweets
        const source = tweet.retweeted_tweet || tweet;
        const text = source.text || tweet.text || '';

        if (!matchesSearchTerms(text, searchTerms)) continue;

        const user = tweet.user;
        allPosts.push({
          id: '',
          eventId: '',
          tweetId: tweet.id_str || '',
          name: user?.name || 'Unknown',
          handle: user?.screen_name || 'unknown',
          text,
          time: tweet.created_at || '',
          likes: String(source.favorite_count || 0),
          retweets: String(source.retweet_count || 0),
        });
      }
    }
  }

  console.log(`[twitter] Found ${allPosts.length} matching tweets from ${NEWS_ACCOUNTS.length} accounts`);

  // Deduplicate by text similarity (same tweet retweeted by multiple accounts)
  const seen = new Set<string>();
  const deduped: XPostData[] = [];
  for (const post of allPosts) {
    const key = post.tweetId || post.text.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(post);
  }

  // Sort by engagement
  return deduped.sort((a, b) => {
    const engA = parseInt(a.likes || '0') + parseInt(a.retweets || '0');
    const engB = parseInt(b.likes || '0') + parseInt(b.retweets || '0');
    return engB - engA;
  });
}
