import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const market = searchParams.get('market') || 'Market';
    const event = searchParams.get('event') || '';
    const side = (searchParams.get('side') || 'yes').toUpperCase();
    const entry = searchParams.get('entry') || '0.50';
    const current = searchParams.get('current') || '0.50';
    const pnl = searchParams.get('pnl') || '+$0.00';
    const pnlPct = searchParams.get('pnlPct') || '0';
    const stake = searchParams.get('stake') || '$0.00';
    const payout = searchParams.get('payout') || '$0.00';

    const isPositive = !pnl.startsWith('-');
    const isYes = side === 'YES';

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f97316', letterSpacing: '3px' }}>
                SINGL
              </div>
              <div style={{ fontSize: '14px', color: '#475569', marginLeft: '14px' }}>
                Winning Position
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isPositive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              padding: '8px 20px',
              borderRadius: '100px',
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 800,
                color: isPositive ? '#22c55e' : '#ef4444',
                display: 'flex',
              }}>
                {pnl} ({pnlPct}%)
              </div>
            </div>
          </div>

          {/* Event context */}
          {event && (
            <div style={{ fontSize: '16px', color: '#64748b', marginBottom: '8px', display: 'flex' }}>
              {event}
            </div>
          )}

          {/* Market title */}
          <div style={{
            fontSize: market.length > 50 ? '36px' : '44px',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.2,
            marginBottom: '36px',
            display: 'flex',
          }}>
            {market}
          </div>

          {/* Side badge + price movement */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
            <div style={{
              display: 'flex',
              padding: '12px 28px',
              borderRadius: '12px',
              background: isYes ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              border: `2px solid ${isYes ? '#22c55e' : '#ef4444'}`,
            }}>
              <div style={{
                fontSize: '28px',
                fontWeight: 800,
                color: isYes ? '#22c55e' : '#ef4444',
              }}>
                {side}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748b', letterSpacing: '2px', fontWeight: 700 }}>ENTRY</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#94a3b8' }}>{entry}c</div>
              </div>
              <div style={{ fontSize: '28px', color: '#475569', display: 'flex' }}>
                →
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748b', letterSpacing: '2px', fontWeight: 700 }}>NOW</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: isPositive ? '#22c55e' : '#ef4444' }}>{current}c</div>
              </div>
            </div>
          </div>

          {/* Footer stats */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '12px', color: '#64748b', letterSpacing: '2px', fontWeight: 700 }}>STAKE</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff' }}>{stake}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '12px', color: '#64748b', letterSpacing: '2px', fontWeight: 700 }}>POT. PAYOUT</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#f97316' }}>{payout}</div>
              </div>
            </div>
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
      ),
      { width: 1200, height: 630 }
    );
  } catch {
    return new Response('OG image generation failed', { status: 500 });
  }
}
