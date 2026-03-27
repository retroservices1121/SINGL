export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const ESPN_TEAM_IDS: Record<string, number> = {
  'Michigan': 130, 'Arizona': 12, 'Duke': 150, 'Houston': 248,
  'Purdue': 2509, 'Illinois': 356, 'Iowa State': 66, 'UConn': 41,
  "St. John's": 2599, 'Michigan State': 127, 'Arkansas': 8,
  'Nebraska': 158, 'Iowa': 2294, 'Tennessee': 2633, 'Alabama': 333,
  'Texas': 251,
};

interface CachedEntry {
  data: TeamStatsResponse;
  timestamp: number;
}

interface TeamStatsResponse {
  name: string;
  record: string;
  rank?: number;
  conference: string;
  standing: string;
  stats: {
    ppg: number | null;
    rpg: number | null;
    apg: number | null;
    fgPct: number | null;
    threePtPct: number | null;
    ftPct: number | null;
    spg: number | null;
    bpg: number | null;
    topg: number | null;
  };
  logo?: string;
}

const CACHE = new Map<string, CachedEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const STAT_NAME_MAP: Record<string, keyof TeamStatsResponse['stats']> = {
  avgPoints: 'ppg',
  avgRebounds: 'rpg',
  avgAssists: 'apg',
  fieldGoalPct: 'fgPct',
  threePointFieldGoalPct: 'threePtPct',
  freeThrowPct: 'ftPct',
  avgSteals: 'spg',
  avgBlocks: 'bpg',
  avgTurnovers: 'topg',
};

function findTeamId(teamName: string): number | null {
  // Exact match
  if (ESPN_TEAM_IDS[teamName]) return ESPN_TEAM_IDS[teamName];

  // Case-insensitive match
  const lower = teamName.toLowerCase();
  for (const [name, id] of Object.entries(ESPN_TEAM_IDS)) {
    if (name.toLowerCase() === lower) return id;
  }

  // Partial match
  for (const [name, id] of Object.entries(ESPN_TEAM_IDS)) {
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) return id;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamName = searchParams.get('team');

  if (!teamName) {
    return NextResponse.json({ error: 'Missing team parameter' }, { status: 400 });
  }

  // Check cache
  const cached = CACHE.get(teamName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const teamId = findTeamId(teamName);
  if (!teamId) {
    return NextResponse.json({ error: `Unknown team: ${teamName}` }, { status: 404 });
  }

  try {
    const [teamRes, statsRes] = await Promise.all([
      fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${teamId}`, {
        next: { revalidate: 300 },
      }),
      fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${teamId}/statistics`, {
        next: { revalidate: 300 },
      }),
    ]);

    if (!teamRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch team info from ESPN' }, { status: 502 });
    }

    const teamData = await teamRes.json();
    const team = teamData.team;

    // Extract team info
    const record = team?.record?.items?.[0]?.summary || '—';
    const rank = team?.rank || undefined;
    const standing = team?.standingSummary || '—';
    const conference = team?.groups?.parent?.name || team?.groups?.name || '—';
    const logo = team?.logos?.[0]?.href || undefined;

    // Extract stats
    const statsObj: TeamStatsResponse['stats'] = {
      ppg: null, rpg: null, apg: null,
      fgPct: null, threePtPct: null, ftPct: null,
      spg: null, bpg: null, topg: null,
    };

    if (statsRes.ok) {
      const statsData = await statsRes.json();
      const categories = statsData?.results?.stats?.categories || [];

      for (const category of categories) {
        const stats = category?.stats || [];
        for (const stat of stats) {
          const mappedKey = STAT_NAME_MAP[stat.name];
          if (mappedKey && stat.displayValue) {
            const val = parseFloat(stat.displayValue);
            if (!isNaN(val)) {
              statsObj[mappedKey] = val;
            }
          }
        }
      }
    }

    const result: TeamStatsResponse = {
      name: team?.displayName || teamName,
      record,
      rank,
      conference,
      standing,
      stats: statsObj,
      logo,
    };

    // Cache result
    CACHE.set(teamName, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (err) {
    console.error('ESPN API error:', err);
    return NextResponse.json({ error: 'Failed to fetch team stats' }, { status: 500 });
  }
}
