'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import PageShell from '@/app/components/PageShell';
import MarketWalletBar from '@/app/components/MarketWalletBar';
import {
  MARKET_ABI, ERC20_ABI, COLLATERAL_DECIMALS, COLLATERAL_SYMBOL,
  MARKETS_CHAIN_ID, OUTCOME, isMarketplaceLive,
} from '@/app/lib/marketsAbi';

interface MarketState {
  question: string; status: number; winning: number;
  priceYes: number; priceNo: number;
  yesShares: bigint; noShares: bigint;
}
const STATUS = ['Open', 'Closed', 'Resolved'];

export default function MarketClient({ address }: { address: `0x${string}` }) {
  const { address: account, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: MARKETS_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [m, setM] = useState<MarketState | null>(null);
  const [side, setSide] = useState<0 | 1>(OUTCOME.YES);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('10');
  const [quote, setQuote] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicClient || !isMarketplaceLive) return;
    const read = (fn: string, args: unknown[] = []) =>
      publicClient.readContract({ address, abi: MARKET_ABI, functionName: fn as never, args: args as never });
    try {
      const [q, st, win, pY, pN] = await Promise.all([
        read('question'), read('status'), read('winningOutcome'), read('price', [0]), read('price', [1]),
      ]) as [string, number, number, bigint, bigint];
      const [yS, nS] = account
        ? await Promise.all([read('yesShares', [account]), read('noShares', [account])]) as [bigint, bigint]
        : [0n, 0n];
      setM({
        question: q, status: Number(st), winning: Number(win),
        priceYes: Number(formatUnits(pY, 18)), priceNo: Number(formatUnits(pN, 18)),
        yesShares: yS, noShares: nS,
      });
    } catch { /* ignore */ }
  }, [publicClient, address, account]);

  useEffect(() => { load(); }, [load]);

  // Live quote as the user types.
  useEffect(() => {
    (async () => {
      if (!publicClient || !amount || Number(amount) <= 0) { setQuote(''); return; }
      try {
        if (mode === 'buy') {
          const wei = parseUnits(amount, COLLATERAL_DECIMALS);
          const [shares] = await publicClient.readContract({ address, abi: MARKET_ABI, functionName: 'calcBuy', args: [side, wei] }) as [bigint, bigint];
          setQuote(`≈ ${Number(formatUnits(shares, COLLATERAL_DECIMALS)).toFixed(2)} shares`);
        } else {
          const shares = parseUnits(amount, COLLATERAL_DECIMALS);
          const [out] = await publicClient.readContract({ address, abi: MARKET_ABI, functionName: 'calcSell', args: [side, shares] }) as [bigint, bigint];
          setQuote(`≈ ${Number(formatUnits(out, COLLATERAL_DECIMALS)).toFixed(2)} ${COLLATERAL_SYMBOL}`);
        }
      } catch { setQuote(''); }
    })();
  }, [publicClient, address, amount, side, mode]);

  const collateralOf = useCallback(async () =>
    publicClient!.readContract({ address, abi: MARKET_ABI, functionName: 'collateral' }) as Promise<`0x${string}`>, [publicClient, address]);

  const submit = async () => {
    if (!publicClient || !account) return;
    setBusy(true); setMsg(null);
    try {
      if (mode === 'buy') {
        const wei = parseUnits(amount, COLLATERAL_DECIMALS);
        const coll = await collateralOf();
        const allowance = await publicClient.readContract({ address: coll, abi: ERC20_ABI, functionName: 'allowance', args: [account, address] }) as bigint;
        if (allowance < wei) {
          const h = await writeContractAsync({ address: coll, abi: ERC20_ABI, functionName: 'approve', args: [address, wei], chainId: MARKETS_CHAIN_ID });
          await publicClient.waitForTransactionReceipt({ hash: h });
        }
        const h = await writeContractAsync({ address, abi: MARKET_ABI, functionName: 'buy', args: [side, wei, 0n], chainId: MARKETS_CHAIN_ID });
        await publicClient.waitForTransactionReceipt({ hash: h });
      } else {
        const shares = parseUnits(amount, COLLATERAL_DECIMALS);
        const h = await writeContractAsync({ address, abi: MARKET_ABI, functionName: 'sell', args: [side, shares, 0n], chainId: MARKETS_CHAIN_ID });
        await publicClient.waitForTransactionReceipt({ hash: h });
      }
      setMsg('Done.'); await load();
    } catch (e) { setMsg(e instanceof Error ? e.message.slice(0, 140) : 'Failed'); }
    finally { setBusy(false); }
  };

  const redeem = async () => {
    if (!publicClient || !account) return;
    setBusy(true); setMsg(null);
    try {
      const h = await writeContractAsync({ address, abi: MARKET_ABI, functionName: 'redeem', args: [], chainId: MARKETS_CHAIN_ID });
      await publicClient.waitForTransactionReceipt({ hash: h });
      setMsg('Redeemed.'); await load();
    } catch (e) { setMsg(e instanceof Error ? e.message.slice(0, 140) : 'Failed'); }
    finally { setBusy(false); }
  };

  const onChain = isConnected && chainId === MARKETS_CHAIN_ID;
  const resolved = m?.status === 2;
  const fmt = (v: bigint) => Number(formatUnits(v, COLLATERAL_DECIMALS)).toFixed(2);

  if (!isMarketplaceLive) {
    return <PageShell title="Market"><p className="py-24 text-center text-sm text-[var(--secondary)]">Marketplace launching soon.</p></PageShell>;
  }

  return (
    <PageShell title="Market">
      <div className="flex items-center justify-between mb-4">
        <Link href="/markets" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[var(--secondary)] hover:text-[var(--primary-container)]">
          <span className="material-symbols-outlined text-base">arrow_back</span> Markets
        </Link>
        <MarketWalletBar />
      </div>

      {!m ? <p className="text-sm text-[var(--secondary)]">Loading…</p> : (
        <div className="max-w-xl mx-auto space-y-5">
          <div className="bg-[var(--surface-container-lowest)] rounded-xl p-5 shadow-ambient">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--secondary)]">{STATUS[m.status]}{resolved && ` · ${m.winning === 0 ? 'YES' : 'NO'} won`}</span>
            <h2 className="font-heading font-black text-lg text-[var(--on-surface)] mt-1 mb-4">{m.question}</h2>
            <div className="flex gap-3">
              <div className="flex-1 text-center py-3 rounded-lg bg-[var(--yes-bg)]">
                <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--yes)]">YES</div>
                <div className="text-2xl font-black font-mono text-[var(--yes)]">{Math.round(m.priceYes * 100)}¢</div>
              </div>
              <div className="flex-1 text-center py-3 rounded-lg bg-[var(--no-bg)]">
                <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--no)]">NO</div>
                <div className="text-2xl font-black font-mono text-[var(--no)]">{Math.round(m.priceNo * 100)}¢</div>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[var(--secondary)]">Your position: {fmt(m.yesShares)} YES · {fmt(m.noShares)} NO</p>
          </div>

          {resolved ? (
            <button type="button" disabled={!onChain || busy} onClick={redeem}
              className="w-full py-3 rounded-lg bg-[var(--primary-container)] text-white text-sm font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50">
              {busy ? 'Redeeming…' : 'Redeem winnings'}
            </button>
          ) : (
            <div className="bg-[var(--surface-container-lowest)] rounded-xl p-5 shadow-ambient space-y-3">
              <div className="flex gap-2">
                {(['buy', 'sell'] as const).map(t => (
                  <button key={t} onClick={() => setMode(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer ${mode === t ? 'bg-[var(--primary-container)] text-white' : 'bg-[var(--surface-container-low)] text-[var(--secondary)]'}`}>{t}</button>
                ))}
              </div>
              <div className="flex gap-2">
                {([['YES', OUTCOME.YES], ['NO', OUTCOME.NO]] as const).map(([label, val]) => (
                  <button key={label} onClick={() => setSide(val)} className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer ${side === val ? (val === 0 ? 'bg-[var(--yes)] text-white' : 'bg-[var(--no)] text-white') : 'bg-[var(--surface-container-low)] text-[var(--secondary)]'}`}>{label}</button>
                ))}
              </div>
              <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal"
                className="w-full px-3 py-2 rounded-lg border border-[var(--surface-container)] bg-[var(--surface-container-low)] text-sm font-mono text-[var(--on-surface)]"
                placeholder={mode === 'buy' ? COLLATERAL_SYMBOL : 'shares'} />
              {quote && <p className="text-[11px] text-[var(--secondary)]">{quote} · 1% fee</p>}
              <button type="button" disabled={!onChain || busy || !amount} onClick={submit}
                className="w-full py-3 rounded-lg bg-[var(--primary-container)] text-white text-sm font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50">
                {busy ? 'Submitting…' : `${mode} ${side === 0 ? 'YES' : 'NO'}`}
              </button>
            </div>
          )}
          {msg && <p className="text-[11px] text-center text-[var(--secondary)]">{msg}</p>}
        </div>
      )}
    </PageShell>
  );
}
