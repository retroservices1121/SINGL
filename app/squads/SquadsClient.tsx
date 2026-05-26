'use client';

import PageShell from '@/app/components/PageShell';
import SquadRoster from '@/app/components/SquadRoster';
import Spinner from '@/app/components/ui/Spinner';
import { useActiveEvent } from '@/app/hooks/useActiveEvent';

export default function SquadsClient() {
  const { profiles, loading, error } = useActiveEvent();
  return (
    <PageShell title="Squads">
      {loading ? (
        <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="py-32 text-center text-sm text-[var(--secondary)]">Failed to load: {error}</div>
      ) : (
        <SquadRoster profiles={profiles} />
      )}
    </PageShell>
  );
}
