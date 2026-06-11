// Shared World Cup match-market discovery, used by both the public
// /api/fifa/matches endpoint and the warming cron. AGG titles match
// markets by team name ("Mexico vs. South Africa"), not "World Cup …", so
// we look each group pairing up by team names and keep whatever venues
// have posted. Result is persisted to SiteConfig so every serverless
// instance serves it instantly (the in-memory cache is per-instance).

import { prisma } from '@/app/lib/db';
import { searchEventsBrief, getVenueEvent, mapPool, type AggVenueEvent, type AggVenueMarket } from '@/app/lib/aggServer';
import { getGroupMatchups, titleMentionsCountry, countryFlagUrl, type FIFACountry } from '@/app/lib/fifa';

// Bump the suffix to invalidate the cached payload when the shape changes
// so a fresh build runs instead of serving old rows.
export const FIFA_MATCHES_KEY = 'fifaMatchesV4';

// These are all GROUP-stage games, which run Jun 11–27. Reject anything
// resolving outside that window: it's either a settled pre-tournament
// friendly sharing the pairing, or a prop/award market that settles long
// after the match (which would show a wrong date).
const GROUP_START = '2026-06-10T00:00:00.000Z';
const GROUP_END = '2026-06-28T00:00:00.000Z';

export interface MatchTeam { name: string; code: string; flag: string; group: string; }
export interface MatchMarket {
  id: string;
  group: string;
  home: MatchTeam;
  away: MatchTeam;
  eventId: string;
  eventTitle: string;
  venue: string | null;
  date: string | null; // ISO kickoff/close time, for ordering + display
}

function team(c: FIFACountry): MatchTeam {
  return { name: c.name, code: c.code, flag: countryFlagUrl(c, 40), group: c.group };
}

// Prefer the plain "Team vs Team" moneyline over prop/side events
// ("- More Markets", "- Exact Score", ": Spread", ": BTTS", halftime,
// "Correct Score", …). Lower-but-not-rejected so a match with ONLY prop
// events still surfaces something tradeable.
function eventScore(ev: AggVenueEvent): number {
  const t = (ev.title || '').toLowerCase();
  let s = 1000 - t.length;
  if (t.includes(' - ') || t.includes(': ')) s -= 5000;
  if (/win by|to score|both to|total |corners|cards|player props|half|exact score|correct score|spread|btts|team total|announcers|first goal/.test(t)) s -= 5000;
  return s;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Some venues (e.g. limitless) bake the date into the title
// ("World Cup, X vs Y, Jun 25, 2026") rather than a structured field.
function dateFromTitle(title: string): string | null {
  const m = title.match(/\b([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (!m) return null;
  const mon = MONTHS[m[1].toLowerCase()];
  if (mon === undefined) return null;
  const d = new Date(Date.UTC(Number(m[3]), mon, Number(m[2]), 12, 0, 0));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// The reliable match date is when its markets resolve (≈ kickoff), not the
// event's startDate (which AGG often returns as a placeholder). Use the
// earliest market endDate; fall back to event endDate, then a title date.
function resolveDate(ev: AggVenueEvent, markets: AggVenueMarket[] | undefined): string | null {
  const ends = (markets || []).map(m => m.endDate).filter((d): d is string => !!d).sort();
  return ends[0] ?? ev.endDate ?? dateFromTitle(ev.title || '');
}

// Runs the full per-pairing scan (72 group matches), enriching candidates
// to confirm each is a real upcoming WC match (markets resolve inside the
// tournament window) rather than a settled friendly. ~120-180s — call from
// a long-timeout context (cron, or a route with maxDuration >= 300).
export async function discoverMatches(now: number): Promise<MatchMarket[]> {
  const matchups = getGroupMatchups();
  // Drop matches that have already finished (resolve > ~4h ago).
  const cutoff = new Date(now - 4 * 60 * 60 * 1000).toISOString();
  const minDate = cutoff > GROUP_START ? cutoff : GROUP_START;

  const found = await mapPool(matchups, 8, async (mu): Promise<MatchMarket | null> => {
    const events = await searchEventsBrief(`${mu.home.name} vs ${mu.away.name}`, 40);
    const candidates = events.filter(ev =>
      ev.title
      && titleMentionsCountry(ev.title, mu.home)
      && titleMentionsCountry(ev.title, mu.away),
    );
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => eventScore(b) - eventScore(a));

    // Enrich the top candidates to read each one's resolution date, then
    // keep only those resolving within the group-stage window. The match
    // RESULT settles at kickoff while props settle later, so the right
    // event + date is the EARLIEST in-window one; ties break toward the
    // cleanest (moneyline) title via eventScore.
    const enriched = await Promise.all(
      candidates.slice(0, 6).map(async ev => {
        const full = await getVenueEvent(ev.id);
        return { ev, date: resolveDate(ev, full?.markets), venue: ev.venue ?? full?.venue ?? null };
      }),
    );
    const valid = enriched.filter(e => e.date && e.date >= minDate && e.date <= GROUP_END) as
      { ev: AggVenueEvent; date: string; venue: string | null }[];
    if (valid.length === 0) return null;
    valid.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : eventScore(b.ev) - eventScore(a.ev)));
    const best = valid[0];

    return {
      id: `${mu.group}:${mu.home.code}-${mu.away.code}`,
      group: mu.group,
      home: team(mu.home),
      away: team(mu.away),
      eventId: best.ev.id,
      eventTitle: best.ev.title || `${mu.home.name} vs ${mu.away.name}`,
      venue: best.venue,
      date: best.date,
    };
  });

  // Order by kickoff (soonest first) so today's fixtures lead.
  return (found.filter(Boolean) as MatchMarket[])
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.group.localeCompare(b.group));
}

// Discover + persist to the shared SiteConfig cache (timestamped).
export async function discoverAndPersist(now: number): Promise<MatchMarket[]> {
  const matches = await discoverMatches(now);
  // Only overwrite the cache with a non-empty result, so a transient AGG
  // hiccup can't wipe a good list.
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
