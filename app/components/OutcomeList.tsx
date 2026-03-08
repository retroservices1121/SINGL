'use client';

import { useState } from 'react';
import type { MarketData } from '@/app/types';
import { useTradeStore } from '@/app/store/tradeStore';

interface OutcomeListProps {
  markets: MarketData[];
}

export default function OutcomeList({ markets }: OutcomeListProps) {
  const openTrade = useTradeStore(s => s.openTrade);
  const [showAll, setShowAll] = useState(false);

  const sorted = [...markets].sort((a, b) => b.yesPrice - a.yesPrice);
  const visible = showAll ? sorted : sorted.slice(0, 5);
  const hasMore = sorted.length > 5;

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--cream)]">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">Outcome</span>
        <div className="flex items-center gap-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">Chance</span>
        </div>
      </div>

      {/* Rows */}
      {visible.map((market, i) => {
        const yesCents = Math.round(market.yesPrice * 100);
        const noCents = Math.round(market.noPrice * 100) || (100 - yesCents);

        return (
          <div
            key={market.id || market.ticker || i}
            className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--cream)] transition-colors"
          >
            {/* Outcome name */}
            <span className="text-sm font-medium text-[var(--text)] flex-1 pr-4">{market.title}</span>

            {/* Chance + buttons */}
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-sm font-bold font-mono text-[var(--text)] w-12 text-right">
                {yesCents}%
              </span>

              <button
                onClick={() => openTrade(market, 'yes')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 cursor-pointer transition-colors ${
                  yesCents >= 50
                    ? 'bg-[var(--yes-bg)] border-[var(--yes)] text-[var(--yes)] hover:bg-[var(--yes)] hover:text-white'
                    : 'border-[var(--border)] text-[var(--text-sec)] hover:border-[var(--yes)] hover:text-[var(--yes)]'
                }`}
              >
                Yes {yesCents}c
              </button>

              <button
                onClick={() => openTrade(market, 'no')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 cursor-pointer transition-colors ${
                  noCents >= 50
                    ? 'bg-[var(--no-bg)] border-[var(--no)] text-[var(--no)] hover:bg-[var(--no)] hover:text-white'
                    : 'border-[var(--border)] text-[var(--text-sec)] hover:border-[var(--no)] hover:text-[var(--no)]'
                }`}
              >
                No {noCents}c
              </button>
            </div>
          </div>
        );
      })}

      {/* Show more */}
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 text-sm font-semibold text-[var(--orange)] hover:bg-[var(--cream)] transition-colors cursor-pointer"
        >
          {sorted.length - 5} more
        </button>
      )}
    </div>
  );
}
