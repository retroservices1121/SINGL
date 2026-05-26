import NewsClient from './NewsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'News | SINGL by Spredd Markets',
  description: 'Latest World Cup 2026 news and X/Twitter coverage.',
};

export default function NewsPage() {
  return <NewsClient />;
}
