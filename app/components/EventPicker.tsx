'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TrendingEvent } from '@/app/types';
import { slugify } from '@/app/lib/utils';

const TRENDING_EVENTS: TrendingEvent[] = [
  { slug: 'us-strikes-iran', title: 'US Strikes on Iran', emoji: '🎯', color: '#CC3344', subtitle: 'Military escalation odds' },
  { slug: 'tsla-q1-earnings', title: 'TSLA Q1 Earnings', emoji: '📊', color: '#B87A00', subtitle: 'Tesla earnings predictions' },
  { slug: 'ufc-314', title: 'UFC 314', emoji: '🥊', color: '#078A57', subtitle: 'Fight outcome markets' },
  { slug: '2026-academy-awards', title: '2026 Academy Awards', emoji: '🏆', color: '#C93340', subtitle: 'Oscar winner predictions' },
  { slug: 'bitcoin-halving', title: 'Bitcoin Halving', emoji: '₿', color: '#F2841A', subtitle: 'Crypto price predictions' },
  { slug: 'fed-rate-decision', title: 'Fed Rate Decision', emoji: '🏦', color: '#2B6CB0', subtitle: 'Interest rate markets' },
  { slug: '2026-midterms', title: '2026 Midterms', emoji: '🗳️', color: '#6B46C1', subtitle: 'Election outcome predictions' },
  { slug: 'nba-finals-2026', title: 'NBA Finals 2026', emoji: '🏀', color: '#078A57', subtitle: 'Championship winner markets' },
  { slug: 'ai-regulation-bill', title: 'AI Regulation Bill', emoji: '🤖', color: '#2B6CB0', subtitle: 'Tech policy predictions' },
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
