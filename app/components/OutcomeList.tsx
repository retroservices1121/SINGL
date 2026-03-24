'use client';

import { useState } from 'react';
import type { MarketData } from '@/app/types';
import { useTradeStore } from '@/app/store/tradeStore';
import { formatVolume } from '@/app/lib/utils';

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
    <div className="bg-[var(--surface-container-lowest)] rounded-xl overflow-hidden shadow-ambient">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface-container-low)]">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--secondary)]">Outcome</span>
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--secondary)]">Chance</span>
      </div>

      {/* Rows */}
      {visible.map((market, i) => {
        const yesCents = Math.round(market.yesPrice * 100);
        const noCents = Math.round(market.noPrice * 100) || (100 - yesCents);

        return (
          <div
            key={market.id || market.ticker || i}
            className="flex items-center justify-between px-5 py-4 hover:bg-[var(--primary-fixed)]/30 transition-colors group"
          >
            {/* Outcome name + volume */}
            <div className="flex-1 pr-4">
              <span className="text-sm font-medium text-[var(--on-surface)] font-heading uppercase group-hover:text-[var(--primary)] transition-colors">
                {market.title}
              </span>
              {market.volume != null && market.volume > 0 && (
                <span className="text-[10px] text-[var(--secondary)] ml-2">
                  Vol: {formatVolume(market.volume)}
                </span>
              )}
            </div>

            {/* Chance + buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-bold font-mono text-[var(--on-surface)] w-12 text-right">
                {yesCents}%
              </span>

              <button
                onClick={() => openTrade(market, 'yes')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-all hover:scale-[1.02] ${
                  yesCents >= 50
                    ? 'bg-[var(--yes-bg)] text-[var(--yes)] hover:bg-[var(--yes)] hover:text-white'
                    : 'bg-[var(--surface-container-high)] text-[var(--secondary)] hover:text-[var(--yes)]'
                }`}
              >
                Yes {yesCents}c
              </button>

              <button
                onClick={() => openTrade(market, 'no')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md cursor-pointer transition-all hover:scale-[1.02] ${
                  noCents >= 50
                    ? 'bg-[var(--no-bg)] text-[var(--no)] hover:bg-[var(--no)] hover:text-white'
                    : 'bg-[var(--surface-container-high)] text-[var(--secondary)] hover:text-[var(--no)]'
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
          className="w-full py-3 text-sm font-bold text-[var(--primary-container)] hover:bg-[var(--surface-container-low)] transition-colors cursor-pointer uppercase tracking-widest"
        >
          {sorted.length - 5} more
        </button>
      )}
    </div>
  );
}
