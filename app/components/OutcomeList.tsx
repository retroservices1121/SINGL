'use client';

import type { MarketData } from '@/app/types';
import { useTradeStore } from '@/app/store/tradeStore';
import { formatPercent } from '@/app/lib/utils';
import Button from './ui/Button';

interface OutcomeListProps {
  markets: MarketData[];
}

export default function OutcomeList({ markets }: OutcomeListProps) {
  const openTrade = useTradeStore(s => s.openTrade);

  const sorted = [...markets].sort((a, b) => b.yesPrice - a.yesPrice);

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_100px] sm:grid-cols-[1fr_80px_140px] items-center px-4 py-2.5 border-b border-[var(--border)] bg-[var(--cream)]">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">Outcome</span>
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] text-center">Chance</span>
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] text-center">Trade</span>
      </div>

      {/* Rows */}
      {sorted.map((market, i) => {
        const pct = Math.round(market.yesPrice * 100);
        return (
          <div
            key={market.id || market.ticker || i}
            className="grid grid-cols-[1fr_80px_100px] sm:grid-cols-[1fr_80px_140px] items-center px-4 py-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--cream)] transition-colors"
          >
            {/* Outcome name + probability bar */}
            <div className="pr-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[var(--text-dim)] w-5 shrink-0">{i + 1}</span>
                <span className="text-sm font-semibold text-[var(--text)] leading-tight">{market.title}</span>
              </div>
              <div className="ml-7">
                <div className="h-1.5 rounded-full bg-[var(--sand)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      backgroundColor: pct >= 50 ? 'var(--yes)' : 'var(--orange)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Chance */}
            <div className="text-center">
              <span className={`text-base font-bold font-mono ${pct >= 50 ? 'text-[var(--yes)]' : 'text-[var(--text)]'}`}>
                {formatPercent(market.yesPrice)}
              </span>
            </div>

            {/* Trade buttons */}
            <div className="flex gap-1.5 justify-center">
              <Button variant="yes" size="sm" onClick={() => openTrade(market, 'yes')}>
                Yes
              </Button>
              <Button variant="no" size="sm" onClick={() => openTrade(market, 'no')}>
                No
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
