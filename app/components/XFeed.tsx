'use client';

import type { XPostData } from '@/app/types';

interface XFeedProps {
  posts: XPostData[];
}

export default function XFeed({ posts }: XFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-dim)] text-sm">
        No posts yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Posts on X
        </h3>
        <span className="text-xs font-bold text-[var(--orange)] bg-[var(--orange-lt)] px-2 py-0.5 rounded-full">
          {posts.length}
        </span>
      </div>
      {posts.map((post, i) => (
        <div
          key={post.id || i}
          className="bg-[var(--paper)] border border-[var(--border)] rounded-xl p-3 hover:-translate-y-[1px] transition-all duration-200"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-[var(--sand)] flex items-center justify-center text-xs font-bold text-[var(--text-sec)]">
              {post.name.charAt(0)}
            </div>
            <div>
              <span className="text-sm font-semibold text-[var(--text)]">{post.name}</span>
              <span className="text-xs text-[var(--text-dim)] ml-1">@{post.handle}</span>
            </div>
          </div>
          <p className="text-sm text-[var(--text-sec)] leading-relaxed mb-2">{post.text}</p>
          <div className="flex items-center gap-4 text-xs text-[var(--text-dim)]">
            <span>{post.time}</span>
            {post.likes && <span>{post.likes} likes</span>}
            {post.retweets && <span>{post.retweets} retweets</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
