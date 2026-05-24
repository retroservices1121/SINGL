import { NextResponse } from 'next/server';
import { aggFetch } from '@/app/lib/aggServer';

export const dynamic = 'force-dynamic';

// GET /api/agg/charts?outcomeId=...&range=1d|1w|1m|all
// Proxies AGG GET /charts/bars and normalizes to { bars: [{ t, p }] } so
// MarketDetailOverlay's chart renders without changes. AGG's bar format
// is OHLCV ({ t, o, h, l, c, v }) — we expose the close (c) as the price.
const RESOLUTION: Record<string, { res: string; lookbackMs: number }> = {
  '1d':  { res: '5m', lookbackMs: 24 * 60 * 60 * 1000 },
  '1w':  { res: '1h', lookbackMs: 7 * 24 * 60 * 60 * 1000 },
  '1m':  { res: '1h', lookbackMs: 30 * 24 * 60 * 60 * 1000 },
  'all': { res: '1d', lookbackMs: 365 * 24 * 60 * 60 * 1000 },
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const outcomeId = url.searchParams.get('outcomeId');
    if (!outcomeId) return NextResponse.json({ error: 'outcomeId is required' }, { status: 400 });

    const range = url.searchParams.get('range') || '1w';
    const conf = RESOLUTION[range] ?? RESOLUTION['1w'];
    const to = Date.now();
    const from = to - conf.lookbackMs;

    const raw = await aggFetch<{ data?: Array<{ t: number; o?: number; h?: number; l?: number; c?: number; v?: number }> }>(
      '/charts/bars',
      { query: { venueMarketOutcomeId: outcomeId, resolution: conf.res, from: String(from), to: String(to) } },
    );

    const bars = (raw.data || [])
      .filter(b => typeof b.c === 'number')
      .map(b => ({
        // AGG returns t in milliseconds; MarketDetailOverlay's PriceChart
        // multiplies by 1000 expecting seconds — emit seconds here so the
        // axis renders correctly.
        t: Math.floor(b.t / 1000),
        p: b.c as number,
      }));

    return NextResponse.json({ bars });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'charts failed';
    return NextResponse.json({ error: msg, bars: [] }, { status: 500 });
  }
}
