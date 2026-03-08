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

  // If all rules follow same pattern, show a general one + first specific example
  const firstRule = rulesList[0];
  const allSamePattern = rulesList.length > 1 && rulesList.every(r =>
    r.rules.includes('resolves to Yes')
  );

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
          {allSamePattern ? (
            <>
              <div>
                <p className="text-sm font-semibold text-[var(--orange)] mb-2">{firstRule.title}</p>
                <p className="text-sm text-[var(--text-sec)] leading-relaxed">{firstRule.rules}</p>
              </div>
              {firstRule.expires && (
                <p className="text-xs text-[var(--text-dim)]">
                  Note: this event is mutually exclusive. Expires{' '}
                  {new Date(firstRule.expires).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
              <p className="text-xs text-[var(--text-dim)] italic">
                The same resolution pattern applies to all {rulesList.length} outcomes in this event.
              </p>
            </>
          ) : (
            rulesList.slice(0, 5).map((r, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-[var(--orange)] mb-1">{r.title}</p>
                <p className="text-sm text-[var(--text-sec)] leading-relaxed">{r.rules}</p>
                {r.expires && (
                  <p className="text-xs text-[var(--text-dim)] mt-1">
                    Expires {new Date(r.expires).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
