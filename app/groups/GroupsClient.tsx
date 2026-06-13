'use client';

import PageShell from '@/app/components/PageShell';
import GroupStageTable from '@/app/components/GroupStageTable';
import Spinner from '@/app/components/ui/Spinner';
import { useActiveEvent } from '@/app/hooks/useActiveEvent';
import { getGroups, enrichGroupsWithMarkets, enrichGroupsWithResults, type MatchResult } from '@/app/lib/fifa';
import { useEffect, useMemo, useState } from 'react';

export default function GroupsClient() {
  const { profiles, loading, error } = useActiveEvent();
  const [results, setResults] = useState<MatchResult[]>([]);

  // Live standings from finished matches (ESPN). Refresh while open so the
  // table fills in as games settle.
  useEffect(() => {
    let live = true;
    const load = () => fetch('/api/fifa/results')
      .then(r => r.json())
      .then(d => { if (live && Array.isArray(d.results)) setResults(d.results); })
      .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { live = false; clearInterval(t); };
  }, []);

  const groups = useMemo(
    () => enrichGroupsWithResults(enrichGroupsWithMarkets(getGroups(), profiles), results),
    [profiles, results],
  );

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
