'use client';

import { useState, useMemo } from 'react';
import type { CountryProfile, MatchFixture, FIFACountry, ParsedFIFAMarket, FIFARound } from '@/app/lib/fifa';
import { ROUND_LABELS, getKnockoutSchedule } from '@/app/lib/fifa';
import { useTradeStore } from '@/app/store/tradeStore';

type KnockoutRound = 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL';
const KNOCKOUT_ROUNDS: KnockoutRound[] = ['R32', 'R16', 'QF', 'SF', 'FINAL'];
const TAB_ICONS: Record<KnockoutRound, string> = {
  R32: 'grid_view', R16: 'view_comfy_alt', QF: 'trophy', SF: 'social_leaderboard', FINAL: 'emoji_events',
};

interface WorldCupBracketProps {
  profiles: CountryProfile[];
}

function findProfileForCountry(country: FIFACountry | null, profiles: CountryProfile[]): CountryProfile | null {
  if (!country) return null;
  return profiles.find(p => p.country.code === country.code) ||
    profiles.find(p => p.name.toLowerCase() === country.name.toLowerCase()) || null;
}

function findMatchupMarket(home: FIFACountry | null, away: FIFACountry | null, profiles: CountryProfile[]):
  { homeOdds: number; awayOdds: number; market: ParsedFIFAMarket } | null {
  if (!home || !away) return null;
  const homeProfile = findProfileForCountry(home, profiles);
  const awayProfile = findProfileForCountry(away, profiles);
  const allMarkets = [...(homeProfile?.markets || []), ...(awayProfile?.markets || [])];

  for (const m of allMarkets) {
    if (m.fifaMarketType !== 'matchup') continue;
    const t = m.title.toLowerCase();
    const hasHome = t.includes(home.name.toLowerCase());
    const hasAway = t.includes(away.name.toLowerCase());
    if (hasHome && hasAway) {
      const homeFirst = t.indexOf(home.name.toLowerCase()) < t.indexOf(away.name.toLowerCase());
      return { homeOdds: homeFirst ? m.yesPrice : m.noPrice, awayOdds: homeFirst ? m.noPrice : m.yesPrice, market: m };
    }
  }
  return null;
}

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function MatchCard({ fixture, profiles, featured }: { fixture: MatchFixture; profiles: CountryProfile[]; featured?: boolean }) {
  const openTrade = useTradeStore(s => s.openTrade);
  const matchup = findMatchupMarket(fixture.home, fixture.away, profiles);

  const renderSlot = (country: FIFACountry | null, label: string, profile: CountryProfile | null, odds: number | null, isTop: boolean) => {
    const champOdds = profile?.championshipOdds ? Math.round(profile.championshipOdds * 100) : null;
    const displayOdds = odds !== null ? Math.round(odds * 100) : champOdds;
    const hasTrade = profile?.championshipMarket || matchup?.market;

    return (
      <div
        className={`flex items-center justify-between ${featured ? 'px-4 py-3' : 'px-3 py-2'} transition-all group ${
          isTop ? 'border-b border-[var(--surface-container-highest)]' : ''
        } bg-[var(--surface-container-low)] ${hasTrade ? 'cursor-pointer hover:bg-[var(--surface-container)]' : ''}`}
        onClick={() => {
          if (matchup?.market) openTrade(matchup.market, 'yes');
          else if (profile?.championshipMarket) openTrade(profile.championshipMarket, 'yes');
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {country ? (
            <>
              <span className={`${featured ? 'text-xl' : 'text-base'} shrink-0`}>{country.flag}</span>
              <div className="min-w-0">
                <span className={`font-heading font-black uppercase tracking-tight truncate ${featured ? 'text-sm' : 'text-[11px]'} text-[var(--on-surface)]`}>
                  {country.name}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-bold text-[var(--secondary)]">Grp {country.group}</span>
                  <span className="text-[8px] text-[var(--secondary)]">#{country.fifaRanking}</span>
                </div>
              </div>
            </>
          ) : (
            <span className={`${featured ? 'text-xs' : 'text-[10px]'} text-[var(--secondary)] italic truncate`}>{label}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {displayOdds !== null && displayOdds > 0 && (
            <span className={`font-mono font-bold ${featured ? 'text-sm' : 'text-[11px]'} text-[var(--yes)]`}>{displayOdds}%</span>
          )}
          {hasTrade && (
            <span className="material-symbols-outlined text-[10px] text-[var(--secondary)] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
          )}
        </div>
      </div>
    );
  };

  const homeProfile = findProfileForCountry(fixture.home, profiles);
  const awayProfile = findProfileForCountry(fixture.away, profiles);

  return (
    <div className={`${featured ? 'rounded-xl' : 'rounded-lg'} shadow-ambient overflow-hidden border border-[var(--surface-container-high)] hover:scale-[1.02] transition-all duration-200`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--surface-container-high)]">
        <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest">#{fixture.matchNumber}</span>
        <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest">{formatDate(fixture.date)} {fixture.time}</span>
      </div>
      {renderSlot(fixture.home, fixture.homeLabel, homeProfile, matchup?.homeOdds ?? null, true)}
      {renderSlot(fixture.away, fixture.awayLabel, awayProfile, matchup?.awayOdds ?? null, false)}
    </div>
  );
}

function FinalCard({ fixture, profiles }: { fixture: MatchFixture; profiles: CountryProfile[] }) {
  const openTrade = useTradeStore(s => s.openTrade);
  const topTeam = profiles.filter(p => p.championshipOdds).sort((a, b) => (b.championshipOdds || 0) - (a.championshipOdds || 0))[0];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-container-lowest)] rounded-full shadow-ambient">
          <span className="material-symbols-outlined text-[var(--primary-container)] text-xl">emoji_events</span>
          <span className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">2026 FIFA World Cup Final</span>
        </div>
        <div className="mt-2 text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">
          {formatDate(fixture.date)} &middot; {fixture.venue} &middot; {fixture.city}
        </div>
      </div>
      <div className="max-w-md mx-auto">
        <MatchCard fixture={fixture} profiles={profiles} featured />
      </div>
      {!fixture.home && !fixture.away && topTeam && (
        <div
          className="max-w-sm mx-auto bg-[var(--on-surface)] rounded-xl p-6 text-center cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden"
          onClick={() => topTeam.championshipMarket && openTrade(topTeam.championshipMarket, 'yes')}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[var(--primary-container)]/20 rounded-full blur-2xl" />
          <span className="material-symbols-outlined text-4xl text-[var(--primary-container)] mb-2">emoji_events</span>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">{topTeam.country.flag}</span>
            <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white">{topTeam.name}</h3>
          </div>
          <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded text-white">
            #{topTeam.country.fifaRanking} FIFA &middot; Group {topTeam.country.group}
          </span>
          <div className="mt-3 font-mono text-4xl font-bold text-[var(--primary-container)]">
            {Math.round((topTeam.championshipOdds || 0) * 100)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">market-implied favorite</div>
          <button className="mt-4 w-full py-2.5 text-xs font-bold uppercase tracking-widest rounded-md bg-[var(--primary-container)] text-white hover:brightness-110 transition-all cursor-pointer">
            Trade Championship
          </button>
        </div>
      )}
    </div>
  );
}

function PathToFinal({ profiles }: { profiles: CountryProfile[] }) {
  const [selectedTeam, setSelectedTeam] = useState<CountryProfile | null>(null);
  const top16 = profiles.filter(p => p.championshipOdds !== null).slice(0, 16);
  if (top16.length === 0) return null;

  const displayRounds: { key: FIFARound; label: string }[] = [
    { key: 'R32', label: 'Rd of 32' }, { key: 'R16', label: 'Rd of 16' },
    { key: 'QF', label: 'Quarter' }, { key: 'SF', label: 'Semi' },
    { key: 'FINAL', label: 'Final' }, { key: 'WINNER', label: 'Champion' },
  ];

  return (
    <div className="mt-8 p-5 bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[var(--tertiary)]">route</span>
        <h4 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">Path to the Final</h4>
      </div>
      <p className="text-[10px] text-[var(--secondary)] mb-4 uppercase tracking-wider">Select a team to see their implied knockout path probability</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {top16.map(team => (
          <button
            key={team.name}
            onClick={() => setSelectedTeam(selectedTeam?.name === team.name ? null : team)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
              selectedTeam?.name === team.name ? 'bg-[var(--primary-container)] text-white' : 'bg-[var(--surface-container-low)] text-[var(--secondary)] hover:text-[var(--on-surface)]'
            }`}
          >
            <span className="text-sm">{team.country.flag}</span>
            {team.name}
          </button>
        ))}
      </div>

      {selectedTeam && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--surface-container-high)]">
            <span className="text-3xl">{selectedTeam.country.flag}</span>
            <div>
              <h5 className="font-heading font-black text-lg uppercase tracking-tight text-[var(--on-surface)]">{selectedTeam.name}</h5>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest">Group {selectedTeam.country.group}</span>
                <span className="text-[9px] font-bold text-[var(--secondary)]">#{selectedTeam.country.fifaRanking} FIFA</span>
              </div>
            </div>
          </div>

          {(selectedTeam.groupAdvancementOdds || selectedTeam.groupWinOdds) && (
            <div className="flex gap-2 mb-2">
              {selectedTeam.groupWinOdds && (
                <div className="text-center px-3 py-2 bg-[var(--surface-container)] rounded-lg flex-1">
                  <div className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Win Group</div>
                  <div className="font-mono font-bold text-sm text-[var(--yes)]">{Math.round(selectedTeam.groupWinOdds * 100)}%</div>
                </div>
              )}
              {selectedTeam.groupAdvancementOdds && (
                <div className="text-center px-3 py-2 bg-[var(--surface-container)] rounded-lg flex-1">
                  <div className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Advance</div>
                  <div className="font-mono font-bold text-sm text-[var(--yes)]">{Math.round(selectedTeam.groupAdvancementOdds * 100)}%</div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {displayRounds.map((r, i) => {
              const roundMarket = selectedTeam.markets.find(m => m.round === r.key);
              const roundOdds = roundMarket ? Math.round(roundMarket.yesPrice * 100) : null;
              return (
                <div key={r.key} className="flex items-center gap-3">
                  <div className="text-center shrink-0">
                    <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-1">{r.label}</div>
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center font-mono font-bold text-lg ${
                      roundOdds !== null ? 'bg-[var(--yes-bg)] text-[var(--yes)]' : 'bg-[var(--surface-container-high)] text-[var(--secondary)]'
                    }`}>
                      {roundOdds !== null ? `${roundOdds}%` : '\u2014'}
                    </div>
                  </div>
                  {i < displayRounds.length - 1 && (
                    <span className="material-symbols-outlined text-[var(--secondary)] text-sm shrink-0">chevron_right</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between p-3 bg-[var(--on-surface)] rounded-lg">
            <span className="text-xs text-slate-400 uppercase tracking-widest">Championship Probability</span>
            <span className="font-mono text-xl font-bold text-[var(--primary-container)]">{Math.round((selectedTeam.championshipOdds || 0) * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorldCupBracket({ profiles }: WorldCupBracketProps) {
  const [activeRound, setActiveRound] = useState<KnockoutRound>('R32');
  const fixtures = useMemo(() => getKnockoutSchedule(), []);

  const roundFixtures = fixtures.filter(f => f.round === activeRound);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--primary-container)]">account_tree</span>
        <h3 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">Knockout Bracket</h3>
      </div>

      {/* Round tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-container-high)] rounded-xl overflow-x-auto">
        {KNOCKOUT_ROUNDS.map(round => {
          const isActive = activeRound === round;
          const count = fixtures.filter(f => f.round === round).length;
          return (
            <button
              key={round}
              onClick={() => setActiveRound(round)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                isActive ? 'bg-[var(--surface-container-lowest)] text-[var(--on-surface)] shadow-ambient' : 'text-[var(--secondary)] hover:text-[var(--on-surface)]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{TAB_ICONS[round]}</span>
              <span className="hidden sm:inline">{ROUND_LABELS[round]}</span>
              <span className="sm:hidden">{round === 'FINAL' ? 'Final' : round}</span>
              {count > 1 && (
                <span className={`text-[8px] px-1 py-0.5 rounded ${isActive ? 'bg-[var(--primary-container)] text-white' : 'bg-[var(--surface-container-highest)] text-[var(--secondary)]'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeRound === 'FINAL' ? (
        (() => {
          const finalFixture = fixtures.find(f => f.round === 'FINAL');
          return finalFixture ? <FinalCard fixture={finalFixture} profiles={profiles} /> : null;
        })()
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-[var(--primary-container)]" />
              <h4 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
                {ROUND_LABELS[activeRound]} &mdash; {roundFixtures.length} Matches
              </h4>
            </div>
          </div>
          <div className={`grid gap-3 ${
            activeRound === 'R32' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              : activeRound === 'R16' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2'
          }`}>
            {roundFixtures.map(f => <MatchCard key={f.id} fixture={f} profiles={profiles} />)}
          </div>
        </div>
      )}

      <PathToFinal profiles={profiles} />
    </div>
  );
}
