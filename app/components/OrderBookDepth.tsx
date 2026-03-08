'use client';

import { useState, useEffect } from 'react';
import type { MarketData } from '@/app/types';

interface OrderBookDepthProps {
  markets: MarketData[];
}

interface DepthData {
  ticker: string;
  title: string;
  yesBid: number;
  yesAsk: number;
  noBid: number;
  noAsk: number;
  spread: number;
}

export default function OrderBookDepth({ markets }: OrderBookDepthProps) {
  const [depthData, setDepthData] = useState<DepthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchDepth() {
      try {
        const res = await fetch('/api/depth');
        if (res.ok) {
          const data = await res.json();
          setDepthData(data.markets || []);
        }
      } catch {}
      setLoading(false);
    }
    fetchDepth();
  }, []);

  const sorted = [...markets].sort((a, b) => b.yesPrice - a.yesPrice);

  const displayData = depthData.length > 0 ? depthData : sorted.map(m => ({
    ticker: m.ticker,
    title: m.title,
    yesBid: Math.max(0, m.yesPrice - 0.01),
    yesAsk: m.yesPrice,
    noBid: Math.max(0, m.noPrice - 0.01),
    noAsk: m.noPrice,
    spread: 1,
  }));

  if (displayData.length === 0) return null;

  const visibleData = expanded ? displayData : displayData.slice(0, 5);
  const hasMore = displayData.length > 5;

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--cream)] flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Order Book
        </span>
        <div className="flex items-center gap-4 text-[10px] font-semibold text-[var(--text-dim)]">
          <span>Bid</span>
          <span>Ask</span>
          <span>Spread</span>
        </div>
      </div>

      {/* Rows */}
      <div>
        {visibleData.map((d, i) => {
          const yesBidPct = Math.round(d.yesBid * 100);
          const yesAskPct = Math.round(d.yesAsk * 100);
          const spreadCents = Math.max(1, yesAskPct - yesBidPct);
          const isTight = spreadCents <= 2;

          return (
            <div
              key={d.ticker || i}
              className="relative px-4 py-2.5 flex items-center justify-between group hover:bg-[var(--cream)] transition-colors"
              style={{ borderBottom: i < visibleData.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              {/* Subtle bid depth background */}
              <div
                className="absolute inset-y-0 left-0 bg-emerald-50 opacity-40 pointer-events-none"
                style={{ width: `${yesBidPct}%` }}
              />

              {/* Title */}
              <span className="relative text-sm text-[var(--text)] truncate flex-1 mr-4">
                {d.title}
              </span>

              {/* Values */}
              <div className="relative flex items-center gap-4 shrink-0">
                <span className="text-sm font-mono font-semibold text-emerald-600 w-10 text-right">
                  {yesBidPct}c
                </span>
                <span className="text-sm font-mono font-semibold text-red-500 w-10 text-right">
                  {yesAskPct}c
                </span>
                <span className={`text-xs font-mono font-bold w-8 text-right ${
                  isTight ? 'text-emerald-500' : 'text-[var(--text-dim)]'
                }`}>
                  {spreadCents}c
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 text-xs font-semibold text-[var(--orange)] hover:bg-[var(--cream)] border-t border-[var(--border)] transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${displayData.length} markets`}
        </button>
      )}
    </div>
  );
}
