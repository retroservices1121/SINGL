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
  RESOLUTION_KIND, RESOLUTION_LABEL,
} from '@/app/lib/marketsAbi';
import type { MarketData } from '@/app/types';

interface MarketCard { address: `0x${string}`; question: string; priceYes: number; status: number; resKind: number; }
const STATUS = ['Open', 'Closed', 'Resolved'];

/** A resolution feed this market settles against (the design doc's launch rule). */
interface BoundSource { kind: number; value: string; label: string; }

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

  // Resolution binding: a market must map to a feed it settles against. Default
  // path is mirroring an agg.market question (objective, auto-settleable); the
  // manual escape hatch is testnet-only.
  const [resMode, setResMode] = useState<'agg' | 'manual'>('agg');
  const [source, setSource] = useState<BoundSource | null>(null);
  const [aggQuery, setAggQuery] = useState('');
  const [aggResults, setAggResults] = useState<MarketData[] | null>(null);
  const [aggBusy, setAggBusy] = useState(false);

  const searchAgg = useCallback(async () => {
    const q = aggQuery.trim();
    if (!q) { setAggResults(null); return; }
    setAggBusy(true);
    try {
      const res = await fetch(`/api/markets?q=${encodeURIComponent(q)}&limit=8`);
      const json = await res.json();
      setAggResults((json.markets || []) as MarketData[]);
    } catch { setAggResults([]); }
    finally { setAggBusy(false); }
  }, [aggQuery]);

  const pickAgg = (mkt: MarketData) => {
    const venue = mkt.venue ? `${mkt.venue}:` : '';
    setSource({ kind: RESOLUTION_KIND.AGG, value: `${venue}${mkt.id}`, label: mkt.title });
    setQuestion(mkt.title);
    setAggResults(null);
    setAggQuery('');
  };

  const clearSource = () => { setSource(null); setQuestion(''); };

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
    if (!publicClient || !isMarketplaceLive) { setMarkets([]); return; }
    try {
      const count = await publicClient.readContract({ address: FACTORY_ADDRESS as `0x${string}`, abi: FACTORY_ABI, functionName: 'marketCount' }) as bigint;
      const addrs = await Promise.all(
        Array.from({ length: Number(count) }, (_, i) =>
          publicClient.readContract({ address: FACTORY_ADDRESS as `0x${string}`, abi: FACTORY_ABI, functionName: 'allMarkets', args: [BigInt(i)] }) as Promise<`0x${string}`>),
      );
      const cards = await Promise.all(addrs.map(async (a) => {
        const [q, p, s, k] = await Promise.all([
          publicClient.readContract({ address: a, abi: MARKET_ABI, functionName: 'question' }) as Promise<string>,
          publicClient.readContract({ address: a, abi: MARKET_ABI, functionName: 'price', args: [0] }) as Promise<bigint>,
          publicClient.readContract({ address: a, abi: MARKET_ABI, functionName: 'status' }) as Promise<number>,
          publicClient.readContract({ address: a, abi: MARKET_ABI, functionName: 'resolutionKind' }) as Promise<number>,
        ]);
        return { address: a, question: q, priceYes: Number(formatUnits(p, 18)), status: Number(s), resKind: Number(k) };
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
      // 2) create the market, binding its resolution source
      const resKind = resMode === 'agg' ? RESOLUTION_KIND.AGG : RESOLUTION_KIND.MANUAL;
      const resSource = resMode === 'agg' ? (source?.value ?? '') : '';
      const createHash = await writeContractAsync({
        address: FACTORY_ADDRESS as `0x${string}`, abi: FACTORY_ABI, functionName: 'createMarket',
        args: [COLLATERAL_ADDRESS as `0x${string}`, question, '0x0000000000000000000000000000000000000000', seedWei, resKind, resSource], chainId: MARKETS_CHAIN_ID,
      });
      await publicClient.waitForTransactionReceipt({ hash: createHash });
      setMsg('Market created.'); setQuestion(''); setSource(null);
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

            {/* Resolution source — what the market settles against. */}
            <div className="flex gap-2 mb-3">
              {(['agg', 'manual'] as const).map(mode => (
                <button key={mode} type="button" onClick={() => { setResMode(mode); clearSource(); }}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest cursor-pointer ${resMode === mode ? 'bg-[var(--on-surface)] text-white' : 'bg-[var(--surface-container-low)] text-[var(--secondary)]'}`}>
                  {mode === 'agg' ? 'Mirror agg.market' : 'Custom (testnet)'}
                </button>
              ))}
            </div>

            {resMode === 'agg' ? (
              source ? (
                <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-[var(--primary-container)] bg-[var(--primary-fixed)] p-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--primary)]">Resolves via agg.market</p>
                    <p className="text-sm font-bold text-[var(--on-surface)] line-clamp-2">{source.label}</p>
                    <p className="text-[10px] font-mono text-[var(--secondary)] mt-0.5">{source.value}</p>
                  </div>
                  <button type="button" onClick={clearSource} className="text-[10px] font-bold uppercase tracking-widest text-[var(--secondary)] hover:text-[var(--on-surface)] cursor-pointer shrink-0">Change</button>
                </div>
              ) : (
                <div className="mb-3">
                  <div className="flex gap-2">
                    <input
                      value={aggQuery} onChange={e => setAggQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchAgg(); } }}
                      placeholder="Search agg.market to mirror a question…"
                      className="flex-1 px-3 py-2 rounded-lg border border-[var(--surface-container)] bg-[var(--surface-container-low)] text-sm text-[var(--on-surface)]"
                    />
                    <button type="button" onClick={searchAgg} disabled={aggBusy || !aggQuery.trim()}
                      className="px-3 py-2 rounded-lg bg-[var(--surface-container)] text-[var(--on-surface)] text-xs font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50">
                      {aggBusy ? '…' : 'Search'}
                    </button>
                  </div>
                  {aggResults && (
                    aggResults.length === 0 ? (
                      <p className="mt-2 text-[11px] text-[var(--secondary)]">No markets found — try other terms or use Custom.</p>
                    ) : (
                      <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
                        {aggResults.map(r => (
                          <button key={r.id} type="button" onClick={() => pickAgg(r)}
                            className="w-full text-left p-2.5 rounded-lg bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)] cursor-pointer">
                            <p className="text-xs font-bold text-[var(--on-surface)] line-clamp-2">{r.title}</p>
                            <p className="text-[10px] text-[var(--secondary)] mt-0.5">
                              {r.venue ?? 'agg'} · YES {Math.round((r.yesPrice ?? 0) * 100)}¢{r.volume ? ` · $${Math.round(r.volume).toLocaleString()} vol` : ''}
                            </p>
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )
            ) : (
              <input
                value={question} onChange={e => setQuestion(e.target.value)}
                placeholder="Will X happen by Y?"
                className="w-full mb-3 px-3 py-2 rounded-lg border border-[var(--surface-container)] bg-[var(--surface-container-low)] text-sm text-[var(--on-surface)]"
              />
            )}

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
              type="button"
              disabled={!onChain || busy || !meetsGate || (resMode === 'agg' ? !source : !question.trim())}
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
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--primary)]">{RESOLUTION_LABEL[m.resKind] ?? 'Manual'}</span>
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
