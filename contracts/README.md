# Spredd Markets — contracts

On-chain prediction markets for the Spredd Markets marketplace. v1 uses an
**FPMM** (Gnosis/Polymarket-style constant-product AMM) — the cheap, solvent,
on-chain alternative to LMSR (which needs gas-heavy fixed-point exp/ln). The
off-chain LMSR lib (`app/lib/lmsr.ts`) is kept for quotes/previews.

## Contracts
- **`SpreddMarket.sol`** — one binary (YES/NO) market: seeded FPMM pool,
  buy/sell either outcome (**1% fee per trade, split 70% creator / 30%
  platform**), `close()` (owner stops trading), `resolve()` (resolver settles),
  `redeem()` (winning shares → 1 collateral each). Solvent by construction.
  Buyback/LP from platform fees is **manual** (fees land at the platform
  address; no auto-routing).
- **`SpreddMarketFactory.sol`** — permissionless creation **gated by a $SPRDD
  hold** (anti-spam + demand sink); pulls the creator's seed and funds the
  market. Owner-configurable fees / gate / resolver.
- **`MockERC20.sol`** — the testnet tokens: **PTS** (free points, the trading
  collateral — open-mint faucet) and **$SPRDD** (the create-gate; distribute to
  chosen testers, no public faucet, so the gate actually gates).

## Testnet model (free-to-play)
Trading uses **free PTS points** (claimable in the UI), so there's no real money
on testnet — it still exercises the on-chain AMM and the create-gate end to end.
**Creation stays gated by holding ≥ 1,000 $SPRDD.** Mainnet swaps PTS for real
collateral (USDC) and uses the real $SPRDD; the gate logic is unchanged.

## Develop
```
npm install
npx hardhat compile
npx hardhat test
```

## Deploy to Base Sepolia
1. `cp .env.example .env` and set `PRIVATE_KEY` (funded testnet key) + RPC.
   Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
2. `npm run deploy:baseSepolia`
3. The script prints the SPRDD / USDC / MarketFactory addresses and mints test
   tokens to the deployer. Wire the factory address into the app.

## Resolution
v1 resolver = an admin/oracle adapter address. The app's ESPN / agg.market
matcher calls `resolve(outcome)` once a bound event settles (objective,
auto-resolved). Subjective markets + dispute windows come later.

## Notes / next
- Shares are internal (AMM-tradable); tokenize to ERC1155 for secondary
  transfer + composability later.
- Add an on-chain $SPRDD/USD oracle so the create-gate can be USD-pegged
  ($1,000) rather than a fixed token amount.
- Route platform fees → $SPRDD buyback + LP (currently paid to the platform
  address).
- Audit before mainnet.
