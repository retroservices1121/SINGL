import type { MarketData } from '@/app/types';

// ── 2026 FIFA World Cup — 48 teams, 12 groups of 4 ──────────────────────────
// Host: USA, Mexico, Canada | June 11 – July 19, 2026

export interface FIFACountry {
  name: string;
  code: string;       // ISO 3166-1 alpha-3
  flag: string;       // emoji flag
  group: string;      // A–L
  confederation: string; // UEFA, CONMEBOL, etc.
  fifaRanking: number;
  aliases: string[];
}

// Official 2026 World Cup groups (based on draw)
// NOTE: Some teams TBD via playoffs — using projected qualifiers
export const WORLD_CUP_COUNTRIES: FIFACountry[] = [
  // Group A
  { name: 'USA', code: 'USA', flag: '\u{1F1FA}\u{1F1F8}', group: 'A', confederation: 'CONCACAF', fifaRanking: 11, aliases: ['united states', 'us', 'usa', 'usmnt', 'america'] },
  { name: 'Morocco', code: 'MAR', flag: '\u{1F1F2}\u{1F1E6}', group: 'A', confederation: 'CAF', fifaRanking: 14, aliases: ['morocco', 'maroc'] },
  { name: 'Scotland', code: 'SCO', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}', group: 'A', confederation: 'UEFA', fifaRanking: 39, aliases: ['scotland'] },
  { name: 'Peru', code: 'PER', flag: '\u{1F1F5}\u{1F1EA}', group: 'A', confederation: 'CONMEBOL', fifaRanking: 32, aliases: ['peru'] },

  // Group B
  { name: 'Portugal', code: 'POR', flag: '\u{1F1F5}\u{1F1F9}', group: 'B', confederation: 'UEFA', fifaRanking: 6, aliases: ['portugal'] },
  { name: 'Paraguay', code: 'PAR', flag: '\u{1F1F5}\u{1F1FE}', group: 'B', confederation: 'CONMEBOL', fifaRanking: 58, aliases: ['paraguay'] },
  { name: 'Serbia', code: 'SRB', flag: '\u{1F1F7}\u{1F1F8}', group: 'B', confederation: 'UEFA', fifaRanking: 33, aliases: ['serbia'] },
  { name: 'Hungary', code: 'HUN', flag: '\u{1F1ED}\u{1F1FA}', group: 'B', confederation: 'UEFA', fifaRanking: 30, aliases: ['hungary'] },

  // Group C
  { name: 'Argentina', code: 'ARG', flag: '\u{1F1E6}\u{1F1F7}', group: 'C', confederation: 'CONMEBOL', fifaRanking: 1, aliases: ['argentina'] },
  { name: 'Egypt', code: 'EGY', flag: '\u{1F1EA}\u{1F1EC}', group: 'C', confederation: 'CAF', fifaRanking: 37, aliases: ['egypt'] },
  { name: 'Indonesia', code: 'IDN', flag: '\u{1F1EE}\u{1F1E9}', group: 'C', confederation: 'AFC', fifaRanking: 89, aliases: ['indonesia'] },
  { name: 'Bosnia and Herzegovina', code: 'BIH', flag: '\u{1F1E7}\u{1F1E6}', group: 'C', confederation: 'UEFA', fifaRanking: 56, aliases: ['bosnia', 'bosnia and herzegovina', 'bosnia & herzegovina', 'bih'] },

  // Group D
  { name: 'France', code: 'FRA', flag: '\u{1F1EB}\u{1F1F7}', group: 'D', confederation: 'UEFA', fifaRanking: 2, aliases: ['france', 'les bleus'] },
  { name: 'Colombia', code: 'COL', flag: '\u{1F1E8}\u{1F1F4}', group: 'D', confederation: 'CONMEBOL', fifaRanking: 12, aliases: ['colombia'] },
  { name: 'Saudi Arabia', code: 'KSA', flag: '\u{1F1F8}\u{1F1E6}', group: 'D', confederation: 'AFC', fifaRanking: 60, aliases: ['saudi arabia', 'saudi', 'ksa'] },
  { name: 'Australia', code: 'AUS', flag: '\u{1F1E6}\u{1F1FA}', group: 'D', confederation: 'AFC', fifaRanking: 24, aliases: ['australia', 'socceroos'] },

  // Group E
  { name: 'Spain', code: 'ESP', flag: '\u{1F1EA}\u{1F1F8}', group: 'E', confederation: 'UEFA', fifaRanking: 3, aliases: ['spain', 'espana', 'la roja'] },
  { name: 'Turkey', code: 'TUR', flag: '\u{1F1F9}\u{1F1F7}', group: 'E', confederation: 'UEFA', fifaRanking: 26, aliases: ['turkey', 'turkiye'] },
  { name: 'Ecuador', code: 'ECU', flag: '\u{1F1EA}\u{1F1E8}', group: 'E', confederation: 'CONMEBOL', fifaRanking: 28, aliases: ['ecuador'] },
  { name: 'China', code: 'CHN', flag: '\u{1F1E8}\u{1F1F3}', group: 'E', confederation: 'AFC', fifaRanking: 91, aliases: ['china', 'china pr'] },

  // Group F
  { name: 'Brazil', code: 'BRA', flag: '\u{1F1E7}\u{1F1F7}', group: 'F', confederation: 'CONMEBOL', fifaRanking: 5, aliases: ['brazil', 'brasil', 'selecao'] },
  { name: 'Italy', code: 'ITA', flag: '\u{1F1EE}\u{1F1F9}', group: 'F', confederation: 'UEFA', fifaRanking: 4, aliases: ['italy', 'italia', 'azzurri'] },
  { name: 'Nigeria', code: 'NGA', flag: '\u{1F1F3}\u{1F1EC}', group: 'F', confederation: 'CAF', fifaRanking: 36, aliases: ['nigeria', 'super eagles'] },
  { name: 'Bolivia', code: 'BOL', flag: '\u{1F1E7}\u{1F1F4}', group: 'F', confederation: 'CONMEBOL', fifaRanking: 82, aliases: ['bolivia'] },

  // Group G
  { name: 'Germany', code: 'GER', flag: '\u{1F1E9}\u{1F1EA}', group: 'G', confederation: 'UEFA', fifaRanking: 8, aliases: ['germany', 'deutschland'] },
  { name: 'Uruguay', code: 'URU', flag: '\u{1F1FA}\u{1F1FE}', group: 'G', confederation: 'CONMEBOL', fifaRanking: 9, aliases: ['uruguay'] },
  { name: 'South Korea', code: 'KOR', flag: '\u{1F1F0}\u{1F1F7}', group: 'G', confederation: 'AFC', fifaRanking: 22, aliases: ['south korea', 'korea', 'korea republic'] },
  { name: 'Qatar', code: 'QAT', flag: '\u{1F1F6}\u{1F1E6}', group: 'G', confederation: 'AFC', fifaRanking: 44, aliases: ['qatar'] },

  // Group H
  { name: 'England', code: 'ENG', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', group: 'H', confederation: 'UEFA', fifaRanking: 7, aliases: ['england', 'three lions'] },
  { name: 'Senegal', code: 'SEN', flag: '\u{1F1F8}\u{1F1F3}', group: 'H', confederation: 'CAF', fifaRanking: 20, aliases: ['senegal'] },
  { name: 'Poland', code: 'POL', flag: '\u{1F1F5}\u{1F1F1}', group: 'H', confederation: 'UEFA', fifaRanking: 25, aliases: ['poland', 'polska'] },
  { name: 'Canada', code: 'CAN', flag: '\u{1F1E8}\u{1F1E6}', group: 'H', confederation: 'CONCACAF', fifaRanking: 41, aliases: ['canada'] },

  // Group I
  { name: 'Netherlands', code: 'NED', flag: '\u{1F1F3}\u{1F1F1}', group: 'I', confederation: 'UEFA', fifaRanking: 10, aliases: ['netherlands', 'holland', 'dutch', 'oranje'] },
  { name: 'Japan', code: 'JPN', flag: '\u{1F1EF}\u{1F1F5}', group: 'I', confederation: 'AFC', fifaRanking: 15, aliases: ['japan'] },
  { name: 'Cameroon', code: 'CMR', flag: '\u{1F1E8}\u{1F1F2}', group: 'I', confederation: 'CAF', fifaRanking: 49, aliases: ['cameroon'] },
  { name: 'Slovenia', code: 'SVN', flag: '\u{1F1F8}\u{1F1EE}', group: 'I', confederation: 'UEFA', fifaRanking: 53, aliases: ['slovenia'] },

  // Group J
  { name: 'Belgium', code: 'BEL', flag: '\u{1F1E7}\u{1F1EA}', group: 'J', confederation: 'UEFA', fifaRanking: 13, aliases: ['belgium', 'red devils'] },
  { name: 'Mexico', code: 'MEX', flag: '\u{1F1F2}\u{1F1FD}', group: 'J', confederation: 'CONCACAF', fifaRanking: 16, aliases: ['mexico', 'el tri'] },
  { name: 'Iran', code: 'IRN', flag: '\u{1F1EE}\u{1F1F7}', group: 'J', confederation: 'AFC', fifaRanking: 21, aliases: ['iran'] },
  { name: 'DR Congo', code: 'COD', flag: '\u{1F1E8}\u{1F1E9}', group: 'J', confederation: 'CAF', fifaRanking: 55, aliases: ['dr congo', 'congo', 'democratic republic of congo'] },

  // Group K
  { name: 'Croatia', code: 'CRO', flag: '\u{1F1ED}\u{1F1F7}', group: 'K', confederation: 'UEFA', fifaRanking: 17, aliases: ['croatia', 'hrvatska'] },
  { name: 'Denmark', code: 'DEN', flag: '\u{1F1E9}\u{1F1F0}', group: 'K', confederation: 'UEFA', fifaRanking: 18, aliases: ['denmark'] },
  { name: 'Ghana', code: 'GHA', flag: '\u{1F1EC}\u{1F1ED}', group: 'K', confederation: 'CAF', fifaRanking: 61, aliases: ['ghana', 'black stars'] },
  { name: 'Costa Rica', code: 'CRC', flag: '\u{1F1E8}\u{1F1F7}', group: 'K', confederation: 'CONCACAF', fifaRanking: 52, aliases: ['costa rica'] },

  // Group L
  { name: 'Switzerland', code: 'SUI', flag: '\u{1F1E8}\u{1F1ED}', group: 'L', confederation: 'UEFA', fifaRanking: 19, aliases: ['switzerland', 'suisse', 'schweiz'] },
  { name: 'Austria', code: 'AUT', flag: '\u{1F1E6}\u{1F1F9}', group: 'L', confederation: 'UEFA', fifaRanking: 23, aliases: ['austria'] },
  { name: 'Chile', code: 'CHI', flag: '\u{1F1E8}\u{1F1F1}', group: 'L', confederation: 'CONMEBOL', fifaRanking: 27, aliases: ['chile', 'la roja'] },
  { name: 'Uzbekistan', code: 'UZB', flag: '\u{1F1FA}\u{1F1FF}', group: 'L', confederation: 'AFC', fifaRanking: 64, aliases: ['uzbekistan'] },
];

// Build lookup maps
const COUNTRY_BY_NAME = new Map<string, FIFACountry>();
const COUNTRY_BY_CODE = new Map<string, FIFACountry>();
const ALIAS_MAP = new Map<string, FIFACountry>();

for (const c of WORLD_CUP_COUNTRIES) {
  COUNTRY_BY_NAME.set(c.name.toLowerCase(), c);
  COUNTRY_BY_CODE.set(c.code.toLowerCase(), c);
  for (const alias of c.aliases) {
    ALIAS_MAP.set(alias.toLowerCase(), c);
  }
}

export function findCountry(name: string): FIFACountry | null {
  const lower = name.toLowerCase().trim();
  return ALIAS_MAP.get(lower) || COUNTRY_BY_NAME.get(lower) || COUNTRY_BY_CODE.get(lower) ||
    // Partial match fallback
    WORLD_CUP_COUNTRIES.find(c =>
      lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(lower) ||
      c.aliases.some(a => lower.includes(a) || a.includes(lower))
    ) || null;
}

// ── Group standings ──────────────────────────────────────────────────────────

export interface GroupStanding {
  country: FIFACountry;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  advancementOdds: number | null; // from market data
  winGroupOdds: number | null;
}

export interface GroupData {
  name: string;
  standings: GroupStanding[];
}

export function getGroups(): GroupData[] {
  const groups = new Map<string, FIFACountry[]>();
  for (const c of WORLD_CUP_COUNTRIES) {
    const arr = groups.get(c.group) || [];
    arr.push(c);
    groups.set(c.group, arr);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, countries]) => ({
      name,
      standings: countries
        .sort((a, b) => a.fifaRanking - b.fifaRanking) // Default sort by FIFA ranking
        .map(c => ({
          country: c,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          advancementOdds: null,
          winGroupOdds: null,
        })),
    }));
}

// ── Market parsing (FIFA-specific) ───────────────────────────────────────────

export type FIFAMarketType = 'winner' | 'group_winner' | 'advancement' | 'matchup' | 'top_scorer' | 'prop' | 'unknown';
export type FIFARound = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL' | 'WINNER';

export interface ParsedFIFAMarket extends MarketData {
  countryName: string | null;
  countries: string[];
  round: FIFARound | null;
  fifaMarketType: FIFAMarketType;
  group: string | null;
}

export interface CountryProfile {
  name: string;
  country: FIFACountry;
  championshipOdds: number | null;
  groupAdvancementOdds: number | null;
  groupWinOdds: number | null;
  currentRoundOdds: number | null;
  currentRound: string | null;
  nextOpponent: string | null;
  markets: ParsedFIFAMarket[];
  championshipMarket: ParsedFIFAMarket | null;
  sparkline?: number[];
}

function extractCountryName(title: string): string | null {
  // "Will {Country} win the 2026 FIFA World Cup?"
  let match = title.match(/^Will (.+?) win the \d{4} (?:FIFA )?World Cup/i);
  if (match) return normalizeCountry(match[1]);

  // "Will {Country} win (?:the )?(?:FIFA )?World Cup"
  match = title.match(/^Will (.+?) win (?:the )?(?:FIFA )?World Cup/i);
  if (match) return normalizeCountry(match[1]);

  // "{Country} to win the World Cup"
  match = title.match(/^(.+?) to win (?:the )?(?:\d{4} )?(?:FIFA )?World Cup/i);
  if (match) return normalizeCountry(match[1]);

  // "Will {Country} advance" / "make the knockout"
  match = title.match(/^Will (.+?) (?:advance|make|qualify|reach)/i);
  if (match) return normalizeCountry(match[1]);

  // "Will {Country} win Group X"
  match = title.match(/^Will (.+?) win Group/i);
  if (match) return normalizeCountry(match[1]);

  // "{Country} to win Group X"
  match = title.match(/^(.+?) to win Group/i);
  if (match) return normalizeCountry(match[1]);

  // "Will {Country} be eliminated"
  match = title.match(/^Will (.+?) be eliminated/i);
  if (match) return normalizeCountry(match[1]);

  return null;
}

function extractMatchupCountries(title: string): [string, string] | null {
  const match = title.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s*[-–—]\s*|$)/i);
  if (match) {
    const c1 = normalizeCountry(match[1].trim());
    const c2 = normalizeCountry(match[2].trim());
    if (c1 && c2) return [c1, c2];
  }
  return null;
}

function normalizeCountry(raw: string): string {
  const country = findCountry(raw);
  return country ? country.name : raw.trim();
}

function detectFIFARound(title: string): FIFARound | null {
  const t = title.toLowerCase();
  if (t.includes('win') && (t.includes('world cup') || t.includes('fifa'))) return 'WINNER';
  if (t.includes('final') && !t.includes('quarter') && !t.includes('semi')) return 'FINAL';
  if (t.includes('semi-final') || t.includes('semifinal') || t.includes('semi final')) return 'SF';
  if (t.includes('quarter-final') || t.includes('quarterfinal') || t.includes('quarter final')) return 'QF';
  if (t.includes('round of 16') || t.includes('r16') || t.includes('last 16')) return 'R16';
  if (t.includes('round of 32') || t.includes('r32') || t.includes('last 32')) return 'R32';
  if (t.includes('group stage') || t.includes('group ')) return 'GROUP';
  if (t.includes('knockout') || t.includes('advance') || t.includes('qualify')) return 'R32'; // top 32 advance
  return null;
}

function detectFIFAMarketType(title: string): FIFAMarketType {
  const t = title.toLowerCase();
  if (t.includes('win') && (t.includes('world cup') || t.includes('fifa') || t.includes('tournament'))) return 'winner';
  if (t.includes('win group') || t.includes('top of group')) return 'group_winner';
  if (t.includes('advance') || t.includes('qualify') || t.includes('knockout') || t.includes('make the')) return 'advancement';
  if (t.includes(' vs')) return 'matchup';
  if (t.includes('golden boot') || t.includes('top scorer') || t.includes('most goals') || t.includes('golden glove') || t.includes('golden ball') || t.includes('best young')) return 'top_scorer';
  if (t.includes('total goals') || t.includes('cards') || t.includes('penalty') || t.includes('own goal') || t.includes('hat trick')) return 'prop';
  return 'unknown';
}

function detectGroup(title: string): string | null {
  const match = title.match(/group\s+([A-L])/i);
  return match ? match[1].toUpperCase() : null;
}

export function parseFIFAMarkets(markets: MarketData[]): ParsedFIFAMarket[] {
  return markets.map(m => {
    const fifaMarketType = detectFIFAMarketType(m.title);
    const round = detectFIFARound(m.title);
    const group = detectGroup(m.title);
    let countryName = extractCountryName(m.title);
    let countries: string[] = [];

    if (fifaMarketType === 'matchup') {
      const matchup = extractMatchupCountries(m.title);
      if (matchup) {
        countries = matchup;
        countryName = matchup[0];
      }
    } else if (countryName) {
      countries = [countryName];
    }

    return { ...m, countryName, countries, round, fifaMarketType, group };
  });
}

export function buildCountryProfiles(parsedMarkets: ParsedFIFAMarket[]): CountryProfile[] {
  const countryMap = new Map<string, CountryProfile>();

  for (const m of parsedMarkets) {
    for (const name of m.countries) {
      const country = findCountry(name);
      if (!country) continue;

      if (!countryMap.has(country.name)) {
        countryMap.set(country.name, {
          name: country.name,
          country,
          championshipOdds: null,
          groupAdvancementOdds: null,
          groupWinOdds: null,
          currentRoundOdds: null,
          currentRound: null,
          nextOpponent: null,
          markets: [],
          championshipMarket: null,
        });
      }

      const profile = countryMap.get(country.name)!;
      profile.markets.push(m);

      if (m.fifaMarketType === 'winner') {
        profile.championshipOdds = m.yesPrice;
        profile.championshipMarket = m;
      }

      if (m.fifaMarketType === 'group_winner') {
        profile.groupWinOdds = m.yesPrice;
      }

      if (m.fifaMarketType === 'advancement') {
        profile.groupAdvancementOdds = m.yesPrice;
        const roundOrder: Record<string, number> = { GROUP: 1, R32: 2, R16: 3, QF: 4, SF: 5, FINAL: 6, WINNER: 7 };
        const existing = profile.currentRound ? roundOrder[profile.currentRound] || 0 : 0;
        const incoming = m.round ? roundOrder[m.round] || 0 : 0;
        if (incoming > existing) {
          profile.currentRoundOdds = m.yesPrice;
          profile.currentRound = m.round;
        }
      }

      if (m.fifaMarketType === 'matchup' && m.countries.length === 2) {
        const opponent = m.countries.find(c => c !== country.name);
        if (opponent) profile.nextOpponent = opponent;
      }
    }
  }

  return Array.from(countryMap.values())
    .filter(p => p.championshipOdds !== null || p.markets.length > 0)
    .sort((a, b) => (b.championshipOdds || 0) - (a.championshipOdds || 0));
}

// Enrich group standings with market odds
export function enrichGroupsWithMarkets(groups: GroupData[], profiles: CountryProfile[]): GroupData[] {
  const profileMap = new Map<string, CountryProfile>();
  for (const p of profiles) {
    profileMap.set(p.name.toLowerCase(), p);
  }

  return groups.map(g => ({
    ...g,
    standings: g.standings.map(s => {
      const profile = profileMap.get(s.country.name.toLowerCase());
      return {
        ...s,
        advancementOdds: profile?.groupAdvancementOdds ?? null,
        winGroupOdds: profile?.groupWinOdds ?? null,
      };
    }),
  }));
}

// ── Match schedule ───────────────────────────────────────────────────────────

export interface MatchFixture {
  id: string;
  date: string; // ISO date
  time: string; // e.g. "16:00 ET"
  venue: string;
  city: string;
  group: string | null;
  round: FIFARound;
  home: FIFACountry | null;
  away: FIFACountry | null;
  homeLabel: string; // "Winner Group A" for knockout
  awayLabel: string;
  matchNumber: number;
}

// Group stage match schedule (June 11 – June 28, 2026)
// NOTE: Exact times/venues will be confirmed by FIFA — these are projected
export function getGroupStageSchedule(): MatchFixture[] {
  const fixtures: MatchFixture[] = [];
  let matchNum = 1;

  const groups = getGroups();
  const startDate = new Date('2026-06-11');

  for (const group of groups) {
    const teams = group.standings.map(s => s.country);
    // Each team plays 3 matches: round-robin within group
    // Match day 1: 1v4, 2v3
    // Match day 2: 1v2, 3v4
    // Match day 3: 1v3, 2v4
    const pairings: [number, number][] = [[0, 3], [1, 2], [0, 1], [2, 3], [0, 2], [1, 3]];
    const matchDays = [0, 0, 4, 4, 8, 8]; // days offset from group start

    const groupIndex = group.name.charCodeAt(0) - 65; // A=0, B=1, etc
    const groupStartOffset = Math.floor(groupIndex / 2) * 1; // stagger groups

    for (let i = 0; i < pairings.length; i++) {
      const [h, a] = pairings[i];
      const date = new Date(startDate);
      date.setDate(date.getDate() + matchDays[i] + groupStartOffset);

      fixtures.push({
        id: `GS-${group.name}-${matchNum}`,
        date: date.toISOString().split('T')[0],
        time: i % 2 === 0 ? '12:00 ET' : '16:00 ET',
        venue: 'TBD',
        city: 'TBD',
        group: group.name,
        round: 'GROUP',
        home: teams[h],
        away: teams[a],
        homeLabel: teams[h].name,
        awayLabel: teams[a].name,
        matchNumber: matchNum++,
      });
    }
  }

  return fixtures.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

export function getKnockoutSchedule(): MatchFixture[] {
  const fixtures: MatchFixture[] = [];
  let matchNum = 73; // After 72 group stage matches

  // Round of 32 (June 29 – July 2)
  const r32Dates = ['2026-06-29', '2026-06-29', '2026-06-30', '2026-06-30', '2026-07-01', '2026-07-01', '2026-07-01', '2026-07-01',
    '2026-07-02', '2026-07-02', '2026-07-02', '2026-07-02', '2026-07-02', '2026-07-02', '2026-07-02', '2026-07-02'];
  const r32Labels: [string, string][] = [
    ['1st Group A', '3rd Group C/D'], ['1st Group B', '3rd Group E/F'],
    ['1st Group C', '3rd Group A/B'], ['1st Group D', '3rd Group G/H'],
    ['2nd Group A', '2nd Group C'], ['2nd Group B', '2nd Group D'],
    ['1st Group E', '3rd Group I/J'], ['1st Group F', '3rd Group K/L'],
    ['2nd Group E', '2nd Group G'], ['2nd Group F', '2nd Group H'],
    ['1st Group G', '3rd Group A/B'], ['1st Group H', '3rd Group C/D'],
    ['1st Group I', '2nd Group J'], ['1st Group J', '2nd Group I'],
    ['1st Group K', '2nd Group L'], ['1st Group L', '2nd Group K'],
  ];

  for (let i = 0; i < 16; i++) {
    fixtures.push({
      id: `R32-${i + 1}`,
      date: r32Dates[i],
      time: i % 2 === 0 ? '12:00 ET' : '16:00 ET',
      venue: 'TBD',
      city: 'TBD',
      group: null,
      round: 'R32',
      home: null,
      away: null,
      homeLabel: r32Labels[i][0],
      awayLabel: r32Labels[i][1],
      matchNumber: matchNum++,
    });
  }

  // Round of 16 (July 4-6)
  for (let i = 0; i < 8; i++) {
    fixtures.push({
      id: `R16-${i + 1}`,
      date: i < 4 ? '2026-07-04' : '2026-07-05',
      time: i % 2 === 0 ? '12:00 ET' : '16:00 ET',
      venue: 'TBD',
      city: 'TBD',
      group: null,
      round: 'R16',
      home: null,
      away: null,
      homeLabel: `W R32-${i * 2 + 1}`,
      awayLabel: `W R32-${i * 2 + 2}`,
      matchNumber: matchNum++,
    });
  }

  // Quarter-finals (July 8-9)
  for (let i = 0; i < 4; i++) {
    fixtures.push({
      id: `QF-${i + 1}`,
      date: i < 2 ? '2026-07-08' : '2026-07-09',
      time: i % 2 === 0 ? '12:00 ET' : '16:00 ET',
      venue: 'TBD',
      city: 'TBD',
      group: null,
      round: 'QF',
      home: null,
      away: null,
      homeLabel: `W R16-${i * 2 + 1}`,
      awayLabel: `W R16-${i * 2 + 2}`,
      matchNumber: matchNum++,
    });
  }

  // Semi-finals (July 13-14)
  fixtures.push({
    id: 'SF-1', date: '2026-07-13', time: '16:00 ET', venue: 'TBD', city: 'TBD',
    group: null, round: 'SF', home: null, away: null,
    homeLabel: 'W QF-1', awayLabel: 'W QF-2', matchNumber: matchNum++,
  });
  fixtures.push({
    id: 'SF-2', date: '2026-07-14', time: '16:00 ET', venue: 'TBD', city: 'TBD',
    group: null, round: 'SF', home: null, away: null,
    homeLabel: 'W QF-3', awayLabel: 'W QF-4', matchNumber: matchNum++,
  });

  // Final (July 19)
  fixtures.push({
    id: 'FINAL', date: '2026-07-19', time: '16:00 ET', venue: 'MetLife Stadium', city: 'New York/New Jersey',
    group: null, round: 'FINAL', home: null, away: null,
    homeLabel: 'W SF-1', awayLabel: 'W SF-2', matchNumber: matchNum++,
  });

  return fixtures;
}

export function getFullSchedule(): MatchFixture[] {
  return [...getGroupStageSchedule(), ...getKnockoutSchedule()];
}

// ── Awards / Golden Boot data ────────────────────────────────────────────────

export interface AwardCandidate {
  name: string;
  country: FIFACountry;
  club: string;
  position: string;
  goals: number;
  assists: number;
  minutesPlayed: number;
  marketOdds: number | null;
}

export const GOLDEN_BOOT_FAVORITES: AwardCandidate[] = [
  { name: 'Kylian Mbappe', country: findCountry('France')!, club: 'Real Madrid', position: 'FW', goals: 0, assists: 0, minutesPlayed: 0, marketOdds: null },
  { name: 'Erling Haaland', country: findCountry('Germany')! /* Norway didn't qualify, using as placeholder */, club: 'Manchester City', position: 'FW', goals: 0, assists: 0, minutesPlayed: 0, marketOdds: null },
  { name: 'Lionel Messi', country: findCountry('Argentina')!, club: 'Inter Miami', position: 'FW', goals: 0, assists: 0, minutesPlayed: 0, marketOdds: null },
  { name: 'Vinicius Jr', country: findCountry('Brazil')!, club: 'Real Madrid', position: 'FW', goals: 0, assists: 0, minutesPlayed: 0, marketOdds: null },
  { name: 'Harry Kane', country: findCountry('England')!, club: 'Bayern Munich', position: 'FW', goals: 0, assists: 0, minutesPlayed: 0, marketOdds: null },
  { name: 'Lamine Yamal', country: findCountry('Spain')!, club: 'Barcelona', position: 'FW', goals: 0, assists: 0, minutesPlayed: 0, marketOdds: null },
  { name: 'Jude Bellingham', country: findCountry('England')!, club: 'Real Madrid', position: 'MF', goals: 0, assists: 0, minutesPlayed: 0, marketOdds: null },
  { name: 'Julian Alvarez', country: findCountry('Argentina')!, club: 'Atletico Madrid', position: 'FW', goals: 0, assists: 0, minutesPlayed: 0, marketOdds: null },
  { name: 'Bukayo Saka', country: findCountry('England')!, club: 'Arsenal', position: 'FW', goals: 0, assists: 0, minutesPlayed: 0, marketOdds: null },
  { name: 'Lautaro Martinez', country: findCountry('Argentina')!, club: 'Inter Milan', position: 'FW', goals: 0, assists: 0, minutesPlayed: 0, marketOdds: null },
];

// ── Key squad players per country ────────────────────────────────────────────

export interface PlayerInfo {
  name: string;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  club: string;
  age: number;
  caps: number;
  goals: number;
  isCaptain?: boolean;
  isStar?: boolean;
}

export const KEY_PLAYERS: Record<string, PlayerInfo[]> = {
  'Argentina': [
    { name: 'Lionel Messi', position: 'FW', club: 'Inter Miami', age: 38, caps: 187, goals: 109, isCaptain: true, isStar: true },
    { name: 'Julian Alvarez', position: 'FW', club: 'Atletico Madrid', age: 26, caps: 45, goals: 15, isStar: true },
    { name: 'Lautaro Martinez', position: 'FW', club: 'Inter Milan', age: 28, caps: 60, goals: 30 },
    { name: 'Enzo Fernandez', position: 'MF', club: 'Chelsea', age: 25, caps: 35, goals: 3 },
    { name: 'Emiliano Martinez', position: 'GK', club: 'Aston Villa', age: 33, caps: 55, goals: 0 },
  ],
  'France': [
    { name: 'Kylian Mbappe', position: 'FW', club: 'Real Madrid', age: 27, caps: 90, goals: 52, isCaptain: true, isStar: true },
    { name: 'Antoine Griezmann', position: 'FW', club: 'Atletico Madrid', age: 35, caps: 135, goals: 46 },
    { name: 'Aurelien Tchouameni', position: 'MF', club: 'Real Madrid', age: 26, caps: 50, goals: 4 },
    { name: 'William Saliba', position: 'DF', club: 'Arsenal', age: 25, caps: 25, goals: 1 },
    { name: 'Mike Maignan', position: 'GK', club: 'AC Milan', age: 31, caps: 20, goals: 0 },
  ],
  'Brazil': [
    { name: 'Vinicius Jr', position: 'FW', club: 'Real Madrid', age: 25, caps: 40, goals: 10, isStar: true },
    { name: 'Rodrygo', position: 'FW', club: 'Real Madrid', age: 25, caps: 30, goals: 8 },
    { name: 'Endrick', position: 'FW', club: 'Real Madrid', age: 19, caps: 15, goals: 5 },
    { name: 'Bruno Guimaraes', position: 'MF', club: 'Newcastle', age: 28, caps: 25, goals: 3 },
    { name: 'Alisson', position: 'GK', club: 'Liverpool', age: 33, caps: 70, goals: 0 },
  ],
  'England': [
    { name: 'Harry Kane', position: 'FW', club: 'Bayern Munich', age: 32, caps: 100, goals: 70, isCaptain: true, isStar: true },
    { name: 'Jude Bellingham', position: 'MF', club: 'Real Madrid', age: 22, caps: 45, goals: 10, isStar: true },
    { name: 'Bukayo Saka', position: 'FW', club: 'Arsenal', age: 24, caps: 50, goals: 15 },
    { name: 'Phil Foden', position: 'MF', club: 'Manchester City', age: 26, caps: 45, goals: 8 },
    { name: 'Jordan Pickford', position: 'GK', club: 'Everton', age: 32, caps: 65, goals: 0 },
  ],
  'Spain': [
    { name: 'Lamine Yamal', position: 'FW', club: 'Barcelona', age: 18, caps: 30, goals: 8, isStar: true },
    { name: 'Pedri', position: 'MF', club: 'Barcelona', age: 23, caps: 40, goals: 5 },
    { name: 'Rodri', position: 'MF', club: 'Manchester City', age: 30, caps: 65, goals: 4, isCaptain: true },
    { name: 'Nico Williams', position: 'FW', club: 'Athletic Bilbao', age: 23, caps: 30, goals: 7 },
    { name: 'Unai Simon', position: 'GK', club: 'Athletic Bilbao', age: 28, caps: 30, goals: 0 },
  ],
  'Germany': [
    { name: 'Florian Wirtz', position: 'MF', club: 'Bayer Leverkusen', age: 23, caps: 35, goals: 10, isStar: true },
    { name: 'Jamal Musiala', position: 'MF', club: 'Bayern Munich', age: 23, caps: 45, goals: 8, isStar: true },
    { name: 'Kai Havertz', position: 'FW', club: 'Arsenal', age: 27, caps: 55, goals: 18 },
    { name: 'Antonio Rudiger', position: 'DF', club: 'Real Madrid', age: 33, caps: 80, goals: 3, isCaptain: true },
    { name: 'Marc-Andre ter Stegen', position: 'GK', club: 'Barcelona', age: 34, caps: 45, goals: 0 },
  ],
  'Portugal': [
    { name: 'Cristiano Ronaldo', position: 'FW', club: 'Al Nassr', age: 41, caps: 215, goals: 135, isCaptain: true, isStar: true },
    { name: 'Bruno Fernandes', position: 'MF', club: 'Manchester United', age: 31, caps: 70, goals: 20 },
    { name: 'Bernardo Silva', position: 'MF', club: 'Manchester City', age: 31, caps: 100, goals: 15 },
    { name: 'Rafael Leao', position: 'FW', club: 'AC Milan', age: 26, caps: 30, goals: 6 },
    { name: 'Diogo Costa', position: 'GK', club: 'Porto', age: 26, caps: 20, goals: 0 },
  ],
  'Netherlands': [
    { name: 'Cody Gakpo', position: 'FW', club: 'Liverpool', age: 25, caps: 40, goals: 15, isStar: true },
    { name: 'Virgil van Dijk', position: 'DF', club: 'Liverpool', age: 34, caps: 65, goals: 8, isCaptain: true },
    { name: 'Frenkie de Jong', position: 'MF', club: 'Barcelona', age: 29, caps: 55, goals: 3 },
    { name: 'Xavi Simons', position: 'MF', club: 'RB Leipzig', age: 23, caps: 25, goals: 5 },
    { name: 'Bart Verbruggen', position: 'GK', club: 'Brighton', age: 23, caps: 15, goals: 0 },
  ],
  'Italy': [
    { name: 'Federico Chiesa', position: 'FW', club: 'Liverpool', age: 28, caps: 55, goals: 10, isStar: true },
    { name: 'Nicolo Barella', position: 'MF', club: 'Inter Milan', age: 29, caps: 60, goals: 10 },
    { name: 'Sandro Tonali', position: 'MF', club: 'Newcastle', age: 26, caps: 30, goals: 2 },
    { name: 'Alessandro Bastoni', position: 'DF', club: 'Inter Milan', age: 27, caps: 30, goals: 2 },
    { name: 'Gianluigi Donnarumma', position: 'GK', club: 'PSG', age: 27, caps: 70, goals: 0, isCaptain: true },
  ],
  'USA': [
    { name: 'Christian Pulisic', position: 'FW', club: 'AC Milan', age: 27, caps: 75, goals: 30, isCaptain: true, isStar: true },
    { name: 'Weston McKennie', position: 'MF', club: 'Juventus', age: 27, caps: 55, goals: 12 },
    { name: 'Gio Reyna', position: 'MF', club: 'Borussia Dortmund', age: 23, caps: 30, goals: 5 },
    { name: 'Tyler Adams', position: 'MF', club: 'Bournemouth', age: 27, caps: 40, goals: 1 },
    { name: 'Matt Turner', position: 'GK', club: 'Crystal Palace', age: 32, caps: 35, goals: 0 },
  ],
  'Mexico': [
    { name: 'Hirving Lozano', position: 'FW', club: 'PSV', age: 30, caps: 70, goals: 19, isStar: true },
    { name: 'Edson Alvarez', position: 'MF', club: 'West Ham', age: 28, caps: 65, goals: 4, isCaptain: true },
    { name: 'Santiago Gimenez', position: 'FW', club: 'Feyenoord', age: 25, caps: 30, goals: 12 },
    { name: 'Cesar Montes', position: 'DF', club: 'Al Ahli', age: 27, caps: 40, goals: 2 },
    { name: 'Guillermo Ochoa', position: 'GK', club: 'Salernitana', age: 41, caps: 140, goals: 0 },
  ],
};

// ── Confederation colors for UI ──────────────────────────────────────────────

export const CONFEDERATION_COLORS: Record<string, string> = {
  UEFA: '#003399',
  CONMEBOL: '#FFD700',
  CONCACAF: '#009639',
  CAF: '#FF6600',
  AFC: '#E60012',
  OFC: '#0080FF',
};

// ── Round display labels ─────────────────────────────────────────────────────

export const ROUND_LABELS: Record<string, string> = {
  GROUP: 'Group Stage',
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-Final',
  SF: 'Semi-Final',
  FINAL: 'Final',
  WINNER: 'Champion',
};

export const ROUND_ORDER: Record<string, number> = {
  GROUP: 1,
  R32: 2,
  R16: 3,
  QF: 4,
  SF: 5,
  FINAL: 6,
  WINNER: 7,
};
