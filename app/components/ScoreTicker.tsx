'use client';

import { useEffect, useState, useRef } from 'react';

interface Game {
  id: string;
  awayTeam: string;
  awayScore: number | null;
  awayRank: number | null;
  awayWinner: boolean;
  homeTeam: string;
  homeScore: number | null;
  homeRank: number | null;
  homeWinner: boolean;
  status: 'scheduled' | 'live' | 'halftime' | 'final';
  statusDetail: string;
  period: number;
  clock: string;
  broadcast: string | null;
}

function GameChip({ game }: { game: Game }) {
  const isLive = game.status === 'live' || game.status === 'halftime';
  const isFinal = game.status === 'final';

  return (
    <div className="inline-flex items-center gap-3 px-4 py-1.5 shrink-0">
      {/* Status indicator */}
      <div className="flex items-center gap-1 shrink-0">
        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
        <span className={`text-[9px] font-bold uppercase tracking-widest ${
          isLive ? 'text-red-400' : isFinal ? 'text-[var(--secondary)]' : 'text-[var(--secondary)]'
        }`}>
          {isLive ? game.statusDetail : isFinal ? 'Final' : game.statusDetail}
        </span>
      </div>

      {/* Away team */}
      <div className="flex items-center gap-1.5">
        {game.awayRank && game.awayRank <= 25 && (
          <span className="text-[8px] text-[var(--secondary)]">{game.awayRank}</span>
        )}
        <span className={`text-xs font-bold uppercase tracking-tight ${
          game.awayWinner ? 'text-white' : 'text-slate-300'
        }`}>
          {game.awayTeam}
        </span>
        {game.awayScore !== null && (
          <span className={`font-mono text-sm font-bold ${
            game.awayWinner ? 'text-white' : 'text-slate-400'
          }`}>
            {game.awayScore}
          </span>
        )}
      </div>

      <span className="text-[9px] text-slate-600">@</span>

      {/* Home team */}
      <div className="flex items-center gap-1.5">
        {game.homeRank && game.homeRank <= 25 && (
          <span className="text-[8px] text-[var(--secondary)]">{game.homeRank}</span>
        )}
        <span className={`text-xs font-bold uppercase tracking-tight ${
          game.homeWinner ? 'text-white' : 'text-slate-300'
        }`}>
          {game.homeTeam}
        </span>
        {game.homeScore !== null && (
          <span className={`font-mono text-sm font-bold ${
            game.homeWinner ? 'text-white' : 'text-slate-400'
          }`}>
            {game.homeScore}
          </span>
        )}
      </div>

      {/* Broadcast */}
      {game.broadcast && (
        <span className="text-[8px] text-slate-600 font-bold">{game.broadcast}</span>
      )}

      {/* Divider */}
      <span className="text-slate-700">|</span>
    </div>
  );
}

export default function ScoreTicker() {
  const [games, setGames] = useState<Game[]>([]);
  const [paused, setPaused] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const res = await fetch('/api/scores');
        const data = await res.json();
        setGames(data.games || []);
      } catch {
        // Silently fail
      }
    };

    fetchScores();
    const interval = setInterval(fetchScores, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (games.length === 0) return null;

  // Sort: live first, then halftime, then scheduled, then final
  const sorted = [...games].sort((a, b) => {
    const order = { live: 0, halftime: 1, scheduled: 2, final: 3 };
    return order[a.status] - order[b.status];
  });

  const liveCount = games.filter(g => g.status === 'live' || g.status === 'halftime').length;

  return (
    <div
      className="bg-[var(--on-surface)] border-b border-white/5 overflow-hidden relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center">
        {/* Label */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 bg-[var(--primary-container)] z-10">
          {liveCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          <span className="text-[9px] font-black text-white uppercase tracking-widest">
            {liveCount > 0 ? 'Live' : 'Scores'}
          </span>
        </div>

        {/* Scrolling ticker */}
        <div className="overflow-hidden flex-1" ref={tickerRef}>
          <div
            className="flex whitespace-nowrap"
            style={{
              animation: `ticker ${sorted.length * 6}s linear infinite`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          >
            {/* Duplicate for seamless loop */}
            {[...sorted, ...sorted].map((game, i) => (
              <GameChip key={`${game.id}-${i}`} game={game} />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
