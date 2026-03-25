'use client';

import { useEffect, useState } from 'react';
import { useTradeStore } from '@/app/store/tradeStore';
import { useEventStore } from '@/app/store/eventStore';
import { formatVolume, formatPercent } from '@/app/lib/utils';

interface PricePoint {
  timestamp: string;
  yesPrice: number;
}

type TimeRange = '1d' | '1w' | '1m' | 'all';

function PriceChart({ data, height = 220 }: { data: PricePoint[]; height?: number }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-[var(--secondary)] text-xs" style={{ height }}>
        No price history yet
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 10, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Yes and No prices (No = 1 - Yes)
  const yesPrices = data.map(d => d.yesPrice);
  const noPrices = data.map(d => 1 - d.yesPrice);

  // Fixed 0-100% range for clarity
  const min = 0;
  const max = 1;
  const range = 1;

  const toX = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => padding.top + chartH - ((v - min) / range) * chartH;

  // Yes line
  const yesPoints = data.map((d, i) => `${toX(i)},${toY(d.yesPrice)}`);
  const yesLinePath = `M${yesPoints.join(' L')}`;
  const yesAreaPath = `${yesLinePath} L${toX(data.length - 1)},${padding.top + chartH} L${padding.left},${padding.top + chartH} Z`;

  // No line
  const noPoints = data.map((d, i) => `${toX(i)},${toY(1 - d.yesPrice)}`);
  const noLinePath = `M${noPoints.join(' L')}`;
  const noAreaPath = `${noLinePath} L${toX(data.length - 1)},${padding.top + chartH} L${padding.left},${padding.top + chartH} Z`;

  const yesLast = yesPrices[yesPrices.length - 1];
  const noLast = noPrices[noPrices.length - 1];

  // Y-axis labels
  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => i / (yTicks - 1));

  // X-axis labels
  const xLabelIndices = [0, Math.floor(data.length / 2), data.length - 1];
  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="yes-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--yes)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--yes)" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="no-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--no)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--no)" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((v, i) => (
        <g key={i}>
          <line
            x1={padding.left} y1={toY(v)}
            x2={width - padding.right} y2={toY(v)}
            stroke="var(--surface-container-high)" strokeWidth="0.5"
          />
          <text x={padding.left - 6} y={toY(v) + 3} textAnchor="end" fill="var(--secondary)" fontSize="10" fontFamily="JetBrains Mono, monospace">
            {Math.round(v * 100)}%
          </text>
        </g>
      ))}

      {/* X labels */}
      {xLabelIndices.map(idx => (
        <text key={idx} x={toX(idx)} y={height - 5} textAnchor="middle" fill="var(--secondary)" fontSize="9" fontFamily="JetBrains Mono, monospace">
          {formatDate(data[idx].timestamp)}
        </text>
      ))}

      {/* No area + line */}
      <path d={noAreaPath} fill="url(#no-fill)" />
      <path d={noLinePath} fill="none" stroke="var(--no)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />

      {/* Yes area + line (on top) */}
      <path d={yesAreaPath} fill="url(#yes-fill)" />
      <path d={yesLinePath} fill="none" stroke="var(--yes)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* End dots — Yes */}
      <circle cx={toX(data.length - 1)} cy={toY(yesLast)} r="4" fill="var(--yes)" />
      <circle cx={toX(data.length - 1)} cy={toY(yesLast)} r="7" fill="var(--yes)" opacity="0.2" />

      {/* End dots — No */}
      <circle cx={toX(data.length - 1)} cy={toY(noLast)} r="3" fill="var(--no)" />
      <circle cx={toX(data.length - 1)} cy={toY(noLast)} r="6" fill="var(--no)" opacity="0.15" />

      {/* End labels */}
      <text x={width - padding.right + 2} y={toY(yesLast) - 6} fill="var(--yes)" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
        Yes
      </text>
      <text x={width - padding.right + 2} y={toY(noLast) - 6} fill="var(--no)" fontSize="9" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
        No
      </text>
    </svg>
  );
}

export default function MarketDetailOverlay() {
  const { detailOpen, detailMarket, closeDetail, openTrade } = useTradeStore();
  const currentEvent = useEventStore(s => s.currentEvent);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('1w');

  useEffect(() => {
    if (!detailOpen || !detailMarket) {
      setPriceHistory([]);
      return;
    }

    const fetchPrices = async () => {
      setLoading(true);
      try {
        // Fidelity: minutes per data point based on time range
        const fidelityMap: Record<TimeRange, string> = { '1d': '5', '1w': '60', '1m': '360', 'all': '1440' };
        const fidelity = fidelityMap[timeRange];

        // Fetch directly from Polymarket CLOB via our proxy
        const tokenId = detailMarket.yesTokenId;
        if (tokenId) {
          const res = await fetch(`/api/prices/history?tokenId=${encodeURIComponent(tokenId)}&fidelity=${fidelity}`);
          const data = await res.json();

          if (data.history && data.history.length > 0) {
            // Filter by time range
            const now = Date.now();
            const rangeMs: Record<TimeRange, number> = {
              '1d': 24 * 60 * 60 * 1000,
              '1w': 7 * 24 * 60 * 60 * 1000,
              '1m': 30 * 24 * 60 * 60 * 1000,
              'all': Infinity,
            };
            const cutoff = now - rangeMs[timeRange];

            const filtered = data.history
              .filter((p: { t: number }) => p.t * 1000 >= cutoff)
              .map((p: { t: number; p: number }) => ({
                timestamp: new Date(p.t * 1000).toISOString(),
                yesPrice: p.p,
              }));

            if (filtered.length > 0) {
              setPriceHistory(filtered);
              setLoading(false);
              return;
            }
          }
        }

        // Fallback: try DB snapshots
        if (currentEvent) {
          const dbRes = await fetch(`/api/prices?eventId=${currentEvent.id}&range=${timeRange}`);
          const dbData = await dbRes.json();
          const marketPrices = dbData.snapshots?.[detailMarket.ticker] ||
            dbData.snapshots?.[detailMarket.conditionId] || [];
          setPriceHistory(marketPrices);
        } else {
          setPriceHistory([]);
        }
      } catch {
        setPriceHistory([]);
      }
      setLoading(false);
    };

    fetchPrices();
  }, [detailOpen, detailMarket, currentEvent, timeRange]);

  if (!detailOpen || !detailMarket) return null;

  const market = detailMarket;
  const yesCents = Math.round(market.yesPrice * 100);
  const noCents = Math.round(market.noPrice * 100) || (100 - yesCents);

  const handleTrade = (side: 'yes' | 'no') => {
    closeDetail();
    openTrade(market, side);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeDetail}>
      <div
        className="bg-[var(--surface-container-lowest)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-[pop-in_0.2s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface-container-lowest)] border-b border-[var(--surface-container)] px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-black text-lg uppercase tracking-tight text-[var(--on-surface)] leading-tight">
              {market.title}
            </h2>
            {market.category && (
              <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest mt-1 inline-block">
                {market.category}
              </span>
            )}
          </div>
          <button
            onClick={closeDetail}
            className="text-[var(--secondary)] hover:text-[var(--on-surface)] transition-colors cursor-pointer shrink-0 mt-1"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Price & Stats */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-6 mb-4">
            <div>
              <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Yes</div>
              <div className="font-mono text-3xl font-black text-[var(--yes)]">{yesCents}c</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">No</div>
              <div className="font-mono text-3xl font-black text-[var(--no)]">{noCents}c</div>
            </div>
            {market.change24h !== null && market.change24h !== undefined && Math.abs(market.change24h) >= 0.5 && (
              <div>
                <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">24h</div>
                <div className={`font-mono text-lg font-bold flex items-center gap-1 ${market.change24h > 0 ? 'text-[var(--yes)]' : 'text-[var(--no)]'}`}>
                  <span className="material-symbols-outlined text-sm">
                    {market.change24h > 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  {market.change24h > 0 ? '+' : ''}{market.change24h.toFixed(1)}
                </div>
              </div>
            )}
            {market.volume != null && market.volume > 0 && (
              <div className="ml-auto text-right">
                <div className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Volume</div>
                <div className="font-mono text-lg font-bold text-[var(--on-surface)]">{formatVolume(market.volume)}</div>
              </div>
            )}
          </div>

          {/* Odds bar */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-[var(--yes)]">YES {yesCents}%</span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-[var(--surface-container-high)]">
              <div className="h-full bg-[var(--yes)] rounded-full transition-all" style={{ width: `${yesCents}%` }} />
            </div>
            <span className="text-[10px] font-bold text-[var(--no)]">{noCents}% NO</span>
          </div>
        </div>

        {/* Price Chart */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">Price History</h3>
            <div className="flex gap-1">
              {(['1d', '1w', '1m', 'all'] as TimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded transition-all cursor-pointer ${
                    timeRange === r
                      ? 'bg-[var(--primary-container)] text-white'
                      : 'bg-[var(--surface-container-high)] text-[var(--secondary)] hover:text-[var(--on-surface)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[var(--surface-container-low)] rounded-xl p-3">
            {loading ? (
              <div className="flex items-center justify-center text-[var(--secondary)] text-xs" style={{ height: 200 }}>
                Loading price data...
              </div>
            ) : (
              <PriceChart data={priceHistory} />
            )}
          </div>
        </div>

        {/* Trade Buttons */}
        <div className="px-6 pb-4">
          <div className="flex gap-3">
            <button
              onClick={() => handleTrade('yes')}
              className="flex-1 py-3.5 text-sm font-black uppercase tracking-widest rounded-lg bg-[var(--yes)] text-white hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-[var(--yes)]/20"
            >
              Buy Yes {yesCents}c
            </button>
            <button
              onClick={() => handleTrade('no')}
              className="flex-1 py-3.5 text-sm font-black uppercase tracking-widest rounded-lg bg-[var(--no)] text-white hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-[var(--no)]/20"
            >
              Buy No {noCents}c
            </button>
          </div>
        </div>

        {/* Rules */}
        {market.rulesPrimary && (
          <div className="px-6 pb-6">
            <div className="border-t border-[var(--surface-container)] pt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-sm text-[var(--secondary)]">gavel</span>
                <h3 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">Resolution Rules</h3>
              </div>
              <div className="bg-[var(--surface-container-low)] rounded-xl p-4 text-sm text-[var(--secondary)] leading-relaxed whitespace-pre-wrap">
                {market.rulesPrimary}
              </div>
            </div>
          </div>
        )}

        {/* Market Info */}
        <div className="px-6 pb-6">
          <div className="border-t border-[var(--surface-container)] pt-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {market.closeTime && (
                <div className="bg-[var(--surface-container-low)] rounded-lg p-3">
                  <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Closes</div>
                  <div className="font-mono font-bold text-[var(--on-surface)]">
                    {new Date(market.closeTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              )}
              {market.expirationTime && (
                <div className="bg-[var(--surface-container-low)] rounded-lg p-3">
                  <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Expires</div>
                  <div className="font-mono font-bold text-[var(--on-surface)]">
                    {new Date(market.expirationTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              )}
              <div className="bg-[var(--surface-container-low)] rounded-lg p-3">
                <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Condition ID</div>
                <div className="font-mono text-[10px] text-[var(--on-surface)] truncate">{market.conditionId}</div>
              </div>
              <div className="bg-[var(--surface-container-low)] rounded-lg p-3">
                <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">Tick Size</div>
                <div className="font-mono font-bold text-[var(--on-surface)]">{market.tickSize}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
