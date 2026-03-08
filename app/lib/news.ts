import type { NewsItemData } from '@/app/types';

/**
 * News fetcher using Google News RSS (no API key needed)
 * Parses RSS XML to extract news articles for event search terms
 */

interface RSSItem {
  title: string;
  source: string;
  url: string;
  pubDate: string;
}

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || '';
    const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || '';
    const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || '';
    const source = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || '';

    if (title) {
      items.push({
        title: decodeHTMLEntities(title),
        source: decodeHTMLEntities(source) || 'News',
        url: link,
        pubDate,
      });
    }
  }

  return items;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function guessSentiment(title: string): string {
  const lower = title.toLowerCase();
  const positive = ['surge', 'soar', 'jump', 'rise', 'gain', 'rally', 'high', 'record', 'boost', 'win', 'bull', 'up'];
  const negative = ['crash', 'plunge', 'drop', 'fall', 'decline', 'loss', 'bear', 'low', 'cut', 'risk', 'fear', 'warn', 'down', 'sink'];

  if (positive.some(w => lower.includes(w))) return 'positive';
  if (negative.some(w => lower.includes(w))) return 'negative';
  return 'neutral';
}

function timeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

export async function fetchEventNews(searchTerms: string[]): Promise<NewsItemData[]> {
  const allItems: NewsItemData[] = [];
  const seenTitles = new Set<string>();

  for (const term of searchTerms) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(term)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (!res.ok) {
        console.error(`Google News RSS failed for "${term}": ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const items = parseRSSItems(xml);

      for (const item of items.slice(0, 10)) {
        // Skip duplicates
        const titleKey = item.title.toLowerCase().slice(0, 50);
        if (seenTitles.has(titleKey)) continue;
        seenTitles.add(titleKey);

        allItems.push({
          id: '',
          eventId: '',
          title: item.title,
          summary: '',
          source: item.source,
          sentiment: guessSentiment(item.title),
          time: timeAgo(item.pubDate),
          url: item.url,
        });
      }
    } catch (err) {
      console.error(`News fetch error for "${term}":`, err);
    }
  }

  return allItems.slice(0, 20);
}
