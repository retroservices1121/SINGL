'use client';

import type { XPostData } from '@/app/types';

interface XFeedProps {
  posts: XPostData[];
}

function formatTime(time: string): string {
  if (!time) return '';
  try {
    const date = new Date(time);
    if (isNaN(date.getTime())) return time;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return time;
  }
}

export default function XFeed({ posts }: XFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--secondary)] text-sm">
        No posts yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black font-heading uppercase tracking-widest text-[var(--on-surface)] px-1">
        Social Feed
      </h3>
      {posts.map((post, i) => {
        const hasLikes = post.likes && post.likes !== '0';
        const hasRetweets = post.retweets && post.retweets !== '0';
        const displayName = post.name && post.name !== post.handle && post.name !== 'unknown'
          ? post.name
          : null;
        const displayHandle = post.handle && post.handle !== 'unknown' ? post.handle : null;

        return (
          <div
            key={post.id || i}
            className="p-4 bg-[var(--surface-container-low)] rounded-lg hover:bg-[var(--surface-container)] transition-colors"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-start gap-3">
              {displayHandle ? (
                <img
                  src={`https://unavatar.io/twitter/${displayHandle}`}
                  alt=""
                  className="w-8 h-8 rounded-full bg-[var(--surface-container-high)] flex-shrink-0 object-cover"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = 'none';
                    el.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-8 h-8 rounded-full bg-[var(--surface-container-high)] flex-shrink-0 flex items-center justify-center text-xs font-bold text-[var(--secondary)] ${displayHandle ? 'hidden' : ''}`}>
                {(displayName || displayHandle || 'X').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {displayName && (
                    <span className="text-sm font-bold text-[var(--on-surface)]">{displayName}</span>
                  )}
                  {displayHandle && (
                    <span className="text-[10px] text-[var(--secondary)]">@{displayHandle}</span>
                  )}
                  {!displayName && !displayHandle && (
                    <span className="text-sm font-bold text-[var(--on-surface)]">X User</span>
                  )}
                  <span className="text-[10px] text-[var(--secondary)]">{formatTime(post.time)}</span>
                </div>
                <p className="text-xs text-[var(--on-surface)] leading-relaxed mt-1.5">{post.text}</p>
                {(hasLikes || hasRetweets) && (
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--secondary)]">
                    {hasLikes && (
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {post.likes}
                      </span>
                    )}
                    {hasRetweets && (
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                        {post.retweets}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
