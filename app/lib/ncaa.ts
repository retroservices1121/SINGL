import type { MarketData } from '@/app/types';

// NCAA team name aliases for fuzzy matching
const TEAM_ALIASES: Record<string, string> = {
  'uconn': 'UConn', 'connecticut': 'UConn',
  'unc': 'North Carolina', 'n. carolina': 'North Carolina', 'tar heels': 'North Carolina',
  'duke': 'Duke', 'blue devils': 'Duke',
  'kansas': 'Kansas', 'jayhawks': 'Kansas',
  'kentucky': 'Kentucky', 'wildcats': 'Kentucky',
  'gonzaga': 'Gonzaga', 'zags': 'Gonzaga',
  'houston': 'Houston', 'cougars': 'Houston',
  'purdue': 'Purdue', 'boilermakers': 'Purdue',
  'tennessee': 'Tennessee', 'vols': 'Tennessee', 'volunteers': 'Tennessee',
  'auburn': 'Auburn', 'tigers': 'Auburn',
  'alabama': 'Alabama', 'crimson tide': 'Alabama',
  'michigan': 'Michigan', 'wolverines': 'Michigan',
  'michigan state': 'Michigan State', 'spartans': 'Michigan State',
  'ohio state': 'Ohio State', 'buckeyes': 'Ohio State',
  'iowa state': 'Iowa State', 'cyclones': 'Iowa State',
  'marquette': 'Marquette', 'golden eagles': 'Marquette',
  'st. john\'s': 'St. John\'s', 'saint john\'s': 'St. John\'s', 'st john\'s': 'St. John\'s',
  'arizona': 'Arizona',
  'baylor': 'Baylor', 'bears': 'Baylor',
  'creighton': 'Creighton', 'bluejays': 'Creighton',
  'florida': 'Florida', 'gators': 'Florida',
  'illinois': 'Illinois', 'fighting illini': 'Illinois',
  'indiana': 'Indiana', 'hoosiers': 'Indiana',
  'iowa': 'Iowa', 'hawkeyes': 'Iowa',
  'lsu': 'LSU',
  'memphis': 'Memphis',
  'missouri': 'Missouri',
  'north carolina state': 'NC State', 'nc state': 'NC State', 'n.c. state': 'NC State',
  'oregon': 'Oregon', 'ducks': 'Oregon',
  'san diego state': 'San Diego State', 'sdsu': 'San Diego State',
  'texas': 'Texas', 'longhorns': 'Texas',
  'texas tech': 'Texas Tech', 'red raiders': 'Texas Tech',
  'ucla': 'UCLA', 'bruins': 'UCLA',
  'usc': 'USC', 'trojans': 'USC',
  'villanova': 'Villanova',
  'virginia': 'Virginia', 'cavaliers': 'Virginia',
  'wisconsin': 'Wisconsin', 'badgers': 'Wisconsin',
  'xavier': 'Xavier',
  'clemson': 'Clemson',
  'colorado state': 'Colorado State',
  'dayton': 'Dayton',
  'drake': 'Drake',
  'grand canyon': 'Grand Canyon',
  'james madison': 'James Madison',
  'mcneese': 'McNeese', 'mcneese state': 'McNeese',
  'morehead state': 'Morehead State',
  'oakland': 'Oakland',
  'samford': 'Samford',
  'stetson': 'Stetson',
  'vermont': 'Vermont',
  'wagner': 'Wagner',
  'yale': 'Yale',
};

export type RoundCode = 'R64' | 'R32' | 'S16' | 'E8' | 'F4' | 'CHAMP' | 'WINNER';
export type MarketType = 'winner' | 'advancement' | 'matchup' | 'elimination' | 'unknown';

export interface ParsedMarket extends MarketData {
  teamName: string | null;
  teams: string[];
  round: RoundCode | null;
  marketType: MarketType;
}

export interface TeamProfile {
  name: string;
  seed?: number;
  region?: string;
  championshipOdds: number | null;
  currentRoundOdds: number | null;
  currentRound: string | null;
  nextOpponent: string | null;
  markets: ParsedMarket[];
  championshipMarket: ParsedMarket | null;
  sparkline?: number[];
}

// Extract team name from market title
function extractTeamName(title: string): string | null {
  // Pattern: "Will {Team} win the 2026 NCAA Tournament?"
  let match = title.match(/^Will (.+?) win the \d{4} NCAA/i);
  if (match) return normalizeTeam(match[1]);

  // Pattern: "Will {Team} make the Sweet 16/Elite Eight/Final Four?"
  match = title.match(/^Will (.+?) make the /i);
  if (match) return normalizeTeam(match[1]);

  // Pattern: "Will {Team} be eliminated"
  match = title.match(/^Will (.+?) be eliminated/i);
  if (match) return normalizeTeam(match[1]);

  // Pattern: "{Team} to win"
  match = title.match(/^(.+?) to win/i);
  if (match) return normalizeTeam(match[1]);

  return null;
}

// Extract both teams from matchup title
function extractMatchupTeams(title: string): [string, string] | null {
  // Pattern: "{Team} vs {Team}" or "{Team} vs. {Team}"
  const match = title.match(/^(.+?)\s+vs\.?\s+(.+?)$/i);
  if (match) {
    const t1 = normalizeTeam(match[1].trim());
    const t2 = normalizeTeam(match[2].trim());
    if (t1 && t2) return [t1, t2];
  }
  return null;
}

function normalizeTeam(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (TEAM_ALIASES[lower]) return TEAM_ALIASES[lower];

  // Try partial matching
  for (const [alias, canonical] of Object.entries(TEAM_ALIASES)) {
    if (lower.includes(alias) || alias.includes(lower)) return canonical;
  }

  // Return cleaned up original
  return raw.trim();
}

function detectRound(title: string): RoundCode | null {
  const t = title.toLowerCase();
  if (t.includes('win the') && (t.includes('ncaa tournament') || t.includes('championship'))) return 'WINNER';
  if (t.includes('final four')) return 'F4';
  if (t.includes('elite eight') || t.includes('elite 8')) return 'E8';
  if (t.includes('sweet 16') || t.includes('sweet sixteen')) return 'S16';
  if (t.includes('round of 32')) return 'R32';
  if (t.includes('round of 64')) return 'R64';
  return null;
}

function detectMarketType(title: string): MarketType {
  const t = title.toLowerCase();
  if (t.includes('win the') && (t.includes('tournament') || t.includes('championship'))) return 'winner';
  if (t.includes('make the') || t.includes('advance')) return 'advancement';
  if (t.includes(' vs')) return 'matchup';
  if (t.includes('eliminated')) return 'elimination';
  return 'unknown';
}

export function parseMarkets(markets: MarketData[]): ParsedMarket[] {
  return markets.map(m => {
    const marketType = detectMarketType(m.title);
    const round = detectRound(m.title);
    let teamName = extractTeamName(m.title);
    let teams: string[] = [];

    if (marketType === 'matchup') {
      const matchup = extractMatchupTeams(m.title);
      if (matchup) {
        teams = matchup;
        teamName = matchup[0];
      }
    } else if (teamName) {
      teams = [teamName];
    }

    return { ...m, teamName, teams, round, marketType };
  });
}

export function buildTeamProfiles(parsedMarkets: ParsedMarket[]): TeamProfile[] {
  const teamMap = new Map<string, TeamProfile>();

  for (const m of parsedMarkets) {
    for (const team of m.teams) {
      if (!teamMap.has(team)) {
        teamMap.set(team, {
          name: team,
          championshipOdds: null,
          currentRoundOdds: null,
          currentRound: null,
          nextOpponent: null,
          markets: [],
          championshipMarket: null,
        });
      }
      const profile = teamMap.get(team)!;
      profile.markets.push(m);

      if (m.marketType === 'winner') {
        profile.championshipOdds = m.yesPrice;
        profile.championshipMarket = m;
      }

      if (m.marketType === 'advancement' && m.round) {
        // Keep the most advanced round
        const roundOrder: Record<string, number> = { R64: 1, R32: 2, S16: 3, E8: 4, F4: 5, CHAMP: 6, WINNER: 7 };
        const existing = profile.currentRound ? roundOrder[profile.currentRound] || 0 : 0;
        const incoming = roundOrder[m.round] || 0;
        if (incoming > existing) {
          profile.currentRoundOdds = m.yesPrice;
          profile.currentRound = m.round;
        }
      }

      if (m.marketType === 'matchup' && m.teams.length === 2) {
        const opponent = m.teams.find(t => t !== team);
        if (opponent) profile.nextOpponent = opponent;
      }
    }
  }

  // Sort by championship odds descending
  return Array.from(teamMap.values())
    .filter(t => t.championshipOdds !== null || t.markets.length > 0)
    .sort((a, b) => (b.championshipOdds || 0) - (a.championshipOdds || 0));
}

// Extract seed from market description (rulesPrimary)
export function extractSeedFromDescription(description: string | null): number | null {
  if (!description) return null;
  const match = description.match(/\((\d{1,2})\s*seed\)/i) || description.match(/(\d{1,2})-seed/i);
  return match ? parseInt(match[1]) : null;
}
