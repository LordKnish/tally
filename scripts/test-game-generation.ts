/**
 * Test Game Generation Script
 *
 * Queries Wikidata to verify aircraft availability for each game mode.
 * Reports eligible aircraft counts and identifies potential issues.
 *
 * Usage: npx tsx scripts/test-game-generation.ts
 */

// ============================================================================
// Constants
// ============================================================================

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'Mozilla/5.0 (compatible; TallyGame/1.0; +https://github.com/tally-game)';

// ============================================================================
// Game Mode Configuration (mirrored from generate-game.ts)
// ============================================================================

type GameModeId = 'main' | 'commercial' | 'ww2' | 'goldenage';

interface ModeConfig {
  id: GameModeId;
  name: string;
  yearMin: number | null;
  yearMax: number | null;
  aircraftTypes: string[];
  /** Use subclass path (P279+) instead of direct instance (P31) for type matching */
  useSubclassPath?: boolean;
}

const GAME_MODES: Record<GameModeId, ModeConfig> = {
  main: {
    id: 'main',
    name: 'Daily Tally',
    yearMin: 1980,
    yearMax: null,
    aircraftTypes: [
      'Q127771',    // fighter aircraft
      'Q170877',    // bomber
      'Q15056993',  // attack aircraft
      'Q28885102',  // multirole combat aircraft
      'Q180352',    // reconnaissance aircraft
      'Q753779',    // trainer aircraft
    ],
  },
  commercial: {
    id: 'commercial',
    name: 'Commercial',
    yearMin: 1970,  // Relaxed from 1980 to include more aircraft
    yearMax: null,
    aircraftTypes: [
      'Q210932',    // airliner (uses subclass path to find Boeing 747, Airbus A320, etc.)
    ],
    useSubclassPath: true,  // Query subclasses of airliner (Boeing 747-400, A320, etc.)
  },
  ww2: {
    id: 'ww2',
    name: 'WW2',
    yearMin: 1935,
    yearMax: 1950,
    aircraftTypes: [
      'Q127771',    // fighter aircraft
      'Q170877',    // bomber
      'Q15056993',  // attack aircraft
      'Q180352',    // reconnaissance aircraft
      'Q753779',    // trainer aircraft
    ],
  },
  goldenage: {
    id: 'goldenage',
    name: 'Golden Age',
    yearMin: null,
    yearMax: 1940,  // Pre-1940: WW1, barnstormers, interwar pioneers
    aircraftTypes: [
      'Q11436',     // aircraft (general)
      'Q127771',    // fighter aircraft
      'Q170877',    // bomber
      'Q127134',    // biplane
      'Q180352',    // reconnaissance aircraft
      'Q753779',    // trainer aircraft
      'Q15056993',  // attack aircraft
    ],
  },
};

const ALL_MODE_IDS: GameModeId[] = ['main', 'commercial', 'ww2', 'goldenage'];

// ============================================================================
// SPARQL Functions
// ============================================================================

function buildYearFilter(mode: ModeConfig): string {
  if (mode.yearMin !== null && mode.yearMax !== null) {
    return `FILTER(YEAR(?firstFlight) >= ${mode.yearMin} && YEAR(?firstFlight) <= ${mode.yearMax})`;
  }
  if (mode.yearMin !== null) {
    return `FILTER(YEAR(?firstFlight) >= ${mode.yearMin})`;
  }
  if (mode.yearMax !== null) {
    return `FILTER(YEAR(?firstFlight) <= ${mode.yearMax})`;
  }
  return '';
}

function buildCountQuery(mode: ModeConfig): string {
  const typeValues = mode.aircraftTypes.map((t) => `wd:${t}`).join(' ');
  const yearFilter = buildYearFilter(mode);

  // For subclass path: find types that are subclasses of baseType, then find instances
  // For direct: find instances directly of the type
  const typeMatchClause = mode.useSubclassPath
    ? `VALUES ?baseType { ${typeValues} }
  ?type wdt:P279+ ?baseType .
  ?aircraft wdt:P31 ?type .`
    : `VALUES ?type { ${typeValues} }
  ?aircraft wdt:P31 ?type .`;

  return `
SELECT (COUNT(DISTINCT ?aircraft) AS ?count)
WHERE {
  ${typeMatchClause}
  ?aircraft wdt:P18 ?image .

  OPTIONAL { ?aircraft wdt:P606 ?firstFlight . }
  OPTIONAL { ?aircraft wdt:P729 ?introduced . }
  BIND(COALESCE(?firstFlight, ?introduced) AS ?flightDate)
  FILTER(BOUND(?flightDate))

  ${yearFilter}

  ?aircraft rdfs:label ?label .
  FILTER(LANG(?label) = "en")
  FILTER(!STRSTARTS(?label, "Q"))
}
  `.trim();
}

interface SparqlResponse<T> {
  results: {
    bindings: T[];
  };
}

async function executeSparql<T>(query: string): Promise<T[]> {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`SPARQL query failed: ${response.status}`);
  }

  const data = (await response.json()) as SparqlResponse<T>;
  return data.results.bindings;
}

async function getEligibleAircraftCount(mode: ModeConfig): Promise<number> {
  const query = buildCountQuery(mode);
  const results = await executeSparql<{ count: { value: string } }>(query);

  if (results.length === 0) {
    return 0;
  }

  return parseInt(results[0].count.value, 10);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Tally Game Mode Validation');
  console.log('='.repeat(60));
  console.log('');

  const results: { mode: string; count: number; status: string }[] = [];

  for (const modeId of ALL_MODE_IDS) {
    const mode = GAME_MODES[modeId];
    console.log(`Testing ${mode.name} (${modeId})...`);

    try {
      const count = await getEligibleAircraftCount(mode);
      const status = count === 0 ? 'FAIL - No aircraft!' : count < 10 ? 'WARN - Low count' : 'OK';
      results.push({ mode: mode.name, count, status });
      console.log(`  -> ${count} eligible aircraft (${status})`);
    } catch (error) {
      results.push({ mode: mode.name, count: -1, status: 'ERROR' });
      console.log(`  -> ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log('');
  console.log('| Mode         | Count  | Status |');
  console.log('|--------------|--------|--------|');
  for (const r of results) {
    const modeCol = r.mode.padEnd(12);
    const countCol = (r.count >= 0 ? r.count.toString() : 'ERR').padStart(6);
    console.log(`| ${modeCol} | ${countCol} | ${r.status.padEnd(6)} |`);
  }
  console.log('');

  const failed = results.filter(r => r.count === 0 || r.count === -1);
  const warned = results.filter(r => r.count > 0 && r.count < 10);

  if (failed.length > 0) {
    console.log(`FAILED: ${failed.map(r => r.mode).join(', ')}`);
    process.exit(1);
  } else if (warned.length > 0) {
    console.log(`WARNINGS: ${warned.map(r => r.mode).join(', ')} have low aircraft counts`);
  } else {
    console.log('All modes have sufficient aircraft!');
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
