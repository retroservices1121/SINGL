'use client';

import type { MarketData } from '@/app/types';

interface OutcomeChartProps {
  markets: MarketData[];
}

export default function OutcomeChart({ markets }: OutcomeChartProps) {
  const sorted = [...markets].sort((a, b) => b.yesPrice - a.yesPrice);
  const top = sorted.slice(0, 10);

  if (top.length === 0) return null;

  // Build a simple area-style visualization of the probability distribution
  const maxPct = Math.round(top[0].yesPrice * 100);
  const chartHeight = 200;
  const chartWidth = 100; // percentage-based

  // Generate SVG points for a smooth line
  const points = top.map((m, i) => {
    const x = (i / Math.max(top.length - 1, 1)) * chartWidth;
    const y = chartHeight - (m.yesPrice / Math.max(top[0].yesPrice, 0.01)) * (chartHeight - 20);
    return { x, y, label: m.title, pct: Math.round(m.yesPrice * 100) };
  });

  const linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `0,${chartHeight} ${linePoints} ${chartWidth},${chartHeight}`;

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-2xl font-bold font-mono text-[var(--text)]">{maxPct}%</span>
        <span className="text-sm text-[var(--text-dim)]">top outcome probability</span>
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-48"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(frac => (
          <line
            key={frac}
            x1="0" y1={chartHeight - frac * (chartHeight - 20)}
            x2={chartWidth} y2={chartHeight - frac * (chartHeight - 20)}
            stroke="var(--border)" strokeWidth="0.3" strokeDasharray="1,1"
          />
        ))}

        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill="url(#chartGradient)"
        />

        {/* Line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--yes)"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y} r="1.2"
            fill="var(--yes)"
          />
        ))}

        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--yes)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--yes)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 overflow-hidden">
        {points.filter((_, i) => i % Math.ceil(points.length / 5) === 0 || i === points.length - 1).map((p, i) => (
          <span key={i} className="text-[10px] text-[var(--text-dim)] truncate max-w-[60px]">
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
