'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import PageShell from '@/app/components/PageShell';
import MarketWalletBar from '@/app/components/MarketWalletBar';
import {
  FACTORY_ABI, MARKET_ABI, ERC20_ABI, FACTORY_ADDRESS, COLLATERAL_ADDRESS,
  COLLATERAL_DECIMALS, COLLATERAL_SYMBOL, MARKETS_CHAIN_ID, isMarketplaceLive, FAUCET_AMOUNT,
} from '@/app/lib/marketsAbi';

interface MarketCard { address: `0x${string}`; question: string; priceYes: number; status: number; }
const STATUS = ['Open', 'Closed', 'Resolved'];

// Design-preview only: visiting /markets?preview=1 renders the full
// marketplace UI (faucet + create form + cards) with these mock markets,
// even before the Base Sepolia contracts are live. Normal visitors still
// see the "launching soon" placeholder. Nothing here is on-chain.
const PREVIEW_MARKETS: MarketCard[] = [
  { address: '0x1111111111111111111111111111111111111111', question: 'Will Argentina win the 2026 World Cup?', priceYes: 0.62, status: 0 },
  { address: '0x2222222222222222222222222222222222222222', question: 'Will the USA reach the quarter-finals?', priceYes: 0.28, status: 0 },
  { address: '0x3333333333333333333333333333333333333333', question: 'Top scorer: will a player net 7+ goals this tournament?', priceYes: 0.41, status: 0 },
  { address: '0x4444444444444444444444444444444444444444', question: 'Will the final go to a penalty shootout?', priceYes: 0.18, status: 1 },
];

export default function MarketsClient() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: MARKETS_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [markets, setMarkets] = useState<MarketCard[] | null>(null);
  const [question, setQuestion] = useState('');
  const [seed, setSeed] = useState('100');
  const [gate, setGate] = useState<{ min: bigint; bal: bigint } | null>(null);
  const [pts, setPts] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  // Design-preview flag from the URL (?preview=1). Read on mount so it
  // doesn't affect SSR / normal visitors.
  useEffect(() => {
    if (typeof window !== 'undefined') setPreview(new URLSearchParams(window.location.search).has('preview'));
  }, []);

  const loadPts = useCallback(async () => {
    if (!publicClient || !isMarketplaceLive || !address) return;
    try {
      const b = await publicClient.readContract({ address: COLLATERAL_ADDRESS as `0x${string}`, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }) as bigint;
      setPts(b);
    } catch { /* ignore */ }
  }, [publicClient, address]);

  useEffect(() => { loadPts(); }, [loadPts]);

  const claimPoints = async () => {
    if (!publicClient || !address) return;
    setBusy(true); setMsg(null);
    try {
      const h = await writeContractAsync({
        address: COLLATERAL_ADDRESS as `0x${string}`, abi: ERC20_ABI, functionName: 'mint',
        args: [address, parseUnits(String(FAUCET_AMOUNT), COLLATERAL_DECIMALS)], chainId: MARKETS_CHAIN_ID,
      });
      await publicClient.waitForTransactionReceipt({ hash: h });
      await loadPts();
    } catch (e) { setMsg(e instanceof Error ? e.message.slice(0, 140) : 'Failed'); }
    finally { setBusy(false); }
  };

  const load = useCallback(async () => {
    if (!isMarketplaceLive) { setMarkets(preview ? PREVIEW_MARKETS : []); return; }
    if (!publicClient) { setMarkets([]); return; }
    try {
      const count = await publicClient.readContract({ address: FACTORY_ADDRESS as `0x${string}`, abi: FACTORY_ABI, functionName: 'marketCount' }) as bigint;
      const addrs = await Promise.all(
        Array.from({ length: Number(count) }, (_, i) =>
          publicClient.readContract({ address: FACTORY_ADDRESS as `0x${string}`, abi: FACTORY_ABI, functionName: 'allMarkets', args: [BigInt(i)] }) as Promise<`0x${string}`>),
      );
      const cards = await Promise.all(addrs.map(async (a) => {
        const [q, p, s] = await Promise.all([
          publicClient.readContract({ address: a, abi: MARKET_ABI, functionName: 'question' }) as Promise<string>,
          publicClient.readContract({ address: a, abi: MARKET_ABI, functionName: 'price', args: [0] }) as Promise<bigint>,
          publicClient.readContract({ address: a, abi: MARKET_ABI, functionName: 'status' }) as Promise<number>,
        ]);
        return { address: a, question: q, priceYes: Number(formatUnits(p, 18)), status: Number(s) };
      }));
      setMarkets(cards.reverse());
    } catch { setMarkets([]); }
  }, [publicClient, preview]);

  useEffect(() => { load(); }, [load]);

  // Read the $SPRDD create-gate + the connected wallet's balance.
  useEffect(() => {
    (async () => {
      if (!publicClient || !isMarketplaceLive || !address) return;
      try {
        const sprdd = await publicClient.readContract({ address: FACTORY_ADDRESS as `0x${string}`, abi: [{ type: 'function', name: 'sprdd', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }] as const, functionName: 'sprdd' }) as `0x${string}`;
        const [min, bal] = await Promise.all([
          publicClient.readContract({ address: FACTORY_ADDRESS as `0x${string}`, abi: FACTORY_ABI, functionName: 'minSprddToCreate' }) as Promise<bigint>,
          publicClient.readContract({ address: sprdd, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }) as Promise<bigint>,
        ]);
        setGate({ min, bal });
      } catch { /* ignore */ }
    })();
  }, [publicClient, address]);

  const create = async () => {
    if (!publicClient || !address) return;
    setBusy(true); setMsg(null);
    try {
      const seedWei = parseUnits(seed || '0', COLLATERAL_DECIMALS);
      // 1) approve collateral to the factory
      const approveHash = await writeContractAsync({
        address: COLLATERAL_ADDRESS as `0x${string}`, abi: ERC20_ABI, functionName: 'approve',
        args: [FACTORY_ADDRESS as `0x${string}`, seedWei], chainId: MARKETS_CHAIN_ID,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      // 2) create the market
      const createHash = await writeContractAsync({
        address: FACTORY_ADDRESS as `0x${string}`, abi: FACTORY_ABI, functionName: 'createMarket',
        args: [COLLATERAL_ADDRESS as `0x${string}`, question, '0x0000000000000000000000000000000000000000', seedWei], chainId: MARKETS_CHAIN_ID,
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });
      setMsg('Market created.'); setQuestion('');
      await load();
    } catch (e) { setMsg(e instanceof Error ? e.message.slice(0, 140) : 'Failed'); }
    finally { setBusy(false); }
  };

  const onChain = isConnected && chainId === MARKETS_CHAIN_ID;
  const meetsGate = gate ? gate.bal >= gate.min : false;

  return (
    <PageShell title="Markets" subtitle="Create & trade any market">
      <div className="flex justify-end mb-4"><MarketWalletBar /></div>

      {!isMarketplaceLive && !preview ? (
        <div className="py-24 text-center text-sm text-[var(--secondary)]">
          Marketplace launching soon — contracts deploying to Base Sepolia.
        </div>
      ) : (
        <div className="space-y-8">
          {preview && !isMarketplaceLive && (
            <div className="rounded-xl border border-dashed border-[var(--primary-container)] bg-[var(--primary-fixed)] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-[var(--primary)]">
              Design preview · mock data · contracts not yet deployed
            </div>
          )}
          {/* Testnet faucet — trade with free points, no real money. */}
          <div className="bg-[var(--primary-fixed)] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--primary-container)]">
            <div>
              <p className="text-xs font-black uppercase tracking-tight text-[var(--primary)]">Testnet · free to play</p>
              <p className="text-[11px] text-[var(--primary)]">
                Trade with free {COLLATERAL_SYMBOL} points{pts != null ? ` · you have ${Number(formatUnits(pts, COLLATERAL_DECIMALS)).toLocaleString()}` : ''}
              </p>
            </div>
            <button
              type="button" disabled={!onChain || busy} onClick={claimPoints}
              className="px-4 py-2 rounded-lg bg-[var(--primary-container)] text-white text-xs font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
            >
              {busy ? '…' : `Claim ${FAUCET_AMOUNT.toLocaleString()} ${COLLATERAL_SYMBOL}`}
            </button>
          </div>

          {/* Create */}
          <div className="bg-[var(--surface-container-lowest)] rounded-xl p-5 shadow-ambient">
            <h3 className="font-heading font-black text-sm uppercase tracking-tight text-[var(--on-surface)] mb-3">Create a market</h3>
            <input
              value={question} onChange={e => setQuestion(e.target.value)}
              placeholder="Will X happen by Y?"
              className="w-full mb-3 px-3 py-2 rounded-lg border border-[var(--surface-container)] bg-[var(--surface-container-low)] text-sm text-[var(--on-surface)]"
            />
            <div className="flex items-center gap-3 mb-3">
              <input
                value={seed} onChange={e => setSeed(e.target.value)} inputMode="decimal"
                className="w-32 px-3 py-2 rounded-lg border border-[var(--surface-container)] bg-[var(--surface-container-low)] text-sm font-mono text-[var(--on-surface)]"
              />
              <span className="text-xs text-[var(--secondary)]">{COLLATERAL_SYMBOL} seed liquidity</span>
            </div>
            {gate && (
              <p className="text-[11px] text-[var(--secondary)] mb-3">
                Gate: hold ≥ {formatUnits(gate.min, 18)} SPRDD · you hold {formatUnits(gate.bal, 18)}
                {meetsGate ? ' ✓' : ' — not enough'}
              </p>
            )}
            <button
              type="button" disabled={!onChain || busy || !question || !meetsGate}
              onClick={create}
              className="px-4 py-2 rounded-lg bg-[var(--primary-container)] text-white text-xs font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create market'}
            </button>
            {msg && <p className="mt-2 text-[11px] text-[var(--secondary)]">{msg}</p>}
          </div>

          {/* List */}
          {markets === null ? (
            <p className="text-sm text-[var(--secondary)]">Loading markets…</p>
          ) : markets.length === 0 ? (
            <p className="text-sm text-[var(--secondary)]">No markets yet — be the first to create one.</p>
          ) : (
            <div className="grid-auto-cards">
              {markets.map(m => (
                <Link key={m.address} href={`/markets/${m.address}`}
                  className="block bg-[var(--surface-container-lowest)] rounded-xl p-4 shadow-ambient hover:scale-[1.02] transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--secondary)]">{STATUS[m.status]}</span>
                    <span className="text-[9px] font-mono text-[var(--secondary)]">{m.address.slice(0, 6)}…</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--on-surface)] mb-3 line-clamp-2">{m.question}</p>
                  <div className="flex gap-2">
                    <div className="flex-1 text-center py-1.5 rounded-md bg-[var(--yes-bg)] text-[var(--yes)] text-xs font-bold">YES {Math.round(m.priceYes * 100)}¢</div>
                    <div className="flex-1 text-center py-1.5 rounded-md bg-[var(--no-bg)] text-[var(--no)] text-xs font-bold">NO {Math.round((1 - m.priceYes) * 100)}¢</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
