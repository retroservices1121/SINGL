'use client';

import type { MarketData } from '@/app/types';
import { useTradeStore } from '@/app/store/tradeStore';
import { formatVolume } from '@/app/lib/utils';

interface MarketCardProps {
  market: MarketData;
  index: number;
}

export default function MarketCard({ market, index }: MarketCardProps) {
  const openTrade = useTradeStore(s => s.openTrade);
  const openDetail = useTradeStore(s => s.openDetail);
  const yesCents = Math.round(market.yesPrice * 100);
  const noCents = Math.round(market.noPrice * 100) || (100 - yesCents);

  return (
    <div
      className="bg-[var(--surface-container-lowest)] rounded-xl p-5 shadow-ambient hover:scale-[1.02] transition-all duration-300 flex flex-col cursor-pointer"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => openDetail(market)}
    >
      {/* Title */}
      <h4 className="font-heading font-bold text-sm text-[var(--on-surface)] leading-snug mb-4 uppercase tracking-tight flex-1">
        {market.title}
      </h4>

      {/* Odds bar */}
      <div className="flex items-center gap-1 mb-3 h-2 rounded-full overflow-hidden bg-[var(--surface-container-high)]">
        <div
          className="h-full bg-[var(--yes)] rounded-full transition-all"
          style={{ width: `${yesCents}%` }}
        />
      </div>

      {/* Prices */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--yes)]">Yes {yesCents}c</span>
          <span className="text-[var(--surface-container-highest)]">|</span>
          <span className="text-xs font-bold text-[var(--no)]">No {noCents}c</span>
        </div>
        {market.volume != null && market.volume > 0 && (
          <span className="text-[10px] text-[var(--secondary)]">
            Vol: {formatVolume(market.volume)}
          </span>
        )}
      </div>

      {/* Trade buttons */}
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); openTrade(market, 'yes'); }}
          className="flex-1 py-2 text-xs font-bold rounded-md bg-[var(--yes-bg)] text-[var(--yes)] hover:bg-[var(--yes)] hover:text-white transition-colors cursor-pointer"
        >
          Buy Yes
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); openTrade(market, 'no'); }}
          className="flex-1 py-2 text-xs font-bold rounded-md bg-[var(--no-bg)] text-[var(--no)] hover:bg-[var(--no)] hover:text-white transition-colors cursor-pointer"
        >
          Buy No
        </button>
      </div>
    </div>
  );
}
