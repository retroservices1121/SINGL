import { NextResponse } from 'next/server';
import { searchEventsBrief, mapPool, type AggVenueEvent } from '@/app/lib/aggServer';
import { getGroupMatchups, titleMentionsCountry, countryFlagUrl, type FIFACountry } from '@/app/lib/fifa';

export const dynamic = 'force-dynamic';
// Discovery fans out one search per group pairing (72). The full scan runs
// ~90-120s, so we need headroom well past the default 60s; the SWR cache
// below means only the first request after expiry pays it.
export const maxDuration = 300;

const CACHE_TTL_MS = 30 * 60 * 1000; // fixtures barely change; rebuild every 30 min
let cached: { ts: number; payload: unknown } | null = null;
let inflight: Promise<unknown> | null = null;

interface MatchTeam { name: string; code: string; flag: string; group: string; }
interface MatchMarket {
  id: string;
  group: string;
  home: MatchTeam;
  away: MatchTeam;
  eventId: string;
  eventTitle: string;
  venue: string | null;
}

function team(c: FIFACountry): MatchTeam {
  return { name: c.name, code: c.code, flag: countryFlagUrl(c, 40), group: c.group };
}

// Among the events that name both teams, prefer the plain "Team vs Team"
// moneyline over prop/side events ("- More Markets", "- Exact Score",
// ": Spread", ": BTTS", halftime, corners, …) — shorter, suffix-free
// titles win. Linking to the moneyline event gives the cleanest trade.
function eventScore(ev: AggVenueEvent): number {
  const t = (ev.title || '').toLowerCase();
  let s = 1000 - t.length;
  if (t.includes(' - ') || t.includes(': ')) s -= 5000;
  if (/win by|to score|both to|total |corners|cards|player props|halftime|first half|exact score|spread|btts|team total|announcers/.test(t)) s -= 5000;
  return s;
}

async function buildPayload(): Promise<{ matches: MatchMarket[] }> {
  const matchups = getGroupMatchups();

  const found = await mapPool(matchups, 6, async (mu): Promise<MatchMarket | null> => {
    const events = await searchEventsBrief(`${mu.home.name} vs ${mu.away.name}`, 40);
    const candidates = events.filter(ev =>
      ev.title
      && titleMentionsCountry(ev.title, mu.home)
      && titleMentionsCountry(ev.title, mu.away),
    );
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => eventScore(b) - eventScore(a));
    const ev = candidates[0];
    return {
      id: `${mu.group}:${mu.home.code}-${mu.away.code}`,
      group: mu.group,
      home: team(mu.home),
      away: team(mu.away),
      eventId: ev.id,
      eventTitle: ev.title || `${mu.home.name} vs ${mu.away.name}`,
      venue: ev.venue ?? null,
    };
  });

  const matches = (found.filter(Boolean) as MatchMarket[])
    .sort((a, b) => a.group.localeCompare(b.group) || a.home.name.localeCompare(b.home.name));

  return { matches };
}

function refresh(): Promise<unknown> {
  if (!inflight) {
    inflight = buildPayload()
      .then(payload => { cached = { ts: Date.now(), payload }; return payload; })
      .catch(err => {
        console.error('[fifa/matches] refresh failed:', err);
        return cached?.payload ?? { matches: [] };
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export async function GET() {
  // Stale-while-revalidate: serve cache instantly, refresh in background.
  // The cold build is ~100s, so the first caller waits; everyone after is
  // instant until the cache goes stale.
  if (cached) {
    if (Date.now() - cached.ts >= CACHE_TTL_MS) void refresh();
    return NextResponse.json(cached.payload);
  }
  return NextResponse.json(await refresh());
}
