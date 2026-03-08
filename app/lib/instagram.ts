import type { InstaPostData } from '@/app/types';

/**
 * Instagram post fetcher using Google search to discover public IG posts,
 * then Instagram oEmbed API to get metadata.
 *
 * No API key required — uses public endpoints only.
 */

interface OEmbedResponse {
  author_name?: string;
  title?: string;
  thumbnail_url?: string;
  html?: string;
}

async function searchInstagramPosts(query: string): Promise<string[]> {
  // Use Google to find Instagram posts about the topic
  const searchQuery = encodeURIComponent(`site:instagram.com/p/ ${query}`);
  const url = `https://www.google.com/search?q=${searchQuery}&num=10`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) return [];

    const html = await res.text();

    // Extract Instagram URLs from Google results
    const urls: string[] = [];
    const regex = /https?:\/\/(?:www\.)?instagram\.com\/p\/([A-Za-z0-9_-]+)/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const fullUrl = `https://www.instagram.com/p/${match[1]}/`;
      if (!urls.includes(fullUrl)) {
        urls.push(fullUrl);
      }
    }

    return urls.slice(0, 8);
  } catch (err) {
    console.error('[instagram] Google search error:', err instanceof Error ? err.message : err);
    return [];
  }
}

async function getOEmbed(permalink: string): Promise<OEmbedResponse | null> {
  try {
    const res = await fetch(
      `https://graph.instagram.com/oembed?url=${encodeURIComponent(permalink)}&omitscript=true`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchEventInstaPosts(searchTerms: string[]): Promise<InstaPostData[]> {
  const allPosts: InstaPostData[] = [];
  const seenUrls = new Set<string>();

  for (const term of searchTerms) {
    const urls = await searchInstagramPosts(term);

    for (const permalink of urls) {
      if (seenUrls.has(permalink)) continue;
      seenUrls.add(permalink);

      const oembed = await getOEmbed(permalink);
      if (!oembed) continue;

      // Extract shortcode as postId
      const shortcodeMatch = permalink.match(/\/p\/([A-Za-z0-9_-]+)/);
      const postId = shortcodeMatch ? shortcodeMatch[1] : null;

      // Extract caption from oembed title or html
      let caption = oembed.title || '';
      if (!caption && oembed.html) {
        // Try to extract text from the embed HTML
        const textMatch = oembed.html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
        if (textMatch) {
          caption = textMatch[1].replace(/<[^>]+>/g, '').trim();
        }
      }

      allPosts.push({
        id: '',
        eventId: '',
        postId,
        username: oembed.author_name || 'unknown',
        caption: caption.slice(0, 500),
        imageUrl: oembed.thumbnail_url || null,
        permalink,
        likes: null,
        timestamp: null,
      });
    }

    console.log(`[instagram] ${urls.length} posts found for "${term}"`);
  }

  return allPosts;
}
