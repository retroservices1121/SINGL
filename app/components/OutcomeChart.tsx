'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { MarketData } from '@/app/types';

const COLORS = [
  '#F2841A', // orange
  '#3B82F6', // blue
  '#10B981', // green
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#F59E0B', // amber
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#6366F1', // indigo
];

interface SnapshotPoint {
  timestamp: string;
  yesPrice: number;
}

interface OutcomeChartProps {
  markets: MarketData[];
  eventId?: string;
}

export default function OutcomeChart({ markets, eventId }: OutcomeChartProps) {
  const [historyData, setHistoryData] = useState<Record<string, SnapshotPoint[]> | null>(null);

  const sorted = [...markets].sort((a, b) => b.yesPrice - a.yesPrice);
  const topMarkets = sorted.slice(0, 8);

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/prices?eventId=${encodeURIComponent(eventId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.snapshots) setHistoryData(data.snapshots);
      })
      .catch(() => {});
  }, [eventId]);

  if (topMarkets.length === 0) return null;

  // Build chart data: merge all market timelines into unified time points
  const hasHistory = historyData && Object.keys(historyData).length > 0;

  // Collect all unique timestamps and build merged data
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
        time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      for (const m of topMarkets) {
        const marketHistory = historyData[m.ticker];
        if (marketHistory) {
          // Find the closest point at or before this timestamp
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

  // If no history, show current prices as two identical points so lines render
  if (chartData.length === 0) {
    for (const label of ['Now', ' ']) {
      const point: Record<string, number | string> = { time: label };
      for (const m of topMarkets) {
        point[m.ticker] = Math.round(m.yesPrice * 100);
      }
      chartData.push(point);
    }
  }

  // Build ticker-to-short-label map
  const tickerLabels: Record<string, string> = {};
  for (const m of topMarkets) {
    tickerLabels[m.ticker] = m.title.length > 25 ? m.title.slice(0, 25) + '...' : m.title;
  }

  const maxPct = Math.round(topMarkets[0].yesPrice * 100);

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-2xl font-bold font-mono text-[var(--text)]">{maxPct}c</span>
        <span className="text-sm text-[var(--text-dim)]">top outcome</span>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'var(--text-dim)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={(v: number) => `${v}c`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [`${value}c`, tickerLabels[name] || name] as any}
              labelStyle={{ color: 'var(--text-dim)', marginBottom: 4 }}
            />
            {topMarkets.map((m, i) => {
              const color = COLORS[i % COLORS.length];
              return (
                <Line
                  key={m.ticker}
                  type="monotone"
                  dataKey={m.ticker}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ fill: color, stroke: color, r: 3 }}
                  activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {topMarkets.map((m, i) => (
          <div key={m.ticker} className="flex items-center gap-1.5 text-xs text-[var(--text-sec)]">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="truncate max-w-[150px]">{m.title}</span>
            <span className="font-mono text-[var(--text-dim)]">{Math.round(m.yesPrice * 100)}c</span>
          </div>
        ))}
      </div>
    </div>
  );
}
