'use client';

import PageShell from '@/app/components/PageShell';
import HeadToHead from '@/app/components/HeadToHead';
import Spinner from '@/app/components/ui/Spinner';
import { useActiveEvent } from '@/app/hooks/useActiveEvent';

export default function H2HClient() {
  const { profiles, loading, error } = useActiveEvent();
  return (
    <PageShell title="Head to Head">
      {loading ? (
        <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="py-32 text-center text-sm text-[var(--secondary)]">Failed to load: {error}</div>
      ) : (
        <HeadToHead profiles={profiles} />
      )}
    </PageShell>
  );
}
