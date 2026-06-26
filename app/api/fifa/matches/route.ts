import { NextResponse } from 'next/server';
import { discoverAndPersist, readPersisted } from '@/app/lib/fifaMatches';

export const dynamic = 'force-dynamic';
// Cold build (no shared cache yet) runs the full ~100s scan, so allow
// headroom past the default 60s. Once the SiteConfig cache is populated
// (by this route or the warming cron) every request is an instant DB read.
export const maxDuration = 300;

const FRESH_MS = 30 * 60 * 1000; // rebuild in the background after 30 min
let inflight: Promise<unknown> | null = null;

function rebuild(now: number): Promise<unknown> {
  if (!inflight) {
    inflight = discoverAndPersist(now)
      .catch(err => { console.error('[fifa/matches] rebuild failed:', err); return []; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export async function GET() {
  const now = Date.now();
  const cached = await readPersisted();

  // Shared, non-personalized data — let the browser/edge cache it briefly so
  // repeat loads & quick navigation skip the round-trip entirely.
  const CACHE = 'public, s-maxage=30, stale-while-revalidate=120';
  if (cached) {
    // Serve the shared cache instantly; refresh in the background if stale.
    if (now - cached.ts >= FRESH_MS) void rebuild(now);
    return NextResponse.json({ matches: cached.matches }, { headers: { 'Cache-Control': CACHE } });
  }

  // First ever load — nothing cached yet. Build now (slow), persist, return.
  const matches = await rebuild(now);
  return NextResponse.json({ matches: Array.isArray(matches) ? matches : [] }, { headers: { 'Cache-Control': CACHE } });
}
