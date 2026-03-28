'use client';

import type { MarketData } from '@/app/types';
import { useTradeStore } from '@/app/store/tradeStore';
import { formatVolume } from '@/app/lib/utils';

const SITE_URL = 'https://singl.spredd.markets';

interface MarketCardProps {
  market: MarketData;
  index: number;
}

export default function MarketCard({ market, index }: MarketCardProps) {
  const openTrade = useTradeStore(s => s.openTrade);
  const openDetail = useTradeStore(s => s.openDetail);
  const yesCents = Math.round(market.yesPrice * 100);
  const noCents = Math.round(market.noPrice * 100) || (100 - yesCents);

  const shareOnX = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${SITE_URL}/market/${market.conditionId}`;
    const text = `${market.title}\n\nYes ${yesCents}\u00a2 / No ${noCents}\u00a2\n\nTrade on SINGL by @singlmarket`;
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  return (
    <div
      className="bg-[var(--surface-container-lowest)] rounded-xl p-5 shadow-ambient hover:scale-[1.02] transition-all duration-300 flex flex-col cursor-pointer"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => openDetail(market)}
    >
      {/* Title + share */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <h4 className="font-heading font-bold text-sm text-[var(--on-surface)] leading-snug uppercase tracking-tight flex-1">
          {market.title}
        </h4>
        <button
          onClick={shareOnX}
          className="shrink-0 p-1.5 rounded-md text-[var(--secondary)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] transition-colors cursor-pointer"
          title="Share on X"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
        </button>
      </div>

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
