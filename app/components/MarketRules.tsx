'use client';

import { useState, useRef, useEffect } from 'react';
import type { MarketData } from '@/app/types';

interface MarketRulesProps {
  markets: MarketData[];
}

export default function MarketRules({ markets }: MarketRulesProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build list of markets that have rules
  const marketsWithRules = markets.filter(m => m.rulesPrimary);
  const selected = marketsWithRules[selectedIdx] || marketsWithRules[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (marketsWithRules.length === 0) return null;

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
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

      {expanded && selected && (
        <div className="px-5 pb-5">
          {/* Outcome selector dropdown */}
          <div className="relative mb-4" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--orange)] hover:text-[var(--orange-dark)] transition-colors cursor-pointer"
            >
              {selected.title}
              <svg
                className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-[var(--paper)] border border-[var(--border)] rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[240px]">
                {marketsWithRules.map((m, i) => (
                  <button
                    key={m.ticker}
                    onClick={() => {
                      setSelectedIdx(i);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      i === selectedIdx
                        ? 'bg-[var(--orange-lt)] text-[var(--orange)] font-semibold'
                        : 'text-[var(--text)] hover:bg-[var(--cream)]'
                    }`}
                  >
                    {m.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rules content */}
          <div className="text-sm text-[var(--text-sec)] leading-relaxed whitespace-pre-line">
            {selected.rulesPrimary}
          </div>

          {/* Expiration */}
          {selected.expirationTime && (
            <p className="text-xs text-[var(--text-dim)] mt-4">
              Expires {new Date(selected.expirationTime).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
