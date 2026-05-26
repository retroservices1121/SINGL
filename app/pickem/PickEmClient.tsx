'use client';

import PageShell from '@/app/components/PageShell';
import PickEm from '@/app/components/PickEm';
import Spinner from '@/app/components/ui/Spinner';
import { useActiveEvent } from '@/app/hooks/useActiveEvent';

export default function PickEmClient() {
  const { profiles, loading, error } = useActiveEvent();
  return (
    <PageShell title="Pick'em" subtitle="Make your World Cup picks">
      {loading ? (
        <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="py-32 text-center text-sm text-[var(--secondary)]">Failed to load: {error}</div>
      ) : (
        <PickEm profiles={profiles} />
      )}
    </PageShell>
  );
}
