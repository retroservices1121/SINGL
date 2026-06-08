// ── ESPN scoreboard — shared fetch + normalize ───────────────────────────────
// Single source of truth for both the pickable-matches list and Oracle
// settlement. Mirrors the shape used by /api/scores but exposed as a function
// so the settle cron and /api/oracle/matches don't each reimplement it.

import { DRAW, type MatchOutcome } from './oracle';

const ESPN_SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

interface ESPNCompetitor {
  team: { abbreviation: string; displayName: string; shortDisplayName: string };
  score?: string;
  winner?: boolean;
}
interface ESPNCompetition {
  competitors: ESPNCompetitor[];
  status: { type: { name: string; shortDetail: string; completed: boolean } };
  date?: string;
}
interface ESPNEvent {
  id: string;
  date: string;
  competitions: ESPNCompetition[];
}

export interface OracleMatch {
  id: string; // ESPN event id
  date: string; // ISO date YYYY-MM-DD (ET)
  kickoff: string; // full ISO timestamp
  away: string; // shortDisplayName
  home: string;
  awayScore: number | null;
  homeScore: number | null;
  status: 'scheduled' | 'live' | 'final';
  statusDetail: string;
  /** Settled outcome (home name / away name / "DRAW"), or null until final. */
  outcome: MatchOutcome | null;
}

// ESPN reports times in UTC; the tournament is in North America. Convert to ET
// (UTC-4 during the summer) so a match's "day" matches how players experience it.
const ET_OFFSET_MS = 4 * 60 * 60 * 1000;
export function etDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() - ET_OFFSET_MS);
  return d.toISOString().split('T')[0];
}

/**
 * Fetch the scoreboard, optionally for a specific YYYYMMDD date (ESPN `dates`
 * param). Returns normalized matches; never throws (returns [] on failure).
 */
export async function fetchMatches(yyyymmdd?: string): Promise<OracleMatch[]> {
  try {
    const url = yyyymmdd ? `${ESPN_SCOREBOARD}?dates=${yyyymmdd}` : ESPN_SCOREBOARD;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = await res.json();
    const events: ESPNEvent[] = data.events || [];

    const out: OracleMatch[] = [];
    for (const event of events) {
      const comp = event.competitions?.[0];
      if (!comp || comp.competitors.length < 2) continue;
      const away = comp.competitors[0];
      const home = comp.competitors[1];

      const st = comp.status.type;
      let status: OracleMatch['status'] = 'scheduled';
      if (st.name === 'STATUS_IN_PROGRESS' || st.name === 'STATUS_HALFTIME') status = 'live';
      else if (st.name === 'STATUS_FINAL' || st.completed) status = 'final';

      const awayName = away.team.shortDisplayName || away.team.abbreviation;
      const homeName = home.team.shortDisplayName || home.team.abbreviation;

      let outcome: MatchOutcome | null = null;
      if (status === 'final') {
        if (away.winner) outcome = awayName;
        else if (home.winner) outcome = homeName;
        else outcome = DRAW; // completed with no winner flag => draw (group stage)
      }

      out.push({
        id: event.id,
        date: etDate(event.date),
        kickoff: event.date,
        away: awayName,
        home: homeName,
        awayScore: away.score ? parseInt(away.score) : null,
        homeScore: home.score ? parseInt(home.score) : null,
        status,
        statusDetail: st.shortDetail,
        outcome,
      });
    }
    return out;
  } catch (err) {
    console.error('[espn] fetchMatches failed:', err);
    return [];
  }
}
