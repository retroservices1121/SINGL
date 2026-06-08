# SPREDD Oracle — World Cup Pick'em + $SPRDD rewards

A daily-prediction game layered on the existing FIFA event. Players predict
matches, build streaks, and earn **$SPRDD** (Base: `0xAC0E…Cc5F`). Holding SPRDD
multiplies every point — the organic buy-demand hook. Free to play. Funded by a
**$1,000 USDC buyback** spread across the tournament (treasury-funded; there is
no trade-fee skim after the AGG cutover).

## What was built

**Backend**
- Prisma models: `OraclePlayer`, `MatchPick`, `BracketPick`, `PointsLedger`,
  `RewardAllocation`, `RewardPeriod`, `OracleConfig`
  (`prisma/migrations/20260608_spredd_oracle`).
- `app/lib/oracle.ts` — all tunables: points, hold tiers, streak curve, reward
  budget, pro-rata split.
- `app/lib/espn.ts` — shared ESPN scoreboard fetch/normalize (matches +
  settlement source of truth).
- `app/lib/sprdd.ts` — viem read of on-chain SPRDD balance → multiplier (Base).
- API: `GET/POST /api/oracle/picks`, `GET/POST /api/oracle/bracket`,
  `GET /api/oracle/matches`, `GET /api/oracle/me`, `GET /api/oracle/leaderboard`,
  `POST /api/oracle/sync-balance`.
- Crons: `GET /api/cron/oracle-settle` (grade finals, award points),
  `GET /api/cron/oracle-rewards` (daily streak + reward-pool allocation),
  `POST /api/cron/oracle-rewards` (record buyback fill → distribute SPRDD).
- **On-chain claim**: `GET /api/oracle/claim` (claimable summary),
  `POST /api/oracle/claim` (pay vested SPRDD to the player's wallet).
  `app/lib/distributor.ts` signs the ERC20 transfer from the buyback wallet.
- `GET /api/leaderboard` now serves the points board (was an empty stub).

**Frontend**
- `app/oracle` — the daily pick'em game (stat header, hold-to-multiply CTA,
  match cards, rewards strip with a working **Claim** button, day nav).
- `app/components/PickEm.tsx` — now persists the bracket to the server and is
  scored (group winners + champion).
- `app/leaderboard` — rebuilt as the Oracle points board.
- Nav: added **Oracle** + **Ranks**.

## Scoring (all tunable in `app/lib/oracle.ts`)

- Correct match pick: **10 pts** × hold multiplier.
- Streak: consecutive settled days with ≥1 correct → daily bonus up to **2.0×**.
- Hold-to-multiply: 250k = 1.25× · 1M = 1.5× · 5M = 2.0×.
- Bracket: group winner +25, advancing team +10, champion +200.

## Reward economy

- $1,000 total, weighted to knockouts (group $12/day, knockout $25/day,
  $200 final jackpot).
- The rewards cron records each day's USD budget + per-player point shares.
- The team buys SPRDD for the budget (semi-manual day one), then `POST`s the
  realized raw amount to `/api/cron/oracle-rewards`, which splits it pro-rata by
  points (largest-remainder) into each `RewardAllocation`.
- Allocations **vest over 7 days** to spread sells; holders are incentivized to
  keep their bag (it sets their multiplier).

## On-chain claim flow

Custodial payout from a hot distributor wallet — the simplest rail for a micro
reward program, shippable now.

- Set `DISTRIBUTOR_PRIVATE_KEY` to the buyback wallet and fund it with the
  bought-back SPRDD + a little Base ETH for gas. Until it's set, claims are
  disabled and balances simply keep accruing.
- `POST /api/oracle/claim` computes the player's currently-**vested** balance
  (linear over 7 days), and pays it to their connected wallet. Safety:
  - per-player **lock** (`claimLockedAt`) so concurrent requests can't both claim;
  - **reserve-before-broadcast** — `claimedRaw` is incremented in a DB tx before
    the transfer is sent, and only reverted if the tx never broadcast or
    explicitly reverts (an ambiguous post-broadcast failure stays `pending` with
    the tx hash for reconciliation, never double-pays);
  - recipient is pinned to the wallet on record for the account.
- `OracleClaim` rows are the audit trail (pending → confirmed/failed + txHash).

## Deploy checklist

1. `npx prisma migrate deploy` (applies `20260608_spredd_oracle` +
   `20260608_oracle_claims`).
2. `npx prisma generate`.
3. Set `BASE_RPC_URL` (recommended), `DISTRIBUTOR_PRIVATE_KEY` (for claims), and
   confirm `CRON_SECRET`.
4. Schedule crons:
   - `/api/cron/oracle-settle?secret=$CRON_SECRET` — every ~20 min on match days.
   - `/api/cron/oracle-rewards?secret=$CRON_SECRET` — daily ~05:00 ET.
5. Each day after the buyback executes, record the fill (this is what makes
   rewards claimable):
   `POST /api/cron/oracle-rewards { periodKey: "YYYY-MM-DD", sprddBought: "<raw>", buybackTx: "0x…" }`.
6. Fund the distributor wallet with the same SPRDD so claims can pay out.

## Known follow-ups (not blocking kickoff)

- **Bracket settlement** (group winners / champion) needs a one-shot grader run
  after the group stage and the final — straightforward off the same ESPN feed.
- **Claim reconciliation**: a tiny cron to resolve any `pending` `OracleClaim`
  rows (receipt not seen in the request window) by re-checking the tx hash.
- Distributor is a hot wallet — keep only ~the active reward float in it; top up
  per phase rather than parking the whole season's SPRDD.
- ESPN team names vs. `fifa.ts` country names: `findCountry` handles flag
  lookups; verify a few group-stage names match once real fixtures populate.
- Volume-based leaderboard remains blocked on the AGG trade-event webhook.
