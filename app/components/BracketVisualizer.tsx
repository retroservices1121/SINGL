'use client';

import { useState } from 'react';
import type { TeamProfile } from '@/app/lib/ncaa';
import { useTradeStore } from '@/app/store/tradeStore';

interface BracketVisualizerProps {
  teams: TeamProfile[];
}

type BracketRound = 'S16' | 'E8' | 'F4' | 'CHAMP';

interface BracketSlot {
  team: TeamProfile | null;
  odds: number; // championship odds 0-1
  roundOdds: number; // odds to reach this specific round 0-1
}

interface Matchup {
  top: BracketSlot;
  bottom: BracketSlot;
  round: BracketRound;
}

const REGIONS = ['East', 'West', 'South', 'Midwest'] as const;
type Region = (typeof REGIONS)[number];

const ROUND_LABELS: Record<BracketRound, string> = {
  S16: 'Sweet 16',
  E8: 'Elite 8',
  F4: 'Final Four',
  CHAMP: 'Championship',
};

// Assign teams to regions based on their region field, or distribute evenly
function assignRegions(teams: TeamProfile[]): Record<Region, TeamProfile[]> {
  const regions: Record<Region, TeamProfile[]> = { East: [], West: [], South: [], Midwest: [] };

  // First pass: assign teams that have a region
  for (const team of teams) {
    if (team.region) {
      const r = REGIONS.find(rg => team.region!.toLowerCase().includes(rg.toLowerCase()));
      if (r) {
        regions[r].push(team);
        continue;
      }
    }
    // Will be distributed in second pass
  }

  // Second pass: distribute unassigned teams evenly, sorted by championship odds
  const unassigned = teams.filter(t => {
    if (!t.region) return true;
    return !REGIONS.some(rg => t.region!.toLowerCase().includes(rg.toLowerCase()));
  }).sort((a, b) => (b.championshipOdds || 0) - (a.championshipOdds || 0));

  for (const team of unassigned) {
    // Find smallest region
    const smallest = REGIONS.reduce((min, r) => regions[r].length < regions[min].length ? r : min, REGIONS[0]);
    regions[smallest].push(team);
  }

  // Sort each region by championship odds
  for (const r of REGIONS) {
    regions[r].sort((a, b) => (b.championshipOdds || 0) - (a.championshipOdds || 0));
  }

  return regions;
}

// Build matchups for a region (Sweet 16 → Elite 8)
function buildRegionMatchups(regionTeams: TeamProfile[]): { sweet16: Matchup[]; elite8: Matchup } {
  const slot = (team: TeamProfile | null): BracketSlot => ({
    team,
    odds: team?.championshipOdds || 0,
    roundOdds: team?.currentRoundOdds || team?.championshipOdds || 0,
  });

  // Pair teams: 1v4, 2v3 seeding style (by odds ranking)
  const t = regionTeams.slice(0, 4);
  const sweet16: Matchup[] = [
    { top: slot(t[0] || null), bottom: slot(t[3] || null), round: 'S16' },
    { top: slot(t[1] || null), bottom: slot(t[2] || null), round: 'S16' },
  ];

  // Elite 8 winner placeholder — show top seed from each S16 matchup
  const e8Top = t[0] || t[3] || null;
  const e8Bot = t[1] || t[2] || null;
  const elite8: Matchup = { top: slot(e8Top), bottom: slot(e8Bot), round: 'E8' };

  return { sweet16, elite8 };
}

function MatchupCard({ matchup, compact }: { matchup: Matchup; compact?: boolean }) {
  const openTrade = useTradeStore(s => s.openTrade);

  const renderSlot = (slot: BracketSlot, position: 'top' | 'bottom') => {
    if (!slot.team) {
      return (
        <div className={`flex items-center justify-between px-3 py-2 bg-[var(--surface-container-high)] ${position === 'top' ? 'rounded-t-lg' : 'rounded-b-lg'} ${compact ? 'py-1.5' : ''}`}>
          <span className="text-[10px] text-[var(--secondary)] italic">TBD</span>
        </div>
      );
    }

    const team = slot.team;
    const odds = Math.round(slot.odds * 100);
    const isHigher = matchup.top.team && matchup.bottom.team
      ? slot.odds > (position === 'top' ? matchup.bottom.odds : matchup.top.odds)
      : false;

    return (
      <div
        className={`flex items-center justify-between px-3 ${compact ? 'py-1.5' : 'py-2'} cursor-pointer transition-all hover:bg-[var(--surface-container)] group ${position === 'top' ? 'rounded-t-lg border-b border-[var(--surface-container-high)]' : 'rounded-b-lg'} ${isHigher ? 'bg-[var(--surface-container-lowest)]' : 'bg-[var(--surface-container-low)]'}`}
        onClick={() => team.championshipMarket && openTrade(team.championshipMarket, 'yes')}
      >
        <div className="flex items-center gap-2 min-w-0">
          {team.seed && (
            <span className="text-[9px] font-bold text-[var(--secondary)] bg-[var(--surface-container-high)] px-1 py-0.5 rounded shrink-0">
              {team.seed}
            </span>
          )}
          <span className={`font-heading font-bold uppercase tracking-tight truncate ${compact ? 'text-[10px]' : 'text-xs'} ${isHigher ? 'text-[var(--on-surface)]' : 'text-[var(--secondary)]'}`}>
            {team.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`font-mono font-bold ${compact ? 'text-[10px]' : 'text-xs'} ${isHigher ? 'text-[var(--yes)]' : 'text-[var(--secondary)]'}`}>
            {odds > 0 ? `${odds}%` : '<1%'}
          </span>
          <span className="material-symbols-outlined text-[10px] text-[var(--secondary)] opacity-0 group-hover:opacity-100 transition-opacity">
            arrow_forward
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full rounded-lg shadow-ambient overflow-hidden border border-[var(--surface-container-high)]">
      {renderSlot(matchup.top, 'top')}
      {renderSlot(matchup.bottom, 'bottom')}
    </div>
  );
}

function RegionBracket({ region, teams }: { region: Region; teams: TeamProfile[] }) {
  const { sweet16, elite8 } = buildRegionMatchups(teams);
  const regionWinner = teams[0]; // Top seed as projected winner

  return (
    <div className="space-y-3">
      {/* Region Header */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full bg-[var(--primary-container)]" />
        <h4 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
          {region} Region
        </h4>
      </div>

      <div className="flex items-center gap-3">
        {/* Sweet 16 matchups */}
        <div className="flex flex-col gap-4 w-[45%] shrink-0">
          {sweet16.map((m, i) => (
            <MatchupCard key={i} matchup={m} />
          ))}
        </div>

        {/* Connector lines */}
        <div className="flex flex-col items-center justify-center w-4 shrink-0 relative">
          <svg viewBox="0 0 16 100" className="w-4 h-full" preserveAspectRatio="none">
            <path d="M0,25 L8,25 L8,75 L0,75" fill="none" stroke="var(--surface-container-highest)" strokeWidth="1.5" />
            <path d="M8,50 L16,50" fill="none" stroke="var(--surface-container-highest)" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Elite 8 */}
        <div className="flex flex-col justify-center w-[45%] shrink-0">
          <MatchupCard matchup={elite8} compact />
          {/* Projected region winner */}
          {regionWinner && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-[var(--primary-fixed)] rounded text-[10px]">
              <span className="material-symbols-outlined text-[12px] text-[var(--primary)]">arrow_forward</span>
              <span className="font-bold text-[var(--primary)] uppercase tracking-wider">{regionWinner.name}</span>
              <span className="font-mono text-[var(--primary)] ml-auto">{Math.round((regionWinner.championshipOdds || 0) * 100)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FinalFourSection({ teams }: { teams: Record<Region, TeamProfile[]> }) {
  const openTrade = useTradeStore(s => s.openTrade);
  // Get top team from each region for Final Four
  const f4Teams = REGIONS.map(r => teams[r][0]).filter(Boolean);

  if (f4Teams.length < 2) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[var(--primary-container)]">emoji_events</span>
        <h4 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
          Final Four & Championship
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Semi 1: East vs West */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">Semifinal 1</div>
          <div className="rounded-xl border border-[var(--surface-container-high)] overflow-hidden shadow-ambient">
            {[teams.East[0], teams.West[0]].map((team, i) => team ? (
              <div
                key={team.name}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--surface-container)] transition-all ${i === 0 ? 'border-b border-[var(--surface-container-high)]' : ''} bg-[var(--surface-container-lowest)]`}
                onClick={() => team.championshipMarket && openTrade(team.championshipMarket, 'yes')}
              >
                <div className="flex items-center gap-2">
                  {team.seed && (
                    <span className="text-[9px] font-bold text-white bg-[var(--on-surface)] px-1.5 py-0.5 rounded">
                      {team.seed}
                    </span>
                  )}
                  <div>
                    <div className="font-heading font-black text-sm uppercase tracking-tight text-[var(--on-surface)]">{team.name}</div>
                    <div className="text-[9px] text-[var(--secondary)] uppercase tracking-widest">{team.region || 'East'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-lg text-[var(--on-surface)]">{Math.round((team.championshipOdds || 0) * 100)}%</div>
                  <div className="text-[9px] text-[var(--secondary)]">to win it all</div>
                </div>
              </div>
            ) : (
              <div key={i} className={`px-4 py-3 ${i === 0 ? 'border-b border-[var(--surface-container-high)]' : ''}`}>
                <span className="text-[10px] text-[var(--secondary)] italic">TBD</span>
              </div>
            ))}
          </div>
        </div>

        {/* Semi 2: South vs Midwest */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">Semifinal 2</div>
          <div className="rounded-xl border border-[var(--surface-container-high)] overflow-hidden shadow-ambient">
            {[teams.South[0], teams.Midwest[0]].map((team, i) => team ? (
              <div
                key={team.name}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--surface-container)] transition-all ${i === 0 ? 'border-b border-[var(--surface-container-high)]' : ''} bg-[var(--surface-container-lowest)]`}
                onClick={() => team.championshipMarket && openTrade(team.championshipMarket, 'yes')}
              >
                <div className="flex items-center gap-2">
                  {team.seed && (
                    <span className="text-[9px] font-bold text-white bg-[var(--on-surface)] px-1.5 py-0.5 rounded">
                      {team.seed}
                    </span>
                  )}
                  <div>
                    <div className="font-heading font-black text-sm uppercase tracking-tight text-[var(--on-surface)]">{team.name}</div>
                    <div className="text-[9px] text-[var(--secondary)] uppercase tracking-widest">{team.region || 'South'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-lg text-[var(--on-surface)]">{Math.round((team.championshipOdds || 0) * 100)}%</div>
                  <div className="text-[9px] text-[var(--secondary)]">to win it all</div>
                </div>
              </div>
            ) : (
              <div key={i} className={`px-4 py-3 ${i === 0 ? 'border-b border-[var(--surface-container-high)]' : ''}`}>
                <span className="text-[10px] text-[var(--secondary)] italic">TBD</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Championship — projected winner */}
      {f4Teams.length > 0 && (
        <div className="mt-6">
          <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center mb-3">Projected Champion</div>
          <div
            className="max-w-sm mx-auto bg-[var(--on-surface)] rounded-xl p-5 text-white text-center cursor-pointer hover:scale-[1.02] transition-all"
            onClick={() => f4Teams[0]?.championshipMarket && openTrade(f4Teams[0].championshipMarket, 'yes')}
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-[var(--primary-container)]/20 rounded-full blur-2xl" />
            <span className="material-symbols-outlined text-4xl text-[var(--primary-container)] mb-2">emoji_events</span>
            <h3 className="font-heading font-black text-2xl uppercase tracking-tight mb-1">{f4Teams[0]?.name}</h3>
            {f4Teams[0]?.seed && (
              <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded">{f4Teams[0].seed}-seed</span>
            )}
            <div className="mt-3 font-mono text-4xl font-bold text-[var(--primary-container)]">
              {Math.round((f4Teams[0]?.championshipOdds || 0) * 100)}%
            </div>
            <div className="text-xs text-slate-400 mt-1">implied probability to win championship</div>
            <button className="mt-4 w-full py-2.5 text-xs font-bold uppercase tracking-widest rounded-md bg-[var(--primary-container)] text-white hover:brightness-110 transition-all cursor-pointer">
              Trade Championship
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Path to Championship calculator
function PathCalculator({ teams }: { teams: TeamProfile[] }) {
  const [selectedTeam, setSelectedTeam] = useState<TeamProfile | null>(null);
  const top16 = teams.filter(t => t.championshipOdds !== null).slice(0, 16);

  if (top16.length === 0) return null;

  // Calculate path probability through rounds
  const getPathOdds = (team: TeamProfile) => {
    const rounds = ['S16', 'E8', 'F4', 'CHAMP', 'WINNER'];
    const roundMarkets = team.markets.filter(m => m.round && rounds.includes(m.round));

    // If we have the championship market, that's the path probability
    if (team.championshipOdds) {
      return {
        overall: team.championshipOdds,
        rounds: roundMarkets.map(m => ({
          round: m.round!,
          odds: m.yesPrice,
          title: m.title,
        })),
      };
    }
    return { overall: 0, rounds: [] };
  };

  return (
    <div className="mt-8 p-5 bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[var(--tertiary)]">route</span>
        <h4 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
          Path to Championship
        </h4>
      </div>
      <p className="text-[10px] text-[var(--secondary)] mb-4 uppercase tracking-wider">Select a team to see their implied path probability</p>

      {/* Team selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {top16.map(team => (
          <button
            key={team.name}
            onClick={() => setSelectedTeam(selectedTeam?.name === team.name ? null : team)}
            className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
              selectedTeam?.name === team.name
                ? 'bg-[var(--primary-container)] text-white'
                : 'bg-[var(--surface-container-low)] text-[var(--secondary)] hover:text-[var(--on-surface)]'
            }`}
          >
            {team.name}
          </button>
        ))}
      </div>

      {/* Path display */}
      {selectedTeam && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {['S16', 'E8', 'F4', 'CHAMP'].map((round, i) => {
              const roundLabels: Record<string, string> = { S16: 'Sweet 16', E8: 'Elite 8', F4: 'Final Four', CHAMP: 'Champion' };
              const pathData = getPathOdds(selectedTeam);
              const roundMarket = pathData.rounds.find(r => r.round === round);
              const roundOdds = roundMarket ? Math.round(roundMarket.odds * 100) : null;

              return (
                <div key={round} className="flex items-center gap-3">
                  <div className="text-center shrink-0">
                    <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-1">{roundLabels[round]}</div>
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center font-mono font-bold text-lg ${
                      roundOdds !== null ? 'bg-[var(--yes-bg)] text-[var(--yes)]' : 'bg-[var(--surface-container-high)] text-[var(--secondary)]'
                    }`}>
                      {roundOdds !== null ? `${roundOdds}%` : '—'}
                    </div>
                  </div>
                  {i < 3 && (
                    <span className="material-symbols-outlined text-[var(--secondary)] text-sm shrink-0">chevron_right</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Overall championship odds */}
          <div className="flex items-center justify-between p-3 bg-[var(--on-surface)] rounded-lg">
            <span className="text-xs text-slate-400 uppercase tracking-widest">Championship Probability</span>
            <span className="font-mono text-xl font-bold text-[var(--primary-container)]">
              {Math.round((selectedTeam.championshipOdds || 0) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BracketVisualizer({ teams }: BracketVisualizerProps) {
  const regions = assignRegions(teams);

  if (teams.length === 0) return null;

  return (
    <div className="space-y-8">
      {/* Regional brackets in 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {REGIONS.map(region => (
          <RegionBracket key={region} region={region} teams={regions[region]} />
        ))}
      </div>

      {/* Final Four */}
      <FinalFourSection teams={regions} />

      {/* Path Calculator */}
      <PathCalculator teams={teams} />
    </div>
  );
}
