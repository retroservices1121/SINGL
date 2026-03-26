import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard';

interface ESPNCompetitor {
  team: { abbreviation: string; displayName: string; shortDisplayName: string };
  score?: string;
  curatedRank?: { current: number };
  winner?: boolean;
}

interface ESPNCompetition {
  competitors: ESPNCompetitor[];
  status: {
    type: { name: string; shortDetail: string; detail: string; completed: boolean };
    period: number;
    displayClock: string;
  };
  broadcasts?: Array<{ names: string[] }>;
}

interface ESPNEvent {
  id: string;
  name: string;
  shortName: string;
  competitions: ESPNCompetition[];
}

export async function GET() {
  try {
    const res = await fetch(ESPN_SCOREBOARD, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json({ games: [] });
    }

    const data = await res.json();
    const events: ESPNEvent[] = data.events || [];

    const games = events.map(event => {
      const comp = event.competitions[0];
      if (!comp || comp.competitors.length < 2) return null;

      // ESPN lists away team first (index 0), home team second (index 1)
      const away = comp.competitors[0];
      const home = comp.competitors[1];

      const statusType = comp.status.type.name; // STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_FINAL, STATUS_HALFTIME
      let status: 'scheduled' | 'live' | 'halftime' | 'final' = 'scheduled';
      if (statusType === 'STATUS_IN_PROGRESS') status = 'live';
      else if (statusType === 'STATUS_HALFTIME') status = 'halftime';
      else if (statusType === 'STATUS_FINAL' || comp.status.type.completed) status = 'final';

      return {
        id: event.id,
        awayTeam: away.team.shortDisplayName || away.team.abbreviation,
        awayScore: away.score ? parseInt(away.score) : null,
        awayRank: away.curatedRank?.current || null,
        awayWinner: away.winner || false,
        homeTeam: home.team.shortDisplayName || home.team.abbreviation,
        homeScore: home.score ? parseInt(home.score) : null,
        homeRank: home.curatedRank?.current || null,
        homeWinner: home.winner || false,
        status,
        statusDetail: comp.status.type.shortDetail,
        period: comp.status.period,
        clock: comp.status.displayClock,
        broadcast: comp.broadcasts?.[0]?.names?.[0] || null,
      };
    }).filter(Boolean);

    return NextResponse.json({ games });
  } catch (err) {
    console.error('[scores] Error:', err);
    return NextResponse.json({ games: [] });
  }
}
