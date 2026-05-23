import { NextResponse } from 'next/server';
import { aggFetch } from '@/app/lib/aggServer';

// GET /api/agg/charts?outcomeId=...&fidelity=60&range=1w
// Proxies AGG GET /charts/bars and normalizes to { bars: [{ t, p }] } so the
// existing MarketDetailOverlay chart code can render without changes.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const outcomeId = url.searchParams.get('outcomeId');
    if (!outcomeId) return NextResponse.json({ error: 'outcomeId is required' }, { status: 400 });

    const fidelity = url.searchParams.get('fidelity') || '60';
    const range = url.searchParams.get('range') || '1w';

    const raw = await aggFetch<{ bars?: Array<{ t?: number; timestamp?: number; p?: number; price?: number }> }>(
      '/charts/bars',
      { query: { outcomeId, fidelity, range } },
    );

    const bars = (raw.bars || []).map(b => ({
      t: b.t ?? b.timestamp ?? 0,
      p: b.p ?? b.price ?? 0,
    }));

    return NextResponse.json({ bars });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'charts failed';
    return NextResponse.json({ error: msg, bars: [] }, { status: 500 });
  }
}
