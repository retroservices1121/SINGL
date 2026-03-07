'use client';

import { useState, useEffect } from 'react';

interface MarketPreview {
  ticker: string;
  title: string;
  status: string;
  yesBid: string;
  yesAsk: string;
  noBid: string;
  noAsk: string;
  volume: number;
  openInterest: number;
  rulesPrimary: string;
  closeTime: number;
  expirationTime: number;
}

interface EventResult {
  ticker: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  volume: number;
  volume24h: number;
  liquidity: number;
  openInterest: number;
  competition: string;
  marketCount: number;
  markets: MarketPreview[];
}

interface ActiveEvent {
  activeEventSlug: string | null;
  event?: { slug: string; title: string; markets: { ticker: string; title: string }[] } | null;
}

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EventResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState<ActiveEvent | null>(null);
  const [setting, setSetting] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const fetchActive = async (s: string) => {
    try {
      const res = await fetch(`/api/admin/event?secret=${encodeURIComponent(s)}`);
      if (res.ok) {
        const data = await res.json();
        setActive(data);
      }
    } catch {}
  };

  const handleLogin = async () => {
    const res = await fetch(`/api/admin/event?secret=${encodeURIComponent(secret)}`);
    if (res.ok) {
      setAuthed(true);
      const data = await res.json();
      setActive(data);
    } else {
      setMessage('Invalid secret');
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`/api/admin/search?secret=${encodeURIComponent(secret)}&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.events || []);
    } catch {
      setMessage('Search failed');
    }
    setSearching(false);
  };

  const handleSetEvent = async (event: EventResult) => {
    setSetting(event.ticker);
    setMessage('');
    try {
      const slug = event.ticker.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res = await fetch('/api/admin/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({
          slug,
          title: event.title,
          subtitle: event.subtitle,
          imageUrl: event.imageUrl,
          searchTerms: [event.title],
          eventMeta: {
            volume: event.volume,
            volume24h: event.volume24h,
            liquidity: event.liquidity,
            openInterest: event.openInterest,
            competition: event.competition,
          },
          markets: event.markets
            .filter(m => m.status !== 'finalized' && m.status !== 'settled')
            .map(m => ({
              ticker: m.ticker,
              title: m.title,
              yesBid: m.yesBid,
              yesAsk: m.yesAsk,
              noBid: m.noBid,
              noAsk: m.noAsk,
              volume: m.volume,
              openInterest: m.openInterest,
              rulesPrimary: m.rulesPrimary,
              closeTime: m.closeTime,
              expirationTime: m.expirationTime,
            })),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const d = data.debug || {};
        setMessage(`Active event set to "${event.title}" — Received: ${d.receivedMarkets} markets, Saved: ${d.savedMarkets} markets${d.marketError ? ` | Error: ${d.marketError}` : ''}`);
        fetchActive(secret);
      } else {
        setMessage(data.error || 'Failed to set event');
      }
    } catch {
      setMessage('Failed to set event');
    }
    setSetting(null);
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
        <div className="bg-[#16213e] rounded-2xl p-8 max-w-sm w-full shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-1">SINGL Admin</h1>
          <p className="text-gray-400 text-sm mb-6">Enter your admin secret to continue</p>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="CRON_SECRET"
            className="w-full border border-gray-600 bg-[#0f3460] text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors cursor-pointer"
          >
            Login
          </button>
          {message && <p className="text-red-400 text-sm mt-3 text-center">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">SINGL Admin</h1>
          <a href="/" className="text-orange-400 text-sm hover:underline">View Site</a>
        </div>

        {/* Current active event */}
        <div className="bg-[#16213e] rounded-xl p-5 mb-6 border border-gray-700">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Current Active Event</h2>
          {active?.event ? (
            <div>
              <p className="text-lg font-semibold text-orange-400">{active.event.title}</p>
              <p className="text-sm text-gray-400 mt-1">Slug: {active.activeEventSlug}</p>
              <p className="text-sm text-gray-400">{active.event.markets?.length || 0} markets</p>
            </div>
          ) : (
            <p className="text-gray-500">No active event set</p>
          )}
        </div>

        {/* Search */}
        <div className="bg-[#16213e] rounded-xl p-5 mb-6 border border-gray-700">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Search DFlow Events</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. NBA Finals, Bitcoin, Election..."
              className="flex-1 border border-gray-600 bg-[#0f3460] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-lg px-4 py-3 mb-6 text-sm">
            {message}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            {results.map(event => (
              <div key={event.ticker} className="bg-[#16213e] rounded-xl p-5 border border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{event.title}</h3>
                    {event.subtitle && <p className="text-sm text-gray-400 mt-0.5">{event.subtitle}</p>}
                    {(() => {
                      const activeCount = event.markets.filter(m => m.status !== 'finalized' && m.status !== 'settled').length;
                      return (
                        <p className="text-xs mt-1">
                          <span className={activeCount > 0 ? 'text-green-400' : 'text-red-400'}>
                            {activeCount} active
                          </span>
                          <span className="text-gray-500"> / {event.marketCount} total markets</span>
                        </p>
                      );
                    })()}
                  </div>
                  {(() => {
                    const activeCount = event.markets.filter(m => m.status !== 'finalized' && m.status !== 'settled').length;
                    return (
                      <button
                        onClick={() => handleSetEvent(event)}
                        disabled={setting === event.ticker || activeCount === 0}
                        className={`text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                          activeCount === 0
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-orange-500 hover:bg-orange-600 disabled:opacity-50'
                        }`}
                      >
                        {setting === event.ticker ? 'Setting...' : activeCount === 0 ? 'No Active Markets' : 'Set Active'}
                      </button>
                    );
                  })()}

                </div>

                {event.markets.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {event.markets.map(m => (
                      <div key={m.ticker} className="flex items-center justify-between text-sm bg-[#0f3460] rounded-lg px-3 py-2">
                        <span className="text-gray-300 truncate flex-1 mr-3">{m.title}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={m.status === 'finalized' || m.status === 'settled' ? 'text-gray-500' : 'text-green-400'}>
                            {m.status || 'active'}
                          </span>
                          {m.yesBid && (
                            <span className="text-gray-400 font-mono">
                              Yes: {(parseFloat(m.yesBid) * 100).toFixed(0)}c
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {searching && (
          <div className="text-center py-12 text-gray-400">Searching DFlow...</div>
        )}
      </div>
    </div>
  );
}
