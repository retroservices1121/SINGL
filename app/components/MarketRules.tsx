'use client';

import { useState } from 'react';
import type { MarketData } from '@/app/types';

interface MarketRulesProps {
  markets: MarketData[];
}

export default function MarketRules({ markets }: MarketRulesProps) {
  const [expanded, setExpanded] = useState(true);

  // Get unique rules
  const rulesMap = new Map<string, { title: string; rules: string; expires: string | null }>();
  for (const m of markets) {
    if (m.rulesPrimary && !rulesMap.has(m.rulesPrimary)) {
      rulesMap.set(m.rulesPrimary, {
        title: m.title,
        rules: m.rulesPrimary,
        expires: m.expirationTime || null,
      });
    }
  }

  const rulesList = Array.from(rulesMap.values());
  if (rulesList.length === 0) return null;

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--cream)] transition-colors"
      >
        <h3 className="font-heading text-lg font-bold text-[var(--text)]">Market Rules</h3>
        <svg
          className={`w-5 h-5 text-[var(--text-dim)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {rulesList.map((r, i) => (
            <div key={i}>
              <p className="text-sm font-semibold text-[var(--orange)] mb-1">{r.title}</p>
              <p className="text-sm text-[var(--text-sec)] leading-relaxed whitespace-pre-line">{r.rules}</p>
              {r.expires && (
                <p className="text-xs text-[var(--text-dim)] mt-1">
                  Expires {new Date(r.expires).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                  })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
