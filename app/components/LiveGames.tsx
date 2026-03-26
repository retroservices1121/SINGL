'use client';

import { useEffect, useState } from 'react';
import type { ParsedMarket } from '@/app/lib/ncaa';
import { useTradeStore } from '@/app/store/tradeStore';

interface LiveGamesProps {
  markets: ParsedMarket[];
}

interface LiveGame {
  market: ParsedMarket;
  team1: string;
  team2: string;
  team1Odds: number;
  team2Odds: number;
  status: 'live' | 'soon' | 'today';
  timeLabel: string;
}

function detectLiveGames(markets: ParsedMarket[]): LiveGame[] {
  const now = Date.now();
  const games: LiveGame[] = [];

  for (const m of markets) {
    if (m.marketType !== 'matchup' || m.teams.length < 2) continue;
    if (!m.closeTime) continue;

    const closeTime = new Date(m.closeTime).getTime();
    const diff = closeTime - now;

    // Past close time = game is live or just ended
    // Within 3 hours = starting soon
    // Within 24 hours = today
    let status: 'live' | 'soon' | 'today' | null = null;
    let timeLabel = '';

    if (diff <= 0 && diff > -4 * 60 * 60 * 1000) {
      // Closed within last 4 hours — game is live
      status = 'live';
      timeLabel = 'LIVE NOW';
    } else if (diff > 0 && diff <= 3 * 60 * 60 * 1000) {
      // Starting within 3 hours
      status = 'soon';
      const mins = Math.floor(diff / (1000 * 60));
      const hrs = Math.floor(mins / 60);
      timeLabel = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
    } else if (diff > 0 && diff <= 24 * 60 * 60 * 1000) {
      // Today
      status = 'today';
      const d = new Date(m.closeTime);
      timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    if (!status) continue;

    games.push({
      market: m,
      team1: m.teams[0],
      team2: m.teams[1],
      team1Odds: Math.round(m.yesPrice * 100),
      team2Odds: Math.round((1 - m.yesPrice) * 100),
      status,
      timeLabel,
    });
  }

  // Sort: live first, then soon, then today
  const order = { live: 0, soon: 1, today: 2 };
  return games.sort((a, b) => order[a.status] - order[b.status]);
}

function GameCard({ game }: { game: LiveGame }) {
  const openDetail = useTradeStore(s => s.openDetail);

  const statusStyles = {
    live: 'bg-[var(--no)] text-white',
    soon: 'bg-[var(--primary-container)] text-white',
    today: 'bg-[var(--surface-container-high)] text-[var(--secondary)]',
  };

  return (
    <div
      className="shrink-0 w-72 bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient overflow-hidden cursor-pointer hover:scale-[1.02] transition-all"
      onClick={() => openDetail(game.market)}
    >
      {/* Status bar */}
      <div className={`flex items-center justify-between px-4 py-1.5 ${
        game.status === 'live' ? 'bg-[var(--no)]' : game.status === 'soon' ? 'bg-[var(--primary-container)]' : 'bg-[var(--surface-container-high)]'
      }`}>
        <div className="flex items-center gap-1.5">
          {game.status === 'live' && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          )}
          <span className={`text-[9px] font-bold uppercase tracking-widest ${
            game.status === 'live' || game.status === 'soon' ? 'text-white' : 'text-[var(--secondary)]'
          }`}>
            {game.status === 'live' ? 'Live' : game.status === 'soon' ? 'Starting Soon' : 'Today'}
          </span>
        </div>
        <span className={`text-[9px] font-bold font-mono ${
          game.status === 'live' || game.status === 'soon' ? 'text-white/80' : 'text-[var(--secondary)]'
        }`}>
          {game.timeLabel}
        </span>
      </div>

      {/* Matchup */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 text-center">
            <div className="font-heading font-black text-sm uppercase tracking-tight text-[var(--on-surface)] mb-1">
              {game.team1}
            </div>
            <div className={`font-mono text-xl font-bold ${game.team1Odds > game.team2Odds ? 'text-[var(--yes)]' : 'text-[var(--on-surface)]'}`}>
              {game.team1Odds}%
            </div>
          </div>
          <div className="px-3">
            <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">vs</span>
          </div>
          <div className="flex-1 text-center">
            <div className="font-heading font-black text-sm uppercase tracking-tight text-[var(--on-surface)] mb-1">
              {game.team2}
            </div>
            <div className={`font-mono text-xl font-bold ${game.team2Odds > game.team1Odds ? 'text-[var(--yes)]' : 'text-[var(--on-surface)]'}`}>
              {game.team2Odds}%
            </div>
          </div>
        </div>

        {/* Odds bar */}
        <div className="flex h-1.5 rounded-full overflow-hidden bg-[var(--surface-container-high)]">
          <div
            className="bg-[var(--yes)] rounded-l-full transition-all"
            style={{ width: `${game.team1Odds}%` }}
          />
          <div
            className="bg-[var(--no)] rounded-r-full transition-all"
            style={{ width: `${game.team2Odds}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LiveGames({ markets }: LiveGamesProps) {
  const [games, setGames] = useState<LiveGame[]>([]);

  useEffect(() => {
    const update = () => setGames(detectLiveGames(markets));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [markets]);

  if (games.length === 0) return null;

  const liveCount = games.filter(g => g.status === 'live').length;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        {liveCount > 0 ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--no)] animate-pulse" />
            <h3 className="text-sm font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
              Live Games
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[var(--no)] text-white text-[9px] font-bold uppercase tracking-widest">
              {liveCount} live
            </span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[var(--primary-container)]">schedule</span>
            <h3 className="text-sm font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
              Upcoming Games
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[var(--primary-fixed)] text-[var(--primary)] text-[9px] font-bold uppercase tracking-widest">
              {games.length} today
            </span>
          </>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        {games.map(game => (
          <GameCard key={game.market.conditionId} game={game} />
        ))}
      </div>
    </div>
  );
}
