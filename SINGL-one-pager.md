# SINGL — One Event. Total Focus.

## What is SINGL?

SINGL is a single-event prediction market terminal. One event at a time. Every data feed, every visualization, every tool — all pointed at the same thing.

Right now that's March Madness. Next week it could be the NBA Finals, a presidential election, a Fed rate decision, or a crypto catalyst. The event changes. The focus doesn't.

SINGL is built by Spredd Markets. Trades execute on-chain via Polymarket on the Polygon network.

## The Problem

Polymarket lists thousands of markets across dozens of categories. Great for browsing. Terrible for trading a single event with conviction.

When an event is live — a tournament, an election night, a breaking geopolitical moment — you don't want a general-purpose marketplace. You want a war room. Every feed, every chart, every alert tuned to the one thing that matters right now.

## The Solution

SINGL wraps Polymarket's liquidity with a purpose-built interface that goes deep on one event at a time.

**Adaptive Event Engine**
The entire platform reconfigures around whatever event is active. Admin sets the event, and SINGL automatically pulls all related markets, news, social posts, and video content. The UI adapts — tournament brackets for March Madness, candidate cards for elections, price tickers for economic events.

**Real-Time Data Feeds**
- Market prices from Polymarket CLOB: every 5 minutes
- Live event scores (ESPN integration): every 30 seconds
- News aggregation: every 30 minutes
- X/Twitter posts: every 15 minutes
- YouTube videos: every 60 minutes
- TikTok content: every 60 minutes

All automated. All contextual to the active event.

**Trading Tools**
- Market cards with live Yes/No odds, volume, and 24h change
- Price history charts with dual Yes/No lines and time range toggles
- Odds movement tracker showing biggest movers with sparklines
- Alert system detecting significant price swings
- Market detail overlay with Polymarket resolution rules
- One-click Buy Yes / Buy No on any outcome

**On-Chain Execution**
- Connect any wallet via Privy (email, social, or crypto wallet)
- Trades execute on Polymarket via Gnosis Safe smart wallets
- Settlement in USDC on Polygon
- Full portfolio tracking with P&L and position management
- Sell positions before expiration, redeem winnings after resolution

**Community & Competition**
- Global leaderboard ranked by volume
- Prize pools for top traders per event
- Portfolio analytics with win rate and performance tracking

## How Events Work

SINGL runs one active event at a time. When an event goes live:

1. All Polymarket markets matching the event are aggregated automatically
2. News, social media, and video feeds are tuned to the event's search terms
3. The UI adapts to the event type (bracket for tournaments, timeline for elections, etc.)
4. Price snapshots begin recording for historical charts
5. Leaderboard and prize pool activate

When the event ends, the next one loads. The platform stays focused.

## Current Event: March Madness 2026

- Interactive tournament bracket with live odds per region
- Path-to-Championship calculator
- Team dashboard cards with seed, region, round-by-round odds
- Live ESPN score ticker
- Upset alerts for underdog surges and favorite fades
- $250 USDC prize pool for top 3 traders

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, Zustand
- **Blockchain**: Polygon, Polymarket CLOB API, Gnosis Safe, USDC
- **Authentication**: Privy (email, social, wallet login)
- **Data**: Polymarket Gamma API, ESPN, YouTube API, X/Twitter
- **Infrastructure**: Railway, PostgreSQL, Prisma ORM

## Links

- **App**: singl.spredd.markets
- **Built by**: Spredd Markets (@spreddterminal)
