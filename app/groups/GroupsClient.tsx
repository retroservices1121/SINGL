'use client';

import PageShell from '@/app/components/PageShell';
import GroupStageTable from '@/app/components/GroupStageTable';
import Spinner from '@/app/components/ui/Spinner';
import { useActiveEvent } from '@/app/hooks/useActiveEvent';
import { getGroups, enrichGroupsWithMarkets } from '@/app/lib/fifa';
import { useMemo } from 'react';

export default function GroupsClient() {
  const { profiles, loading, error } = useActiveEvent();
  const groups = useMemo(() => enrichGroupsWithMarkets(getGroups(), profiles), [profiles]);

  return (
    <PageShell title="Groups" subtitle="12 groups of 4">
      {loading ? (
        <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="py-32 text-center text-sm text-[var(--secondary)]">Failed to load: {error}</div>
      ) : (
        <GroupStageTable groups={groups} profiles={profiles} />
      )}
    </PageShell>
  );
}
