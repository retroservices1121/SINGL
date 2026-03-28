import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const totalValue = searchParams.get('value') || '$0.00';
    const pnl = searchParams.get('pnl') || '+$0.00';
    const pnlPct = searchParams.get('pnlPct') || '0';
    const winRate = searchParams.get('winRate') || '0';
    const positions = searchParams.get('positions') || '0';
    const volume = searchParams.get('volume') || '$0.00';
    // bars: comma-separated pnl ratios e.g. "0.12,-0.05,0.30,..."
    const barsRaw = searchParams.get('bars') || '';
    const bars = barsRaw ? barsRaw.split(',').map(Number) : [];

    const isPositive = !pnl.startsWith('-');

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(145deg, #0a0e1a 0%, #111c2d 40%, #0f1a2e 100%)',
            padding: '50px 60px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f97316', letterSpacing: '3px' }}>
                SINGL
              </div>
              <div style={{ fontSize: '14px', color: '#475569', marginLeft: '14px' }}>
                Portfolio Performance
              </div>
            </div>
            <div style={{ fontSize: '14px', color: '#475569', display: 'flex' }}>
              singl.market
            </div>
          </div>

          {/* Main value */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '8px' }}>
            <div style={{ fontSize: '64px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              {totalValue}
            </div>
          </div>

          {/* P&L line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: isPositive ? '#22c55e' : '#ef4444',
              display: 'flex',
            }}>
              {pnl} ({pnlPct}%)
            </div>
            <div style={{ fontSize: '14px', color: '#475569', display: 'flex' }}>
              all time
            </div>
          </div>

          {/* Velocity bars */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '4px',
            height: '180px',
            marginBottom: '32px',
            padding: '0 4px',
          }}>
            {bars.length > 0 ? bars.map((ratio, i) => {
              const h = Math.max(8, Math.min(170, 85 + ratio * 300));
              const color = ratio >= 0 ? '#f97316' : '#ef4444';
              const opacity = 0.4 + Math.min(0.6, Math.abs(ratio) * 2);
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}px`,
                    background: color,
                    borderRadius: '4px 4px 0 0',
                    opacity,
                  }}
                />
              );
            }) : (
              // Placeholder bars
              Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${40 + Math.sin(i * 0.8) * 30}px`,
                    background: '#1e293b',
                    borderRadius: '4px 4px 0 0',
                  }}
                />
              ))
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', color: '#64748b', letterSpacing: '2px', fontWeight: 700 }}>
                WIN RATE
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
                {winRate}%
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', color: '#64748b', letterSpacing: '2px', fontWeight: 700 }}>
                POSITIONS
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
                {positions}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', color: '#64748b', letterSpacing: '2px', fontWeight: 700 }}>
                VOLUME
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
                {volume}
              </div>
            </div>
            <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end' }}>
              <div style={{
                display: 'flex',
                background: '#f97316',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 700,
                padding: '10px 24px',
                borderRadius: '10px',
              }}>
                Trade on SINGL
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch {
    return new Response('OG image generation failed', { status: 500 });
  }
}
