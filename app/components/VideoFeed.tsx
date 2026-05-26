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

  // Auto-fill grid — same pattern the country/news pages use. 280px
  // min keeps the thumbnails legible while letting 3-5 tiles fit on
  // wide screens. Inner heading dropped — NewsClient (the page that
  // now hosts videos too) supplies the section title above.
  return (
    <div
      style={{
        display: 'grid',
        gap: '1rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
      }}
    >
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
  );
}
