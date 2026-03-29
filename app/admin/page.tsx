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
  event?: { slug: string; title: string; searchTerms: string[]; contentTerms: string[]; markets: { ticker: string; title: string }[] } | null;
}

function TwitterCardManager({ secret, markets }: { secret: string; markets: { ticker: string; title: string }[] }) {
  const [images, setImages] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Load existing custom images
  useEffect(() => {
    fetch(`/api/admin/market-image?secret=${encodeURIComponent(secret)}`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string> = {};
        for (const m of data.markets || []) {
          if (m.conditionId && m.ogImageUrl) map[m.conditionId] = m.ogImageUrl;
        }
        setImages(map);
      })
      .catch(() => {});
  }, [secret]);

  const saveImage = async (conditionId: string, url: string) => {
    setSaving(conditionId);
    setMsg('');
    try {
      const res = await fetch('/api/admin/market-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ conditionId, ogImageUrl: url || null }),
      });
      const data = await res.json();
      if (data.ok) {
        if (url) {
          setImages(prev => ({ ...prev, [conditionId]: url }));
          setMsg(`Card image set for "${data.market.title}"`);
        } else {
          setImages(prev => { const n = { ...prev }; delete n[conditionId]; return n; });
          setMsg(`Card image cleared for "${data.market.title}"`);
        }
      } else {
        setMsg(data.error || 'Failed');
      }
    } catch {
      setMsg('Failed to save');
    }
    setSaving(null);
  };

  const marketsWithImages = markets.filter(m => images[m.ticker]);
  const marketsWithout = markets.filter(m => !images[m.ticker]);

  return (
    <div className="bg-[#16213e] rounded-xl p-5 mb-6 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Twitter Card Images</h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-orange-400 hover:text-orange-300 cursor-pointer"
        >
          {expanded ? 'Collapse' : `Manage (${Object.keys(images).length} custom)`}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Paste an image URL to override the auto-generated Twitter card for a market. Leave blank to use the default.
      </p>

      {msg && <p className="text-xs text-green-400 mb-3">{msg}</p>}

      {/* Markets with custom images */}
      {marketsWithImages.length > 0 && (
        <div className="space-y-2 mb-3">
          {marketsWithImages.map(m => (
            <div key={m.ticker} className="bg-[#0f3460] rounded-lg p-3">
              <div className="text-xs text-gray-300 mb-1.5 truncate">{m.title}</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue={images[m.ticker] || ''}
                  placeholder="https://example.com/image.png"
                  className="flex-1 border border-gray-600 bg-[#1a1a2e] text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveImage(m.ticker, (e.target as HTMLInputElement).value.trim());
                  }}
                  id={`og-${m.ticker}`}
                />
                <button
                  onClick={() => saveImage(m.ticker, (document.getElementById(`og-${m.ticker}`) as HTMLInputElement).value.trim())}
                  disabled={saving === m.ticker}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded cursor-pointer"
                >
                  {saving === m.ticker ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => saveImage(m.ticker, '')}
                  disabled={saving === m.ticker}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded cursor-pointer"
                >
                  Clear
                </button>
              </div>
              {images[m.ticker] && (
                <img src={images[m.ticker]} alt="" className="mt-2 rounded max-h-24 object-cover" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expandable list of all markets */}
      {expanded && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {marketsWithout.map(m => (
            <div key={m.ticker} className="bg-[#0f3460] rounded-lg p-3">
              <div className="text-xs text-gray-300 mb-1.5 truncate">{m.title}</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste image URL for Twitter card..."
                  className="flex-1 border border-gray-600 bg-[#1a1a2e] text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                  id={`og-${m.ticker}`}
                />
                <button
                  onClick={() => saveImage(m.ticker, (document.getElementById(`og-${m.ticker}`) as HTMLInputElement).value.trim())}
                  disabled={saving === m.ticker}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded cursor-pointer"
                >
                  {saving === m.ticker ? '...' : 'Set'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
              {/* Editable title */}
              <div className="flex items-center gap-2 mb-2">
                <input
                  id="eventTitleInput"
                  type="text"
                  defaultValue={active.event.title}
                  className="text-lg font-semibold text-orange-400 bg-transparent border-b border-transparent hover:border-gray-600 focus:border-orange-500 focus:outline-none py-0.5 flex-1"
                />
                <button
                  onClick={async () => {
                    const input = document.getElementById('eventTitleInput') as HTMLInputElement;
                    const newTitle = input.value.trim();
                    if (!newTitle) return;
                    const res = await fetch('/api/admin/event', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
                      body: JSON.stringify({ slug: active.activeEventSlug, title: newTitle }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      setMessage(`Title updated to "${newTitle}"`);
                      fetchActive(secret);
                    }
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Update Title
                </button>
              </div>
              <p className="text-sm text-gray-400">Slug: {active.activeEventSlug}</p>
              <p className="text-sm text-gray-400">{active.event.markets?.length || 0} markets</p>

              {/* Search terms editor */}
              <div className="mt-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Search Terms (for YouTube/Twitter)
                </label>
                <div className="flex gap-2">
                  <input
                    id="searchTermsInput"
                    type="text"
                    defaultValue={active.event.searchTerms?.join(', ') || ''}
                    placeholder="e.g. WTI oil price, crude oil forecast"
                    className="flex-1 border border-gray-600 bg-[#0f3460] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={async () => {
                      const input = document.getElementById('searchTermsInput') as HTMLInputElement;
                      const terms = input.value.split(',').map(t => t.trim()).filter(Boolean);
                      if (terms.length === 0) return;
                      const res = await fetch('/api/admin/event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
                        body: JSON.stringify({ slug: active.activeEventSlug, searchTerms: terms }),
                      });
                      const data = await res.json();
                      if (data.ok) {
                        setMessage(`Search terms updated: ${terms.join(', ')}`);
                        fetchActive(secret);
                      }
                    }}
                    className="bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Comma-separated. Used to search YouTube and Twitter for related content.</p>
              </div>

              {/* Cron triggers */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={async () => {
                    setMessage('Fetching YouTube...');
                    const res = await fetch(`/api/cron/youtube?secret=${encodeURIComponent(secret)}`);
                    const data = await res.json();
                    if (data.note) {
                      setMessage(`YouTube: ${data.note} (searched: ${(data.searchTerms || []).join(', ')})`);
                    } else if (data.success) {
                      setMessage(`YouTube: ${data.created} new, ${data.updated} updated (${data.total} found)`);
                    } else {
                      setMessage(`YouTube error: ${data.error}`);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Fetch YouTube
                </button>
                <button
                  onClick={async () => {
                    setMessage('Fetching News...');
                    const res = await fetch(`/api/cron/news?secret=${encodeURIComponent(secret)}`);
                    const data = await res.json();
                    if (data.note) {
                      setMessage(`News: ${data.note} (searched: ${(data.searchTerms || []).join(', ')})`);
                    } else if (data.success) {
                      setMessage(`News: ${data.created} new articles (${data.total} found)`);
                    } else {
                      setMessage(`News error: ${data.error}`);
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Fetch News
                </button>
                <button
                  onClick={async () => {
                    setMessage('Snapshotting prices...');
                    const res = await fetch(`/api/cron/prices?secret=${encodeURIComponent(secret)}`);
                    const data = await res.json();
                    if (data.success) {
                      setMessage(`Prices: ${data.snapshots} snapshots recorded`);
                    } else {
                      setMessage(`Prices error: ${data.error}`);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Snapshot Prices
                </button>
                <button
                  onClick={async () => {
                    setMessage('Fetching Twitter...');
                    const res = await fetch(`/api/cron/twitter?secret=${encodeURIComponent(secret)}`);
                    const data = await res.json();
                    if (data.note) {
                      setMessage(`Twitter: ${data.note} (searched: ${(data.searchTerms || []).join(', ')})`);
                    } else if (data.success) {
                      setMessage(`Twitter: ${data.created} new, ${data.updated} updated (${data.total} found)`);
                    } else {
                      setMessage(`Twitter error: ${data.error}`);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Fetch Twitter
                </button>
                <button
                  onClick={async () => {
                    setMessage('Fetching TikTok...');
                    const res = await fetch(`/api/cron/tiktok?secret=${encodeURIComponent(secret)}`);
                    const data = await res.json();
                    if (data.note) {
                      setMessage(`TikTok: ${data.note}`);
                    } else if (data.success) {
                      setMessage(`TikTok: ${data.created} new, ${data.updated} updated (${data.total} found)`);
                    } else {
                      setMessage(`TikTok error: ${data.error}`);
                    }
                  }}
                  className="bg-black hover:bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Fetch TikTok
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No active event set</p>
          )}
        </div>

        {/* Twitter Card Images */}
        {active?.event && (
          <TwitterCardManager secret={secret} markets={active.event.markets || []} />
        )}

        {/* Search */}
        <div className="bg-[#16213e] rounded-xl p-5 mb-6 border border-gray-700">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Search Polymarket Events</h2>
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
          <div className="text-center py-12 text-gray-400">Searching Polymarket...</div>
        )}
      </div>
    </div>
  );
}
