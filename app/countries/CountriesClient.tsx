'use client';

import { useMemo, useState } from 'react';
import PageShell from '@/app/components/PageShell';
import CountryCard from '@/app/components/CountryCard';
import CountryStatsPanel from '@/app/components/CountryStatsPanel';
import Spinner from '@/app/components/ui/Spinner';
import { LivePricesProvider } from '@/app/components/LivePricesProvider';
import { useActiveEvent } from '@/app/hooks/useActiveEvent';
import type { CountryProfile } from '@/app/lib/fifa';

export default function CountriesClient() {
  const { profiles, loading, error } = useActiveEvent();
  const [selected, setSelected] = useState<CountryProfile | null>(null);

  // Feed each country's championship market into the live-prices
  // provider so card percentages tick via AGG midpoints instead of
  // staying frozen at the 15s active-event poll.
  const liveMarkets = useMemo(
    () => profiles.map(p => p.championshipMarket).filter(Boolean) as NonNullable<CountryProfile['championshipMarket']>[],
    [profiles],
  );

  return (
    <LivePricesProvider markets={liveMarkets}>
    <PageShell title="Countries" subtitle={loading ? 'Loading…' : `${profiles.length} nations`}>
      {loading ? (
        <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>
      ) : error || profiles.length === 0 ? (
        <div className="py-32 text-center text-sm text-[var(--secondary)]">
          {error ? `Failed to load: ${error}` : 'No country data available yet.'}
        </div>
      ) : (
        <div className="grid-auto-cards">
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
    </LivePricesProvider>
  );
}
