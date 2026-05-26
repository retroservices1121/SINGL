'use client';

import PageShell from '@/app/components/PageShell';
import MatchSchedule from '@/app/components/MatchSchedule';
import Spinner from '@/app/components/ui/Spinner';
import { useActiveEvent } from '@/app/hooks/useActiveEvent';

export default function ScheduleClient() {
  const { profiles, loading, error } = useActiveEvent();
  return (
    <PageShell title="Schedule">
      {loading ? (
        <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="py-32 text-center text-sm text-[var(--secondary)]">Failed to load: {error}</div>
      ) : (
        <MatchSchedule profiles={profiles} />
      )}
    </PageShell>
  );
}
