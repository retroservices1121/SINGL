'use client';

import type { VideoData } from '@/app/types';

interface VideoFeedProps {
  videos: VideoData[];
}

export default function VideoFeed({ videos }: VideoFeedProps) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--secondary)] text-sm">
        No videos yet
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
          Video Coverage
        </h3>
        <span className="px-2 py-0.5 rounded-full bg-[var(--surface-container-high)] text-[10px] font-bold text-[var(--secondary)]">
          {videos.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {videos.map((video, i) => (
          <a
            key={video.id || i}
            href={video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[var(--surface-container-lowest)] rounded-xl overflow-hidden shadow-ambient hover:scale-[1.02] transition-transform"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {video.thumbnail && (
              <div className="relative aspect-video bg-[var(--surface-container-high)]">
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                {video.duration && (
                  <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                    {video.duration}
                  </span>
                )}
              </div>
            )}
            <div className="p-3">
              <h4 className="text-xs font-semibold text-[var(--on-surface)] leading-tight line-clamp-2 group-hover:text-[var(--primary-container)] transition-colors">
                {video.title}
              </h4>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--secondary)]">
                <span>{video.channel}</span>
                {video.views && <span>{video.views} views</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
