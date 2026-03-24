'use client';

import { usePrivy } from '@privy-io/react-auth';
import { usePolymarketSession } from '@/app/hooks/usePolymarketSession';
import { useTradeStore } from '@/app/store/tradeStore';
import { useEventStore } from '@/app/store/eventStore';
import { formatUSD, formatPercent } from '@/app/lib/utils';
import Spinner from './ui/Spinner';

const PRESETS = [10, 25, 50, 100, 250];

export default function TradePanel() {
  const { isOpen, market, side, amount, submitting, confirmed, orderId, closeTrade, setAmount, setSubmitting, setConfirmed } = useTradeStore();
  const currentEvent = useEventStore(s => s.currentEvent);
  const { login, authenticated } = usePrivy();
  const { safeAddress, clobReady, placeMarketOrder } = usePolymarketSession();

  if (!isOpen || !market) return null;

  const price = side === 'yes' ? market.yesPrice : market.noPrice;
  const tokenId = side === 'yes' ? market.yesTokenId : market.noTokenId;
  const shares = amount / price;
  const payout = shares;
  const profit = payout - amount;

  const handleSubmit = async () => {
    if (!authenticated) {
      login();
      return;
    }

    if (!clobReady || !safeAddress) {
      alert('Polymarket session initializing. Please wait a moment and try again.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await placeMarketOrder({
        tokenId,
        side: 'BUY',
        amount,
        price,
        negRisk: market.negRisk,
        tickSize: market.tickSize,
      });

      await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: safeAddress,
          marketTicker: market.ticker,
          marketTitle: market.title,
          eventSlug: currentEvent?.slug || '',
          eventTitle: currentEvent?.title || '',
          side,
          amount,
          price,
          orderId: result.orderID,
        }),
      });

      setConfirmed(result.orderID);
    } catch (err) {
      console.error('[trade] Client error:', err);
      const msg = err instanceof Error ? err.message : 'Trade failed';
      if (!msg.includes('rejected')) {
        alert(`Trade error: ${msg}`);
      }
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeTrade}>
        <div
          className="bg-[var(--surface-container-lowest)] rounded-xl p-8 max-w-sm w-full text-center animate-[pop-in_0.3s_ease-out] shadow-ambient"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-5xl mb-3">{side === 'yes' ? '🎯' : '🛡️'}</div>
          <h3 className="font-heading text-xl font-black uppercase mb-1">Trade Submitted</h3>
          <p className="text-sm text-[var(--secondary)] mb-4">
            {formatUSD(amount)} on {side.toUpperCase()} for &ldquo;{market.title}&rdquo;
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeTrade}>
      <div
        className="bg-[var(--surface-container-lowest)] rounded-xl max-w-sm w-full animate-[pop-in_0.3s_ease-out] shadow-ambient border-t-4 border-[var(--primary-container)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--surface-container)]">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-black uppercase">
              Buy <span className={side === 'yes' ? 'text-[var(--yes)]' : 'text-[var(--no)]'}>{side.toUpperCase()}</span>
            </h3>
            <button onClick={closeTrade} className="text-[var(--secondary)] hover:text-[var(--on-surface)] text-xl cursor-pointer">&times;</button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-xs text-[var(--secondary)] leading-snug">{market.title}</p>

          {/* Amount input */}
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

          {/* Cost breakdown */}
          <div className="bg-[var(--surface-container-low)] rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--secondary)]">Price</span>
              <span className="font-mono font-bold">{formatPercent(price)}</span>
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
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || amount <= 0}
            className={`w-full py-4 rounded-md font-black text-sm uppercase tracking-widest shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              side === 'yes'
                ? 'bg-[var(--yes)] text-white shadow-[var(--yes)]/20 hover:brightness-110'
                : 'bg-[var(--no)] text-white shadow-[var(--no)]/20 hover:brightness-110'
            }`}
          >
            {submitting ? <><Spinner size="sm" /> Processing...</> : authenticated ? `Confirm ${side.toUpperCase()} - ${formatUSD(amount)}` : 'Connect to Trade'}
          </button>
        </div>
      </div>
    </div>
  );
}
