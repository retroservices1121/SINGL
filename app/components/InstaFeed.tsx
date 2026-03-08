'use client';

import type { InstaPostData } from '@/app/types';

interface InstaFeedProps {
  posts: InstaPostData[];
}

export default function InstaFeed({ posts }: InstaFeedProps) {
  if (posts.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Instagram
        </h3>
        <span className="text-xs font-bold text-[var(--orange)] bg-[var(--orange-lt)] px-2 py-0.5 rounded-full">
          {posts.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {posts.map((post, i) => (
          <a
            key={post.id || i}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden hover:-translate-y-[2px] transition-all duration-200"
          >
            {post.imageUrl ? (
              <div className="relative aspect-square bg-[var(--sand)]">
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center">
                    {post.likes && post.likes !== '0' && (
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {post.likes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="17.5" cy="6.5" r="1.5" />
                </svg>
              </div>
            )}

            <div className="p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <img
                  src={`https://unavatar.io/instagram/${post.username}`}
                  alt=""
                  className="w-4 h-4 rounded-full bg-[var(--sand)]"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span className="text-xs font-semibold text-[var(--text)]">
                  @{post.username}
                </span>
              </div>
              {post.caption && (
                <p className="text-[11px] text-[var(--text-sec)] leading-tight line-clamp-2">
                  {post.caption}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
