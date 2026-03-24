'use client';

import type { MarketData } from '@/app/types';
import { formatVolume } from '@/app/lib/utils';

interface StatsBarProps {
  markets: MarketData[];
  volume?: number | null;
  liquidity?: number | null;
  openInterest?: number | null;
  dark?: boolean;
}

export default function StatsBar({ markets, volume, liquidity, openInterest, dark }: StatsBarProps) {
  const totalVolume = volume || markets.reduce((sum, m) => sum + (m.volume || 0), 0);

  const stats = [
    { label: 'Outcomes', value: String(markets.length) },
    ...(totalVolume > 0 ? [{ label: 'Volume', value: formatVolume(totalVolume) }] : []),
    ...(liquidity && liquidity > 0 ? [{ label: 'Liquidity', value: formatVolume(liquidity) }] : []),
    ...(openInterest && openInterest > 0 ? [{ label: 'Open Interest', value: formatVolume(openInterest) }] : []),
  ];

  const pillClass = dark
    ? 'bg-white/10 backdrop-blur-sm text-white/70'
    : 'bg-[var(--surface-container-low)] text-[var(--secondary)]';

  const valueClass = dark
    ? 'text-white font-bold'
    : 'font-bold text-[var(--on-surface)]';

  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {stats.map(s => (
        <div key={s.label} className={`rounded-full px-4 py-1.5 flex items-center gap-2 ${pillClass}`}>
          <span>{s.label}</span>
          <span className={valueClass}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}
