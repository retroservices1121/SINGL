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

    const volText = volume ? `  |  Vol: ${volume}` : '';

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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '32px',
            }}
          >
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

          <div
            style={{
              fontSize: title.length > 60 ? '36px' : title.length > 40 ? '44px' : '52px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.15,
              marginBottom: '32px',
              display: 'flex',
            }}
          >
            {title}
          </div>

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
              {yesPrice > 10 ? `${yesLabel} ${yesPrice}%` : ''}
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
              {noPrice > 10 ? `${noLabel} ${noPrice}%` : ''}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
              fontSize: '18px',
            }}
          >
            <div style={{ display: 'flex', fontWeight: 700, color: '#22c55e' }}>
              {yesLabel} {yesPrice}%
            </div>
            <div style={{ display: 'flex', color: '#475569', marginLeft: '16px', marginRight: '16px' }}>
              |
            </div>
            <div style={{ display: 'flex', fontWeight: 700, color: '#ef4444' }}>
              {noLabel} {noPrice}%{volText}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
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
            <div style={{ display: 'flex', fontSize: '16px', color: '#64748b', marginLeft: '16px' }}>
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
