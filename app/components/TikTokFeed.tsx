'use client';

import type { TikTokData } from '@/app/types';

interface TikTokFeedProps {
  tiktoks: TikTokData[];
}

export default function TikTokFeed({ tiktoks }: TikTokFeedProps) {
  if (tiktoks.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)]">
          TikTok
        </h3>
        <span className="text-xs font-bold text-[var(--orange)] bg-[var(--orange-lt)] px-2 py-0.5 rounded-full">
          {tiktoks.length}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiktoks.map((tt, i) => (
          <a
            key={tt.id || i}
            href={tt.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden hover:-translate-y-[2px] transition-all duration-200"
          >
            {tt.thumbnail ? (
              <div className="relative aspect-[9/16] max-h-48 bg-black">
                <img
                  src={tt.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {/* Stats overlay */}
                {(tt.likes || tt.views) && (
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-2">
                    {tt.views && (
                      <span className="text-[10px] font-semibold text-white bg-black/60 px-1.5 py-0.5 rounded">
                        {tt.views} views
                      </span>
                    )}
                    {tt.likes && tt.likes !== '0' && (
                      <span className="text-[10px] font-semibold text-white bg-black/60 px-1.5 py-0.5 rounded">
                        {tt.likes} likes
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-[9/16] max-h-48 bg-gradient-to-br from-[#00f2ea]/20 to-[#ff0050]/20 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                  <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}

            <div className="p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-semibold text-[var(--text)]">
                  @{tt.username}
                </span>
              </div>
              {tt.caption && (
                <p className="text-[11px] text-[var(--text-sec)] leading-tight line-clamp-2">
                  {tt.caption}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
