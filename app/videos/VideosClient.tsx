'use client';

import PageShell from '@/app/components/PageShell';
import VideoFeed from '@/app/components/VideoFeed';
import TikTokFeed from '@/app/components/TikTokFeed';
import Spinner from '@/app/components/ui/Spinner';
import { useActiveEvent } from '@/app/hooks/useActiveEvent';

export default function VideosClient() {
  const { event, loading, error } = useActiveEvent();

  return (
    <PageShell title="Videos">
      {loading ? (
        <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="py-32 text-center text-sm text-[var(--secondary)]">Failed to load: {error}</div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="font-heading text-lg font-black uppercase tracking-tight text-[var(--on-surface)] mb-3">
              YouTube
            </h2>
            <VideoFeed videos={event?.videos ?? []} />
          </section>
          <section>
            <h2 className="font-heading text-lg font-black uppercase tracking-tight text-[var(--on-surface)] mb-3">
              TikTok
            </h2>
            <TikTokFeed tiktoks={event?.tiktoks ?? []} />
          </section>
        </div>
      )}
    </PageShell>
  );
}
