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

  useEffect(() => {
    // Fetch live bid/ask from DFlow for each market
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

  // Fallback: show spread from stored prices
  const sorted = [...markets].sort((a, b) => b.yesPrice - a.yesPrice).slice(0, 6);

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

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--cream)]">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Order Book
        </span>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {displayData.map((d, i) => {
          const yesBidPct = Math.round(d.yesBid * 100);
          const yesAskPct = Math.round(d.yesAsk * 100);
          const spreadCents = Math.max(1, yesAskPct - yesBidPct);
          const midpoint = (yesBidPct + yesAskPct) / 2;

          return (
            <div key={d.ticker || i} className="px-4 py-3">
              <div className="text-sm font-medium text-[var(--text)] mb-2 truncate">{d.title}</div>

              {/* Visual bid/ask bar */}
              <div className="relative h-8 rounded-lg overflow-hidden bg-gray-100 mb-1.5">
                {/* Bid side (green) */}
                <div
                  className="absolute top-0 left-0 h-full bg-emerald-100 border-r-2 border-emerald-400"
                  style={{ width: `${yesBidPct}%` }}
                >
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">
                    {yesBidPct}c
                  </span>
                </div>

                {/* Ask side (red) */}
                <div
                  className="absolute top-0 right-0 h-full bg-red-100 border-l-2 border-red-400"
                  style={{ width: `${100 - yesAskPct}%` }}
                >
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-red-700">
                    {yesAskPct}c
                  </span>
                </div>

                {/* Spread gap in middle */}
                {spreadCents > 1 && (
                  <div
                    className="absolute top-0 h-full flex items-center justify-center"
                    style={{
                      left: `${yesBidPct}%`,
                      width: `${spreadCents}%`,
                    }}
                  >
                    <span className="text-[10px] font-bold text-gray-500">{spreadCents}c</span>
                  </div>
                )}
              </div>

              {/* Labels */}
              <div className="flex justify-between text-[10px] text-[var(--text-dim)]">
                <span>Bid {yesBidPct}c</span>
                <span className="font-semibold">Spread {spreadCents}c</span>
                <span>Ask {yesAskPct}c</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
