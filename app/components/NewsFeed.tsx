'use client';

import type { NewsItemData } from '@/app/types';

interface NewsFeedProps {
  news: NewsItemData[];
}

function sentimentBadge(sentiment: string) {
  switch (sentiment?.toLowerCase()) {
    case 'positive':
      return { bg: 'bg-green-500/10', text: 'text-green-300', label: 'Bullish' };
    case 'negative':
      return { bg: 'bg-red-500/10', text: 'text-red-300', label: 'Bearish' };
    default:
      return { bg: 'bg-[var(--surface-container)]', text: 'text-[var(--secondary)]', label: 'Neutral' };
  }
}

export default function NewsFeed({ news }: NewsFeedProps) {
  if (news.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--secondary)] text-sm">
        No news articles yet
      </div>
    );
  }

  // Auto-fill grid (matches the rest of the SINGL pages). 320px min
  // lets us see ~2 columns at the page's normal width, more on ultra-
  // wide. Inline style sidesteps the dual-Tailwind responsive scan
  // issue we hit elsewhere. Inner heading dropped — NewsClient
  // already prints the section title above us.
  return (
    <div
      style={{
        display: 'grid',
        gap: '0.75rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
      }}
    >
      {news.map((item, i) => {
        const badge = sentimentBadge(item.sentiment);
        return (
          <div
            key={item.id || i}
            className="p-4 bg-[var(--surface-container-low)] rounded-lg space-y-2 border-l-2 border-[var(--primary-container)]/30 hover:border-[var(--primary-container)] transition-colors"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-[var(--secondary)] uppercase">{item.time}</span>
              <span className={`px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} text-[9px] font-black uppercase`}>
                {badge.label}
              </span>
            </div>
            <h4 className="text-xs font-semibold text-[var(--on-surface)] leading-relaxed line-clamp-3">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary-container)] transition-colors">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </h4>
            <p className="text-xs text-[var(--secondary)] leading-relaxed line-clamp-3">{item.summary}</p>
            <span className="text-[10px] font-bold text-[var(--secondary)]">{item.source}</span>
          </div>
        );
      })}
    </div>
  );
}
