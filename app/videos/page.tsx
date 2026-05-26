import VideosClient from './VideosClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Videos | SINGL by Spredd Markets',
  description: 'YouTube and TikTok coverage of the 2026 FIFA World Cup.',
};

export default function VideosPage() {
  return <VideosClient />;
}
