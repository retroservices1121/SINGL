// ── LMSR — the marketplace's automated market maker ──────────────────────────
// Logarithmic Market Scoring Rule: the proven AMM for binary/categorical
// prediction markets (Hanson). It's the "bonding curve" for outcomes that must
// sum to $1 — provides instant liquidity from the first trade, prices each
// outcome in (0,1), and has a bounded max subsidy. Pure + dependency-free so it
// works identically off-chain (v1) and on-chain (later).
//
// State is the vector of net shares outstanding per outcome, `q`. `b` is the
// liquidity parameter: bigger b = deeper book (less price impact) but larger
// max subsidy. For n outcomes the market maker's worst-case loss is b·ln(n).

/** Numerically-stable log-sum-exp. */
function logSumExp(xs: number[]): number {
  const m = Math.max(...xs);
  if (!isFinite(m)) return m;
  let sum = 0;
  for (const x of xs) sum += Math.exp(x - m);
  return m + Math.log(sum);
}

/** LMSR cost function C(q) = b · ln(Σ exp(q_i / b)). Total paid in = C(q) − C(q0). */
export function cost(q: number[], b: number): number {
  return b * logSumExp(q.map(x => x / b));
}

/** Instantaneous prices per outcome — softmax(q/b). Always sums to 1. */
export function prices(q: number[], b: number): number[] {
  const scaled = q.map(x => x / b);
  const m = Math.max(...scaled);
  const ex = scaled.map(x => Math.exp(x - m));
  const s = ex.reduce((a, c) => a + c, 0);
  return ex.map(e => e / s);
}

/** Cost to buy `shares` of outcome `i` (can be negative for a sell, shares<0). */
export function tradeCost(q: number[], b: number, i: number, shares: number): number {
  const q2 = q.slice();
  q2[i] += shares;
  return cost(q2, b) - cost(q, b);
}

/**
 * Inverse: how many shares of outcome `i` a positive `budget` buys (pre-fee).
 * tradeCost is strictly increasing in shares, so binary-search it. Returns
 * shares ≥ 0.
 */
export function sharesForBudget(q: number[], b: number, i: number, budget: number): number {
  if (budget <= 0) return 0;
  let lo = 0;
  // Grow an upper bound until it overshoots the budget.
  let hi = Math.max(1, budget);
  while (tradeCost(q, b, i, hi) < budget) {
    hi *= 2;
    if (hi > 1e12) break; // safety
  }
  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    if (tradeCost(q, b, i, mid) < budget) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Proceeds from selling `shares` (>0) of outcome `i`. */
export function sellReturn(q: number[], b: number, i: number, shares: number): number {
  return -tradeCost(q, b, i, -shares);
}

/** Worst-case subsidy the maker can lose, = b·ln(n). Sets the seed/liquidity. */
export function maxLoss(b: number, outcomes: number): number {
  return b * Math.log(outcomes);
}

/**
 * Pick a liquidity parameter `b` from how much subsidy you're willing to put
 * up: b = seed / ln(n). For a binary market, b ≈ seed / 0.693.
 */
export function bForSeed(seedUsd: number, outcomes: number): number {
  return seedUsd / Math.log(outcomes);
}
