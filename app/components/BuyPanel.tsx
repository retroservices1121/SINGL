'use client';

import { useEffect, useRef, useState } from 'react';
import { useAggAuth } from '@agg-build/hooks';
import { useAggAuthFlow } from '@agg-build/auth';
import { useAggTrading, type AggQuote } from '@/app/hooks/useAggTrading';
import { useLivePrice } from './LivePricesProvider';
import { formatUSD } from '@/app/lib/utils';
import VenueChip from './VenueChip';
import Spinner from './ui/Spinner';

const PRESETS = [10, 25, 50, 100, 250];

interface BuyPanelProps {
  // The outcome the user is buying. For binary markets pass yesOutcomeId
  // when side==='yes' and noOutcomeId when side==='no'. For multi-outcome
  // markets pass the selected outcome's id for YES; NO falls back to the
  // market's noOutcomeId.
  yesOutcomeId: string | null;
  noOutcomeId: string | null;
  // Static fallback prices for first paint before live ticks land.
  yesPriceFallback: number;
  noPriceFallback: number;
  // Label for the YES side (e.g. country name "Spain" or just "Yes").
  yesLabel: string;
  noLabel: string;
}

export default function BuyPanel({ yesOutcomeId, noOutcomeId, yesPriceFallback, noPriceFallback, yesLabel, noLabel }: BuyPanelProps) {
  const { isAuthenticated } = useAggAuth();
  const { startMethod } = useAggAuthFlow();
  const { ready, walletAddress, initializing, error: sessionError, getQuote, placeOrder } = useAggTrading();

  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [quote, setQuote] = useState<AggQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const quoteSeq = useRef(0);

  const outcomeId = side === 'yes' ? yesOutcomeId : noOutcomeId;
  const yesLive = useLivePrice(yesOutcomeId, yesPriceFallback);
  const noLive = useLivePrice(noOutcomeId, noPriceFallback || (1 - yesLive));
  const livePrice = side === 'yes' ? yesLive : noLive;
  const yesCents = Math.round(yesLive * 100);
  const noCents = Math.round(noLive * 100) || (100 - yesCents);

  // Debounced re-quote when amount/side/outcome changes. AGG's
  // `/execution/quote` rejects unauthenticated callers with a 404, so we
  // skip the call entirely until the user has signed in — the CTA
  // ("Sign in to trade") covers the no-auth UX path.
  useEffect(() => {
    if (!isAuthenticated) { setQuote(null); setQuoting(false); return; }
    if (!outcomeId || amount <= 0) { setQuote(null); return; }
    const seq = ++quoteSeq.current;
    setQuoting(true);
    setLocalError(null);
    const t = setTimeout(async () => {
      try {
        const q = await getQuote({ outcomeId, side: 'BUY', maxSpend: amount });
        if (seq === quoteSeq.current) setQuote(q);
      } catch (err) {
        if (seq === quoteSeq.current) {
          setQuote(null);
          const msg = err instanceof Error ? err.message : 'Quote failed';
          setLocalError(msg);
        }
      } finally {
        if (seq === quoteSeq.current) setQuoting(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [isAuthenticated, outcomeId, amount, getQuote]);

  // Clear confirmation when the user changes anything.
  useEffect(() => { setConfirmed(null); }, [outcomeId, amount, side]);

  const shares = quote?.totalFilled ?? (livePrice > 0 ? amount / livePrice : 0);
  const totalCost = quote?.estimatedCostRaw ?? amount;
  const payout = quote?.estimatedPayout ?? shares;
  const profit = quote?.estimatedProfit ?? (payout - totalCost);
  const fills = quote?.fills ?? [];
  const effectivePrice = shares > 0 ? totalCost / shares : livePrice;

  const handleSubmit = async () => {
    setLocalError(null);
    if (!isAuthenticated) { startMethod('siwe'); return; }
    if (!ready || !walletAddress) { setLocalError('Trading session not ready.'); return; }
    if (!outcomeId) { setLocalError('Outcome not available.'); return; }
    if (!quote?.quoteId) { setLocalError('Waiting for live quote.'); return; }

    setSubmitting(true);
    try {
      const result = await placeOrder({
        quoteId: quote.quoteId,
        fallback: { outcomeId, side: 'BUY', maxSpend: amount },
      });
      setConfirmed(result.orderIds[0] || 'submitted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Trade failed';
      if (!msg.includes('rejected')) setLocalError(msg);
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  };

  let cta = `Buy ${side === 'yes' ? yesLabel : noLabel} · ${formatUSD(amount)}`;
  let ctaDisabled = submitting || amount <= 0 || !outcomeId;
  if (!isAuthenticated) {
    cta = 'Sign in to trade';
  } else if (initializing) {
    cta = 'Initializing…';
    ctaDisabled = true;
  } else if (!ready) {
    cta = 'Provisioning wallet…';
    ctaDisabled = true;
  } else if (quoting || !quote) {
    cta = 'Routing best price…';
    ctaDisabled = true;
  }

  return (
    <div className="bg-[var(--surface-container-low)] rounded-2xl p-5 space-y-4 shadow-ambient">
      {/* Side toggle */}
      <div className="grid grid-cols-2 gap-1 bg-[var(--surface-container)] rounded-lg p-1">
        <button
          onClick={() => setSide('yes')}
          className={`py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all cursor-pointer ${
            side === 'yes' ? 'bg-[var(--yes)] text-white shadow' : 'text-[var(--secondary)] hover:text-[var(--on-surface)]'
          }`}
        >
          Yes · {yesCents}¢
        </button>
        <button
          onClick={() => setSide('no')}
          className={`py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all cursor-pointer ${
            side === 'no' ? 'bg-[var(--no)] text-white shadow' : 'text-[var(--secondary)] hover:text-[var(--on-surface)]'
          }`}
        >
          No · {noCents}¢
        </button>
      </div>

      {/* Amount */}
      <div>
        <label className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-1.5 block">Amount</label>
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
        <div className="flex gap-1.5 mt-2">
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

      {/* Smart routing */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">Smart Routing</h4>
          {quoting && <Spinner size="sm" />}
        </div>
        {fills.length > 0 ? (
          <div className="space-y-1.5">
            {fills.map((f, i) => (
              <div key={`${f.venue}-${i}`} className="flex items-center gap-2 px-2 py-1.5 bg-[var(--surface-container)] rounded-md">
                <VenueChip venue={f.venue} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold capitalize text-[var(--on-surface)]">{f.venue}</div>
                  <div className="text-[9px] font-mono text-[var(--secondary)]">{f.size.toFixed(2)} sh @ {Math.round(f.price * 100)}¢</div>
                </div>
                <div className="font-mono text-sm font-bold text-[var(--on-surface)]">{formatUSD(f.cost)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-[var(--secondary)] italic px-1">
            {amount <= 0 ? 'Enter an amount to see routing' : quoting ? 'Routing…' : 'No fills available'}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="space-y-1 pt-1 border-t border-[var(--surface-container)]">
        <Row label="Avg Price" value={`${(effectivePrice * 100).toFixed(1)}¢`} mono />
        <Row label="Shares" value={shares.toFixed(2)} mono />
        <Row label="Total" value={formatUSD(totalCost)} mono strong />
        <Row label="Pot. Payout" value={formatUSD(payout)} mono accent="yes" />
        <Row label="Pot. Profit" value={`+${formatUSD(profit)}`} mono accent="yes" />
      </div>

      {/* Errors / status */}
      {localError && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-[10px] text-red-700">
          {localError}
        </div>
      )}
      {sessionError && !localError && (
        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-[10px] text-amber-700">
          {sessionError}
        </div>
      )}
      {confirmed && (
        <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md text-[10px] text-emerald-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          Order submitted · <span className="font-mono">{confirmed.slice(0, 10)}…</span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={ctaDisabled}
        className={`w-full py-3.5 rounded-md font-black text-sm uppercase tracking-widest shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
          side === 'yes'
            ? 'bg-[var(--yes)] text-white shadow-[var(--yes)]/20 hover:brightness-110'
            : 'bg-[var(--no)] text-white shadow-[var(--no)]/20 hover:brightness-110'
        }`}
      >
        {submitting ? <><Spinner size="sm" /> Processing…</> : cta}
      </button>

      {walletAddress && (
        <p className="text-center text-[9px] text-[var(--secondary)]">
          Trading via <span className="font-mono">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>
        </p>
      )}
    </div>
  );
}

function Row({ label, value, mono, strong, accent }: { label: string; value: string; mono?: boolean; strong?: boolean; accent?: 'yes' | 'no' }) {
  const colorClass = accent === 'yes' ? 'text-[var(--yes)]' : accent === 'no' ? 'text-[var(--no)]' : 'text-[var(--on-surface)]';
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-medium text-[var(--secondary)]">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} ${strong ? 'font-black text-base' : 'font-bold text-xs'} ${colorClass}`}>
        {value}
      </span>
    </div>
  );
}
