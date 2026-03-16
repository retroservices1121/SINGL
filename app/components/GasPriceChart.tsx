'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { GasPriceData } from '@/app/types';

const GRADE_COLORS: Record<string, string> = {
  regular: '#D4A843',
  midgrade: '#C4652A',
  premium: '#1a1a1a',
  diesel: '#3B82F6',
};

const GRADE_LABELS: Record<string, string> = {
  regular: 'Regular',
  midgrade: 'Midgrade',
  premium: 'Premium',
  diesel: 'Diesel',
};

interface GasPriceChartProps {
  gasPrices: GasPriceData[];
}

export default function GasPriceChart({ gasPrices }: GasPriceChartProps) {
  const [selectedRegion, setSelectedRegion] = useState('US');

  // Group data by region and grade
  const { regions, chartData, grades, latest } = useMemo(() => {
    const regionSet = new Set<string>();
    const gradeSet = new Set<string>();

    for (const p of gasPrices) {
      regionSet.add(p.region);
      gradeSet.add(p.grade);
    }

    const regions = [...regionSet].sort();
    const grades = [...gradeSet].sort();

    // Filter to selected region
    const filtered = gasPrices.filter(p => p.region === selectedRegion);

    // Build time series — group by weekOf
    const byWeek = new Map<string, Record<string, number>>();
    for (const p of filtered) {
      const week = p.weekOf.slice(0, 10); // YYYY-MM-DD
      if (!byWeek.has(week)) byWeek.set(week, {});
      byWeek.get(week)![p.grade] = p.price;
    }

    const chartData = [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, prices]) => ({
        week: new Date(week).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        rawWeek: week,
        ...prices,
      }));

    // Latest prices for display
    const latestByGrade: Record<string, { price: number; change: number | null }> = {};
    for (const grade of grades) {
      const gradeData = filtered
        .filter(p => p.grade === grade)
        .sort((a, b) => b.weekOf.localeCompare(a.weekOf));
      if (gradeData.length > 0) {
        const change = gradeData.length > 1 ? +(gradeData[0].price - gradeData[1].price).toFixed(3) : null;
        latestByGrade[grade] = { price: gradeData[0].price, change };
      }
    }

    return { regions, chartData, grades, latest: latestByGrade };
  }, [gasPrices, selectedRegion]);

  if (gasPrices.length === 0) return null;

  // Y-axis domain
  let yMin = Infinity, yMax = -Infinity;
  for (const point of chartData) {
    for (const grade of grades) {
      const v = (point as Record<string, unknown>)[grade];
      if (typeof v === 'number') {
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
    }
  }
  yMin = Math.max(0, Math.floor(yMin * 10) / 10 - 0.2);
  yMax = Math.ceil(yMax * 10) / 10 + 0.2;

  const gridLines: number[] = [];
  for (let v = Math.ceil(yMin * 2) / 2; v <= yMax; v += 0.5) {
    gridLines.push(+(v.toFixed(1)));
  }

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-dim)]">
            Oil & Gas Prices
          </h2>
          <span className="text-xs font-bold text-[var(--orange)] bg-[var(--orange-lt)] px-2 py-0.5 rounded-full">
            EIA
          </span>
        </div>
        {regions.length > 1 && (
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            className="text-xs font-semibold border border-[var(--border)] rounded-lg px-2 py-1 bg-[var(--paper)] text-[var(--text-sec)] cursor-pointer"
          >
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}
      </div>

      {/* Latest prices */}
      <div className="flex flex-wrap gap-4 mb-4">
        {grades.map(grade => {
          const data = latest[grade];
          if (!data) return null;
          const color = GRADE_COLORS[grade] || '#6b7280';
          return (
            <div key={grade} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-[var(--text-sec)]">{GRADE_LABELS[grade] || grade}</span>
              <span className="text-sm font-bold text-[var(--text)]">
                ${data.price.toFixed(3)}
              </span>
              {data.change !== null && (
                <span className={`text-xs font-semibold ${data.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {data.change >= 0 ? '+' : ''}{data.change.toFixed(3)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 45, left: 0, bottom: 5 }}>
            {gridLines.map(v => (
              <ReferenceLine key={v} y={v} stroke="#e5e7eb" strokeDasharray="2 4" />
            ))}
            <XAxis
              dataKey="week"
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
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              width={50}
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
              formatter={(value: any, name: any) => [`$${Number(value).toFixed(3)}`, GRADE_LABELS[name] || name] as any}
              labelStyle={{ color: '#6b7280', marginBottom: 4 }}
            />
            {grades.map(grade => {
              const color = GRADE_COLORS[grade] || '#6b7280';
              return (
                <Line
                  key={grade}
                  type="monotone"
                  dataKey={grade}
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

      <div className="text-xs text-[var(--text-dim)] mt-2">
        Source: U.S. Energy Information Administration — Weekly Retail Prices
      </div>
    </div>
  );
}
