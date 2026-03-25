import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLOB_API = 'https://clob.polymarket.com';

export async function GET(req: NextRequest) {
  const tokenId = req.nextUrl.searchParams.get('tokenId');
  const fidelity = req.nextUrl.searchParams.get('fidelity') || '60'; // minutes per data point

  if (!tokenId) {
    return NextResponse.json({ error: 'tokenId required' }, { status: 400 });
  }

  try {
    // Polymarket CLOB prices-history endpoint
    const res = await fetch(
      `${CLOB_API}/prices-history?market=${encodeURIComponent(tokenId)}&interval=all&fidelity=${fidelity}`,
    );

    if (!res.ok) {
      // Fallback: try the midpoint endpoint for at least current price
      const midRes = await fetch(
        `${CLOB_API}/midpoint?token_id=${encodeURIComponent(tokenId)}`,
      );
      if (midRes.ok) {
        const midData = await midRes.json();
        return NextResponse.json({
          history: [{
            t: Math.floor(Date.now() / 1000),
            p: parseFloat(midData.mid || '0'),
          }],
        });
      }
      return NextResponse.json({ history: [] });
    }

    const data = await res.json();

    // Polymarket returns { history: [{ t: timestamp, p: price }] }
    const history = (data.history || data || []).map((point: { t: number; p: number }) => ({
      t: point.t,
      p: point.p,
    }));

    return NextResponse.json({ history });
  } catch (err) {
    console.error('Price history fetch error:', err);
    return NextResponse.json({ history: [] });
  }
}
