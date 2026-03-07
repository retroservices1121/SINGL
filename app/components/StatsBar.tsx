'use client';

import type { MarketData } from '@/app/types';
import { formatVolume } from '@/app/lib/utils';

interface StatsBarProps {
  markets: MarketData[];
  volume?: number | null;
  liquidity?: number | null;
  openInterest?: number | null;
}

export default function StatsBar({ markets, volume, liquidity, openInterest }: StatsBarProps) {
  const totalVolume = volume || markets.reduce((sum, m) => sum + (m.volume || 0), 0);

  const stats = [
    { label: 'Outcomes', value: String(markets.length) },
    ...(totalVolume > 0 ? [{ label: 'Volume', value: formatVolume(totalVolume) }] : []),
    ...(liquidity && liquidity > 0 ? [{ label: 'Liquidity', value: formatVolume(liquidity) }] : []),
    ...(openInterest && openInterest > 0 ? [{ label: 'Open Interest', value: formatVolume(openInterest) }] : []),
  ];

  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {stats.map(s => (
        <div key={s.label} className="bg-[var(--paper)] border border-[var(--border)] rounded-full px-4 py-1.5 flex items-center gap-2">
          <span className="text-[var(--text-dim)]">{s.label}</span>
          <span className="font-bold text-[var(--text)]">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
