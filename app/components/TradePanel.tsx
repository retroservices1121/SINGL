'use client';

import { useState, useEffect, useRef } from 'react';
import { useAggAuth } from '@agg-build/hooks';
import { useAggAuthFlow } from '@agg-build/auth';
import { useAggTrading, type AggQuote } from '@/app/hooks/useAggTrading';
import { useTradeStore } from '@/app/store/tradeStore';
import { useLivePrice } from './LivePricesProvider';
import { formatUSD, formatPercent } from '@/app/lib/utils';
import Spinner from './ui/Spinner';

const PRESETS = [10, 25, 50, 100, 250];

export default function TradePanel() {
  const { isOpen, market, side, amount, submitting, confirmed, orderId, closeTrade, setAmount, setSubmitting, setConfirmed } = useTradeStore();
  const { isAuthenticated } = useAggAuth();
  const { startMethod } = useAggAuthFlow();
  const authenticated = isAuthenticated;
  const signIn = () => startMethod('siwe');
  const { ready, walletAddress, initializing, error: sessionError, getQuote, placeOrder } = useAggTrading();
  const [localError, setLocalError] = useState<string | null>(null);
  const [quote, setQuote] = useState<AggQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const quoteSeq = useRef(0);

  const outcomeId = market ? (side === 'yes' ? market.yesOutcomeId : market.noOutcomeId) : '';
  // Live price for the side the user picked, falling back to the static
  // price baked into MarketData on first paint.
  const livePrice = useLivePrice(
    outcomeId || null,
    side === 'yes' ? (market?.yesPrice ?? 0.5) : (market?.noPrice ?? 0.5),
  );

  // Re-quote whenever the user changes amount/side/market. Debounce 250 ms.
  useEffect(() => {
    if (!market || !outcomeId || amount <= 0) { setQuote(null); return; }
    const seq = ++quoteSeq.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const q = await getQuote({ outcomeId, side: 'BUY', maxSpend: amount });
        if (seq === quoteSeq.current) setQuote(q);
      } catch {
        if (seq === quoteSeq.current) setQuote(null);
      } finally {
        if (seq === quoteSeq.current) setQuoting(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [market, outcomeId, amount, getQuote]);

  if (!isOpen || !market) return null;

  const sideLabel = side === 'yes'
    ? (market.outcomeName || 'YES')
    : (market.outcome2Name || 'NO');

  // Use quote when available; fall back to live mid price (which itself
  // falls back to the static MarketData price) for the breakdown.
  const fallbackPrice = livePrice > 0 ? livePrice : (side === 'yes' ? market.yesPrice : (market.noPrice || (1 - market.yesPrice)));
  const shares = quote?.totalFilled ?? (fallbackPrice > 0 ? amount / fallbackPrice : 0);
  const cost = quote?.estimatedCostRaw ?? amount;
  const payout = quote?.estimatedPayout ?? shares;
  const profit = quote?.estimatedProfit ?? (payout - cost);
  const effectivePrice = shares > 0 ? cost / shares : fallbackPrice;
  const routedVenues = quote?.fills?.map(f => f.venue).filter(Boolean) ?? [];

  const handleSubmit = async () => {
    setLocalError(null);

    if (!authenticated) { signIn(); return; }
    if (!ready || !walletAddress) { setLocalError('Trading session not ready. Please wait.'); return; }
    if (!outcomeId) { setLocalError('Market outcome not available.'); return; }
    if (!quote?.quoteId) { setLocalError('Waiting for live quote. Try again in a moment.'); return; }

    setSubmitting(true);
    try {
      const result = await placeOrder({
        quoteId: quote.quoteId,
        fallback: { outcomeId, side: 'BUY', maxSpend: amount },
      });
      setConfirmed(result.orderIds[0] || 'submitted');
    } catch (err) {
      console.error('[trade] error:', err);
      const msg = err instanceof Error ? err.message : 'Trade failed';
      if (!msg.includes('rejected')) setLocalError(`Trade error: ${msg}`);
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={closeTrade}>
        <div
          className="bg-[var(--surface-container-lowest)] rounded-xl p-8 max-w-sm w-full text-center animate-[pop-in_0.3s_ease-out] shadow-ambient"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-5xl mb-3">{side === 'yes' ? '🎯' : '🛡️'}</div>
          <h3 className="font-heading text-xl font-black uppercase mb-1">Trade Submitted</h3>
          <p className="text-sm text-[var(--secondary)] mb-4">
            {formatUSD(amount)} on {sideLabel} for &ldquo;{market.title}&rdquo;
          </p>
          {orderId && (
            <p className="text-[10px] text-[var(--secondary)] font-mono">
              Order: {orderId.slice(0, 12)}...
            </p>
          )}
          <div className="mt-6">
            <button
              onClick={closeTrade}
              className="gradient-cta text-white px-8 py-3 rounded-md font-bold text-sm uppercase tracking-widest shadow-lg shadow-[var(--primary-container)]/30 hover:brightness-110 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  let buttonLabel = '';
  let buttonDisabled = submitting || amount <= 0;
  if (!authenticated) {
    buttonLabel = 'Connect Wallet to Trade';
  } else if (initializing) {
    buttonLabel = 'Initializing Session...';
    buttonDisabled = true;
  } else if (!ready) {
    buttonLabel = 'Waiting for Trading Session...';
    buttonDisabled = true;
  } else if (quoting || !quote) {
    buttonLabel = 'Fetching Best Route...';
    buttonDisabled = true;
  } else {
    buttonLabel = `Confirm ${sideLabel} - ${formatUSD(amount)}`;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={closeTrade}>
      <div
        className="bg-[var(--surface-container-lowest)] rounded-xl max-w-sm w-full animate-[pop-in_0.3s_ease-out] shadow-ambient border-t-4 border-[var(--primary-container)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[var(--surface-container)]">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-black uppercase">
              Buy <span className={side === 'yes' ? 'text-[var(--yes)]' : 'text-[var(--no)]'}>{sideLabel}</span>
            </h3>
            <button onClick={closeTrade} className="text-[var(--secondary)] hover:text-[var(--on-surface)] text-xl cursor-pointer">&times;</button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-xs text-[var(--secondary)] leading-snug">{market.title}</p>

          {authenticated && !ready && !initializing && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>Trading session not ready. Please wait for auto-provisioning.</span>
            </div>
          )}
          {authenticated && initializing && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-300">
              <Spinner size="sm" />
              <span>Setting up trading session...</span>
            </div>
          )}
          {sessionError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{sessionError}</span>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-1.5 block">Amount (USDC)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--secondary)]">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                className="w-full text-right font-mono bg-[var(--surface-container-high)] rounded-md px-3 py-2.5 text-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-container)] border-none"
                min="1"
                step="1"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setAmount(p)}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                    amount === p
                      ? 'bg-[var(--primary-container)] text-white'
                      : 'bg-[var(--surface-container-high)] text-[var(--secondary)] hover:bg-[var(--surface-container-highest)]'
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[var(--surface-container-low)] rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--secondary)]">Price</span>
              <span className="font-mono font-bold">{formatPercent(effectivePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--secondary)]">Est. Shares</span>
              <span className="font-mono font-bold">{shares.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--surface-container)]">
              <span className="font-medium">Potential Payout</span>
              <span className="font-mono font-black text-[var(--on-surface)]">{formatUSD(payout)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--secondary)]">Potential Profit</span>
              <span className="font-mono font-bold text-[var(--yes)]">+{formatUSD(profit)}</span>
            </div>
            {routedVenues.length > 0 && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--surface-container)]">
                <span className="material-symbols-outlined text-sm text-[var(--secondary)]">route</span>
                <span className="text-[10px] text-[var(--secondary)] uppercase tracking-wider">
                  Routed: {[...new Set(routedVenues)].join(', ')}
                </span>
              </div>
            )}
          </div>

          {localError && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
              {localError}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={buttonDisabled}
            className={`w-full py-4 rounded-md font-black text-sm uppercase tracking-widest shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              side === 'yes'
                ? 'bg-[var(--yes)] text-white shadow-[var(--yes)]/20 hover:brightness-110'
                : 'bg-[var(--no)] text-white shadow-[var(--no)]/20 hover:brightness-110'
            }`}
          >
            {submitting ? <><Spinner size="sm" /> Processing...</> : buttonLabel}
          </button>

          {authenticated && walletAddress && (
            <div className="text-center">
              <span className="text-[9px] text-[var(--secondary)]">
                Trading via AGG: <span className="font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
