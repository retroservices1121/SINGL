'use client';

import type { MarketData } from '@/app/types';
import { formatVolume } from '@/app/lib/utils';

interface StatsBarProps {
  markets: MarketData[];
}

export default function StatsBar({ markets }: StatsBarProps) {
  const totalVolume = markets.reduce((sum, m) => sum + (m.volume || 0), 0);
  const avgYes = markets.length > 0
    ? markets.reduce((sum, m) => sum + m.yesPrice, 0) / markets.length
    : 0;

  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <div className="bg-[var(--paper)] border border-[var(--border)] rounded-full px-4 py-1.5 flex items-center gap-2">
        <span className="text-[var(--text-dim)]">Markets</span>
        <span className="font-bold text-[var(--text)]">{markets.length}</span>
      </div>
      {totalVolume > 0 && (
        <div className="bg-[var(--paper)] border border-[var(--border)] rounded-full px-4 py-1.5 flex items-center gap-2">
          <span className="text-[var(--text-dim)]">Total Vol</span>
          <span className="font-bold text-[var(--text)]">{formatVolume(totalVolume)}</span>
        </div>
      )}
      {markets.length > 0 && (
        <div className="bg-[var(--paper)] border border-[var(--border)] rounded-full px-4 py-1.5 flex items-center gap-2">
          <span className="text-[var(--text-dim)]">Avg YES</span>
          <span className="font-bold text-[var(--yes)]">{Math.round(avgYes * 100)}%</span>
        </div>
      )}
    </div>
  );
}
