'use client';

import { useState } from 'react';
import type { MarketData } from '@/app/types';
import { useTradeStore } from '@/app/store/tradeStore';
import { useLivePriceInfo } from './LivePricesProvider';
import { formatVolume } from '@/app/lib/utils';
import VenueChip from './VenueChip';

const SITE_URL = 'https://singl.market';

interface MarketCardProps {
  market: MarketData;
  index: number;
  // Parent event title — rendered as a small label above the market title
  // so users have context when the market itself is just an outcome name
  // (e.g. AGG returns "USA" for "Will the USA win the 2026 World Cup?").
  eventTitle?: string;
}

// Shorten team names for buttons: "Illinois Fighting Illini" → "Illinois"
function shortName(name: string | null | undefined): string | null {
  if (!name) return null;
  // Drop common suffixes like "Fighting Illini", "Wolverines", "Boilermakers", etc.
  return name.replace(/\s+(Fighting Illini|Hawkeyes|Boilermakers|Wildcats|Huskies|Blue Devils|Volunteers|Wolverines|Panthers|Bulldogs|Bears|Tigers|Cyclones|Crimson Tide|Spartans|Golden Eagles|Red Raiders|Jayhawks|Cougars|Cavaliers|Badgers|Gators|Hoosiers|Buckeyes|Bruins|Trojans|Gaels|Musketeers|Commodores|Razorbacks|Cornhuskers|Aggies|Longhorns|Mountaineers|Terrapins|Sooners|Cowboys|Beavers|Ducks|Lumberjacks|Rebels|Seminoles|Cardinals|Redbirds|Catamounts)$/i, '').trim();
}

export default function MarketCard({ market, index, eventTitle }: MarketCardProps) {
  const openTrade = useTradeStore(s => s.openTrade);
  const openDetail = useTradeStore(s => s.openDetail);
  const [copied, setCopied] = useState(false);
  const yesInfo = useLivePriceInfo(market.yesOutcomeId, market.yesPrice, market.venue ?? null);
  const noInfo = useLivePriceInfo(market.noOutcomeId, market.noPrice || (1 - yesInfo.price), market.venue ?? null);
  const yesCents = Math.round(yesInfo.price * 100);
  const noCents = Math.round(noInfo.price * 100) || (100 - yesCents);
  const yesLabel = shortName(market.outcomeName) || 'Yes';
  const noLabel = shortName(market.outcome2Name) || 'No';

  // Multi-outcome detection: when AGG returns one market with 3+ outcomes
  // (e.g. "Nation to Reach Final" with 32 country outcomes) show a stacked
  // top-3 preview instead of the binary Yes/No price row.
  const outcomes = market.outcomes ?? [];
  const isMultiOutcome = outcomes.length > 2;
  const topThree = outcomes
    .slice()
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    .slice(0, 3);
  // Hide the eventTitle subtitle when it's identical to the market title
  // (saves visual noise on truly singular events).
  const showEventSubtitle = eventTitle && eventTitle.trim().toLowerCase() !== market.title.trim().toLowerCase();

  const copyShareText = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${SITE_URL}/market/${market.venueMarketId}`;
    const text = `${market.title}\n\n${yesLabel} ${yesCents}\u00a2 / ${noLabel} ${noCents}\u00a2\n\nTrade on SINGL\n${url}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="bg-[var(--surface-container-lowest)] rounded-xl p-5 shadow-ambient hover:scale-[1.02] transition-all duration-300 flex flex-col cursor-pointer"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => openDetail(market)}
    >
      {/* Event subtitle + title + share. Venue is surfaced inline next to
          each side's price via VenueChip — no separate top badge needed. */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          {showEventSubtitle && (
            <p className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest leading-none mb-1 truncate">
              {eventTitle}
            </p>
          )}
          <h4 className="font-heading font-bold text-sm text-[var(--on-surface)] leading-snug uppercase tracking-tight">
            {market.title}
          </h4>
        </div>
        <button
          onClick={copyShareText}
          className="shrink-0 p-1.5 rounded-md text-[var(--secondary)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] transition-colors cursor-pointer"
          title={copied ? 'Copied!' : 'Copy share text'}
        >
          {copied ? (
            <svg className="w-3.5 h-3.5 text-[var(--yes)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          )}
        </button>
      </div>

      {isMultiOutcome ? (
        <>
          {/* Top-3 outcome preview — tap card to open full list */}
          <div className="space-y-1.5 mb-3">
            {topThree.map(o => {
              const pct = Math.round((o.price ?? 0) * 100);
              return (
                <div key={o.id} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--on-surface)] truncate flex-1">{o.label}</span>
                  <div className="w-16 h-1.5 rounded-full overflow-hidden bg-[var(--surface-container-high)]">
                    <div className="h-full bg-[var(--yes)] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--on-surface)] w-8 text-right">{pct}%</span>
                </div>
              );
            })}
            {outcomes.length > 3 && (
              <p className="text-[10px] text-[var(--secondary)] pt-1">
                +{outcomes.length - 3} more outcomes
              </p>
            )}
          </div>
          {/* Single CTA into the full outcomes view */}
          <button
            onClick={(e) => { e.stopPropagation(); openDetail(market); }}
            className="w-full py-2 text-xs font-bold rounded-md bg-[var(--surface-container-high)] text-[var(--on-surface)] hover:bg-[var(--primary-container)] hover:text-white transition-colors cursor-pointer"
          >
            View {outcomes.length} Outcomes
          </button>
        </>
      ) : (
        <>
          {/* Odds bar */}
          <div className="flex items-center gap-1 mb-3 h-2 rounded-full overflow-hidden bg-[var(--surface-container-high)]">
            <div
              className="h-full bg-[var(--yes)] rounded-full transition-all"
              style={{ width: `${yesCents}%` }}
            />
          </div>

          {/* Prices + per-side venue chip (AGG may route YES + NO to different venues) */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--yes)]">
                {yesLabel} {yesCents}c <VenueChip venue={yesInfo.venue} />
              </span>
              <span className="text-[var(--surface-container-highest)]">|</span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--no)]">
                {noLabel} {noCents}c <VenueChip venue={noInfo.venue} />
              </span>
            </div>
            {market.volume != null && market.volume > 0 && (
              <span className="text-[10px] text-[var(--secondary)] shrink-0">
                Vol: {formatVolume(market.volume)}
              </span>
            )}
          </div>

          {/* Trade buttons */}
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); openTrade(market, 'yes'); }}
              className="flex-1 py-2 text-xs font-bold rounded-md bg-[var(--yes-bg)] text-[var(--yes)] hover:bg-[var(--yes)] hover:text-white transition-colors cursor-pointer truncate"
            >
              Buy {yesLabel}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openTrade(market, 'no'); }}
              className="flex-1 py-2 text-xs font-bold rounded-md bg-[var(--no-bg)] text-[var(--no)] hover:bg-[var(--no)] hover:text-white transition-colors cursor-pointer truncate"
            >
              Buy {noLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
