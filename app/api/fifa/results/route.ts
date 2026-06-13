import { NextResponse } from 'next/server';
import { fetchMatches } from '@/app/lib/espn';
import type { MatchResult } from '@/app/lib/fifa';

export const dynamic = 'force-dynamic';

// GET /api/fifa/results — finished World Cup matches (ESPN), so the groups
// page can compute live W/D/L/GD/Pts. ESPN fetches are revalidated ~30s.
const TOURNAMENT_START = '2026-06-11';
const CACHE_TTL_MS = 60 * 1000;
let cached: { ts: number; results: MatchResult[] } | null = null;

function etYyyymmdd(ms: number): string {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).replace(/-/g, '');
}

export async function GET() {
  const now = Date.now();
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ results: cached.results });
  }

  // Every ET day from the tournament start through today (inclusive).
  const start = Date.parse(`${TOURNAMENT_START}T12:00:00Z`);
  const days: string[] = [];
  for (let t = start; t <= now + 24 * 60 * 60 * 1000; t += 24 * 60 * 60 * 1000) {
    days.push(etYyyymmdd(t));
    if (days.length > 40) break; // safety bound (whole tournament is ~39 days)
  }

  const lists = await Promise.all(days.map(d => fetchMatches(d)));
  const seen = new Set<string>();
  const results: MatchResult[] = [];
  for (const list of lists) {
    for (const m of list) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      if (m.status === 'final' && m.homeScore != null && m.awayScore != null) {
        results.push({ home: m.home, away: m.away, homeScore: m.homeScore, awayScore: m.awayScore });
      }
    }
  }

  cached = { ts: now, results };
  return NextResponse.json({ results });
}
