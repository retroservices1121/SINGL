// ── SPREDD Oracle — scoring, multipliers, rewards math ───────────────────────
// Pure, dependency-free helpers shared by the API routes and the settle/rewards
// crons. All tunables live here so the economy is configured in one place.

// SPRDD token (Base) — the hold-to-multiply asset and reward currency.
export const SPRDD_ADDRESS = '0xAC0E8f7e3dF7239f5D0f0AE55cf85962d007Cc5F';
export const SPRDD_DECIMALS = 18;
export const BASE_CHAIN_ID = 8453;

// ── Points ───────────────────────────────────────────────────────────────────
// A correct daily match pick is the unit of scoring. Streak and hold multipliers
// scale it. Bracket points settle in bulk after the group stage / final.
export const POINTS = {
  matchCorrect: 10,
  bracketAdvancing: 10, // per correctly predicted team to advance
  bracketGroupWinner: 25, // per correct group winner
  bracketChampion: 200, // correct World Cup champion
} as const;

// ── Hold-to-multiply ──────────────────────────────────────────────────────────
// Holding SPRDD boosts every point you earn. Tiers are in whole tokens; the
// multiplier is basis points (10000 = 1.00x). This is the organic buy demand:
// players buy SPRDD to climb tiers.
export interface HoldTier {
  minTokens: number; // whole SPRDD
  bps: number; // multiplier in basis points
  label: string;
}
export const HOLD_TIERS: HoldTier[] = [
  { minTokens: 5_000_000, bps: 20000, label: '2.0x' },
  { minTokens: 1_000_000, bps: 15000, label: '1.5x' },
  { minTokens: 250_000, bps: 12500, label: '1.25x' },
  { minTokens: 0, bps: 10000, label: '1.0x' },
];

// ── Streak ────────────────────────────────────────────────────────────────────
// Consecutive settled days with >= 1 correct pick. Resets to 0 on a missed/blank
// day. The streak multiplier is applied as a daily bonus on that day's points.
export const STREAK_STEP_BPS = 1500; // +0.15x per day past the first
export const STREAK_MAX_BPS = 20000; // cap at 2.0x

// ── Reward budget ─────────────────────────────────────────────────────────────
// $1,000 USDC across the tournament, weighted toward the knockouts. Daily pools
// fund the buyback; the reserve seeds the champion/final jackpot.
export const REWARD = {
  totalUsd: 1000,
  groupStageDailyUsd: 12, // Jun 11–27
  knockoutDailyUsd: 25, // Jun 28–Jul 18
  finalJackpotUsd: 200, // champion-callers + top overall, paid at the final
  vestDays: 7, // vest each daily allocation over a week to spread sells
} as const;

// Tournament phase boundaries (ET dates).
export const KNOCKOUT_START = '2026-06-28';
export const FINAL_DATE = '2026-07-19';

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Multiplier (bps) for a raw on-chain SPRDD balance (string, 18 decimals). */
export function multiplierForBalance(rawBalance: string): number {
  let whole: bigint;
  try {
    whole = BigInt(rawBalance) / 10n ** BigInt(SPRDD_DECIMALS);
  } catch {
    return 10000;
  }
  const tokens = Number(whole);
  for (const tier of HOLD_TIERS) {
    if (tokens >= tier.minTokens) return tier.bps;
  }
  return 10000;
}

export function holdLabelForBps(bps: number): string {
  return HOLD_TIERS.find(t => t.bps === bps)?.label ?? `${(bps / 10000).toFixed(2)}x`;
}

/** Streak multiplier (bps) for a given streak length in days. */
export function streakMultiplierBps(streakDays: number): number {
  if (streakDays <= 1) return 10000;
  return Math.min(STREAK_MAX_BPS, 10000 + (streakDays - 1) * STREAK_STEP_BPS);
}

/** Apply a basis-point multiplier to a base point value (rounded). */
export function applyBps(base: number, bps: number): number {
  return Math.round((base * bps) / 10000);
}

/** USD reward budget for a given ET date during the tournament. */
export function dailyBudgetUsd(isoDate: string): number {
  if (isoDate >= KNOCKOUT_START) return REWARD.knockoutDailyUsd;
  return REWARD.groupStageDailyUsd;
}

/** Split a raw token pool across players pro-rata by points (largest-remainder). */
export function splitPool(
  poolRaw: bigint,
  shares: { playerId: string; points: number }[]
): Record<string, bigint> {
  const total = shares.reduce((s, x) => s + x.points, 0);
  const out: Record<string, bigint> = {};
  if (total <= 0 || poolRaw <= 0n) {
    for (const s of shares) out[s.playerId] = 0n;
    return out;
  }
  let distributed = 0n;
  const remainders: { playerId: string; rem: bigint }[] = [];
  for (const s of shares) {
    const exact = (poolRaw * BigInt(s.points)) / BigInt(total);
    out[s.playerId] = exact;
    distributed += exact;
    const rem = poolRaw * BigInt(s.points) - exact * BigInt(total);
    remainders.push({ playerId: s.playerId, rem });
  }
  // Hand out the leftover dust to the largest remainders, one unit each.
  let leftover = poolRaw - distributed;
  remainders.sort((a, b) => (b.rem > a.rem ? 1 : b.rem < a.rem ? -1 : 0));
  for (let i = 0; leftover > 0n && i < remainders.length; i++, leftover--) {
    out[remainders[i].playerId] += 1n;
  }
  return out;
}

// ── Vesting ───────────────────────────────────────────────────────────────────
// Linear vest from vestStart → vestEnd. `vestedRaw` is the cumulative amount
// unlocked by `nowMs`; `claimableRaw` subtracts what's already been claimed.
export function vestedRaw(sprddAmount: string, vestStartMs: number, vestEndMs: number, nowMs: number): bigint {
  let total: bigint;
  try {
    total = BigInt(sprddAmount);
  } catch {
    return 0n;
  }
  if (nowMs >= vestEndMs) return total;
  if (nowMs <= vestStartMs || vestEndMs <= vestStartMs) return 0n;
  const elapsed = BigInt(nowMs - vestStartMs);
  const span = BigInt(vestEndMs - vestStartMs);
  return (total * elapsed) / span;
}

export function claimableRaw(
  sprddAmount: string,
  claimedRaw: string,
  vestStartMs: number,
  vestEndMs: number,
  nowMs: number
): bigint {
  let claimed: bigint;
  try {
    claimed = BigInt(claimedRaw);
  } catch {
    claimed = 0n;
  }
  const vested = vestedRaw(sprddAmount, vestStartMs, vestEndMs, nowMs);
  const claimable = vested - claimed;
  return claimable > 0n ? claimable : 0n;
}

export type MatchOutcome = string; // home/away team name as ESPN reports it, or "DRAW"
export const DRAW: MatchOutcome = 'DRAW';
