'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TrendingEvent } from '@/app/types';
import { slugify } from '@/app/lib/utils';

const TRENDING_EVENTS: TrendingEvent[] = [
  { slug: '2028-presidential-election', title: '2028 Presidential Election', emoji: '🗳️', color: '#6B46C1', subtitle: '24 active markets' },
  { slug: 'pro-basketball-champion', title: 'NBA Champion', emoji: '🏀', color: '#078A57', subtitle: '30 active markets' },
  { slug: 'oscars-best-supporting-actor', title: 'Oscar Best Supporting Actor', emoji: '🏆', color: '#C93340', subtitle: '6 active markets' },
  { slug: 'iran-supreme-leader', title: 'Next Supreme Leader of Iran', emoji: '🌍', color: '#CC3344', subtitle: '15 active markets' },
  { slug: 'bitcoin-halving', title: 'Bitcoin Halving', emoji: '₿', color: '#F2841A', subtitle: 'When will it happen?' },
  { slug: 'bitcoin-150k', title: 'Bitcoin to $150K', emoji: '📈', color: '#F2841A', subtitle: '3 active markets' },
  { slug: 'midterms-2026', title: '2026 Midterms', emoji: '🏛️', color: '#2B6CB0', subtitle: 'Congress balance of power' },
  { slug: 'strait-of-hormuz', title: 'Strait of Hormuz Crisis', emoji: '⚓', color: '#CC3344', subtitle: '3 active markets' },
  { slug: 'congress-stock-trading-ban', title: 'Congress Stock Trading Ban', emoji: '📊', color: '#B87A00', subtitle: '2 active markets' },
];

export default function EventPicker() {
  const [search, setSearch] = useState('');
  const router = useRouter();

  const filtered = search
    ? TRENDING_EVENTS.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.subtitle.toLowerCase().includes(search.toLowerCase())
      )
    : TRENDING_EVENTS;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/event/${slugify(search.trim())}`);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative max-w-xl mx-auto">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="e.g. TSLA earnings, UFC 314, Bitcoin halving..."
            className="w-full border border-[var(--border)] rounded-xl px-4 py-3 pl-10 text-sm bg-[var(--paper)] focus:outline-none focus:ring-2 focus:ring-[var(--orange)] placeholder:text-[var(--text-dim)]"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((event, i) => (
          <button
            key={event.slug}
            onClick={() => router.push(`/event/${event.slug}`)}
            className="group bg-[var(--paper)] border border-[var(--border)] rounded-xl p-5 text-left hover:-translate-y-[3px] transition-all duration-300 cursor-pointer"
            style={{
              animationDelay: `${i * 60}ms`,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div className="text-3xl mb-2">{event.emoji}</div>
            <h3 className="font-heading text-base font-bold text-[var(--text)] group-hover:text-[var(--orange)] transition-colors">
              {event.title}
            </h3>
            <p className="text-xs text-[var(--text-dim)] mt-1">{event.subtitle}</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: event.color }}>
              <span>Explore markets</span>
              <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
