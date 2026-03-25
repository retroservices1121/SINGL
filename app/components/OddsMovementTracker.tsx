'use client';

import type { TeamProfile } from '@/app/lib/ncaa';
import { useTradeStore } from '@/app/store/tradeStore';
import Sparkline from './Sparkline';

interface OddsMovementTrackerProps {
  teams: TeamProfile[];
}

interface Mover {
  team: TeamProfile;
  change24h: number; // points change
  direction: 'up' | 'down';
  currentOdds: number;
}

function getMovers(teams: TeamProfile[]): Mover[] {
  const movers: Mover[] = [];

  for (const team of teams) {
    if (!team.championshipOdds || team.championshipOdds === 0) continue;

    // Use change24h from championship market if available
    const champMarket = team.championshipMarket;
    let change = champMarket?.change24h ?? null;

    // If no change24h, estimate from sparkline
    if (change === null && team.sparkline && team.sparkline.length >= 2) {
      const first = team.sparkline[0];
      const last = team.sparkline[team.sparkline.length - 1];
      change = (last - first) * 100;
    }

    if (change !== null && Math.abs(change) >= 1) {
      movers.push({
        team,
        change24h: change,
        direction: change > 0 ? 'up' : 'down',
        currentOdds: team.championshipOdds,
      });
    }
  }

  // Sort by absolute change descending
  return movers.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
}

function MomentumBadge({ change }: { change: number }) {
  const abs = Math.abs(change);
  let label = '';
  let color = '';

  if (abs >= 10) {
    label = 'SURGING';
    color = change > 0 ? 'bg-[var(--yes)] text-white' : 'bg-[var(--no)] text-white';
  } else if (abs >= 5) {
    label = 'HOT';
    color = change > 0 ? 'bg-[var(--yes-bg)] text-[var(--yes)]' : 'bg-[var(--no-bg)] text-[var(--no)]';
  } else {
    label = 'MOVING';
    color = 'bg-[var(--surface-container-high)] text-[var(--secondary)]';
  }

  return (
    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${color}`}>
      {label}
    </span>
  );
}

function MoverCard({ mover }: { mover: Mover }) {
  const openTrade = useTradeStore(s => s.openTrade);
  const { team, change24h, direction, currentOdds } = mover;
  const oddsPercent = Math.round(currentOdds * 100);
  const changeAbs = Math.abs(change24h).toFixed(1);

  return (
    <div
      className="shrink-0 w-64 bg-[var(--surface-container-lowest)] rounded-xl p-4 shadow-ambient hover:scale-[1.02] transition-all cursor-pointer"
      onClick={() => team.championshipMarket && openTrade(team.championshipMarket, 'yes')}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-heading font-black text-sm uppercase tracking-tight text-[var(--on-surface)]">
              {team.name}
            </h4>
            <MomentumBadge change={change24h} />
          </div>
          <div className="flex items-center gap-2">
            {team.seed && (
              <span className="text-[9px] font-bold text-white bg-[var(--on-surface)] px-1 py-0.5 rounded">{team.seed}</span>
            )}
            {team.region && (
              <span className="text-[9px] text-[var(--secondary)] uppercase tracking-widest">{team.region}</span>
            )}
          </div>
        </div>
        {/* Sparkline */}
        {team.sparkline && team.sparkline.length > 1 && (
          <Sparkline data={team.sparkline} width={72} height={32} />
        )}
      </div>

      {/* Odds + Change */}
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-mono text-2xl font-bold text-[var(--on-surface)]">{oddsPercent}%</span>
        <span className={`flex items-center gap-0.5 text-sm font-bold ${direction === 'up' ? 'text-[var(--yes)]' : 'text-[var(--no)]'}`}>
          <span className="material-symbols-outlined text-sm">
            {direction === 'up' ? 'trending_up' : 'trending_down'}
          </span>
          {direction === 'up' ? '+' : '-'}{changeAbs}
        </span>
      </div>

      {/* Bar showing relative odds */}
      <div className="h-1 bg-[var(--surface-container-high)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${direction === 'up' ? 'bg-[var(--yes)]' : 'bg-[var(--no)]'}`}
          style={{ width: `${Math.min(oddsPercent * 2, 100)}%` }}
        />
      </div>

      {/* 24h label */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[9px] text-[var(--secondary)] uppercase tracking-widest">24h change</span>
        {team.nextOpponent && (
          <span className="text-[9px] text-[var(--secondary)]">vs {team.nextOpponent}</span>
        )}
      </div>
    </div>
  );
}

export default function OddsMovementTracker({ teams }: OddsMovementTrackerProps) {
  const movers = getMovers(teams);

  if (movers.length === 0) return null;

  const risers = movers.filter(m => m.direction === 'up');
  const fallers = movers.filter(m => m.direction === 'down');

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[var(--tertiary)]">show_chart</span>
        <h3 className="text-sm font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
          Odds Movement
        </h3>
        <span className="px-2 py-0.5 rounded-full bg-[var(--surface-container-high)] text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest">
          24h
        </span>
      </div>

      {/* Risers */}
      {risers.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-sm text-[var(--yes)]">arrow_upward</span>
            <span className="text-[10px] font-bold text-[var(--yes)] uppercase tracking-widest">Rising</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {risers.map(mover => (
              <MoverCard key={mover.team.name} mover={mover} />
            ))}
          </div>
        </div>
      )}

      {/* Fallers */}
      {fallers.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-sm text-[var(--no)]">arrow_downward</span>
            <span className="text-[10px] font-bold text-[var(--no)] uppercase tracking-widest">Falling</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {fallers.map(mover => (
              <MoverCard key={mover.team.name} mover={mover} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
