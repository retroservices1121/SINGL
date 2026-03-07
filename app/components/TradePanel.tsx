'use client';

import { useTradeStore } from '@/app/store/tradeStore';
import { calculateFee } from '@/app/lib/fees';
import { formatUSD, formatPercent } from '@/app/lib/utils';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

const PRESETS = [10, 25, 50, 100, 250];

export default function TradePanel() {
  const { isOpen, market, side, amount, submitting, confirmed, txSignature, closeTrade, setAmount, setSubmitting, setConfirmed } = useTradeStore();

  if (!isOpen || !market) return null;

  const price = side === 'yes' ? market.yesPrice : market.noPrice;
  const shares = amount / price;
  const payout = shares;
  const profit = payout - amount;
  const { fee, netAmount } = calculateFee(amount);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketTicker: market.ticker,
          side,
          amount: netAmount,
          grossAmount: amount,
          feeAmount: fee,
        }),
      });
      const data = await res.json();
      if (data.transaction) {
        setConfirmed(data.transaction);
      } else {
        setSubmitting(false);
      }
    } catch {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeTrade}>
        <div
          className="bg-[var(--paper)] rounded-2xl p-6 max-w-sm w-full text-center animate-[pop-in_0.3s_ease-out]"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-5xl mb-3">{side === 'yes' ? '🎯' : '🛡️'}</div>
          <h3 className="font-heading text-lg font-bold mb-1">Trade Submitted</h3>
          <p className="text-sm text-[var(--text-sec)] mb-4">
            {formatUSD(amount)} on {side.toUpperCase()} for &ldquo;{market.title}&rdquo;
          </p>
          {txSignature && (
            <a
              href={`https://solscan.io/tx/${txSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--orange)] underline"
            >
              View on Solscan
            </a>
          )}
          <div className="mt-4">
            <Button variant="primary" size="md" onClick={closeTrade}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeTrade}>
      <div
        className="bg-[var(--paper)] rounded-2xl p-6 max-w-sm w-full animate-[pop-in_0.3s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-bold">
            Buy <span className={side === 'yes' ? 'text-[var(--yes)]' : 'text-[var(--no)]'}>{side.toUpperCase()}</span>
          </h3>
          <button onClick={closeTrade} className="text-[var(--text-dim)] hover:text-[var(--text)] text-xl cursor-pointer">&times;</button>
        </div>

        <p className="text-sm text-[var(--text-sec)] mb-4 leading-snug">{market.title}</p>

        <div className="mb-4">
          <label className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-1 block">Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-lg font-mono bg-[var(--cream)] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]"
            min="1"
            step="1"
          />
          <div className="flex gap-2 mt-2">
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={`flex-1 py-1 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
                  amount === p
                    ? 'bg-[var(--orange)] text-white border-[var(--orange)]'
                    : 'border-[var(--border)] text-[var(--text-sec)] hover:bg-[var(--sand)]'
                }`}
              >
                ${p}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--cream)] rounded-lg p-3 mb-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-dim)]">Price</span>
            <span className="font-mono">{formatPercent(price)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-dim)]">Shares</span>
            <span className="font-mono">{shares.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-dim)]">Fee (0.50%)</span>
            <span className="font-mono">{formatUSD(fee)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-1.5">
            <span className="text-[var(--text-dim)]">Potential payout</span>
            <span className="font-mono font-bold text-[var(--yes)]">{formatUSD(payout)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-dim)]">Potential profit</span>
            <span className="font-mono font-bold text-[var(--yes)]">+{formatUSD(profit)}</span>
          </div>
        </div>

        <Button
          variant={side === 'yes' ? 'yes' : 'no'}
          size="lg"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleSubmit}
          disabled={submitting || amount <= 0}
        >
          {submitting ? <><Spinner size="sm" /> Processing...</> : `Buy ${side.toUpperCase()} - ${formatUSD(amount)}`}
        </Button>
      </div>
    </div>
  );
}
