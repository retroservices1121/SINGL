'use client';

import { useEffect, useState } from 'react';
import { useTradeStore } from '@/app/store/tradeStore';
import { useLivePrice, useLivePricesMap } from './LivePricesProvider';
import { formatVolume, formatPercent } from '@/app/lib/utils';
import VenueChip from './VenueChip';
import BuyPanel from './BuyPanel';

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
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('1w');
  // Which outcome the chart + (future) buy panel reflect. Defaults to the
  // first outcome on open; user can switch by tapping a row in the outcomes
  // list. Falls back to yesOutcomeId for legacy 2-outcome data.
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const outcomesList = detailMarket?.outcomes ?? [];
  const selectedOutcome = outcomesList.find(o => o.id === selectedOutcomeId)
    ?? outcomesList[0]
    ?? null;
  const livePrices = useLivePricesMap();
  // Hook calls must run on every render, before any conditional return.
  const liveYes = useLivePrice(detailMarket?.yesOutcomeId, detailMarket?.yesPrice ?? 0.5);
  const liveNo = useLivePrice(detailMarket?.noOutcomeId, detailMarket?.noPrice ?? (1 - liveYes));

  // Reset selected outcome whenever a different market opens.
  useEffect(() => {
    if (!detailMarket) return;
    setSelectedOutcomeId(detailMarket.outcomes?.[0]?.id ?? detailMarket.yesOutcomeId ?? null);
  }, [detailMarket]);

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

        // Chart bars come straight from AGG. No DB fallback — pricing
        // is never persisted on our side. Use the selected outcome so
        // the chart updates when the user picks a different one.
        const outcomeId = selectedOutcomeId ?? detailMarket.yesOutcomeId;
        if (outcomeId) {
          const res = await fetch(`/api/agg/charts?outcomeId=${encodeURIComponent(outcomeId)}&fidelity=${fidelity}&range=${timeRange}`);
          const data = await res.json();
          const points: PricePoint[] = (data.bars || []).map((b: { t: number; p: number }) => ({
            timestamp: new Date(b.t * 1000).toISOString(),
            yesPrice: b.p,
          }));
          setPriceHistory(points);
        } else {
          setPriceHistory([]);
        }
      } catch {
        setPriceHistory([]);
      }
      setLoading(false);
    };

    fetchPrices();
  }, [detailOpen, detailMarket, timeRange, selectedOutcomeId]);

  if (!detailOpen || !detailMarket) return null;

  const market = detailMarket;
  const yesCents = Math.round(liveYes * 100);
  const noCents = Math.round(liveNo * 100) || (100 - yesCents);

  // Use team names for game matchups
  const yesLabel = market.outcomeName
    ? market.outcomeName.replace(/\s+(Fighting Illini|Hawkeyes|Boilermakers|Wildcats|Huskies|Blue Devils|Volunteers|Wolverines|Panthers|Bulldogs|Bears|Tigers|Cyclones|Crimson Tide|Spartans|Golden Eagles|Red Raiders|Jayhawks|Cougars|Cavaliers|Badgers|Gators|Hoosiers|Buckeyes|Bruins|Trojans|Gaels|Musketeers|Commodores|Razorbacks|Cornhuskers|Aggies|Longhorns|Mountaineers|Terrapins|Sooners|Cowboys|Beavers|Ducks|Lumberjacks|Rebels|Seminoles|Cardinals|Redbirds|Catamounts)$/i, '').trim()
    : 'Yes';
  const noLabel = market.outcome2Name
    ? market.outcome2Name.replace(/\s+(Fighting Illini|Hawkeyes|Boilermakers|Wildcats|Huskies|Blue Devils|Volunteers|Wolverines|Panthers|Bulldogs|Bears|Tigers|Cyclones|Crimson Tide|Spartans|Golden Eagles|Red Raiders|Jayhawks|Cougars|Cavaliers|Badgers|Gators|Hoosiers|Buckeyes|Bruins|Trojans|Gaels|Musketeers|Commodores|Razorbacks|Cornhuskers|Aggies|Longhorns|Mountaineers|Terrapins|Sooners|Cowboys|Beavers|Ducks|Lumberjacks|Rebels|Seminoles|Cardinals|Redbirds|Catamounts)$/i, '').trim()
    : 'No';

  // Clicking a Yes/No button on an outcome row focuses that outcome
  // in the sidebar (and sets the BuyPanel's side via uncontrolled state).
  // The actual buy flow lives inside BuyPanel now — no more handoff to
  // the legacy TradePanel modal from inside the detail view.
  const focusOutcome = (outcomeId: string) => {
    setSelectedOutcomeId(outcomeId);
  };
  // Legacy hand-off retained for any spots that still call it (none in this file).
  const handleTrade = (_side: 'yes' | 'no') => {
    void openTrade; void closeDetail;
  };

  const isMulti = outcomesList.length > 2;
  // Live % for the selected (or default) outcome — drives the chart header
  // and the right-side buy panel preview. Falls back to static outcome price
  // → 0.5 when nothing live yet.
  const selectedPriceLive = selectedOutcome ? (livePrices.get(selectedOutcome.id) ?? selectedOutcome.price ?? 0.5) : liveYes;
  const selectedYesCents = Math.round(selectedPriceLive * 100);
  const selectedNoCents = 100 - selectedYesCents;
  const selectedLabel = selectedOutcome?.label || yesLabel;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto" onClick={closeDetail}>
      <div className="min-h-screen p-4 md:p-8" onClick={e => e.stopPropagation()}>
        <div className="max-w-7xl mx-auto bg-[var(--surface-container-lowest)] rounded-2xl shadow-2xl overflow-hidden">
          {/* Sticky close bar */}
          <div className="sticky top-0 z-20 bg-[var(--surface-container-lowest)]/95 backdrop-blur-sm border-b border-[var(--surface-container)] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">
              <VenueChip venue={market.venue ?? null} size="xs" />
              <span>{market.venue || 'Market'}</span>
              {market.volume != null && market.volume > 0 && (
                <>
                  <span className="text-[var(--surface-container-highest)]">•</span>
                  <span>Vol {formatVolume(market.volume)}</span>
                </>
              )}
            </div>
            <button
              onClick={closeDetail}
              className="text-[var(--secondary)] hover:text-[var(--on-surface)] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* LEFT — chart + outcomes */}
            <div className="lg:col-span-2 space-y-5">
              <header>
                <h1 className="font-heading font-black text-2xl md:text-3xl uppercase tracking-tight text-[var(--on-surface)] leading-tight">
                  {market.title}
                </h1>
                {/* Top-3 outcome chips for multi-outcome markets, click to focus */}
                {isMulti && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {outcomesList.slice(0, 8).map(o => {
                      const live = livePrices.get(o.id) ?? o.price ?? 0;
                      const pct = Math.round(live * 100);
                      const active = o.id === (selectedOutcome?.id ?? '');
                      return (
                        <button
                          key={o.id}
                          onClick={() => setSelectedOutcomeId(o.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            active
                              ? 'bg-[var(--on-surface)] text-white'
                              : 'bg-[var(--surface-container-high)] text-[var(--secondary)] hover:text-[var(--on-surface)]'
                          }`}
                        >
                          {o.label}
                          <span className="font-mono opacity-80">{pct}%</span>
                        </button>
                      );
                    })}
                    {outcomesList.length > 8 && (
                      <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold text-[var(--secondary)]">+{outcomesList.length - 8} more</span>
                    )}
                  </div>
                )}
              </header>

              {/* Chart with timeframe selector */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-3xl font-black text-[var(--on-surface)]">{selectedYesCents}¢</span>
                    <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">
                      {selectedLabel}
                    </span>
                  </div>
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
                    <div className="flex items-center justify-center text-[var(--secondary)] text-xs" style={{ height: 220 }}>
                      Loading price data...
                    </div>
                  ) : (
                    <PriceChart data={priceHistory} />
                  )}
                </div>
              </section>

              {/* Description / rules */}
              {market.rulesPrimary && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-sm text-[var(--secondary)]">gavel</span>
                    <h3 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">Resolution Rules</h3>
                  </div>
                  <p className="text-sm text-[var(--secondary)] leading-relaxed whitespace-pre-wrap">
                    {market.rulesPrimary}
                  </p>
                </section>
              )}

              {/* Outcomes list — only renders when there are 3+ outcomes */}
              {isMulti && (
                <section>
                  <h3 className="text-xs font-black font-heading uppercase tracking-widest text-[var(--on-surface)] mb-3">
                    Outcomes ({outcomesList.length})
                  </h3>
                  <div className="rounded-xl overflow-hidden border border-[var(--surface-container)]">
                    {outcomesList.map((o, idx) => {
                      const live = livePrices.get(o.id) ?? o.price ?? 0;
                      const pct = Math.round(live * 100);
                      const isSelected = o.id === selectedOutcome?.id;
                      return (
                        <div
                          key={o.id}
                          onClick={() => setSelectedOutcomeId(o.id)}
                          className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
                            idx > 0 ? 'border-t border-[var(--surface-container)]' : ''
                          } ${isSelected ? 'bg-[var(--surface-container)]' : 'hover:bg-[var(--surface-container-low)]'}`}
                        >
                          {o.imageUrl ? (
                            <img src={o.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center text-[10px] font-bold text-[var(--secondary)]">
                              {o.label.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-heading font-bold text-sm text-[var(--on-surface)] truncate">{o.label}</div>
                          </div>
                          <div className="w-12 text-right font-mono text-sm font-bold text-[var(--on-surface)]">{pct}%</div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); focusOutcome(o.id); }}
                              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[var(--yes-bg)] text-[var(--yes)] hover:bg-[var(--yes)] hover:text-white transition-colors"
                            >
                              Yes {pct}¢
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); focusOutcome(o.id); }}
                              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[var(--no-bg)] text-[var(--no)] hover:bg-[var(--no)] hover:text-white transition-colors"
                            >
                              No {100 - pct}¢
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Market metadata strip */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                {market.closeTime && (
                  <Meta label="Closes" value={new Date(market.closeTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                )}
                <Meta label="Tick Size" value={market.tickSize} mono />
                <Meta label="Market ID" value={market.venueMarketId.slice(0, 10) + '…'} mono small />
                {market.venue && <Meta label="Venue" value={market.venue} capitalize />}
              </section>
            </div>

            {/* RIGHT — sticky inline buy panel with smart routing. */}
            <aside className="lg:sticky lg:top-20 self-start space-y-3">
              <div className="flex items-center gap-2 px-1">
                <VenueChip venue={market.venue ?? null} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">Trade</p>
                  <p className="font-heading font-bold text-sm text-[var(--on-surface)] truncate">{selectedLabel}</p>
                </div>
              </div>

              <BuyPanel
                key={selectedOutcome?.id ?? market.venueMarketId}
                yesOutcomeId={selectedOutcome?.id ?? market.yesOutcomeId}
                noOutcomeId={market.noOutcomeId}
                yesPriceFallback={selectedOutcome?.price ?? market.yesPrice}
                noPriceFallback={market.noPrice || (1 - (selectedOutcome?.price ?? market.yesPrice))}
                yesLabel={selectedLabel}
                noLabel={market.outcome2Name || 'No'}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, mono, capitalize, small }: { label: string; value: string; mono?: boolean; capitalize?: boolean; small?: boolean }) {
  return (
    <div className="bg-[var(--surface-container-low)] rounded-lg p-2.5">
      <div className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest mb-0.5">{label}</div>
      <div
        className={`font-bold text-[var(--on-surface)] ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''} ${small ? 'text-[10px] truncate' : 'text-xs'}`}
      >
        {value}
      </div>
    </div>
  );
}
