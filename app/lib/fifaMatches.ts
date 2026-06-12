// World Cup match markets — REAL schedule from ESPN, market from AGG.
//
// ESPN (the same source the SPREDD Oracle uses) is the source of truth for
// fixtures: real teams, kickoff times, dates and live status. AGG only
// provides the tradeable market, which we attach per fixture by team name
// (AGG titles match markets "Mexico vs. South Africa", not "World Cup …").
// Result is persisted to SiteConfig so every instance serves it instantly.

import { prisma } from '@/app/lib/db';
import { searchEventsBrief, getVenueEvent, mapPool, type AggVenueEvent, type AggVenueMarket } from '@/app/lib/aggServer';
import { findCountry, titleMentionsCountry, countryFlagUrl, type FIFACountry } from '@/app/lib/fifa';
import { fetchMatches, type OracleMatch } from '@/app/lib/espn';

// Bump to invalidate the cached payload when the shape changes.
export const FIFA_MATCHES_KEY = 'fifaMatchesV8';

// How far ahead to surface fixtures (covers the live matchdays without
// pulling the whole tournament every refresh).
const LOOKAHEAD_DAYS = 16;

export interface MatchTeam { name: string; code: string; flag: string; group: string; }
export interface MatchMarket {
  id: string;            // ESPN event id
  group: string;
  home: MatchTeam;
  away: MatchTeam;
  eventId: string;       // AGG event id (for trading)
  eventTitle: string;
  venue: string | null;
  date: string;          // real ESPN kickoff (ISO)
  status: 'scheduled' | 'live' | 'final';
}

function team(c: FIFACountry): MatchTeam {
  return { name: c.name, code: c.code, flag: countryFlagUrl(c, 40), group: c.group };
}

// Prefer the plain "Team vs Team" moneyline over prop/side events.
function eventScore(ev: AggVenueEvent): number {
  const t = (ev.title || '').toLowerCase();
  let s = 1000 - t.length;
  if (t.includes(' - ') || t.includes(': ') || t.includes('?')) s -= 5000;
  if (/win by|to score|both to|total |corners|cards|player props|half|exact score|correct score|spread|btts|team total|announcers|first goal|\bsay\b|will the|captain|\bopener\b|to start|man of the match|\bmotm\b|booking|red card|penalty/.test(t)) s -= 5000;
  return s;
}

// The event holds the full-match WIN market — a market for each team
// (moneyline), not a halftime/exact-score/prop variant.
function hasMoneyline(ev: AggVenueEvent, markets: AggVenueMarket[] | undefined, home: FIFACountry, away: FIFACountry): boolean {
  const t = (ev.title || '').toLowerCase();
  if (/half|exact score|first team|player props|to score|corners|cards|assists|goalscorer|captain|opener|to start|man of the match|motm|booking/.test(t)) return false;
  const titles = (markets || []).map(m => (m.question ?? m.title ?? '').trim().toLowerCase());
  const has = (c: FIFACountry) => titles.some(x => x === c.name.toLowerCase() || c.aliases.includes(x));
  return has(home) && has(away);
}

function earliestEnd(markets: AggVenueMarket[] | undefined): string | null {
  const ends = (markets || []).map(m => m.endDate).filter((d): d is string => !!d).sort();
  return ends[0] ?? null;
}

// Find the AGG event to trade for a fixture: search by team names, keep
// only events resolving near the real kickoff (rejects settled friendlies
// sharing the pairing), then prefer the moneyline.
async function findAggEvent(home: FIFACountry, away: FIFACountry, kickoffIso: string):
  Promise<{ eventId: string; title: string; venue: string | null } | null> {
  const events = await searchEventsBrief(`${home.name} vs ${away.name}`, 100);
  const candidates = events.filter(ev =>
    ev.title && titleMentionsCountry(ev.title, home) && titleMentionsCountry(ev.title, away));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => eventScore(b) - eventScore(a));

  const k = new Date(kickoffIso).getTime();
  const enriched = await Promise.all(candidates.slice(0, 8).map(async ev => {
    const full = await getVenueEvent(ev.id);
    return {
      ev,
      end: earliestEnd(full?.markets) ?? ev.endDate ?? null,
      venue: ev.venue ?? full?.venue ?? null,
      moneyline: hasMoneyline(ev, full?.markets, home, away),
    };
  }));
  // Tie the market to THIS fixture: its markets must resolve within a few
  // days of the real kickoff.
  const valid = enriched.filter(e => e.end && Math.abs(new Date(e.end).getTime() - k) <= 4 * 24 * 60 * 60 * 1000);
  if (valid.length === 0) return null;
  valid.sort((a, b) => (b.moneyline ? 1 : 0) - (a.moneyline ? 1 : 0) || eventScore(b.ev) - eventScore(a.ev));
  const best = valid[0];
  return { eventId: best.ev.id, title: best.ev.title || `${home.name} vs ${away.name}`, venue: best.venue };
}

// ET calendar date (YYYYMMDD) `offset` days from `now` — ESPN buckets the
// scoreboard by ET day, matching how fixtures are experienced.
function etYyyymmdd(now: number, offset: number): string {
  const d = new Date(now + offset * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).replace(/-/g, '');
}

async function fetchUpcomingFixtures(now: number): Promise<OracleMatch[]> {
  const days = Array.from({ length: LOOKAHEAD_DAYS }, (_, i) => etYyyymmdd(now, i));
  const lists = await mapPool(days, 6, d => fetchMatches(d));
  const seen = new Set<string>();
  const out: OracleMatch[] = [];
  for (const list of lists) {
    for (const m of list) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      if (m.status !== 'final') out.push(m); // upcoming + live only
    }
  }
  return out;
}

// Real fixtures (ESPN) joined to their AGG market. ~30-90s depending on how
// many matchdays are in range — call from a long-timeout context.
export async function discoverMatches(now: number): Promise<MatchMarket[]> {
  const fixtures = await fetchUpcomingFixtures(now);

  const out = await mapPool(fixtures, 8, async (fx): Promise<MatchMarket | null> => {
    const home = findCountry(fx.home);
    const away = findCountry(fx.away);
    if (!home || !away) return null;
    const agg = await findAggEvent(home, away, fx.kickoff);
    if (!agg) return null;
    return {
      id: fx.id,
      group: home.group,
      home: team(home),
      away: team(away),
      eventId: agg.eventId,
      eventTitle: agg.title,
      venue: agg.venue,
      date: fx.kickoff,
      status: fx.status,
    };
  });

  return (out.filter(Boolean) as MatchMarket[]).sort((a, b) => a.date.localeCompare(b.date));
}

// Discover + persist to the shared SiteConfig cache (timestamped).
export async function discoverAndPersist(now: number): Promise<MatchMarket[]> {
  const matches = await discoverMatches(now);
  if (matches.length > 0) {
    const value = JSON.stringify({ ts: now, matches });
    await prisma.siteConfig.upsert({
      where: { key: FIFA_MATCHES_KEY },
      create: { id: FIFA_MATCHES_KEY, key: FIFA_MATCHES_KEY, value },
      update: { value },
    });
  }
  return matches;
}

export async function readPersisted(): Promise<{ ts: number; matches: MatchMarket[] } | null> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { key: FIFA_MATCHES_KEY } });
    if (!row) return null;
    const data = JSON.parse(row.value);
    return { ts: data.ts ?? 0, matches: Array.isArray(data.matches) ? data.matches : [] };
  } catch {
    return null;
  }
}
