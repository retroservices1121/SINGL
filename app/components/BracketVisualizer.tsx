'use client';

import { useState, useEffect } from 'react';
import type { TeamProfile } from '@/app/lib/ncaa';
import { useTradeStore } from '@/app/store/tradeStore';

// ── Types from the bracket API ─────────────────────────────────────────────

interface BracketTeam {
  name: string;
  nameShort: string;
  seed: number;
  isWinner: boolean;
  score: number | null;
}

interface BracketGame {
  id: string;
  round: number;
  roundName: string;
  region: string;
  gameState: 'P' | 'I' | 'F';
  startTime: string | null;
  score: [number, number] | null;
  winnerIndex: number | null;
  feedsInto: string | null;
  teams: BracketTeam[];
}

interface BracketRegion {
  name: string;
  games: BracketGame[];
}

interface BracketResponse {
  regions: BracketRegion[];
  finalFour: BracketGame[];
  championship: BracketGame | null;
  teams: Array<{ name: string; nameShort: string; seed: number; region: string }>;
}

// ── Props ──────────────────────────────────────────────────────────────────

interface BracketVisualizerProps {
  teams: TeamProfile[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function findMarketForTeam(teamShort: string, profiles: TeamProfile[]): TeamProfile | null {
  const lower = teamShort.toLowerCase();
  return (
    profiles.find(p => p.name.toLowerCase() === lower) ||
    profiles.find(p => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase())) ||
    null
  );
}

// ── Game Card Component ────────────────────────────────────────────────────

/**
 * Find the matchup market for a specific game between two teams.
 * Matchup markets have marketType === 'matchup' and contain both team names.
 * YES price = probability that the first listed team wins.
 */
function findMatchupMarket(
  teamShort: string,
  otherTeamShort: string | undefined,
  profiles: TeamProfile[],
): { odds: number; market: import('@/app/lib/ncaa').ParsedMarket } | null {
  if (!otherTeamShort) return null;

  const profile = findMarketForTeam(teamShort, profiles);
  if (!profile) return null;

  // Search this team's markets for a matchup involving the other team
  for (const m of profile.markets) {
    if (m.marketType !== 'matchup') continue;
    const titleLower = m.title.toLowerCase();
    const otherLower = otherTeamShort.toLowerCase();

    // Check if the matchup title contains the other team
    const otherProfile = findMarketForTeam(otherTeamShort, profiles);
    const otherName = otherProfile?.name?.toLowerCase() || otherLower;

    if (titleLower.includes(otherLower) || titleLower.includes(otherName)) {
      // YES price = first team listed wins. Figure out if "our" team is first or second.
      const teamLower = (profile.name || teamShort).toLowerCase();
      const teamPos = titleLower.indexOf(teamLower);
      const otherPos = titleLower.indexOf(otherName) !== -1
        ? titleLower.indexOf(otherName)
        : titleLower.indexOf(otherLower);

      // If our team appears first in the title, YES = our team wins
      // If our team appears second, NO = our team wins → odds = noPrice
      const isFirstTeam = teamPos < otherPos;
      const odds = isFirstTeam ? m.yesPrice : m.noPrice;
      return { odds, market: m };
    }
  }

  return null;
}

function GameCard({
  game,
  profiles,
  compact,
}: {
  game: BracketGame;
  profiles: TeamProfile[];
  compact?: boolean;
}) {
  const openTrade = useTradeStore(s => s.openTrade);

  const renderTeamSlot = (team: BracketTeam | undefined, position: 'top' | 'bottom', otherTeam?: BracketTeam) => {
    const isTBD = !team || team.nameShort === 'TBD' || team.seed === 0;

    if (isTBD) {
      return (
        <div
          className={`flex items-center justify-between px-3 ${compact ? 'py-1.5' : 'py-2'} bg-[var(--surface-container-high)] ${
            position === 'top' ? 'rounded-t-lg border-b border-[var(--surface-container-highest)]' : 'rounded-b-lg'
          }`}
        >
          <span className="text-[10px] text-[var(--secondary)] italic">TBD</span>
        </div>
      );
    }

    const profile = findMarketForTeam(team.nameShort, profiles);
    const isWinner = team.isWinner;
    const isLoser = game.gameState === 'F' && !team.isWinner && otherTeam?.isWinner;
    const isLive = game.gameState === 'I';

    // For pending games, prefer game-level matchup odds over championship odds
    let odds: number | null = null;
    let tradeMarket = profile?.championshipMarket || null;

    if (game.gameState === 'P' && otherTeam && otherTeam.nameShort !== 'TBD') {
      const matchup = findMatchupMarket(team.nameShort, otherTeam.nameShort, profiles);
      if (matchup) {
        odds = Math.round(matchup.odds * 100);
        tradeMarket = matchup.market;
      }
    }

    // Fall back to championship odds if no matchup market found
    if (odds === null && profile?.championshipOdds) {
      odds = Math.round(profile.championshipOdds * 100);
    }

    return (
      <div
        className={`flex items-center justify-between px-3 ${compact ? 'py-1.5' : 'py-2'} transition-all group ${
          position === 'top' ? 'rounded-t-lg border-b border-[var(--surface-container-highest)]' : 'rounded-b-lg'
        } ${
          isWinner
            ? 'bg-[var(--surface-container-lowest)]'
            : isLoser
            ? 'bg-[var(--surface-container-high)] opacity-60'
            : 'bg-[var(--surface-container-low)]'
        } ${tradeMarket ? 'cursor-pointer hover:bg-[var(--surface-container)]' : ''}`}
        onClick={() => tradeMarket && openTrade(tradeMarket, 'yes')}
      >
        <div className="flex items-center gap-2 min-w-0">
          {team.seed > 0 && (
            <span className="text-[9px] font-bold text-[var(--secondary)] bg-[var(--surface-container-high)] px-1 py-0.5 rounded shrink-0">
              {team.seed}
            </span>
          )}
          <span
            className={`font-heading font-bold uppercase tracking-tight truncate ${compact ? 'text-[10px]' : 'text-xs'} ${
              isWinner ? 'text-[var(--on-surface)]' : isLoser ? 'text-[var(--secondary)]' : 'text-[var(--on-surface)]'
            }`}
          >
            {team.nameShort}
          </span>
          {isWinner && game.gameState === 'F' && (
            <span className="material-symbols-outlined text-[10px] text-[var(--yes)]">check_circle</span>
          )}
          {isLive && (
            <span className="inline-flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">Live</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Show score for completed/live games */}
          {(game.gameState === 'F' || game.gameState === 'I') && team.score != null && (
            <span
              className={`font-mono font-bold ${compact ? 'text-[10px]' : 'text-xs'} ${
                isWinner ? 'text-[var(--on-surface)]' : 'text-[var(--secondary)]'
              }`}
            >
              {team.score}
            </span>
          )}
          {/* Show odds for future games */}
          {game.gameState === 'P' && odds !== null && (
            <span className={`font-mono font-bold ${compact ? 'text-[10px]' : 'text-xs'} text-[var(--yes)]`}>
              {odds > 0 ? `${odds}%` : '<1%'}
            </span>
          )}
          {tradeMarket && (
            <span className="material-symbols-outlined text-[10px] text-[var(--secondary)] opacity-0 group-hover:opacity-100 transition-opacity">
              arrow_forward
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full rounded-lg shadow-ambient overflow-hidden border border-[var(--surface-container-high)]">
      {renderTeamSlot(game.teams[0], 'top', game.teams[1])}
      {renderTeamSlot(game.teams[1], 'bottom', game.teams[0])}
    </div>
  );
}

// ── Region Bracket Component ───────────────────────────────────────────────

function RegionBracket({
  region,
  profiles,
}: {
  region: BracketRegion;
  profiles: TeamProfile[];
}) {
  // Group games by round
  const gamesByRound = new Map<number, BracketGame[]>();
  for (const g of region.games) {
    const arr = gamesByRound.get(g.round) || [];
    arr.push(g);
    gamesByRound.set(g.round, arr);
  }

  // Only show Sweet 16 (round 4) and Elite Eight (round 5)
  const s16Games = gamesByRound.get(4) || [];
  const e8Games = gamesByRound.get(5) || [];
  const regionWinner = e8Games.length > 0 && e8Games[0].gameState === 'F'
    ? e8Games[0].teams.find(t => t.isWinner)
    : null;

  return (
    <div className="space-y-3">
      {/* Region Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-[var(--primary-container)]" />
          <h4 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
            {region.name} Region
          </h4>
        </div>
        {regionWinner && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[var(--primary-fixed)] rounded text-[9px]">
            <span className="material-symbols-outlined text-[10px] text-[var(--primary)]">arrow_forward</span>
            <span className="font-bold text-[var(--primary)] uppercase tracking-wider">
              {regionWinner.nameShort} to Final Four
            </span>
          </div>
        )}
      </div>

      {/* Bracket layout: S16 → connector → E8 → projected winner */}
      <div className="flex items-center gap-3">
        {/* Sweet 16 matchups */}
        <div className="flex flex-col gap-4 w-[45%] shrink-0">
          {s16Games.map(game => (
            <GameCard key={game.id} game={game} profiles={profiles} />
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
          {e8Games.map(game => (
            <GameCard key={game.id} game={game} profiles={profiles} compact />
          ))}
          {/* Projected region winner */}
          {regionWinner && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-[var(--primary-fixed)] rounded text-[10px]">
              <span className="material-symbols-outlined text-[12px] text-[var(--primary)]">arrow_forward</span>
              <span className="font-bold text-[var(--primary)] uppercase tracking-wider">{regionWinner.nameShort}</span>
              {(() => {
                const profile = findMarketForTeam(regionWinner.nameShort, profiles);
                const odds = profile?.championshipOdds ? Math.round(profile.championshipOdds * 100) : null;
                return odds ? <span className="font-mono text-[var(--primary)] ml-auto">{odds}%</span> : null;
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Final Four Section ─────────────────────────────────────────────────────

function FinalFourSection({
  finalFour,
  championship,
  profiles,
}: {
  finalFour: BracketGame[];
  championship: BracketGame | null;
  profiles: TeamProfile[];
}) {
  const openTrade = useTradeStore(s => s.openTrade);

  if (finalFour.length === 0 && !championship) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[var(--primary-container)]">emoji_events</span>
        <h4 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
          Final Four & Championship
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {finalFour.map((game, i) => (
          <div key={game.id} className="space-y-3">
            <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">
              Semifinal {i + 1}
            </div>
            <div className="rounded-xl border border-[var(--surface-container-high)] overflow-hidden shadow-ambient">
              {game.teams.map((team, ti) => {
                const isTBD = !team || team.nameShort === 'TBD' || team.seed === 0;
                const profile = !isTBD ? findMarketForTeam(team.nameShort, profiles) : null;
                const isWinner = team.isWinner && game.gameState === 'F';
                const isLive = game.gameState === 'I';
                const odds = profile?.championshipOdds ? Math.round(profile.championshipOdds * 100) : null;

                if (isTBD) {
                  return (
                    <div
                      key={ti}
                      className={`px-4 py-3 bg-[var(--surface-container-low)] ${
                        ti === 0 ? 'border-b border-[var(--surface-container-high)]' : ''
                      }`}
                    >
                      <span className="text-[10px] text-[var(--secondary)] italic">TBD</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={team.nameShort}
                    className={`flex items-center justify-between px-4 py-3 transition-all ${
                      ti === 0 ? 'border-b border-[var(--surface-container-high)]' : ''
                    } ${isWinner ? 'bg-[var(--surface-container-lowest)]' : 'bg-[var(--surface-container-low)]'} ${
                      profile?.championshipMarket ? 'cursor-pointer hover:bg-[var(--surface-container)]' : ''
                    }`}
                    onClick={() => profile?.championshipMarket && openTrade(profile.championshipMarket, 'yes')}
                  >
                    <div className="flex items-center gap-2">
                      {team.seed > 0 && (
                        <span className="text-[9px] font-bold text-white bg-[var(--on-surface)] px-1.5 py-0.5 rounded">
                          {team.seed}
                        </span>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-heading font-black text-sm uppercase tracking-tight text-[var(--on-surface)]">
                            {team.nameShort}
                          </span>
                          {isWinner && (
                            <span className="material-symbols-outlined text-[12px] text-[var(--yes)]">check_circle</span>
                          )}
                          {isLive && (
                            <span className="inline-flex items-center gap-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[8px] font-bold text-red-400 uppercase">Live</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {(game.gameState === 'F' || game.gameState === 'I') && team.score != null ? (
                        <div className={`font-mono font-bold text-lg ${isWinner ? 'text-[var(--on-surface)]' : 'text-[var(--secondary)]'}`}>
                          {team.score}
                        </div>
                      ) : odds !== null ? (
                        <>
                          <div className="font-mono font-bold text-lg text-[var(--on-surface)]">{odds}%</div>
                          <div className="text-[9px] text-[var(--secondary)]">to win it all</div>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Championship Game */}
      {championship && (
        <div className="mt-6">
          <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center mb-3">
            Championship
          </div>

          {championship.teams.some(t => t.nameShort !== 'TBD' && t.seed > 0) ? (
            <div className="max-w-sm mx-auto rounded-xl border border-[var(--surface-container-high)] overflow-hidden shadow-ambient">
              {championship.teams.map((team, ti) => {
                const isTBD = team.nameShort === 'TBD' || team.seed === 0;
                const profile = !isTBD ? findMarketForTeam(team.nameShort, profiles) : null;
                const isWinner = team.isWinner && championship.gameState === 'F';
                const odds = profile?.championshipOdds ? Math.round(profile.championshipOdds * 100) : null;

                if (isTBD) {
                  return (
                    <div
                      key={ti}
                      className={`px-4 py-3 bg-[var(--surface-container-low)] ${
                        ti === 0 ? 'border-b border-[var(--surface-container-high)]' : ''
                      }`}
                    >
                      <span className="text-[10px] text-[var(--secondary)] italic">TBD</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={team.nameShort}
                    className={`flex items-center justify-between px-4 py-4 transition-all ${
                      ti === 0 ? 'border-b border-[var(--surface-container-high)]' : ''
                    } ${isWinner ? 'bg-[var(--surface-container-lowest)]' : 'bg-[var(--surface-container-low)]'} ${
                      profile?.championshipMarket ? 'cursor-pointer hover:bg-[var(--surface-container)]' : ''
                    }`}
                    onClick={() => profile?.championshipMarket && openTrade(profile.championshipMarket, 'yes')}
                  >
                    <div className="flex items-center gap-2">
                      {team.seed > 0 && (
                        <span className="text-[9px] font-bold text-white bg-[var(--on-surface)] px-1.5 py-0.5 rounded">
                          {team.seed}
                        </span>
                      )}
                      <span className="font-heading font-black text-sm uppercase tracking-tight text-[var(--on-surface)]">
                        {team.nameShort}
                      </span>
                      {isWinner && (
                        <span className="material-symbols-outlined text-[14px] text-[var(--yes)]">emoji_events</span>
                      )}
                    </div>
                    <div className="text-right">
                      {championship.gameState === 'F' && team.score != null ? (
                        <span className={`font-mono font-bold text-xl ${isWinner ? 'text-[var(--on-surface)]' : 'text-[var(--secondary)]'}`}>
                          {team.score}
                        </span>
                      ) : odds !== null ? (
                        <span className="font-mono font-bold text-lg text-[var(--yes)]">{odds}%</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // TBD championship - show projected champion from Polymarket odds
            (() => {
              const topTeam = profiles.filter(p => p.championshipOdds).sort((a, b) => (b.championshipOdds || 0) - (a.championshipOdds || 0))[0];
              if (!topTeam) return null;
              return (
                <div
                  className="max-w-sm mx-auto bg-[var(--on-surface)] rounded-xl p-5 text-white text-center cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden"
                  onClick={() => topTeam.championshipMarket && openTrade(topTeam.championshipMarket, 'yes')}
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-[var(--primary-container)]/20 rounded-full blur-2xl" />
                  <span className="material-symbols-outlined text-4xl text-[var(--primary-container)] mb-2">emoji_events</span>
                  <h3 className="font-heading font-black text-2xl uppercase tracking-tight mb-1">{topTeam.name}</h3>
                  {topTeam.seed && (
                    <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded">{topTeam.seed}-seed</span>
                  )}
                  <div className="mt-3 font-mono text-4xl font-bold text-[var(--primary-container)]">
                    {Math.round((topTeam.championshipOdds || 0) * 100)}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">market-implied favorite</div>
                  <button className="mt-4 w-full py-2.5 text-xs font-bold uppercase tracking-widest rounded-md bg-[var(--primary-container)] text-white hover:brightness-110 transition-all cursor-pointer">
                    Trade Championship
                  </button>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}

// ── Path Calculator (kept from original) ───────────────────────────────────

function PathCalculator({ teams }: { teams: TeamProfile[] }) {
  const [selectedTeam, setSelectedTeam] = useState<TeamProfile | null>(null);
  const top16 = teams.filter(t => t.championshipOdds !== null).slice(0, 16);

  if (top16.length === 0) return null;

  const getPathOdds = (team: TeamProfile) => {
    const rounds = ['S16', 'E8', 'F4', 'CHAMP', 'WINNER'];
    const roundMarkets = team.markets.filter(m => m.round && rounds.includes(m.round));

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
      <p className="text-[10px] text-[var(--secondary)] mb-4 uppercase tracking-wider">
        Select a team to see their implied path probability
      </p>

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

      {selectedTeam && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {['S16', 'E8', 'F4', 'CHAMP'].map((round, i) => {
              const roundLabels: Record<string, string> = {
                S16: 'Sweet 16',
                E8: 'Elite 8',
                F4: 'Final Four',
                CHAMP: 'Champion',
              };
              const pathData = getPathOdds(selectedTeam);
              const roundMarket = pathData.rounds.find(r => r.round === round);
              const roundOdds = roundMarket ? Math.round(roundMarket.odds * 100) : null;

              return (
                <div key={round} className="flex items-center gap-3">
                  <div className="text-center shrink-0">
                    <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-1">
                      {roundLabels[round]}
                    </div>
                    <div
                      className={`w-16 h-16 rounded-lg flex items-center justify-center font-mono font-bold text-lg ${
                        roundOdds !== null
                          ? 'bg-[var(--yes-bg)] text-[var(--yes)]'
                          : 'bg-[var(--surface-container-high)] text-[var(--secondary)]'
                      }`}
                    >
                      {roundOdds !== null ? `${roundOdds}%` : '\u2014'}
                    </div>
                  </div>
                  {i < 3 && (
                    <span className="material-symbols-outlined text-[var(--secondary)] text-sm shrink-0">
                      chevron_right
                    </span>
                  )}
                </div>
              );
            })}
          </div>

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

// ── Loading skeleton ───────────────────────────────────────────────────────

function BracketSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-3">
          <div className="h-4 w-32 bg-[var(--surface-container-high)] rounded" />
          <div className="flex gap-3">
            {[1, 2, 3].map(j => (
              <div key={j} className="flex-1 space-y-3">
                <div className="h-3 w-16 bg-[var(--surface-container-high)] rounded mx-auto" />
                {[1, 2].map(k => (
                  <div key={k} className="h-16 bg-[var(--surface-container-high)] rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function BracketVisualizer({ teams }: BracketVisualizerProps) {
  const [bracket, setBracket] = useState<BracketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBracket() {
      try {
        setLoading(true);
        const res = await fetch('/api/bracket');
        if (!res.ok) throw new Error(`Failed to fetch bracket: ${res.status}`);
        const data: BracketResponse = await res.json();
        if (!cancelled) {
          setBracket(data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load bracket');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBracket();
    // Refresh every 60 seconds for live games
    const interval = setInterval(fetchBracket, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading && !bracket) return <BracketSkeleton />;

  if (error && !bracket) {
    return (
      <div className="p-6 bg-[var(--surface-container-low)] rounded-xl text-center">
        <span className="material-symbols-outlined text-2xl text-[var(--secondary)] mb-2">error</span>
        <p className="text-xs text-[var(--secondary)]">{error}</p>
      </div>
    );
  }

  if (!bracket) return null;

  return (
    <div className="space-y-8">
      {/* Live indicator if any games are in progress */}
      {bracket.regions.some(r => r.games.some(g => g.gameState === 'I')) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Games in progress</span>
        </div>
      )}

      {/* Regional brackets in 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bracket.regions.map(region => (
          <RegionBracket key={region.name} region={region} profiles={teams} />
        ))}
      </div>

      {/* Final Four */}
      <FinalFourSection
        finalFour={bracket.finalFour}
        championship={bracket.championship}
        profiles={teams}
      />

      {/* Path Calculator */}
      <PathCalculator teams={teams} />
    </div>
  );
}
