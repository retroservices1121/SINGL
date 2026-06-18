'use client';

import { useState, useMemo, useEffect } from 'react';
import type { CountryProfile, FIFACountry, GroupData } from '@/app/lib/fifa';
import { getGroups, WORLD_CUP_COUNTRIES } from '@/app/lib/fifa';
import CountryFlag from './CountryFlag';
import { useOracleIdentity } from '@/app/hooks/useOracleIdentity';

interface PickEmProps {
  profiles: CountryProfile[];
}

type Step = 1 | 2 | 3;

interface GroupPick {
  advancing: [string, string]; // two country names advancing
  winner: string;              // group winner
}

const SITE_URL = 'https://singl.market';

// Returns the country's implied championship % from the underlying
// market — but only when there's a real, tradable market. AGG's
// no-liquidity 0.5 placeholder shouldn't render as "50% to win the
// World Cup" because that's not a real prediction.
const EPS = 0.001;
function getProfileOdds(name: string, profiles: CountryProfile[]): number | null {
  const p = profiles.find(pr => pr.name === name);
  if (!p?.championshipOdds) return null;
  if (Math.abs(p.championshipOdds - 0.5) <= EPS) return null;
  return Math.round(p.championshipOdds * 100);
}

function GroupPickCard({
  group,
  pick,
  onPick,
  profiles,
}: {
  group: GroupData;
  pick: GroupPick | null;
  onPick: (groupName: string, pick: GroupPick) => void;
  profiles: CountryProfile[];
}) {
  const teams = group.standings.map(s => s.country);
  const advancing = pick?.advancing || [];
  const winner = pick?.winner || '';

  const toggleTeam = (name: string) => {
    let newAdv = [...advancing];
    if (newAdv.includes(name)) {
      newAdv = newAdv.filter(n => n !== name);
    } else if (newAdv.length < 2) {
      newAdv.push(name);
    } else {
      newAdv = [newAdv[1], name]; // replace oldest
    }
    const newWinner = newAdv.length > 0 ? (newAdv.includes(winner) ? winner : newAdv[0]) : '';
    onPick(group.name, { advancing: newAdv as [string, string], winner: newWinner });
  };

  const setWinner = (name: string) => {
    if (!(advancing as string[]).includes(name)) return;
    onPick(group.name, { ...pick!, winner: name });
  };

  const isComplete = advancing.length === 2 && winner;

  return (
    <div className={`bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient overflow-hidden transition-all ${isComplete ? 'ring-2 ring-[var(--yes)]' : ''}`}>
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <h4 className="font-heading font-black text-sm uppercase tracking-tight text-[var(--on-surface)]">Group {group.name}</h4>
        {isComplete && <span className="material-symbols-outlined text-sm text-[var(--yes)]">check_circle</span>}
      </div>
      <div className="px-3 pb-3 space-y-1">
        {teams.map(t => {
          const isAdv = (advancing as string[]).includes(t.name);
          const isWin = winner === t.name;
          const odds = getProfileOdds(t.name, profiles);
          return (
            <div key={t.code} className="flex items-center gap-2">
              <button
                onClick={() => toggleTeam(t.name)}
                className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  isAdv ? 'bg-[var(--yes-bg)] border border-[var(--yes)]' : 'bg-[var(--surface-container-low)] border border-transparent hover:border-[var(--surface-container-highest)]'
                }`}
              >
                <CountryFlag country={t} className="w-6 h-4" />
                <span className="text-[11px] font-bold text-[var(--on-surface)] flex-1 text-left truncate">{t.name}</span>
                {odds !== null && <span className="text-[9px] font-mono text-[var(--secondary)]">{odds}%</span>}
                {isAdv && <span className="material-symbols-outlined text-sm text-[var(--yes)]">check</span>}
              </button>
              {isAdv && (
                <button
                  onClick={() => setWinner(t.name)}
                  className={`shrink-0 text-[8px] font-bold uppercase tracking-widest px-2 py-1.5 rounded cursor-pointer transition-all ${
                    isWin ? 'bg-[var(--primary-container)] text-white' : 'bg-[var(--surface-container-high)] text-[var(--secondary)] hover:text-[var(--on-surface)]'
                  }`}
                >
                  1st
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PickEm({ profiles }: PickEmProps) {
  const groups = useMemo(() => getGroups(), []);
  const { aggUserId, walletAddress } = useOracleIdentity();
  const [step, setStep] = useState<Step>(1);
  const [groupPicks, setGroupPicks] = useState<Record<string, GroupPick>>({});
  const [champion, setChampion] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [locked, setLocked] = useState(false);

  // Load from localStorage (instant), then hydrate from the server if signed in
  // so a player's bracket follows them across devices and counts for points.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('singl-pickem');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.groupPicks) setGroupPicks(data.groupPicks);
        if (data.champion) setChampion(data.champion);
        if (data.submitted) setSubmitted(data.submitted);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!aggUserId) return;
    fetch(`/api/oracle/bracket?aggUserId=${aggUserId}`)
      .then(r => r.json())
      .then(data => {
        if (data.locked) setLocked(true);
        if (data.bracket) {
          setGroupPicks(data.bracket.groupPicks || {});
          setChampion(data.bracket.champion || '');
          setSubmitted(true);
        }
      })
      .catch(() => {});
  }, [aggUserId]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('singl-pickem', JSON.stringify({ groupPicks, champion, submitted }));
    } catch {}
  }, [groupPicks, champion, submitted]);

  const handleGroupPick = (groupName: string, pick: GroupPick) => {
    setGroupPicks(prev => ({ ...prev, [groupName]: pick }));
  };

  const allGroupsPicked = groups.every(g => {
    const p = groupPicks[g.name];
    return p && p.advancing.length === 2 && p.winner;
  });

  // All advancing teams
  const advancingTeams = useMemo(() => {
    const teams: FIFACountry[] = [];
    for (const g of groups) {
      const p = groupPicks[g.name];
      if (!p) continue;
      for (const name of p.advancing) {
        const country = WORLD_CUP_COUNTRIES.find(c => c.name === name);
        if (country) teams.push(country);
      }
    }
    return teams;
  }, [groupPicks, groups]);

  const handleSubmit = () => {
    setSubmitted(true);
    // Persist to the server when signed in so the bracket settles for points
    // (correct group winners + champion) after the group stage / final.
    if (aggUserId) {
      fetch('/api/oracle/bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aggUserId, walletAddress, groupPicks, champion }),
      }).catch(() => {});
    }
  };

  const shareOnX = () => {
    const topPick = champion || 'TBD';
    const text = `My 2026 World Cup prediction: ${topPick} to win it all!\n\nMake your picks on SINGL`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE_URL)}`, '_blank');
  };

  const resetPicks = () => {
    setGroupPicks({});
    setChampion('');
    setSubmitted(false);
    setStep(1);
    localStorage.removeItem('singl-pickem');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[var(--on-surface)] rounded-xl p-6 text-center relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-[var(--primary-container)]/20 rounded-full blur-2xl" />
        <span className="material-symbols-outlined text-4xl text-[var(--primary-container)] mb-2">emoji_events</span>
        <h2 className="font-heading font-black text-2xl text-white uppercase tracking-tight">Pick&apos;em Challenge</h2>
        <p className="text-sm text-[var(--secondary)] mt-1">Predict the World Cup &mdash; Free to play</p>
        <p className="text-[10px] text-[var(--secondary)] mt-2 max-w-md mx-auto leading-relaxed">
          Signed in? Your bracket is saved and scored — correct group winners (+25) and champion (+200) earn points toward
          the SPREDD Oracle leaderboard and $SPRDD rewards. Locks at kickoff June 11.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              step >= s ? 'bg-[var(--primary-container)] text-white' : 'bg-[var(--surface-container-high)] text-[var(--secondary)]'
            }`}>{s}</div>
            <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:inline ${
              step >= s ? 'text-[var(--on-surface)]' : 'text-[var(--secondary)]'
            }`}>
              {s === 1 ? 'Groups' : s === 2 ? 'Champion' : 'Submit'}
            </span>
            {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? 'bg-[var(--primary-container)]' : 'bg-[var(--surface-container-high)]'}`} />}
          </div>
        ))}
      </div>

      {!submitted && step === 1 && (
        <>
          <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">
            Pick 2 teams to advance from each group. Tap &quot;1st&quot; to pick the group winner.
          </div>
          <div className="grid-auto-cards">
            {groups.map(g => (
              <GroupPickCard key={g.name} group={g} pick={groupPicks[g.name] || null} onPick={handleGroupPick} profiles={profiles} />
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!allGroupsPicked}
              className="px-8 py-3 bg-[var(--primary-container)] text-white rounded-lg font-heading font-bold uppercase tracking-widest text-sm hover:brightness-110 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: Pick Champion
            </button>
          </div>
        </>
      )}

      {!submitted && step === 2 && (
        <>
          <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">
            Pick the World Cup champion from your advancing teams
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {advancingTeams.map(t => {
              const odds = getProfileOdds(t.name, profiles);
              return (
                <button
                  key={t.code}
                  onClick={() => setChampion(t.name)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                    champion === t.name
                      ? 'bg-[var(--primary-container)] text-white ring-2 ring-[var(--primary-container)] shadow-lg'
                      : 'bg-[var(--surface-container-lowest)] text-[var(--on-surface)] shadow-ambient hover:scale-[1.02]'
                  }`}
                >
                  <CountryFlag country={t} className="w-10 h-7" />
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-bold uppercase tracking-tight truncate">{t.name}</div>
                    {odds !== null && (
                      <div className={`text-[9px] font-mono ${champion === t.name ? 'text-white/70' : 'text-[var(--secondary)]'}`}>{odds}%</div>
                    )}
                  </div>
                  {champion === t.name && <span className="material-symbols-outlined text-sm">emoji_events</span>}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)}
              className="px-6 py-3 bg-[var(--surface-container-high)] text-[var(--secondary)] rounded-lg font-bold text-sm cursor-pointer hover:text-[var(--on-surface)]">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!champion}
              className="px-8 py-3 bg-[var(--primary-container)] text-white rounded-lg font-heading font-bold uppercase tracking-widest text-sm hover:brightness-110 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Review Picks
            </button>
          </div>
        </>
      )}

      {!submitted && step === 3 && (
        <>
          <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-6">
            <div className="text-center mb-4">
              <span className="material-symbols-outlined text-3xl text-[var(--primary-container)]">emoji_events</span>
              <h3 className="font-heading font-black text-xl uppercase tracking-tight text-[var(--on-surface)] mt-1">Your Champion</h3>
              {(() => {
                const c = WORLD_CUP_COUNTRIES.find(ct => ct.name === champion);
                return c ? (
                  <div className="mt-2">
                    <CountryFlag country={c} className="w-16 h-11" width={80} />
                    <div className="font-heading font-black text-2xl text-[var(--on-surface)] uppercase tracking-tight">{c.name}</div>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-2">Group Winners</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
              {groups.map(g => {
                const pick = groupPicks[g.name];
                const winnerCountry = pick ? WORLD_CUP_COUNTRIES.find(c => c.name === pick.winner) : null;
                return (
                  <div key={g.name} className="text-center p-2 bg-[var(--surface-container-low)] rounded-lg">
                    <div className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-1">Grp {g.name}</div>
                    {winnerCountry && (
                      <>
                        <CountryFlag country={winnerCountry} className="w-7 h-5 mx-auto" />
                        <div className="text-[9px] font-bold text-[var(--on-surface)] truncate">{winnerCountry.name}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-3.5 bg-[var(--primary-container)] text-white rounded-lg font-heading font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all cursor-pointer"
            >
              Submit Picks
            </button>
          </div>
          <button onClick={() => setStep(2)}
            className="px-6 py-3 bg-[var(--surface-container-high)] text-[var(--secondary)] rounded-lg font-bold text-sm cursor-pointer hover:text-[var(--on-surface)]">
            Back
          </button>
        </>
      )}

      {/* Submitted state */}
      {submitted && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-[var(--yes)] mb-2">check_circle</span>
            <h3 className="font-heading font-black text-xl text-[var(--on-surface)] uppercase tracking-tight">Picks Locked In!</h3>
            {(() => {
              const c = WORLD_CUP_COUNTRIES.find(ct => ct.name === champion);
              return c ? (
                <div className="mt-3">
                  <CountryFlag country={c} className="w-16 h-11" width={80} />
                  <div className="font-heading font-black text-2xl text-[var(--on-surface)] uppercase tracking-tight">{c.name}</div>
                  <div className="text-sm text-[var(--secondary)] mt-1">Your champion pick</div>
                </div>
              ) : null;
            })()}

            <div className="flex gap-3 mt-4">
              <button onClick={shareOnX}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--on-surface)] text-white rounded-lg text-xs font-bold cursor-pointer hover:opacity-90">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                Share on X
              </button>
              <button onClick={resetPicks}
                className="flex-1 py-2.5 bg-[var(--surface-container-high)] text-[var(--secondary)] rounded-lg text-xs font-bold cursor-pointer hover:text-[var(--on-surface)]">
                Reset Picks
              </button>
            </div>
          </div>

          {/* CTA to real markets — route through AGG's place-order panel */}
          <div className="bg-[var(--primary-fixed)] rounded-xl p-5 text-center border border-[var(--primary-container)]">
            <h4 className="font-heading font-black text-sm text-[var(--primary)] uppercase tracking-tight mb-1">Want to put money on it?</h4>
            <p className="text-xs text-[var(--secondary)] mb-3">Trade your champion pick on AGG</p>
            {(() => {
              const champProfile = profiles.find(p => p.name === champion);
              const m = champProfile?.championshipMarket;
              if (!m?.eventId) return null;
              const params = new URLSearchParams();
              if (m.venueMarketId) params.set('market', m.venueMarketId);
              if (m.yesOutcomeId) params.set('outcome', m.yesOutcomeId);
              const qs = params.toString();
              const href = `/event/${m.eventId}${qs ? `?${qs}` : ''}`;
              return (
                <a
                  href={href}
                  className="inline-block px-6 py-2.5 bg-[var(--primary-container)] text-white rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer hover:brightness-110 transition-all no-underline"
                >
                  Trade {champion} to Win
                </a>
              );
            })()}
          </div>

          {/* Daily game + leaderboard cross-links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a href="/oracle" className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-6 text-center no-underline hover:scale-[1.01] transition-all">
              <span className="material-symbols-outlined text-2xl text-[var(--primary-container)] mb-2">sports_soccer</span>
              <h4 className="font-heading font-black text-sm text-[var(--on-surface)] uppercase tracking-tight">Play Daily Pick&apos;em</h4>
              <p className="text-[10px] text-[var(--secondary)] mt-1">Predict every match · build a streak · earn $SPRDD</p>
            </a>
            <a href="/leaderboard" className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-6 text-center no-underline hover:scale-[1.01] transition-all">
              <span className="material-symbols-outlined text-2xl text-[var(--secondary)] mb-2">leaderboard</span>
              <h4 className="font-heading font-black text-sm text-[var(--on-surface)] uppercase tracking-tight">Oracle Leaderboard</h4>
              <p className="text-[10px] text-[var(--secondary)] mt-1">Ranked by points · top callers win the jackpot</p>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
