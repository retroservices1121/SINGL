import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get('title') || 'SINGL';
  const imageUrl = searchParams.get('image') || '';
  const emoji = searchParams.get('emoji') || '';
  const subtitle = searchParams.get('subtitle') || 'Single-event prediction market';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left side: text */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingRight: imageUrl ? '40px' : '0',
          }}
        >
          {/* SINGL branding */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#f97316', letterSpacing: '2px' }}>
              SINGL
            </span>
            <span style={{ fontSize: '14px', color: '#94a3b8', marginLeft: '12px' }}>
              by Spredd Markets
            </span>
          </div>

          {/* Event title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            {emoji && (
              <span style={{ fontSize: '48px' }}>{emoji}</span>
            )}
            <h1
              style={{
                fontSize: title.length > 60 ? '36px' : '48px',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {title}
            </h1>
          </div>

          {/* Subtitle */}
          <p style={{ fontSize: '20px', color: '#94a3b8', margin: 0 }}>
            {subtitle}
          </p>

          {/* CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '32px',
              gap: '8px',
            }}
          >
            <div
              style={{
                background: '#f97316',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 700,
                padding: '10px 24px',
                borderRadius: '8px',
              }}
            >
              Trade Now
            </div>
            <span style={{ fontSize: '14px', color: '#64748b', marginLeft: '8px' }}>
              singl.spredd.markets
            </span>
          </div>
        </div>

        {/* Right side: event image */}
        {imageUrl && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '340px',
              height: '340px',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '3px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              width={340}
              height={340}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
