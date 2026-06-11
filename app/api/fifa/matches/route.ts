import { NextResponse } from 'next/server';
import { searchEventsBrief, getVenueEvent, mapAggMarket, mapPool, type AggVenueEvent } from '@/app/lib/aggServer';
import { getGroupMatchups, titleMentionsCountry, countryFlagUrl, type FIFACountry, type GroupMatchup } from '@/app/lib/fifa';

export const dynamic = 'force-dynamic';
// Cold build fans out one search per group pairing (72). Allow headroom so
// the first request doesn't hit the default serverless timeout; subsequent
// requests are served instantly from the SWR cache below.
export const maxDuration = 300;

// Match markets on AGG are titled "Team A vs Team B" (per venue), NOT
// "World Cup …", so the event-title search the rest of the app uses never
// finds them. We instead look each group pairing up by team names and
// surface whatever venues have posted. Most matches aren't listed until
// close to kickoff, so this naturally grows from the opener outward.

const CACHE_TTL_MS = 15 * 60 * 1000; // matches change slowly; pricing is live via WS
let cached: { ts: number; payload: unknown } | null = null;
let inflight: Promise<unknown> | null = null;

interface MatchTeam { name: string; code: string; flag: string; group: string; }
interface MatchOdds { home: number | null; draw: number | null; away: number | null; }
interface MatchMarket {
  id: string;
  group: string;
  home: MatchTeam;
  away: MatchTeam;
  eventId: string;
  eventTitle: string;
  venue: string | null;
  closeTime: string | null;
  odds: MatchOdds;
}

function team(c: FIFACountry): MatchTeam {
  return { name: c.name, code: c.code, flag: countryFlagUrl(c, 40), group: c.group };
}

// A binary leg whose title is exactly a team name / "Tie" / "Draw" gives us
// the moneyline price. Venues differ, so this is best-effort — the card
// still links to the full market when a price can't be read.
function readMoneyline(
  markets: ReturnType<typeof mapAggMarket>[],
  home: FIFACountry,
  away: FIFACountry,
): MatchOdds {
  const odds: MatchOdds = { home: null, draw: null, away: null };
  for (const m of markets) {
    if (!m) continue;
    const t = (m.title || '').trim().toLowerCase();
    if (odds.home == null && (t === home.name.toLowerCase() || home.aliases.includes(t))) odds.home = m.yesPrice;
    else if (odds.away == null && (t === away.name.toLowerCase() || away.aliases.includes(t))) odds.away = m.yesPrice;
    else if (odds.draw == null && (t === 'tie' || t === 'draw')) odds.draw = m.yesPrice;
  }
  return odds;
}

// Prefer the plain match event ("Mexico vs. South Africa") over side
// events ("- More Markets", "- Halftime Result", "- Exact Score").
function eventScore(ev: AggVenueEvent): number {
  const t = (ev.title || '').toLowerCase();
  let s = (ev.markets?.length || 0);
  if (t.includes(' - ')) s -= 100; // de-prioritise prop/side events
  return s;
}

async function buildPayload(): Promise<{ matches: MatchMarket[] }> {
  const matchups = getGroupMatchups();

  // Phase 1 — cheap: one title-only search per pairing, keep just the
  // events that name BOTH teams. No market enrichment yet, so the 72
  // mostly-miss lookups stay fast.
  const hits = await mapPool(matchups, 5, async (mu): Promise<{ mu: GroupMatchup; ev: AggVenueEvent } | null> => {
    const events = await searchEventsBrief(`${mu.home.name} vs ${mu.away.name}`, 40);
    const candidates = events.filter(ev =>
      ev.title
      && titleMentionsCountry(ev.title, mu.home)
      && titleMentionsCountry(ev.title, mu.away),
    );
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => eventScore(b) - eventScore(a));
    return { mu, ev: candidates[0] };
  });

  // Phase 2 — enrich only the survivors (today: the opener) to read markets.
  const matches = await mapPool(hits.filter(Boolean) as { mu: GroupMatchup; ev: AggVenueEvent }[], 8,
    async ({ mu, ev }): Promise<MatchMarket | null> => {
      const full = await getVenueEvent(ev.id);
      const markets = full?.markets || [];
      // Only surface a market that closes within the tournament window —
      // filters out a stale friendly that happened to match the names.
      if (!markets.some(m => (m.endDate || '') >= '2026-06-10')) return null;

      const mapped = markets.map(m => mapAggMarket(full!, m)).filter(Boolean);
      const closeTime = mapped
        .map(m => m!.closeTime)
        .filter((t): t is string => !!t)
        .sort()[0] ?? null;

      return {
        id: `${mu.group}:${mu.home.code}-${mu.away.code}`,
        group: mu.group,
        home: team(mu.home),
        away: team(mu.away),
        eventId: ev.id,
        eventTitle: ev.title || `${mu.home.name} vs ${mu.away.name}`,
        venue: ev.venue ?? full?.venue ?? null,
        closeTime,
        odds: readMoneyline(mapped, mu.home, mu.away),
      };
    });

  return {
    matches: (matches.filter(Boolean) as MatchMarket[])
      .sort((a, b) => (a.closeTime || '').localeCompare(b.closeTime || '')),
  };
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

export async function GET(req: Request) {
  // Temporary diagnostic: ?debug=1 shows what the brief search returns for
  // the opener pairing, so we can see why discovery does/doesn't match.
  if (new URL(req.url).searchParams.get('debug')) {
    const matchups = getGroupMatchups();
    let briefNonEmpty = 0;
    const hitTitles: string[] = [];
    await mapPool(matchups, 5, async (mu) => {
      const events = await searchEventsBrief(`${mu.home.name} vs ${mu.away.name}`, 40);
      if (events.length) briefNonEmpty++;
      const cands = events.filter(ev =>
        ev.title && titleMentionsCountry(ev.title, mu.home) && titleMentionsCountry(ev.title, mu.away));
      if (cands.length) hitTitles.push(`${mu.home.name} v ${mu.away.name} -> "${cands[0].title}" [${cands[0].venue}] ${cands[0].id}`);
      return null;
    });
    return NextResponse.json({
      totalPairings: matchups.length,
      briefNonEmpty,          // how many of the 72 searches returned ANY events
      hitCount: hitTitles.length, // how many matched both team names
      hitTitles,
    });
  }

  // Stale-while-revalidate: serve cache instantly, refresh in background.
  if (cached) {
    if (Date.now() - cached.ts >= CACHE_TTL_MS) void refresh();
    return NextResponse.json(cached.payload);
  }
  return NextResponse.json(await refresh());
}
