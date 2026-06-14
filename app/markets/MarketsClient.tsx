'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import PageShell from '@/app/components/PageShell';
import MarketWalletBar from '@/app/components/MarketWalletBar';
import {
  FACTORY_ABI, MARKET_ABI, ERC20_ABI, FACTORY_ADDRESS, COLLATERAL_ADDRESS,
  COLLATERAL_DECIMALS, COLLATERAL_SYMBOL, MARKETS_CHAIN_ID, isMarketplaceLive,
} from '@/app/lib/marketsAbi';

interface MarketCard { address: `0x${string}`; question: string; priceYes: number; status: number; }
const STATUS = ['Open', 'Closed', 'Resolved'];

export default function MarketsClient() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: MARKETS_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [markets, setMarkets] = useState<MarketCard[] | null>(null);
  const [question, setQuestion] = useState('');
  const [seed, setSeed] = useState('100');
  const [gate, setGate] = useState<{ min: bigint; bal: bigint } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicClient || !isMarketplaceLive) { setMarkets([]); return; }
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
  }, [publicClient]);

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

      {!isMarketplaceLive ? (
        <div className="py-24 text-center text-sm text-[var(--secondary)]">
          Marketplace launching soon — contracts deploying to Base Sepolia.
        </div>
      ) : (
        <div className="space-y-8">
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
