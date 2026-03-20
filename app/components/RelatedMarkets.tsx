'use client';

import { useState, useEffect } from 'react';

interface RelatedMarket {
  ticker: string;
  title: string;
  eventTitle: string;
  yesPrice: number;
}

interface RelatedMarketsProps {
  eventTitle: string;
  currentTickers: string[];
}

export default function RelatedMarkets({ eventTitle, currentTickers }: RelatedMarketsProps) {
  const [markets, setMarkets] = useState<RelatedMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelated() {
      try {
        // Extract key words from event title for search
        const words = eventTitle.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
        if (words.length === 0) return;

        const res = await fetch(`/api/markets?q=${encodeURIComponent(words.join(' '))}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          const filtered = (data.markets || []).filter(
            (m: RelatedMarket) => !currentTickers.includes(m.ticker)
          );
          setMarkets(filtered.slice(0, 5));
        }
      } catch {}
      setLoading(false);
    }
    fetchRelated();
    const interval = setInterval(fetchRelated, 30000);
    return () => clearInterval(interval);
  }, [eventTitle, currentTickers]);

  if (loading || markets.length === 0) return null;

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--cream)]">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Related Markets
        </span>
      </div>

      <div>
        {markets.map((m, i) => {
          const pct = Math.round(m.yesPrice * 100);
          return (
            <div
              key={m.ticker}
              className="relative px-4 py-2.5 flex items-center justify-between hover:bg-[var(--cream)] transition-colors"
              style={{ borderBottom: i < markets.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              {/* Subtle probability background */}
              <div
                className="absolute inset-y-0 left-0 opacity-[0.06] pointer-events-none"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct >= 50 ? 'var(--yes)' : 'var(--no)',
                }}
              />

              <div className="relative flex-1 mr-3">
                <div className="text-sm text-[var(--text)] truncate">{m.title}</div>
                {m.eventTitle && m.eventTitle !== eventTitle && (
                  <div className="text-[10px] text-[var(--text-dim)] truncate">{m.eventTitle}</div>
                )}
              </div>

              <div className="relative shrink-0">
                <span className={`text-sm font-mono font-bold ${
                  pct >= 50 ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {pct}c
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
