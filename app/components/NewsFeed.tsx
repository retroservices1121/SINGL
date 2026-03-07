'use client';

import type { NewsItemData } from '@/app/types';
import { sentimentColor } from '@/app/lib/utils';

interface NewsFeedProps {
  news: NewsItemData[];
}

export default function NewsFeed({ news }: NewsFeedProps) {
  if (news.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-dim)] text-sm">
        No news articles yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)]">
          News & Analysis
        </h3>
        <span className="text-xs font-bold text-[var(--orange)] bg-[var(--orange-lt)] px-2 py-0.5 rounded-full">
          {news.length}
        </span>
      </div>
      {news.map((item, i) => (
        <div
          key={item.id || i}
          className="bg-[var(--paper)] border border-[var(--border)] rounded-xl p-3 hover:-translate-y-[1px] transition-all duration-200"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold text-[var(--text)] leading-tight flex-1">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--orange)]">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </h4>
            <span className={`text-xs font-semibold uppercase ${sentimentColor(item.sentiment)}`}>
              {item.sentiment}
            </span>
          </div>
          <p className="text-xs text-[var(--text-sec)] leading-relaxed mb-1">{item.summary}</p>
          <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
            <span className="font-semibold">{item.source}</span>
            <span>&middot;</span>
            <span>{item.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
