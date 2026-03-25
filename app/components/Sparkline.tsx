'use client';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function Sparkline({ data, width = 80, height = 24, color }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Determine trend color
  const trendColor = color || (data[data.length - 1] > data[0] ? 'var(--yes)' : data[data.length - 1] < data[0] ? 'var(--no)' : 'var(--secondary)');

  // Build SVG path
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M${points.join(' L')}`;

  // Fill area
  const fillD = `${pathD} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-fill-${data.length}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={trendColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#spark-fill-${data.length})`} />
      <path d={pathD} fill="none" stroke={trendColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2} r="2" fill={trendColor} />
    </svg>
  );
}
