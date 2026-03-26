export const dynamic = 'force-dynamic';

// ── Types ──────────────────────────────────────────────────────────────────

interface BracketTeam {
  name: string;
  nameShort: string;
  seed: number;
  isWinner: boolean;
  score: number | null;
}

interface BracketGame {
  id: string;
  round: number;
  roundName: string;
  region: string;
  gameState: 'P' | 'I' | 'F';
  startTime: string | null;
  score: [number, number] | null;
  winnerIndex: number | null;
  feedsInto: string | null;
  teams: BracketTeam[];
}

interface BracketRegion {
  name: string;
  games: BracketGame[];
}

interface BracketResponse {
  regions: BracketRegion[];
  finalFour: BracketGame[];
  championship: BracketGame | null;
  teams: Array<{ name: string; nameShort: string; seed: number; region: string }>;
}

// ── Cache ──────────────────────────────────────────────────────────────────

let cached: { data: BracketResponse; ts: number } | null = null;
const CACHE_TTL = 60_000; // 60 seconds

// ── Section → Region mapping ───────────────────────────────────────────────

const SECTION_REGION: Record<number, string> = {
  1: 'First Four',
  2: 'East',
  3: 'West',    // sectionId 3 = West based on API regionCode TR
  4: 'South',   // sectionId 4 = South based on API regionCode BL
  5: 'Midwest',
  6: 'Final Four',
};

// ── Round detection from bracketPositionId ─────────────────────────────────

function detectRound(bpid: number): { round: number; roundName: string } {
  if (bpid >= 101 && bpid <= 104) return { round: 1, roundName: 'First Four' };
  if (bpid >= 201 && bpid <= 232) return { round: 2, roundName: 'Round of 64' };
  if (bpid >= 301 && bpid <= 316) return { round: 3, roundName: 'Round of 32' };
  if (bpid >= 401 && bpid <= 408) return { round: 4, roundName: 'Sweet 16' };
  if (bpid >= 501 && bpid <= 504) return { round: 5, roundName: 'Elite Eight' };
  if (bpid >= 601 && bpid <= 602) return { round: 6, roundName: 'Final Four' };
  if (bpid === 701) return { round: 7, roundName: 'Championship' };
  return { round: 0, roundName: 'Unknown' };
}

// ── Build game id from section + position ──────────────────────────────────

function makeGameId(sectionId: number, bpid: number): string {
  const region = (SECTION_REGION[sectionId] || 'unknown').toLowerCase().replace(/\s+/g, '-');
  return `${region}-${bpid}`;
}

// ── Parse API response ─────────────────────────────────────────────────────

function parseApiResponse(raw: any): BracketResponse {
  const championship = raw.championships?.[0];
  if (!championship) {
    return { regions: [], finalFour: [], championship: null, teams: [] };
  }

  const games: any[] = championship.games || [];
  const allTeams: Array<{ name: string; nameShort: string; seed: number; region: string }> = [];
  const seenTeams = new Set<string>();

  const regionMap: Record<string, BracketGame[]> = {
    East: [],
    West: [],
    South: [],
    Midwest: [],
  };
  const finalFourGames: BracketGame[] = [];
  let championshipGame: BracketGame | null = null;

  for (const g of games) {
    const bpid: number = g.bracketPositionId;
    const sectionId: number = g.sectionId;
    const { round, roundName } = detectRound(bpid);
    const regionName = SECTION_REGION[sectionId] || 'Unknown';

    // Determine the actual bracket region for regional games
    // For Elite Eight (501-504) and later, the sectionId still matches the region
    // But 501-504 have sectionId matching the original region (2-5)
    let displayRegion = regionName;
    if (sectionId === 6) {
      if (bpid === 701) displayRegion = 'Championship';
      else displayRegion = 'Final Four';
    }

    // Parse teams
    const teams: BracketTeam[] = (g.teams || []).map((t: any) => {
      const team: BracketTeam = {
        name: t.nameFull || t.nameShort || 'TBD',
        nameShort: t.nameShort || 'TBD',
        seed: t.seed || 0,
        isWinner: !!t.isWinner,
        score: t.score != null ? t.score : null,
      };

      // Collect team info for the teams array
      if (t.nameShort && t.nameShort !== 'TBD' && t.seed && !seenTeams.has(t.nameShort)) {
        seenTeams.add(t.nameShort);
        // Only track region for R64 games (most accurate region assignment)
        if (round === 2) {
          allTeams.push({
            name: t.nameFull || t.nameShort,
            nameShort: t.nameShort,
            seed: t.seed,
            region: regionName,
          });
        }
      }

      return team;
    });

    // Build score array
    let score: [number, number] | null = null;
    let winnerIndex: number | null = null;
    if (g.gameState === 'F' || g.gameState === 'I') {
      if (teams.length === 2 && teams[0].score != null && teams[1].score != null) {
        score = [teams[0].score, teams[1].score];
      }
      const wi = teams.findIndex((t: BracketTeam) => t.isWinner);
      if (wi !== -1) winnerIndex = wi;
    }

    // Build start time
    let startTime: string | null = null;
    if (g.startTimeEpoch) {
      startTime = new Date(g.startTimeEpoch * 1000).toISOString();
    } else if (g.startDate && g.startTime && g.startTime !== 'TBA') {
      startTime = `${g.startDate} ${g.startTime}`;
    }

    // feedsInto
    let feedsInto: string | null = null;
    if (g.victorBracketPositionId) {
      // Find the next game to determine its section
      const nextGame = games.find((ng: any) => ng.bracketPositionId === g.victorBracketPositionId);
      if (nextGame) {
        feedsInto = makeGameId(nextGame.sectionId, g.victorBracketPositionId);
      }
    }

    const bracketGame: BracketGame = {
      id: makeGameId(sectionId, bpid),
      round,
      roundName,
      region: displayRegion,
      gameState: g.gameState as 'P' | 'I' | 'F',
      startTime,
      score,
      winnerIndex,
      feedsInto,
      teams,
    };

    // Sort into regions
    if (sectionId === 6) {
      if (bpid === 701) {
        championshipGame = bracketGame;
      } else {
        finalFourGames.push(bracketGame);
      }
    } else if (sectionId === 1) {
      // First Four games - assign to the region their victor feeds into
      // We don't show them in a separate region; attach to their target region
      // For now, include them in a special handling at render time
      // Determine target region from victorBracketPositionId
      if (g.victorBracketPositionId) {
        const targetGame = games.find((ng: any) => ng.bracketPositionId === g.victorBracketPositionId);
        if (targetGame) {
          const targetRegion = SECTION_REGION[targetGame.sectionId];
          if (targetRegion && regionMap[targetRegion]) {
            bracketGame.region = targetRegion;
            regionMap[targetRegion].push(bracketGame);
          }
        }
      }
    } else {
      const rn = SECTION_REGION[sectionId];
      if (rn && regionMap[rn]) {
        regionMap[rn].push(bracketGame);
      }
    }
  }

  // Also collect teams from non-R64 games that weren't seen yet
  for (const g of games) {
    const sectionId: number = g.sectionId;
    if (sectionId >= 2 && sectionId <= 5) {
      const regionName = SECTION_REGION[sectionId];
      for (const t of g.teams || []) {
        if (t.nameShort && t.nameShort !== 'TBD' && t.seed && !seenTeams.has(t.nameShort)) {
          seenTeams.add(t.nameShort);
          allTeams.push({
            name: t.nameFull || t.nameShort,
            nameShort: t.nameShort,
            seed: t.seed,
            region: regionName,
          });
        }
      }
    }
  }

  // Sort games within each region by round then bracketPositionId
  for (const rn of Object.keys(regionMap)) {
    regionMap[rn].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.id.localeCompare(b.id);
    });
  }

  const regions: BracketRegion[] = ['East', 'West', 'South', 'Midwest'].map(name => ({
    name,
    games: regionMap[name] || [],
  }));

  return {
    regions,
    finalFour: finalFourGames,
    championship: championshipGame,
    teams: allTeams.sort((a, b) => a.seed - b.seed),
  };
}

// ── GET handler ────────────────────────────────────────────────────────────

export async function GET() {
  // Return cache if fresh
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    const res = await fetch(
      'https://ncaa-api.henrygd.me/brackets/basketball-men/d1/2026',
      { next: { revalidate: 60 } },
    );

    if (!res.ok) {
      throw new Error(`NCAA API returned ${res.status}`);
    }

    const raw = await res.json();
    const data = parseApiResponse(raw);

    cached = { data, ts: Date.now() };
    return Response.json(data);
  } catch (err: any) {
    console.error('[bracket] fetch error:', err.message);
    // Return stale cache if available
    if (cached) {
      return Response.json(cached.data);
    }
    return Response.json(
      { error: 'Failed to fetch bracket data', regions: [], finalFour: [], championship: null, teams: [] },
      { status: 502 },
    );
  }
}
