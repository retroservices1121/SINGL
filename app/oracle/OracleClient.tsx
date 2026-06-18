'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PageShell from '@/app/components/PageShell';
import Spinner from '@/app/components/ui/Spinner';
import CountryFlag from '@/app/components/CountryFlag';
import { findCountry } from '@/app/lib/fifa';
import { useOracleIdentity } from '@/app/hooks/useOracleIdentity';
import { DRAW } from '@/app/lib/oracle';

interface PlayerStats {
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  rank: number;
  holdMultiplier: string;
  holdMultiplierBps: number;
  sprddBalance: string;
  tradeVolumeUsd: number;
  tradePoints: number;
}
interface Reward {
  periodKey: string;
  pointsShare: number;
  sprddAmount: string;
  claimedRaw: string;
  vestEnd: string;
}
interface OracleMatch {
  id: string;
  date: string;
  kickoff: string;
  away: string;
  home: string;
  awayScore: number | null;
  homeScore: number | null;
  status: 'scheduled' | 'live' | 'final';
  statusDetail: string;
  outcome: string | null;
  open: boolean;
  yourPick: string | null;
}

// Canonical token page on Virtuals (virtualAgentId 23167) — handles the buy flow.
const SPRDD_BUY_URL = 'https://app.virtuals.io/virtuals/23167';

function fmtTokens(raw: string): string {
  try {
    const whole = BigInt(raw) / 10n ** 18n;
    return whole.toLocaleString('en-US');
  } catch {
    return '0';
  }
}

function FlagName({ name }: { name: string }) {
  const country = findCountry(name);
  return (
    <span className="flex items-center gap-2 min-w-0">
      {country && <CountryFlag country={country} className="w-6 h-4 shrink-0" />}
      <span className="text-xs font-bold text-[var(--on-surface)] truncate">{name}</span>
    </span>
  );
}

export default function OracleClient() {
  const { aggUserId, walletAddress, isAuthenticated, loading: authLoading } = useOracleIdentity();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [matches, setMatches] = useState<OracleMatch[]>([]);
  const [dayOffset, setDayOffset] = useState(0); // 0 = current scoreboard
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Claim state
  const [claimable, setClaimable] = useState('0');
  const [claimEnabled, setClaimEnabled] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  const dateParam = useCallback(() => {
    if (dayOffset === 0) return '';
    const d = new Date(Date.now() + dayOffset * 86400000);
    return d.toISOString().split('T')[0].replace(/-/g, '');
  }, [dayOffset]);

  const loadMatches = useCallback(async () => {
    const qs = new URLSearchParams();
    const dp = dateParam();
    if (dp) qs.set('date', dp);
    if (aggUserId) qs.set('aggUserId', aggUserId);
    const res = await fetch(`/api/oracle/matches?${qs}`);
    const data = await res.json();
    setMatches(data.matches || []);
  }, [aggUserId, dateParam]);

  const loadMe = useCallback(async () => {
    if (!aggUserId) {
      setStats(null);
      setRewards([]);
      return;
    }
    const qs = new URLSearchParams({ aggUserId });
    if (walletAddress) qs.set('wallet', walletAddress);
    const res = await fetch(`/api/oracle/me?${qs}`);
    const data = await res.json();
    setStats(data.player || null);
    setRewards(data.rewards || []);
  }, [aggUserId, walletAddress]);

  const loadClaim = useCallback(async () => {
    if (!aggUserId) {
      setClaimable('0');
      return;
    }
    const res = await fetch(`/api/oracle/claim?aggUserId=${aggUserId}`);
    const data = await res.json();
    setClaimable(data.claimableRaw || '0');
    setClaimEnabled(!!data.enabled);
  }, [aggUserId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMatches(), loadMe(), loadClaim()]).finally(() => setLoading(false));
  }, [loadMatches, loadMe, loadClaim]);

  const doClaim = async () => {
    if (!aggUserId || !walletAddress || claiming) return;
    setClaiming(true);
    setClaimMsg(null);
    try {
      const res = await fetch('/api/oracle/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aggUserId, walletAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClaimMsg(data.error || 'Claim failed');
      } else if (data.status === 'confirmed') {
        setClaimMsg('Claimed! SPRDD sent to your wallet.');
      } else if (data.status === 'pending') {
        setClaimMsg('Claim submitted — confirming on-chain.');
      }
      await Promise.all([loadMe(), loadClaim()]);
    } catch {
      setClaimMsg('Claim failed — try again.');
    } finally {
      setClaiming(false);
    }
  };

  const makePick = async (matchId: string, pick: string) => {
    if (!isAuthenticated || !aggUserId) return;
    setSaving(matchId);
    // optimistic
    setMatches(prev => prev.map(m => (m.id === matchId ? { ...m, yourPick: pick } : m)));
    try {
      const res = await fetch('/api/oracle/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aggUserId, walletAddress, matchId, pick }),
      });
      if (!res.ok) await loadMatches(); // revert on failure
    } finally {
      setSaving(null);
    }
  };

  const totalUnclaimed = rewards.reduce((s, r) => {
    try {
      return s + (BigInt(r.sprddAmount) - BigInt(r.claimedRaw));
    } catch {
      return s;
    }
  }, 0n);

  let claimableBig = 0n;
  try {
    claimableBig = BigInt(claimable);
  } catch {
    claimableBig = 0n;
  }

  return (
    <PageShell title="SPREDD Oracle" subtitle="World Cup Pick'em · Free to play">
      {loading || authLoading ? (
        <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {/* Stat header */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Your Points" value={stats ? stats.totalPoints.toLocaleString() : '—'} accent />
            <StatCard label="Rank" value={stats ? `#${stats.rank}` : '—'} />
            <StatCard
              label="Streak"
              value={stats ? `${stats.currentStreak}🔥` : '—'}
              sub={stats && stats.currentStreak > 1 ? `best ${stats.bestStreak}` : undefined}
            />
            <StatCard
              label="Hold Multiplier"
              value={stats ? stats.holdMultiplier : '1.0x'}
              sub={stats ? `${fmtTokens(stats.sprddBalance)} SPRDD` : undefined}
            />
            <StatCard
              label="Trade Points"
              value={stats ? stats.tradePoints.toLocaleString() : '—'}
              sub={stats ? `$${Math.round(stats.tradeVolumeUsd).toLocaleString()} traded` : undefined}
            />
          </div>

          {/* Hold-to-multiply CTA */}
          {(!stats || stats.holdMultiplierBps < 20000) && (
            <div className="bg-[var(--primary-fixed)] rounded-xl p-4 flex items-center justify-between gap-4 border border-[var(--primary-container)]">
              <div>
                <h4 className="font-heading font-black text-sm text-[var(--primary)] uppercase tracking-tight">
                  Hold $SPRDD → multiply every point
                </h4>
                <p className="text-[11px] text-[var(--secondary)] mt-0.5">
                  250k = 1.25x · 1M = 1.5x · 5M = 2.0x. Your bag boosts your whole season.
                </p>
              </div>
              <a
                href={SPRDD_BUY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-4 py-2 bg-[var(--primary-container)] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all no-underline"
              >
                Buy SPRDD
              </a>
            </div>
          )}

          {/* Rewards + claim strip */}
          {(totalUnclaimed > 0n || claimableBig > 0n) && (
            <div className="bg-[var(--on-surface)] rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">SPRDD Rewards</div>
                  <div className="font-heading font-black text-2xl text-white">
                    {fmtTokens(totalUnclaimed.toString())} <span className="text-sm font-normal text-[var(--secondary)]">vesting</span>
                  </div>
                  <div className="text-xs text-[var(--primary-container)] font-bold mt-0.5">
                    {fmtTokens(claimable)} claimable now
                  </div>
                </div>
                <button
                  onClick={doClaim}
                  disabled={!claimEnabled || claiming || claimableBig <= 0n}
                  className="shrink-0 px-5 py-2.5 bg-[var(--primary-container)] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {claiming ? 'Claiming…' : 'Claim'}
                </button>
              </div>
              {!claimEnabled && (
                <p className="text-[10px] text-[var(--secondary)] mt-2">Claims open once rewards are funded — your balance keeps accruing.</p>
              )}
              {claimMsg && <p className="text-[10px] text-slate-300 mt-2">{claimMsg}</p>}
            </div>
          )}

          {/* Not signed in */}
          {!isAuthenticated && (
            <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-5 text-center">
              <p className="text-sm text-[var(--secondary)]">
                Connect your wallet to lock picks, build a streak, and earn $SPRDD.
              </p>
            </div>
          )}

          {/* Day nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setDayOffset(o => o - 1)}
              className="px-3 py-1.5 bg-[var(--surface-container-high)] text-[var(--secondary)] rounded-lg text-xs font-bold cursor-pointer hover:text-[var(--on-surface)]"
            >
              ← Prev day
            </button>
            <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">
              {dayOffset === 0 ? 'Today' : dayOffset > 0 ? `+${dayOffset}d` : `${dayOffset}d`}
            </span>
            <button
              onClick={() => setDayOffset(o => o + 1)}
              className="px-3 py-1.5 bg-[var(--surface-container-high)] text-[var(--secondary)] rounded-lg text-xs font-bold cursor-pointer hover:text-[var(--on-surface)]"
            >
              Next day →
            </button>
          </div>

          {/* Matches */}
          {matches.length === 0 ? (
            <div className="bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-10 text-center text-sm text-[var(--secondary)]">
              No matches scheduled for this day.
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map(m => (
                <MatchRow
                  key={m.id}
                  match={m}
                  saving={saving === m.id}
                  canPick={isAuthenticated && m.open}
                  onPick={makePick}
                />
              ))}
            </div>
          )}

          {/* Bracket cross-link */}
          <Link
            href="/pickem"
            className="block bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-5 text-center hover:scale-[1.01] transition-all no-underline"
          >
            <span className="material-symbols-outlined text-2xl text-[var(--primary-container)]">account_tree</span>
            <h4 className="font-heading font-black text-sm text-[var(--on-surface)] uppercase tracking-tight">
              Fill your bracket → +200 pts for the champion
            </h4>
            <p className="text-[10px] text-[var(--secondary)] mt-1">Group winners + champion. Locks at kickoff June 11.</p>
          </Link>
        </div>
      )}
    </PageShell>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${accent ? 'bg-[var(--primary-container)]' : 'bg-[var(--surface-container-lowest)] shadow-ambient'}`}>
      <div className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-white/70' : 'text-[var(--secondary)]'}`}>{label}</div>
      <div className={`font-heading font-black text-2xl ${accent ? 'text-white' : 'text-[var(--on-surface)]'}`}>{value}</div>
      {sub && <div className={`text-[10px] font-mono ${accent ? 'text-white/60' : 'text-[var(--secondary)]'}`}>{sub}</div>}
    </div>
  );
}

function MatchRow({
  match,
  saving,
  canPick,
  onPick,
}: {
  match: OracleMatch;
  saving: boolean;
  canPick: boolean;
  onPick: (matchId: string, pick: string) => void;
}) {
  const options = [
    { key: match.home, label: match.home },
    { key: DRAW, label: 'Draw' },
    { key: match.away, label: match.away },
  ];
  const settled = match.status === 'final';
  const correct = settled && match.yourPick && match.yourPick === match.outcome;
  const wrong = settled && match.yourPick && match.yourPick !== match.outcome;

  return (
    <div
      className={`bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient p-4 ${
        correct ? 'ring-2 ring-[var(--yes)]' : wrong ? 'ring-1 ring-[var(--no)]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <FlagName name={match.home} />
        <div className="flex flex-col items-center px-3">
          {match.status === 'scheduled' ? (
            <span className="text-[10px] font-bold text-[var(--secondary)] uppercase">{match.statusDetail}</span>
          ) : (
            <span className="font-heading font-black text-sm text-[var(--on-surface)]">
              {match.homeScore ?? 0}–{match.awayScore ?? 0}
            </span>
          )}
          <span
            className={`text-[9px] font-bold uppercase tracking-widest ${
              match.status === 'live' ? 'text-[var(--no)]' : 'text-[var(--secondary)]'
            }`}
          >
            {match.status === 'live' ? '● LIVE' : match.status === 'final' ? 'Final' : ''}
          </span>
        </div>
        <div className="flex justify-end flex-1 min-w-0">
          <FlagName name={match.away} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {options.map(o => {
          const picked = match.yourPick === o.key;
          const isResult = settled && match.outcome === o.key;
          return (
            <button
              key={o.key}
              disabled={!canPick || saving}
              onClick={() => onPick(match.id, o.key)}
              className={`py-2 rounded-lg text-[11px] font-bold uppercase tracking-tight transition-all ${
                picked
                  ? 'bg-[var(--primary-container)] text-white'
                  : isResult
                  ? 'bg-[var(--yes-bg)] text-[var(--yes)] border border-[var(--yes)]'
                  : 'bg-[var(--surface-container-low)] text-[var(--secondary)]'
              } ${canPick && !picked ? 'hover:text-[var(--on-surface)] cursor-pointer' : ''} ${
                !canPick ? 'cursor-default' : ''
              } disabled:opacity-100`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {!match.open && match.status === 'scheduled' && (
        <div className="text-[9px] text-[var(--secondary)] text-center mt-2 uppercase tracking-widest">Picks locked</div>
      )}
    </div>
  );
}
