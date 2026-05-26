'use client';

import { useState } from 'react';
import PageShell from '@/app/components/PageShell';
import CountryCard from '@/app/components/CountryCard';
import CountryStatsPanel from '@/app/components/CountryStatsPanel';
import Spinner from '@/app/components/ui/Spinner';
import { useActiveEvent } from '@/app/hooks/useActiveEvent';
import type { CountryProfile } from '@/app/lib/fifa';

export default function CountriesClient() {
  const { profiles, loading, error } = useActiveEvent();
  const [selected, setSelected] = useState<CountryProfile | null>(null);

  return (
    <PageShell title="Countries" subtitle={loading ? 'Loading…' : `${profiles.length} nations`}>
      {loading ? (
        <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>
      ) : error || profiles.length === 0 ? (
        <div className="py-32 text-center text-sm text-[var(--secondary)]">
          {error ? `Failed to load: ${error}` : 'No country data available yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((p, i) => (
            <CountryCard key={p.name} profile={p} index={i} onSelect={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <CountryStatsPanel
          countryName={selected.name}
          championshipOdds={selected.championshipOdds}
          championshipMarket={selected.championshipMarket}
          onClose={() => setSelected(null)}
        />
      )}
    </PageShell>
  );
}
