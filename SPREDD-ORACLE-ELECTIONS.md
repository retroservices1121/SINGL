# SPREDD Oracle — Election Mode (2026 US Midterms)

> Design sketch for re-pointing the SPREDD Oracle from the World Cup to the
> **November 3, 2026 US midterms** after the tournament ends (Jul 19, 2026).
> Reuses the $SPRDD token economy verbatim; rebuilds the engagement engine
> because an election dumps its outcomes in one night instead of dripping
> them daily. Companion to [SPREDD-ORACLE.md](./SPREDD-ORACLE.md).

---

## TL;DR

| Piece | World Cup | Elections | Action |
|---|---|---|---|
| $SPRDD hold-to-multiply | 250k/1M/5M → 1.25×/1.5×/2× | identical | **reuse** |
| Buyback pool + 7-day vesting + on-chain claim | $1k, knockout-weighted | re-weighted to election night | **reuse, re-tune** |
| Pro-rata split (largest-remainder) | per-day points | per-period points | **reuse** |
| Settlement source | ESPN scoreboard | AP / Decision Desk / market resolution | **replace `espn.ts`** |
| Core loop | daily match pick'em + streaks | campaign-long **bracket** + daily **market-move micro-picks** | **rebuild** |
| Reward cadence | daily drip → knockout jackpot | small campaign drip → **election-night jackpot** | **re-tune** |
| "Champion" bet | World Cup winner | **House + Senate control** | **re-theme bracket** |

**Durable core = the token economy.** Everything in `sprdd.ts`, the
`RewardAllocation`/vesting/claim path, and the pro-rata math is event-agnostic
and ships as-is. The work is a new settlement source + a new prediction model.

---

## Why it's a rebuild, not an event swap

A tournament **drips settled outcomes daily** (104 games over 5 weeks) — which
is what powers daily picks, streaks, and the daily buyback. An election
**settles once** (election night). For the weeks before, nothing resolves.

So the daily engine (`MatchPick` + `oracle-settle` grading finals every 20 min
off ESPN) has nothing to grade until Nov 3. Two consequences:

1. The **bracket** becomes the primary game (predict the race set, lock, settle
   on the night) — this is the natural fit.
2. To keep the **daily streak + hold-to-multiply loop alive** through the long
   campaign, layer a **daily micro-prediction** on top, settled off live
   agg.market price moves / daily data — not off a "match result".

---

## Data model changes

Keep `OraclePlayer`, `PointsLedger`, `RewardPeriod`, `RewardAllocation`,
`OracleClaim`, `OracleConfig` unchanged (player identity, points, reward
accounting, claims all transfer).

Repurpose the two prediction tables:

### `MatchPick` → `DailyPick` (the campaign-long daily loop)
A pick on the **question of the day**, settled daily off market moves / data.
```
DailyPick {
  id, playerId, periodKey (YYYY-MM-DD),
  questionId,            // FK to a daily question (see below)
  choice,               // 'YES' | 'NO' | optionId
  pointsAwarded Int?,    // null until settled
  settledAt DateTime?,
  @@unique([playerId, questionId])
}

DailyQuestion {
  id, periodKey, prompt,
  kind,                 // 'market_move' | 'side_of_day' | 'data' | 'editorial'
  aggMarketId String?,   // the agg.market market this resolves against
  threshold Float?,      // e.g. ">2¢ move"
  resolvedOutcome String?, settledAt DateTime?
}
```
Daily questions are generated from live agg.market election markets, e.g.
*"Will GOP Senate-control price move >2¢ today?"*, *"Which side gains today —
House R or House D?"*, *"Will [PA Senate] cross 50%?"*. Resolution = compare
the market's snapshot at lock vs. settle (we already snapshot prices).

### `BracketPick` → `ElectionPick` (the headline, settles on the night)
The locked-before-Nov-3 prediction set.
```
ElectionPick {
  id, playerId,
  houseControl,         // 'R' | 'D'                       (the "champion" bet)
  senateControl,        // 'R' | 'D'
  senateSeats Json,     // { "PA": "D", "OH": "R", ... }    key contested seats
  governors Json,       // { "GA": "R", ... }
  houseMarginBucket,    // optional confidence/margin bet
  lockedAt DateTime?,   // immutable after election-day lock
  pointsAwarded Int?
}
```

`OracleConfig` gains the active mode + lock time:
```
mode: 'tournament' | 'election'
lockAt: 2026-11-03T<poll-close> (ET)
```

---

## Settlement source — replace `espn.ts`

`espn.ts` (FIFA scoreboard) is irrelevant. Add `app/lib/elections.ts` with the
same shape contract (`fetchResults()` returning normalized, never-throws):

- **Primary:** AP Elections API or Decision Desk HQ (authoritative race calls).
- **Fallback / simplest:** resolve directly off **agg.market** outcomes — the
  contested races are liquid prediction markets; when a market resolves, that
  IS the outcome. This keeps SINGL self-consistent (we already aggregate them)
  and avoids a paid elections feed for v1.
- Daily questions resolve off the **price snapshots we already store** (lock vs.
  settle), no external feed needed.

`cron/oracle-settle` switches by `mode`: in election mode it (a) settles the
day's `DailyQuestion`s every evening, and (b) runs a **one-shot bracket grader**
on election night once races are called.

---

## Scoring (election-tuned `oracle.ts`)

Keep `HOLD_TIERS`, `STREAK_*`, `applyMultiplier`, pro-rata split. Replace the
points map:
```
ELECTION_POINTS = {
  dailyQuestion: 10,        // × hold multiplier × streak (same as a match pick)
  senateSeat: 25,           // per correctly-called contested seat
  governor: 15,
  chamberControl: 200,      // House control + Senate control (the jackpot bets)
  marginBucket: 50,         // optional confidence bet
}
```
Streaks now count **consecutive settled days with a correct daily question** —
the daily loop still drives the up-to-2× streak bonus and rewards holding.

---

## Reward economy (re-tune, don't rebuild)

Same `$X` buyback → `RewardAllocation` → 7-day vest → claim. Re-shape the curve:
```
REWARD = {
  totalUsd: <budget>,
  campaignDailyUsd: <small>,   // sustains the daily loop Sep–Nov
  electionNightUsd: <large>,   // the jackpot, paid on results
  vestDays: 7,
}
```
i.e. a long thin drip during the campaign, then one heavy election-night pool
split pro-rata by bracket points. (Inverse of the tournament's "ramp to the
knockouts" — here it's "ramp to one night".)

---

## Frontend changes

- `/oracle` — swap match cards for: a **daily question card** (the loop) + a
  persistent **"Your 2026 Map"** bracket (chamber control, seats, governors)
  with a lock countdown to Nov 3.
- `PickEm.tsx` → election bracket (chamber toggles, seat map, governor picks).
- Reuse the stat header, hold-to-multiply CTA, rewards strip + **Claim** button
  verbatim.
- Leaderboard/Ranks unchanged (points board).

---

## File-by-file change list

| File | Change |
|---|---|
| `prisma/schema.prisma` | `DailyPick`, `DailyQuestion`, `ElectionPick`; keep reward/claim tables |
| `app/lib/oracle.ts` | `ELECTION_POINTS`, `mode` switch; keep hold/streak/split |
| `app/lib/elections.ts` (new) | settlement source (AP/DDHQ or agg.market resolution) |
| `app/lib/espn.ts` | untouched; unused in election mode |
| `app/lib/sprdd.ts` | **no change** (token multiplier) |
| `app/lib/distributor.ts` | **no change** (claim payout) |
| `app/api/oracle/*` | `matches`→`daily`, `bracket`→election bracket; `me`/`claim`/`leaderboard`/`sync-balance` unchanged |
| `app/api/cron/oracle-settle` | mode switch: daily-question settle + one-shot night grader |
| `app/api/cron/oracle-rewards` | re-weighted budget; same fill→split→vest flow |
| `app/components/PickEm.tsx`, `app/oracle/OracleClient.tsx` | election UI |

---

## Open decisions (resolve before build)

1. **Settlement feed:** paid AP/DDHQ vs. resolve off agg.market outcomes (v1
   recommendation: agg.market — self-consistent, free, already integrated).
2. **Which races** count for the bracket (all 35 Senate + 36 gov + chamber
   control, vs. a curated "key races" set — recommend curated ~12–15 for UX).
3. **Daily question generation:** automated from biggest agg.market price moves
   vs. lightly editorial (recommend automated + an optional manual override in
   `/admin`).
4. **Reward split:** campaign-drip % vs. election-night jackpot %.
5. **Lock policy:** hard lock at first poll-close, or per-race lock as polls
   close across time zones.

---

## Timeline hook

World Cup final: **Jul 19, 2026** → rotate event via the `switch-event` skill
(its worked example is literally the 2026 Midterms). Build window **Aug–Sep**,
soft-launch the daily loop **early Oct**, bracket lock **Nov 3**, settle that
night, vest through **Nov 10**.

## Bottom line

The $SPRDD flywheel (hold-to-multiply → buyback → vest → claim) is the reusable
asset and ports unchanged. Election mode = **new settlement source + bracket-as-
headline + daily market-move micro-picks to keep the loop warm**. Re-skin and
re-tune, not a rewrite.
