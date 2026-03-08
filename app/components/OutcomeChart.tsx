'use client';

import type { MarketData } from '@/app/types';
import { formatPercent } from '@/app/lib/utils';

interface OutcomeChartProps {
  markets: MarketData[];
}

const BAR_COLORS = [
  '#F2841A', '#22C55E', '#3B82F6', '#A855F7', '#EF4444',
  '#F59E0B', '#06B6D4', '#EC4899', '#10B981', '#6366F1',
];

export default function OutcomeChart({ markets }: OutcomeChartProps) {
  const sorted = [...markets].sort((a, b) => b.yesPrice - a.yesPrice);
  const top = sorted.slice(0, 8);
  const maxPrice = Math.max(...top.map(m => m.yesPrice), 0.01);

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-4">
        Probability Distribution
      </h3>
      <div className="space-y-3">
        {top.map((market, i) => {
          const pct = Math.round(market.yesPrice * 100);
          const barWidth = (market.yesPrice / maxPrice) * 100;
          return (
            <div key={market.id || market.ticker || i} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[var(--text)] w-24 sm:w-32 truncate shrink-0">
                {market.title}
              </span>
              <div className="flex-1 h-7 bg-[var(--sand)] rounded-lg overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-700 ease-out flex items-center"
                  style={{
                    width: `${Math.max(barWidth, 3)}%`,
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                >
                  {pct >= 5 && (
                    <span className="text-xs font-bold text-white px-2">{formatPercent(market.yesPrice)}</span>
                  )}
                </div>
                {pct < 5 && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-dim)]">
                    {formatPercent(market.yesPrice)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {sorted.length > 8 && (
        <p className="text-xs text-[var(--text-dim)] mt-3 text-center">
          + {sorted.length - 8} more outcomes below
        </p>
      )}
    </div>
  );
}
