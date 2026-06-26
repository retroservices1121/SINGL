'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CountryProfile,
  MatchFixture,
  FIFACountry,
  ParsedFIFAMarket,
  FIFARound,
} from '@/app/lib/fifa';
import { ROUND_LABELS, getKnockoutSchedule } from '@/app/lib/fifa';
import CountryFlag from './CountryFlag';

interface WorldCupBracketProps {
  profiles: CountryProfile[];
}

const ROUND_ORDER: FIFARound[] = ['R32', 'R16', 'QF', 'SF', 'FINAL'];

function findProfileForCountry(
  country: FIFACountry | null,
  profiles: CountryProfile[],
): CountryProfile | null {
  if (!country) return null;
  return (
    profiles.find(p => p.country.code === country.code) ||
    profiles.find(p => p.name.toLowerCase() === country.name.toLowerCase()) ||
    null
  );
}

const EPS = 0.001;
function realChampOdds(p: CountryProfile | null): number | null {
  if (!p?.championshipOdds) return null;
  if (Math.abs(p.championshipOdds - 0.5) <= EPS) return null;
  return p.championshipOdds;
}

function MatchSlot({
  country,
  fallbackLabel,
  profile,
  isTop,
  onTrade,
}: {
  country: FIFACountry | null;
  fallbackLabel: string;
  profile: CountryProfile | null;
  isTop: boolean;
  onTrade: (market: ParsedFIFAMarket) => void;
}) {
  const odds = realChampOdds(profile);
  const market = profile?.championshipMarket && odds !== null ? profile.championshipMarket : null;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); if (market) onTrade(market); }}
      className={`flex items-center gap-1.5 px-2 py-1.5 ${
        isTop ? 'border-b border-[var(--surface-container)]' : ''
      } ${market ? 'cursor-pointer hover:bg-[var(--surface-container-low)]' : ''}`}
    >
      {country ? (
        <>
          <CountryFlag country={country} className="w-4 h-3 shrink-0" />
          <span className="text-[10px] font-bold text-[var(--on-surface)] truncate flex-1">
            {country.name}
          </span>
        </>
      ) : (
        <span className="text-[9px] text-[var(--secondary)] italic truncate flex-1">
          {fallbackLabel}
        </span>
      )}
      {odds !== null && (
        <span className="font-mono text-[9px] font-bold text-[var(--yes)] shrink-0">
          {Math.round(odds * 100)}%
        </span>
      )}
    </div>
  );
}

function MiniMatch({
  fixture,
  profiles,
  onTrade,
}: {
  fixture: MatchFixture;
  profiles: CountryProfile[];
  onTrade: (market: ParsedFIFAMarket) => void;
}) {
  const homeProfile = findProfileForCountry(fixture.home, profiles);
  const awayProfile = findProfileForCountry(fixture.away, profiles);
  return (
    <div className="rounded-md border border-[var(--surface-container-high)] bg-[var(--surface-container-lowest)] shadow-sm overflow-hidden w-[170px]">
      <div className="px-2 py-0.5 bg-[var(--surface-container-high)] text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center">
        #{fixture.matchNumber}
      </div>
      <MatchSlot
        country={fixture.home}
        fallbackLabel={fixture.homeLabel}
        profile={homeProfile}
        isTop
        onTrade={onTrade}
      />
      <MatchSlot
        country={fixture.away}
        fallbackLabel={fixture.awayLabel}
        profile={awayProfile}
        isTop={false}
        onTrade={onTrade}
      />
    </div>
  );
}

function RoundColumn({
  label,
  matches,
  profiles,
  onTrade,
}: {
  label: string;
  matches: MatchFixture[];
  profiles: CountryProfile[];
  onTrade: (market: ParsedFIFAMarket) => void;
}) {
  return (
    <div className="flex flex-col shrink-0 w-[180px]">
      <h4 className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center mb-3">
        {label}
      </h4>
      <div className="flex-1 flex flex-col justify-around gap-3 min-h-[520px]">
        {matches.map(m => (
          <MiniMatch key={m.id} fixture={m} profiles={profiles} onTrade={onTrade} />
        ))}
      </div>
    </div>
  );
}

function ChampionColumn({
  profiles,
  onTrade,
}: {
  profiles: CountryProfile[];
  onTrade: (market: ParsedFIFAMarket) => void;
}) {
  const topTeam = useMemo(
    () =>
      profiles
        .filter(p => realChampOdds(p) !== null)
        .sort((a, b) => (b.championshipOdds || 0) - (a.championshipOdds || 0))[0] || null,
    [profiles],
  );
  return (
    <div className="flex flex-col shrink-0 w-[180px]">
      <h4 className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest text-center mb-3">
        Champion
      </h4>
      <div className="flex-1 flex items-center justify-center min-h-[520px]">
        <div className="w-full text-center rounded-xl border-2 border-[var(--primary-container)] bg-[var(--surface-container-high)] p-4 shadow-ambient relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-[var(--primary-container)]/20 rounded-full blur-xl" />
          <span className="material-symbols-outlined text-3xl text-[var(--primary-container)]">
            emoji_events
          </span>
          {topTeam ? (
            <>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <CountryFlag country={topTeam.country} className="w-6 h-4" />
                <span className="font-heading font-black text-sm text-white uppercase tracking-tight">
                  {topTeam.name}
                </span>
              </div>
              <div className="font-mono text-2xl font-black text-[var(--primary-container)] mt-2">
                {Math.round((topTeam.championshipOdds || 0) * 100)}%
              </div>
              <div className="text-[9px] text-[var(--secondary)] uppercase tracking-widest mt-0.5">
                Market favorite
              </div>
              {topTeam.championshipMarket && (
                <button
                  onClick={(e) => { e.stopPropagation(); onTrade(topTeam.championshipMarket!); }}
                  className="mt-3 w-full py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md bg-[var(--primary-container)] text-white hover:brightness-110 transition-all cursor-pointer"
                >
                  Trade
                </button>
              )}
            </>
          ) : (
            <div className="text-[10px] text-[var(--secondary)] italic mt-2">No leader yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PathToFinal({
  profiles,
  onTrade,
}: {
  profiles: CountryProfile[];
  onTrade: (market: ParsedFIFAMarket) => void;
}) {
  const [selectedTeam, setSelectedTeam] = useState<CountryProfile | null>(null);
  const top16 = profiles.filter(p => realChampOdds(p) !== null).slice(0, 16);
  if (top16.length === 0) return null;

  const displayRounds: { key: FIFARound; label: string }[] = [
    { key: 'R32', label: 'Rd 32' },
    { key: 'R16', label: 'Rd 16' },
    { key: 'QF', label: 'QF' },
    { key: 'SF', label: 'SF' },
    { key: 'FINAL', label: 'Final' },
    { key: 'WINNER', label: 'Champ' },
  ];

  return (
    <div className="mt-8 p-5 bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[var(--tertiary)]">route</span>
        <h4 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
          Path to the Final
        </h4>
      </div>
      <p className="text-[10px] text-[var(--secondary)] mb-4 uppercase tracking-wider">
        Pick a team to see their implied knockout path probability
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {top16.map(team => (
          <button
            key={team.name}
            onClick={() => setSelectedTeam(selectedTeam?.name === team.name ? null : team)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
              selectedTeam?.name === team.name
                ? 'bg-[var(--primary-container)] text-white'
                : 'bg-[var(--surface-container-low)] text-[var(--secondary)] hover:text-[var(--on-surface)]'
            }`}
          >
            <CountryFlag country={team.country} className="w-5 h-3.5" />
            {team.name}
          </button>
        ))}
      </div>

      {selectedTeam && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--surface-container-high)]">
            <CountryFlag country={selectedTeam.country} className="w-12 h-8" width={80} />
            <div>
              <h5 className="font-heading font-black text-lg uppercase tracking-tight text-[var(--on-surface)]">
                {selectedTeam.name}
              </h5>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest">
                  Group {selectedTeam.country.group}
                </span>
                <span className="text-[9px] font-bold text-[var(--secondary)]">
                  #{selectedTeam.country.fifaRanking} FIFA
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {displayRounds.map((r, i) => {
              const roundMarket = selectedTeam.markets.find(m => m.round === r.key);
              const roundOdds = roundMarket ? Math.round(roundMarket.yesPrice * 100) : null;
              return (
                <div key={r.key} className="flex items-center gap-3">
                  <div className="text-center shrink-0">
                    <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-1">
                      {r.label}
                    </div>
                    <div
                      className={`w-14 h-14 rounded-lg flex items-center justify-center font-mono font-bold text-base ${
                        roundOdds !== null
                          ? 'bg-[var(--yes-bg)] text-[var(--yes)]'
                          : 'bg-[var(--surface-container-high)] text-[var(--secondary)]'
                      }`}
                    >
                      {roundOdds !== null ? `${roundOdds}%` : '—'}
                    </div>
                  </div>
                  {i < displayRounds.length - 1 && (
                    <span className="material-symbols-outlined text-[var(--secondary)] text-sm shrink-0">
                      chevron_right
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {selectedTeam.championshipMarket && (
            <button
              onClick={() => onTrade(selectedTeam.championshipMarket!)}
              className="w-full py-2.5 text-xs font-bold uppercase tracking-widest rounded-md bg-[var(--primary-container)] text-white hover:brightness-110 transition-all cursor-pointer"
            >
              Trade {selectedTeam.name} Championship
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function WorldCupBracket({ profiles }: WorldCupBracketProps) {
  const router = useRouter();
  const fixtures = useMemo(() => getKnockoutSchedule(), []);
  const byRound = useMemo(() => {
    const grouped: Record<FIFARound, MatchFixture[]> = {
      GROUP: [], R32: [], R16: [], QF: [], SF: [], FINAL: [], WINNER: [],
    };
    for (const f of fixtures) grouped[f.round].push(f);
    return grouped;
  }, [fixtures]);

  const onTrade = (market: ParsedFIFAMarket) => {
    if (!market.eventId) return;
    const params = new URLSearchParams();
    if (market.venueMarketId) params.set('market', market.venueMarketId);
    if (market.yesOutcomeId) params.set('outcome', market.yesOutcomeId);
    const qs = params.toString();
    router.push(`/event/${market.eventId}${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--primary-container)]">
          account_tree
        </span>
        <h3 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
          Knockout Bracket
        </h3>
        <span className="text-[10px] text-[var(--secondary)] ml-auto italic">
          Scroll horizontally on narrow screens
        </span>
      </div>

      {/* The actual bracket: five round columns + champion, each
          stretching to the same min-height. justify-around inside each
          column does the bracket "fan-out" — fewer matches → bigger
          gaps → vertical alignment with the next round's match between
          its two feeders. */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-4 px-1">
          {ROUND_ORDER.map(r => (
            <RoundColumn
              key={r}
              label={ROUND_LABELS[r]}
              matches={byRound[r]}
              profiles={profiles}
              onTrade={onTrade}
            />
          ))}
          <ChampionColumn profiles={profiles} onTrade={onTrade} />
        </div>
      </div>

      <PathToFinal profiles={profiles} onTrade={onTrade} />
    </div>
  );
}
