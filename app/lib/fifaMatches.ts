// Shared World Cup match-market discovery, used by both the public
// /api/fifa/matches endpoint and the warming cron. AGG titles match
// markets by team name ("Mexico vs. South Africa"), not "World Cup …", so
// we look each group pairing up by team names and keep whatever venues
// have posted. Result is persisted to SiteConfig so every serverless
// instance serves it instantly (the in-memory cache is per-instance).

import { prisma } from '@/app/lib/db';
import { searchEventsBrief, mapPool, type AggVenueEvent } from '@/app/lib/aggServer';
import { getGroupMatchups, titleMentionsCountry, countryFlagUrl, type FIFACountry } from '@/app/lib/fifa';

export const FIFA_MATCHES_KEY = 'fifaMatches';

export interface MatchTeam { name: string; code: string; flag: string; group: string; }
export interface MatchMarket {
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

// Prefer the plain "Team vs Team" moneyline over prop/side events
// ("- More Markets", "- Exact Score", ": Spread", ": BTTS", halftime, …).
function eventScore(ev: AggVenueEvent): number {
  const t = (ev.title || '').toLowerCase();
  let s = 1000 - t.length;
  if (t.includes(' - ') || t.includes(': ')) s -= 5000;
  if (/win by|to score|both to|total |corners|cards|player props|halftime|first half|exact score|spread|btts|team total|announcers/.test(t)) s -= 5000;
  return s;
}

// Runs the full per-pairing scan (72 group matches). ~90-120s — call from a
// long-timeout context (cron, or a route with maxDuration >= 300).
export async function discoverMatches(): Promise<MatchMarket[]> {
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

  return (found.filter(Boolean) as MatchMarket[])
    .sort((a, b) => a.group.localeCompare(b.group) || a.home.name.localeCompare(b.home.name));
}

// Discover + persist to the shared SiteConfig cache (timestamped).
export async function discoverAndPersist(now: number): Promise<MatchMarket[]> {
  const matches = await discoverMatches();
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
