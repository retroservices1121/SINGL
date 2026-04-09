'use client';

import { useState, useMemo } from 'react';
import type { ParsedFIFAMarket, AwardCandidate } from '@/app/lib/fifa';
import { GOLDEN_BOOT_FAVORITES } from '@/app/lib/fifa';
import { useTradeStore } from '@/app/store/tradeStore';

interface GoldenBootTrackerProps {
  markets: ParsedFIFAMarket[];
}

type AwardTab = 'boot' | 'glove' | 'young';

const TABS: { key: AwardTab; label: string; icon: string }[] = [
  { key: 'boot', label: 'Golden Boot', icon: 'sports_soccer' },
  { key: 'glove', label: 'Golden Glove', icon: 'sports_handball' },
  { key: 'young', label: 'Best Young Player', icon: 'star' },
];

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

function findMarketForPlayer(name: string, markets: ParsedFIFAMarket[]): ParsedFIFAMarket | null {
  const lower = name.toLowerCase();
  return markets.find(m =>
    (m.fifaMarketType === 'top_scorer' || m.title.toLowerCase().includes('golden boot') || m.title.toLowerCase().includes('top scorer')) &&
    m.title.toLowerCase().includes(lower)
  ) || null;
}

function findAwardMarkets(keyword: string, markets: ParsedFIFAMarket[]): ParsedFIFAMarket[] {
  const lower = keyword.toLowerCase();
  return markets.filter(m => m.title.toLowerCase().includes(lower));
}

export default function GoldenBootTracker({ markets }: GoldenBootTrackerProps) {
  const [activeTab, setActiveTab] = useState<AwardTab>('boot');
  const openTrade = useTradeStore(s => s.openTrade);

  // Enrich golden boot favorites with market odds
  const enrichedCandidates = useMemo(() => {
    return GOLDEN_BOOT_FAVORITES.map(c => {
      const market = findMarketForPlayer(c.name, markets);
      return { ...c, marketOdds: market?.yesPrice ?? null, market };
    }).sort((a, b) => (b.marketOdds || 0) - (a.marketOdds || 0));
  }, [markets]);

  const goldenGloveMarkets = useMemo(() => findAwardMarkets('golden glove', markets), [markets]);
  const bestYoungMarkets = useMemo(() => findAwardMarkets('best young', markets), [markets]);

  const topCandidate = enrichedCandidates[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--primary)]">emoji_events</span>
        <h3 className="font-heading font-black text-lg text-[var(--on-surface)] uppercase tracking-tight">Awards & Golden Boot</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface-container-high)] rounded-lg p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all cursor-pointer flex-1 justify-center ${
              activeTab === t.key ? 'bg-[var(--primary-container)] text-white' : 'text-[var(--secondary)] hover:text-[var(--on-surface)]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Golden Boot tab */}
      {activeTab === 'boot' && (
        <div className="space-y-4">
          {/* Featured candidate */}
          {topCandidate && (
            <div
              className="bg-[var(--on-surface)] rounded-xl p-5 text-white relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-all"
              onClick={() => topCandidate.market && openTrade(topCandidate.market, 'yes')}
            >
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-[var(--primary-container)]/20 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Favorite</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{topCandidate.country.flag}</span>
                  <div className="flex-1">
                    <h4 className="font-heading font-black text-xl uppercase tracking-tight">{topCandidate.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{topCandidate.club}</span>
                      <span className="text-[10px] text-slate-500">&middot;</span>
                      <span className="text-[10px] text-slate-400">{topCandidate.position}</span>
                    </div>
                  </div>
                  {topCandidate.marketOdds !== null && (
                    <div className="text-right">
                      <div className="font-mono text-3xl font-bold text-[var(--primary-container)]">
                        {Math.round(topCandidate.marketOdds * 100)}%
                      </div>
                      <div className="text-[9px] text-slate-400">to win</div>
                    </div>
                  )}
                </div>
                {topCandidate.market && (
                  <button className="mt-4 w-full py-2.5 text-xs font-bold uppercase tracking-widest rounded-md bg-[var(--primary-container)] text-white hover:brightness-110 transition-all cursor-pointer">
                    Trade Golden Boot
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[28px_1fr_80px_50px_40px_40px_50px] items-center gap-0 px-4 py-2 border-b border-[var(--surface-container-high)]">
              <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest">#</span>
              <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest">Player</span>
              <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest">Club</span>
              <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">Pos</span>
              <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">G</span>
              <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">A</span>
              <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">Odds</span>
            </div>

            {enrichedCandidates.map((c, i) => (
              <div
                key={c.name}
                className={`grid grid-cols-[28px_1fr_80px_50px_40px_40px_50px] items-center gap-0 px-4 py-2.5 transition-all ${
                  c.market ? 'cursor-pointer hover:bg-[var(--surface-container-low)]' : ''
                } ${i < 3 ? 'bg-[var(--surface-container-low)]' : ''}`}
                onClick={() => c.market && openTrade(c.market, 'yes')}
              >
                <span className="text-xs font-black font-heading" style={i < 3 ? { color: MEDAL_COLORS[i] } : { color: 'var(--secondary)' }}>
                  {i + 1}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{c.country.flag}</span>
                  <span className="text-[11px] font-bold text-[var(--on-surface)] truncate">{c.name}</span>
                </div>
                <span className="text-[10px] text-[var(--secondary)] truncate">{c.club}</span>
                <span className="text-[10px] font-bold text-[var(--secondary)] text-center">{c.position}</span>
                <span className="text-[10px] font-bold font-mono text-[var(--on-surface)] text-center">{c.goals}</span>
                <span className="text-[10px] font-bold font-mono text-[var(--on-surface)] text-center">{c.assists}</span>
                <span className={`text-[10px] font-bold text-center rounded px-1 py-0.5 ${
                  c.marketOdds ? 'text-[var(--yes)] bg-[var(--yes-bg)]' : 'text-[var(--secondary)]'
                }`}>
                  {c.marketOdds ? `${Math.round(c.marketOdds * 100)}%` : '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Golden Glove tab */}
      {activeTab === 'glove' && (
        <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-6">
          {goldenGloveMarkets.length > 0 ? (
            <div className="space-y-2">
              {goldenGloveMarkets.map(m => (
                <div
                  key={m.conditionId}
                  className="flex items-center justify-between p-3 bg-[var(--surface-container-low)] rounded-lg cursor-pointer hover:bg-[var(--surface-container)] transition-all"
                  onClick={() => openTrade(m, 'yes')}
                >
                  <span className="text-xs font-bold text-[var(--on-surface)]">{m.title}</span>
                  <span className="font-mono text-sm font-bold text-[var(--yes)]">{Math.round(m.yesPrice * 100)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-3xl text-[var(--secondary)] mb-2">sports_handball</span>
              <p className="text-sm text-[var(--secondary)]">Golden Glove markets coming soon</p>
              <p className="text-[10px] text-[var(--secondary)] mt-1">Best goalkeeper award — awarded to the top-performing keeper of the tournament</p>
            </div>
          )}
        </div>
      )}

      {/* Best Young Player tab */}
      {activeTab === 'young' && (
        <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-6">
          {bestYoungMarkets.length > 0 ? (
            <div className="space-y-2">
              {bestYoungMarkets.map(m => (
                <div
                  key={m.conditionId}
                  className="flex items-center justify-between p-3 bg-[var(--surface-container-low)] rounded-lg cursor-pointer hover:bg-[var(--surface-container)] transition-all"
                  onClick={() => openTrade(m, 'yes')}
                >
                  <span className="text-xs font-bold text-[var(--on-surface)]">{m.title}</span>
                  <span className="font-mono text-sm font-bold text-[var(--yes)]">{Math.round(m.yesPrice * 100)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-3xl text-[var(--secondary)] mb-2">star</span>
              <p className="text-sm text-[var(--secondary)]">Best Young Player markets coming soon</p>
              <p className="text-[10px] text-[var(--secondary)] mt-1">Awarded to the best player aged 21 or younger</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
