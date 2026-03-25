'use client';

import { useState } from 'react';
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
  const { safeAddress, clobReady, initializing, error: sessionError, initSession, placeMarketOrder } = usePolymarketSession();
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen || !market) return null;

  const price = side === 'yes' ? market.yesPrice : (market.noPrice || (1 - market.yesPrice));
  const tokenId = side === 'yes' ? market.yesTokenId : market.noTokenId;
  const shares = price > 0 ? amount / price : 0;
  const payout = shares;
  const profit = payout - amount;

  const handleSubmit = async () => {
    setLocalError(null);

    if (!authenticated) {
      login();
      return;
    }

    if (!clobReady || !safeAddress) {
      // Try to initialize session
      setLocalError('Trading session not ready. Initializing...');
      try {
        await initSession();
      } catch {
        setLocalError('Failed to initialize trading session. Please try again.');
      }
      return;
    }

    if (!tokenId) {
      setLocalError('Market token ID not available. Cannot place trade.');
      return;
    }

    if (price <= 0) {
      setLocalError('Invalid market price. Cannot place trade.');
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
        setLocalError(`Trade error: ${msg}`);
      }
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

  // Determine button state and label
  let buttonLabel = '';
  let buttonDisabled = submitting || amount <= 0;
  if (!authenticated) {
    buttonLabel = 'Connect Wallet to Trade';
  } else if (initializing) {
    buttonLabel = 'Initializing Session...';
    buttonDisabled = true;
  } else if (!clobReady) {
    buttonLabel = 'Initialize Trading Session';
  } else {
    buttonLabel = `Confirm ${side.toUpperCase()} - ${formatUSD(amount)}`;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={closeTrade}>
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

          {/* Session status */}
          {authenticated && !clobReady && !initializing && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>Trading session not initialized. Click the button below to set up.</span>
            </div>
          )}
          {authenticated && initializing && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <Spinner size="sm" />
              <span>Setting up Polymarket trading session...</span>
            </div>
          )}
          {sessionError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{sessionError}</span>
            </div>
          )}

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

          {/* Error */}
          {localError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {localError}
            </div>
          )}

          {/* Submit */}
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

          {/* Safe wallet info */}
          {authenticated && safeAddress && (
            <div className="text-center">
              <span className="text-[9px] text-[var(--secondary)]">
                Trading via Safe: <span className="font-mono">{safeAddress.slice(0, 6)}...{safeAddress.slice(-4)}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
