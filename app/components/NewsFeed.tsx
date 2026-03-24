'use client';

import type { NewsItemData } from '@/app/types';

interface NewsFeedProps {
  news: NewsItemData[];
}

function sentimentBadge(sentiment: string) {
  switch (sentiment?.toLowerCase()) {
    case 'positive':
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'Bullish' };
    case 'negative':
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Bearish' };
    default:
      return { bg: 'bg-slate-200', text: 'text-slate-600', label: 'Neutral' };
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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black font-heading uppercase tracking-widest text-[var(--on-surface)] px-1">
        Market Pulse
      </h3>
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
            <h4 className="text-xs font-semibold text-[var(--on-surface)] leading-relaxed">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary-container)] transition-colors">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </h4>
            <p className="text-xs text-[var(--secondary)] leading-relaxed">{item.summary}</p>
            <span className="text-[10px] font-bold text-[var(--secondary)]">{item.source}</span>
          </div>
        );
      })}
    </div>
  );
}
