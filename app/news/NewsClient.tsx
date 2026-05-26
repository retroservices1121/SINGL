'use client';

import PageShell from '@/app/components/PageShell';
import NewsFeed from '@/app/components/NewsFeed';
import XFeed from '@/app/components/XFeed';
import Spinner from '@/app/components/ui/Spinner';
import { useActiveEvent } from '@/app/hooks/useActiveEvent';

export default function NewsClient() {
  const { event, loading, error } = useActiveEvent();

  return (
    <PageShell title="News & Social">
      {loading ? (
        <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="py-32 text-center text-sm text-[var(--secondary)]">Failed to load: {error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <h2 className="font-heading text-lg font-black uppercase tracking-tight text-[var(--on-surface)] mb-3">
              Latest News
            </h2>
            <NewsFeed news={event?.newsItems ?? []} />
          </section>
          <section>
            <h2 className="font-heading text-lg font-black uppercase tracking-tight text-[var(--on-surface)] mb-3">
              X / Twitter
            </h2>
            <XFeed posts={event?.xPosts ?? []} />
          </section>
        </div>
      )}
    </PageShell>
  );
}
