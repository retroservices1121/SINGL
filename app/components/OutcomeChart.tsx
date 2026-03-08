'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { MarketData } from '@/app/types';

// Kalshi-style colors: yellow/gold, black, orange/brown for top 3, then more
const COLORS = [
  '#D4A843', // gold/yellow
  '#1a1a1a', // black
  '#C4652A', // orange/brown
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#10B981', // green
  '#EC4899', // pink
  '#06B6D4', // cyan
];

interface SnapshotPoint {
  timestamp: string;
  yesPrice: number;
}

type TimeRange = '1d' | '1w' | '1m' | 'all';

interface OutcomeChartProps {
  markets: MarketData[];
  eventId?: string;
  volume?: number | null;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDateLabel(iso: string, range: TimeRange): string {
  const d = new Date(iso);
  if (range === '1d') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function OutcomeChart({ markets, eventId, volume }: OutcomeChartProps) {
  const [historyData, setHistoryData] = useState<Record<string, SnapshotPoint[]> | null>(null);
  const [range, setRange] = useState<TimeRange>('all');

  const sorted = useMemo(() => [...markets].sort((a, b) => b.yesPrice - a.yesPrice), [markets]);
  const topMarkets = sorted.slice(0, 5);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/prices?eventId=${encodeURIComponent(eventId)}&range=${range}`)
      .then(r => r.json())
      .then(data => {
        if (data.snapshots) setHistoryData(data.snapshots);
      })
      .catch(() => {});
  }, [eventId, range]);

  if (topMarkets.length === 0) return null;

  // Build chart data
  const hasHistory = historyData && Object.keys(historyData).length > 0;
  let chartData: Record<string, number | string>[] = [];

  if (hasHistory) {
    const timeSet = new Set<string>();
    for (const ticker of Object.keys(historyData)) {
      for (const pt of historyData[ticker]) {
        timeSet.add(pt.timestamp);
      }
    }
    const times = [...timeSet].sort();

    chartData = times.map(t => {
      const point: Record<string, number | string> = {
        time: formatDateLabel(t, range),
        rawTime: t,
      };
      for (const m of topMarkets) {
        const marketHistory = historyData[m.ticker];
        if (marketHistory) {
          let val: number | undefined;
          for (const pt of marketHistory) {
            if (pt.timestamp <= t) val = pt.yesPrice;
          }
          if (val !== undefined) point[m.ticker] = Math.round(val * 100);
        }
      }
      return point;
    });
  }

  // If no history, show current prices as flat line
  if (chartData.length === 0) {
    const now = new Date();
    const labels = ['Now', ' '];
    for (const label of labels) {
      const point: Record<string, number | string> = { time: label, rawTime: now.toISOString() };
      for (const m of topMarkets) {
        point[m.ticker] = Math.round(m.yesPrice * 100);
      }
      chartData.push(point);
    }
  }

  // Ticker label map
  const tickerLabels: Record<string, string> = {};
  for (const m of topMarkets) {
    tickerLabels[m.ticker] = m.title.length > 20 ? m.title.slice(0, 20) + '...' : m.title;
  }

  // Y-axis domain: find min/max across all data
  let yMin = 100, yMax = 0;
  for (const point of chartData) {
    for (const m of topMarkets) {
      const v = point[m.ticker];
      if (typeof v === 'number') {
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
    }
  }
  yMin = Math.max(0, Math.floor(yMin / 15) * 15);
  yMax = Math.min(100, Math.ceil(yMax / 15) * 15 + 15);

  const ranges: { key: TimeRange; label: string }[] = [
    { key: '1d', label: '1D' },
    { key: '1w', label: '1W' },
    { key: '1m', label: '1M' },
    { key: 'all', label: 'ALL' },
  ];

  // Grid lines for Y axis
  const gridLines: number[] = [];
  for (let v = yMin; v <= yMax; v += 15) {
    gridLines.push(v);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* Legend — top, Kalshi style */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-4">
        {topMarkets.map((m, i) => (
          <div key={m.ticker} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-sm text-gray-700">{tickerLabels[m.ticker]}</span>
            <span className="text-sm font-semibold" style={{ color: COLORS[i % COLORS.length] }}>
              {Math.round(m.yesPrice * 100)}%
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 45, left: 0, bottom: 5 }}>
            {/* Dotted horizontal grid lines */}
            {gridLines.map(v => (
              <ReferenceLine
                key={v}
                y={v}
                stroke="#e5e7eb"
                strokeDasharray="2 4"
              />
            ))}
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              orientation="right"
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [`${value}%`, tickerLabels[name] || name] as any}
              labelStyle={{ color: '#6b7280', marginBottom: 4 }}
            />
            {topMarkets.map((m, i) => {
              const color = COLORS[i % COLORS.length];
              const isLast = chartData.length > 0;
              return (
                <Line
                  key={m.ticker}
                  type="stepAfter"
                  dataKey={m.ticker}
                  stroke={color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom bar: volume left, time range buttons right */}
      <div className="flex items-center justify-between mt-2">
        <div className="text-sm text-gray-500">
          {volume ? (
            <span className="font-semibold text-gray-700">{formatVolume(volume)} vol</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {ranges.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                range === r.key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
