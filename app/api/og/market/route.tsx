import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const title = searchParams.get('title') || 'Market';
    const yesPrice = parseInt(searchParams.get('yes') || '50', 10);
    const noPrice = parseInt(searchParams.get('no') || '50', 10);
    const volume = searchParams.get('vol') || '';
    const yesLabel = searchParams.get('yesLabel') || 'YES';
    const noLabel = searchParams.get('noLabel') || 'NO';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            padding: '60px 80px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#f97316',
                letterSpacing: '3px',
              }}
            >
              SINGL
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginLeft: '14px' }}>
              by Spredd Markets
            </div>
          </div>

          {/* Market title */}
          <div
            style={{
              fontSize: title.length > 60 ? '36px' : title.length > 40 ? '44px' : '52px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.15,
              marginBottom: '32px',
            }}
          >
            {title}
          </div>

          {/* Odds bar */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '48px',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: `${yesPrice}%`,
                background: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
                color: '#ffffff',
              }}
            >
              {yesPrice > 10 ? `${yesLabel} ${yesPrice}\u00a2` : ''}
            </div>
            <div
              style={{
                width: `${noPrice}%`,
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
                color: '#ffffff',
              }}
            >
              {noPrice > 10 ? `${noLabel} ${noPrice}\u00a2` : ''}
            </div>
          </div>

          {/* Price labels */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>
              {yesLabel} {yesPrice}\u00a2
            </div>
            <div style={{ fontSize: '20px', color: '#475569', marginLeft: '16px', marginRight: '16px' }}>|</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>
              {noLabel} {noPrice}\u00a2
            </div>
            {volume && (
              <div style={{ fontSize: '16px', color: '#94a3b8', marginLeft: 'auto' }}>
                Vol: {volume}
              </div>
            )}
          </div>

          {/* CTA bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                background: '#f97316',
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: 700,
                padding: '12px 28px',
                borderRadius: '10px',
              }}
            >
              Trade Now
            </div>
            <div style={{ fontSize: '16px', color: '#64748b' }}>
              singl.market
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch {
    return new Response('OG image generation failed', { status: 500 });
  }
}
