'use client';

import { useEffect, useState, useCallback } from 'react';
import type { MarketData } from '@/app/types';
import { useTradeStore } from '@/app/store/tradeStore';
import { formatVolume } from '@/app/lib/utils';
import TradePanel from '@/app/components/TradePanel';

const SITE_URL = 'https://singl.market';

interface MarketPageClientProps {
  conditionId: string;
}

export default function MarketPageClient({ conditionId }: MarketPageClientProps) {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const openTrade = useTradeStore(s => s.openTrade);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/${conditionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load market');
      setMarket(data.market);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market');
    } finally {
      setLoading(false);
    }
  }, [conditionId]);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, 15000);
    return () => clearInterval(interval);
  }, [fetchMarket]);

  const url = `${SITE_URL}/market/${conditionId}`;

  const shareOnX = () => {
    if (!market) return;
    const yesCents = Math.round(market.yesPrice * 100);
    const noCents = Math.round(market.noPrice * 100) || (100 - yesCents);
    const text = `${market.title}\n\nYes ${yesCents}\u00a2 / No ${noCents}\u00a2\n\nTrade on SINGL`;
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="animate-pulse text-[var(--secondary)]">Loading market...</div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-[var(--no)] font-bold mb-2">Market not found</p>
        <p className="text-sm text-[var(--secondary)]">{error || 'This market may have been resolved or is unavailable.'}</p>
      </div>
    );
  }

  const yesCents = Math.round(market.yesPrice * 100);
  const noCents = Math.round(market.noPrice * 100) || (100 - yesCents);

  // Use team names for game matchups, fall back to Yes/No
  const yesLabel = market.outcomeName
    ? market.outcomeName.replace(/\s+(Fighting Illini|Hawkeyes|Boilermakers|Wildcats|Huskies|Blue Devils|Volunteers|Wolverines|Panthers|Bulldogs|Bears|Tigers|Cyclones|Crimson Tide|Spartans|Golden Eagles|Red Raiders|Jayhawks|Cougars|Cavaliers|Badgers|Gators|Hoosiers|Buckeyes|Bruins|Trojans|Gaels|Musketeers|Commodores|Razorbacks|Cornhuskers|Aggies|Longhorns|Mountaineers|Terrapins|Sooners|Cowboys|Beavers|Ducks|Lumberjacks|Rebels|Seminoles|Cardinals|Redbirds|Catamounts)$/i, '').trim()
    : 'Yes';
  const noLabel = market.outcome2Name
    ? market.outcome2Name.replace(/\s+(Fighting Illini|Hawkeyes|Boilermakers|Wildcats|Huskies|Blue Devils|Volunteers|Wolverines|Panthers|Bulldogs|Bears|Tigers|Cyclones|Crimson Tide|Spartans|Golden Eagles|Red Raiders|Jayhawks|Cougars|Cavaliers|Badgers|Gators|Hoosiers|Buckeyes|Bruins|Trojans|Gaels|Musketeers|Commodores|Razorbacks|Cornhuskers|Aggies|Longhorns|Mountaineers|Terrapins|Sooners|Cowboys|Beavers|Ducks|Lumberjacks|Rebels|Seminoles|Cardinals|Redbirds|Catamounts)$/i, '').trim()
    : 'No';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Market card */}
      <div className="bg-[var(--surface-container-lowest)] rounded-2xl p-8 shadow-ambient">
        {/* Title */}
        <h1 className="font-heading font-black text-2xl md:text-3xl text-[var(--on-surface)] leading-tight uppercase tracking-tight mb-6">
          {market.title}
        </h1>

        {/* Odds bar */}
        <div className="flex items-center gap-0 mb-2 h-12 rounded-xl overflow-hidden">
          <div
            className="h-full bg-[var(--yes)] flex items-center justify-center text-white font-bold text-sm transition-all"
            style={{ width: `${yesCents}%` }}
          >
            {yesCents > 10 && `${yesLabel} ${yesCents}\u00a2`}
          </div>
          <div
            className="h-full bg-[var(--no)] flex items-center justify-center text-white font-bold text-sm transition-all"
            style={{ width: `${noCents}%` }}
          >
            {noCents > 10 && `${noLabel} ${noCents}\u00a2`}
          </div>
        </div>

        {/* Price + volume row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-[var(--yes)]">{yesLabel} {yesCents}\u00a2</span>
            <span className="text-[var(--surface-container-highest)]">|</span>
            <span className="text-lg font-bold text-[var(--no)]">{noLabel} {noCents}\u00a2</span>
          </div>
          {market.volume != null && market.volume > 0 && (
            <span className="text-sm text-[var(--secondary)]">
              Vol: {formatVolume(market.volume)}
            </span>
          )}
        </div>

        {/* Trade buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => openTrade(market, 'yes')}
            className="flex-1 py-3.5 text-sm font-bold rounded-xl bg-[var(--yes)] text-white hover:opacity-90 transition-all cursor-pointer"
          >
            Buy {yesLabel} {yesCents}\u00a2
          </button>
          <button
            onClick={() => openTrade(market, 'no')}
            className="flex-1 py-3.5 text-sm font-bold rounded-xl bg-[var(--no)] text-white hover:opacity-90 transition-all cursor-pointer"
          >
            Buy {noLabel} {noCents}\u00a2
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex gap-2">
          <button
            onClick={shareOnX}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-[var(--on-surface)] text-white rounded-lg hover:opacity-90 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            Share on X
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-[var(--surface-container-high)] text-[var(--secondary)] rounded-lg hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Rules / description */}
        {market.rulesPrimary && (
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--secondary)] mb-2">Rules</h3>
            <p className="text-sm text-[var(--on-surface)] leading-relaxed">{market.rulesPrimary}</p>
          </div>
        )}
      </div>

      <TradePanel />
    </div>
  );
}
