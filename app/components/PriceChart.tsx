'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { MarketData } from '@/app/types';

interface PriceChartProps {
  eventId: string;
  markets: MarketData[];
}

type Range = '1d' | '1w' | '1m' | 'all';

interface SnapshotPoint {
  timestamp: string;
  yesPrice: number;
}

const RANGES: { key: Range; label: string }[] = [
  { key: '1d', label: '24H' },
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: 'all', label: 'All' },
];

export default function PriceChart({ eventId, markets }: PriceChartProps) {
  const [range, setRange] = useState<Range>('1w');
  const [data, setData] = useState<Record<string, SnapshotPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState<string>(markets[0]?.ticker || '');

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetch(`/api/prices?eventId=${eventId}&range=${range}`)
      .then(r => r.json())
      .then(d => {
        setData(d.snapshots || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [eventId, range]);

  // Set initial selected ticker when markets load
  useEffect(() => {
    if (markets.length > 0 && !selectedTicker) {
      setSelectedTicker(markets[0].ticker);
    }
  }, [markets, selectedTicker]);

  const chartData = useMemo(() => {
    const points = data[selectedTicker] || [];
    return points.map(p => ({
      time: new Date(p.timestamp).getTime(),
      price: Math.round(p.yesPrice * 100),
    }));
  }, [data, selectedTicker]);

  // Current price from live market data
  const currentMarket = markets.find(m => m.ticker === selectedTicker);
  const currentPrice = currentMarket ? Math.round(currentMarket.yesPrice * 100) : null;

  // Price change
  const priceChange = chartData.length > 1
    ? currentPrice !== null
      ? currentPrice - chartData[0].price
      : chartData[chartData.length - 1].price - chartData[0].price
    : null;

  const formatTime = (time: number) => {
    const d = new Date(time);
    if (range === '1d') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const hasData = chartData.length > 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Price History
        </h3>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer transition-colors ${
                range === r.key
                  ? 'bg-[var(--orange)] text-white'
                  : 'text-[var(--text-dim)] hover:bg-[var(--sand)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Market selector tabs */}
      {markets.length > 1 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {markets.map(m => (
            <button
              key={m.ticker}
              onClick={() => setSelectedTicker(m.ticker)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                selectedTicker === m.ticker
                  ? 'bg-[var(--paper)] border border-[var(--orange)] text-[var(--orange)]'
                  : 'bg-[var(--paper)] border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text-dim)]'
              }`}
            >
              {m.title.length > 30 ? m.title.slice(0, 30) + '…' : m.title}
            </button>
          ))}
        </div>
      )}

      {/* Current price header */}
      <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-2xl font-mono font-bold text-[var(--text)]">
            {currentPrice !== null ? `${currentPrice}¢` : '—'}
          </span>
          <span className="text-xs font-semibold uppercase text-[var(--text-dim)]">YES</span>
          {priceChange !== null && (
            <span className={`text-sm font-mono font-semibold ${priceChange >= 0 ? 'text-[var(--yes)]' : 'text-[var(--no)]'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange}¢
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-[var(--text-dim)]">
            Loading chart…
          </div>
        ) : !hasData ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-[var(--text-dim)]">
            Not enough data yet — prices are snapshotted periodically
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--orange)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--orange)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={formatTime}
                tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={v => `${v}¢`}
                tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const point = payload[0].payload;
                  return (
                    <div className="bg-[var(--text)] text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                      <div className="font-mono font-bold">{point.price}¢</div>
                      <div className="text-gray-300 mt-0.5">{new Date(point.time).toLocaleString()}</div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="var(--orange)"
                strokeWidth={2}
                fill="url(#priceGrad)"
                dot={false}
                activeDot={{ r: 4, fill: 'var(--orange)', stroke: 'white', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
