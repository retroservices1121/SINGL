'use client';

import type { VideoData } from '@/app/types';

interface VideoFeedProps {
  videos: VideoData[];
}

export default function VideoFeed({ videos }: VideoFeedProps) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-dim)] text-sm">
        No videos yet
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Video Coverage
        </h3>
        <span className="text-xs font-bold text-[var(--orange)] bg-[var(--orange-lt)] px-2 py-0.5 rounded-full">
          {videos.length}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {videos.map((video, i) => (
          <a
            key={video.id || i}
            href={video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden hover:-translate-y-[3px] transition-all duration-300"
            style={{
              animationDelay: `${i * 60}ms`,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {video.thumbnail && (
              <div className="relative aspect-video bg-[var(--sand)]">
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                {video.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                    {video.duration}
                  </span>
                )}
              </div>
            )}
            <div className="p-3">
              <h4 className="text-xs font-semibold text-[var(--text)] leading-tight line-clamp-2 group-hover:text-[var(--orange)] transition-colors">
                {video.title}
              </h4>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--text-dim)]">
                <span>{video.channel}</span>
                {video.views && <span>&middot; {video.views} views</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
