# Spredd Markets — platform vision (post-World-Cup)

> The plan to evolve **SINGL → Spredd Markets**: keep the agg.market
> aggregation, add a **permissionless user-created market layer** with a
> bonding-curve AMM and creator fees, unify everything under one brand and one
> token (**$SPRDD**), and generalize across verticals (sports → politics →
> crypto → …). Companion to [SPREDD-ORACLE.md](./SPREDD-ORACLE.md) and
> [SPREDD-ORACLE-ELECTIONS.md](./SPREDD-ORACLE-ELECTIONS.md).

---

## Brand + token decision (settled)

- **SINGL → Spredd Markets.** The platform name now matches the token, killing
  the "why does SINGL use $SPRDD?" confusion.
- **$SPRDD is the one token and the single fee sink.** No second token (would
  fragment liquidity/holders). $SPRDD already exists (~1yr, ~$20K liquidity,
  ~18K holders — many dust/bots), so we keep its history and **give it real
  utility** for the first time via the marketplace.
- Migration cost is ~zero (no token change) — only an app/domain rebrand.

---

## The three-layer model

The marketplace is what turns "a series of one-off curated event sites" into a
**persistent platform**:

1. **Curated headline** (rotates: World Cup → Midterms → NBA → …) — the
   acquisition spike, via the `switch-event` flow.
2. **Aggregation** (agg.market, 6 venues) — pro-grade breadth across the
   headline *and* everything else.
3. **Marketplace** (permissionless, NEW) — the long tail + always-on engagement
   + creator flywheel + the $SPRDD demand engine.

The headline rotates; **the marketplace never goes dark.**

---

## The marketplace

**Permissionless creation, gated by stake.** Anyone holding **≥ $1,000 of
$SPRDD** can create a market. The gate is both **anti-spam** and a **demand
sink** (creators must buy/hold). Tie it into hold-to-multiply: higher holdings →
lower fees / featured placement.

**Bonding curve = a prediction-market AMM, not a pump.fun curve.** Outcomes must
sum to $1, so use **LMSR / CPMM (Gnosis-style conditional tokens)** — the proven
AMM for binary/categorical markets. It provides **instant liquidity from market
#1** (solves the cold-start problem) and prices YES 0→1 as people buy.

**Graduation.** Once a market crosses a liquidity/volume threshold, deepen the
curve and/or promote it into the curated feed (pump.fun → Raydium analogue).

**Fees.** Per-trade skim split: **creator fee + platform fee**. Platform fee is
**routed to both $SPRDD buyback AND liquidity** (critical — see thin-liquidity
note). Creator fee is the distribution flywheel (creators promote their own
markets).

**Lifecycle.** Tradable until **(a)** an objective resolution is matched, or
**(b)** the owner closes it (the risky edge — see Resolution).

---

## Resolution — the make-or-break

**"Match a resolution" is the safe core; owner-close is the dangerous edge.**
Permissionless is only safe where outcomes resolve objectively. Quality of the
marketplace per vertical = quality of the resolution feed:

| Vertical | Feed | Status |
|---|---|---|
| **Sports** | ESPN (`espn.ts`) | trustless **today** |
| **Politics / elections** | AP / Decision Desk, **or mirror an agg.market question** | strong; agg already carries the headline races |
| **Crypto / finance** | price oracles | objective, 24/7 |
| **Subjective** (culture, "will X resign") | owner-resolve + **optimistic dispute window** (UMA-style) | ship **last** |

**Launch rule: objectively-resolvable, auto-settled markets only.** A created
market must *map to* an ESPN event / an agg.market question / a price feed.
Free-text subjective markets come later, behind a dispute mechanism. This is the
moat — most launchpads can't auto-resolve.

---

## Multi-vertical rollout

The marketplace generalizes across every event type; expand
**category-by-category as resolution feeds land**: sports (have it) → politics →
crypto → subjective. The headline event rotates above it; the long tail fills in
underneath.

**Politics is arguably the strongest fit** (users create the hyper-local races /
props Polymarket won't list) **and the biggest caveat** — US election contracts
are actively litigated (CFTC v. Kalshi). Permissionless + US + politics is the
riskiest config; the regulatory posture below is the gate.

**Cadence differs, fit doesn't:** fast events (sports) churn daily; slow events
(one election night) sit open for weeks accruing creator fees on every buy, then
spike at settlement. Same flywheel, different heartbeat.

---

## Token economics ($SPRDD as the single sink)

- **Create-gate demand:** every creator buys/holds $1k $SPRDD → demand scales
  with each new vertical, not just the World Cup.
- **Fee → buyback + LP:** every created market and every trade buys back $SPRDD
  *and* deepens liquidity. This is a far better flywheel than the current
  treasury-funded Oracle buyback.
- **Hold-to-multiply tie-in:** holding tiers already power the Oracle; reuse them
  to discount fees / unlock featured markets / boost creator revenue.
- **Thin-liquidity reality ($20K pool):** a $1k gate is ~5% of the pool per
  creator — demand will move price *hard* (good) but it's whippy and cheap to
  manipulate. **Route part of fees into LP** so the marketplace isn't a casino on
  a shallow pool; deepen liquidity as volume grows.

---

## Regulatory posture (DECIDED: geo-gate the USA)

**Chosen posture: geo-restrict the US** (the Polymarket playbook). This lets us
run real-money / crypto-settled markets for the rest of the world, makes
politics viable globally, and **decouples the token from regulation** —
$SPRDD-denominated becomes a flywheel *choice*, not a legal requirement.

**An IP block alone is NOT enough.** Polymarket geofenced the US and still took
a ~$1.4M CFTC settlement because US users entered via VPN. Layer the controls:
- **IP geofence** (Vercel `x-vercel-ip-country` in middleware) on the real-money
  *actions* (trade + create) — read-only aggregation can stay global.
- **VPN / proxy detection** (e.g. IPQualityScore) — the piece Polymarket lacked.
- **On-connect attestation** ("not a US person") + Terms restricting prohibited
  jurisdictions.
- **Block OFAC-sanctioned countries** too (not just US).
- **Offshore operating entity** — structure matters as much as the IP block.

Scope note: SINGL already facilitates real trading via AGG, so the geo-gate
likely applies to the **current app**, not only the future marketplace
(AGG's underlying venues geo-gate themselves, but the Spredd front-end should
have its own gate by launch).

---

## Architecture

**Reuses (already built):** auth/wallets, the trade UI, $SPRDD machinery
(buyback/vest/claim/hold-multiply), ESPN + agg.market resolution feeds, the
event-rotation flow.

**New (the build):** on-chain **market contracts** — the LMSR/CPMM curve +
conditional-token settlement — most likely on **Base** (where $SPRDD lives) or
Solana (where trading runs).

**Key unknown that sets the build size:** *does AGG support market **issuance**,
or do we deploy our own market contracts?* Answer this first.

---

## Open decisions

1. **AGG issuance vs. own contracts** (sets the whole engineering scope).
2. **Chain:** Base (token home) vs. Solana (trading home).
3. **Regulatory posture:** $SPRDD-only vs. geofenced-fiat.
4. **AMM:** LMSR vs. CPMM/conditional-tokens.
5. **Fee split:** creator % / buyback % / LP %.
6. **Graduation threshold** + what "graduation" promotes to.
7. **Create-gate denomination:** fixed USD ($1k) vs. fixed token amount.
8. **Subjective markets:** dispute mechanism design (or exclude indefinitely).

---

## Phased MVP

1. **Sports-only, auto-resolved** (ESPN) — permissionless create (≥$1k $SPRDD),
   LMSR curve, creator + platform fees → buyback/LP, graduation to the feed.
   $SPRDD-denominated to sidestep the worst regulatory risk.
2. **+ Politics & crypto** as resolution feeds (AP/DDHQ, agg-mirror, price
   oracles) and regulatory cover land.
3. **+ Subjective** markets behind an optimistic dispute window.

Throughout: aggregation stays, the curated headline keeps rotating, and the
whole thing rebrands to **Spredd Markets** with $SPRDD as the one token.

## Bottom line

Spredd Markets = **aggregate everything + curate the headline + let anyone
create the long tail**, with **one token ($SPRDD)** that every created market and
every trade buys back. The marketplace is the durable, multi-vertical platform
play; the World Cup is just the first headline it launches under.
