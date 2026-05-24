import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/health/agg?secret=<CRON_SECRET>
// Diagnostic: hits a few AGG endpoints with the server key and reports
// status + first 300 chars of each response so we can tell whether the
// key is recognized, whether origin/IP is allowlisted, etc.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appId = process.env.NEXT_PUBLIC_AGG_APP_ID || '';
  const baseUrl = process.env.NEXT_PUBLIC_AGG_BASE_URL || 'https://api.agg.market';
  const serverKey = process.env.AGG_SERVER_API_KEY || '';

  const config = {
    NEXT_PUBLIC_AGG_APP_ID: appId ? `${appId.slice(0, 6)}…` : '(empty)',
    NEXT_PUBLIC_AGG_BASE_URL: baseUrl,
    AGG_SERVER_API_KEY_set: !!serverKey,
    AGG_SERVER_API_KEY_prefix: serverKey ? serverKey.slice(0, 12) + '…' : '(empty)',
    AGG_SERVER_API_KEY_matchesAppId: serverKey.startsWith(`agg_${appId}_`),
  };

  const headers: Record<string, string> = { 'x-app-id': appId };
  if (serverKey) headers['x-app-api-key'] = serverKey;

  const ping = async (path: string) => {
    try {
      const res = await fetch(`${baseUrl}${path}`, { headers, cache: 'no-store' });
      const text = await res.text();
      return { path, status: res.status, ok: res.ok, body: text.slice(0, 300) };
    } catch (err) {
      return { path, error: err instanceof Error ? err.message : String(err) };
    }
  };

  // The /app/config probe showed only `sports` is enabled — most other
  // category presets are disabled. AGG's /venue-events 500s when it has
  // to fan out across disabled categories. Force the sports id and see
  // if the call recovers.
  const SPORTS = 'd7iw9fo6tp4nkgws7m3e8naw';

  // For the chart probe we need a real outcome id. Pull the first market
  // of the FIFA event and use its first outcome.
  let sampleOutcomeId = '';
  try {
    const markets = await fetch(`${baseUrl}/venue-markets?venueEventId=uflqeqhtzei1c97cmwkuedlq&limit=1`, { headers, cache: 'no-store' });
    const j = await markets.json();
    sampleOutcomeId = j?.data?.[0]?.venueMarketOutcomes?.[0]?.id || '';
  } catch { /* leave empty */ }
  const to = Date.now();
  const from = to - 7 * 24 * 60 * 60 * 1000;

  const results = await Promise.all([
    ping('/search?type=events&q=FIFA&limit=5'),
    ping('/venue-events/uflqeqhtzei1c97cmwkuedlq'),
    ping('/venue-markets?venueEventId=uflqeqhtzei1c97cmwkuedlq&limit=2'),
    // Chart bar probe — proves whether the chart endpoint returns data for
    // a real outcome and shows the exact response shape.
    sampleOutcomeId
      ? ping(`/charts/bars?venueMarketOutcomeId=${sampleOutcomeId}&resolution=1h&from=${from}&to=${to}`)
      : Promise.resolve({ path: '/charts/bars', error: 'no sample outcome id available' }),
  ]);

  return NextResponse.json({ config, results });
}
