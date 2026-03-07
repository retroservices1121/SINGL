'use client';

import type { MarketData } from '@/app/types';
import { useTradeStore } from '@/app/store/tradeStore';
import { formatPercent, formatVolume } from '@/app/lib/utils';
import Badge from './ui/Badge';
import Button from './ui/Button';

interface MarketCardProps {
  market: MarketData;
  index: number;
}

export default function MarketCard({ market, index }: MarketCardProps) {
  const openTrade = useTradeStore(s => s.openTrade);

  return (
    <div
      className="bg-[var(--paper)] border border-[var(--border)] rounded-xl p-4 hover:-translate-y-[3px] transition-all duration-300"
      style={{
        animationDelay: `${index * 60}ms`,
        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-heading text-sm font-semibold text-[var(--text)] leading-tight flex-1 pr-2">
          {market.title}
        </h4>
        {market.category && <Badge category={market.category} />}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 text-center bg-[var(--yes-bg)] rounded-lg py-2">
          <div className="text-xs text-[var(--text-dim)] mb-0.5">YES</div>
          <div className="text-lg font-bold text-[var(--yes)]">{formatPercent(market.yesPrice)}</div>
        </div>
        <div className="flex-1 text-center bg-[var(--no-bg)] rounded-lg py-2">
          <div className="text-xs text-[var(--text-dim)] mb-0.5">NO</div>
          <div className="text-lg font-bold text-[var(--no)]">{formatPercent(market.noPrice)}</div>
        </div>
      </div>

      {market.volume != null && (
        <div className="text-xs text-[var(--text-dim)] mb-3">
          Vol: {formatVolume(market.volume)}
          {market.change24h != null && (
            <span className={`ml-2 ${market.change24h >= 0 ? 'text-[var(--yes)]' : 'text-[var(--no)]'}`}>
              {market.change24h >= 0 ? '+' : ''}{(market.change24h * 100).toFixed(1)}%
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="yes" size="sm" className="flex-1" onClick={() => openTrade(market, 'yes')}>
          Buy YES
        </Button>
        <Button variant="no" size="sm" className="flex-1" onClick={() => openTrade(market, 'no')}>
          Buy NO
        </Button>
      </div>
    </div>
  );
}
