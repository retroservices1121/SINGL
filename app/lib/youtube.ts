import type { VideoData } from '@/app/types';

const YT_API = 'https://www.googleapis.com/youtube/v3';

interface YTSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { high?: { url: string } };
  };
}

interface YTDetailItem {
  id: string;
  contentDetails: { duration: string };
  statistics: { viewCount: string };
}

function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = match[1] ? `${match[1]}:` : '';
  const m = match[2] || '0';
  const s = (match[3] || '0').padStart(2, '0');
  return `${h}${h ? m.padStart(2, '0') : m}:${s}`;
}

function formatViews(count: string): string {
  const n = parseInt(count, 10);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return count;
}

export async function fetchEventVideos(searchTerms: string[]): Promise<VideoData[]> {
  if (!process.env.YOUTUBE_API_KEY) return [];

  const query = searchTerms.slice(0, 3).join(' ');

  const searchRes = await fetch(
    `${YT_API}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=date&maxResults=8&key=${process.env.YOUTUBE_API_KEY}`
  );

  if (!searchRes.ok) {
    console.error('YouTube search failed:', searchRes.status);
    return [];
  }

  const searchData = await searchRes.json();
  const items: YTSearchItem[] = searchData.items || [];
  if (items.length === 0) return [];

  const allIds = items.map(i => i.id.videoId).join(',');
  const detailsRes = await fetch(
    `${YT_API}/videos?part=contentDetails,statistics&id=${allIds}&key=${process.env.YOUTUBE_API_KEY}`
  );
  const details = await detailsRes.json();
  const detailMap = new Map<string, YTDetailItem>();
  for (const d of (details.items || []) as YTDetailItem[]) {
    detailMap.set(d.id, d);
  }

  return items.map(item => {
    const detail = detailMap.get(item.id.videoId);
    return {
      id: '',
      eventId: '',
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      youtubeId: item.id.videoId,
      duration: detail ? parseDuration(detail.contentDetails.duration) : null,
      views: detail ? formatViews(detail.statistics.viewCount) : null,
      thumbnail: item.snippet.thumbnails.high?.url || null,
    };
  });
}
