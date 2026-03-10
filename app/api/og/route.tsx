import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const title = searchParams.get('title') || 'SINGL';
    const subtitle = searchParams.get('subtitle') || 'Single-event prediction market';

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
          {/* SINGL branding */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#f97316',
                letterSpacing: '3px',
              }}
            >
              SINGL
            </div>
            <div style={{ fontSize: '16px', color: '#64748b', marginLeft: '16px' }}>
              by Spredd Markets
            </div>
          </div>

          {/* Event title */}
          <div
            style={{
              fontSize: title.length > 50 ? '40px' : '56px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2,
              marginBottom: '20px',
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: '22px', color: '#94a3b8', marginBottom: '40px' }}>
            {subtitle}
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
              singl.spredd.markets
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
    // Fallback: return a simple response if ImageResponse fails
    return new Response('OG image generation failed', { status: 500 });
  }
}
