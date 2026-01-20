/**
 * Aircraft List Generation Script
 *
 * Queries Wikidata to generate a comprehensive list of aircraft
 * for the Tally game's search autocomplete functionality.
 *
 * Usage: npx tsx scripts/generate-aircraft-list.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Constants
// ============================================================================

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'Mozilla/5.0 (compatible; TallyGame/1.0; +https://github.com/tally-game)';
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'aircraft-list.json');

// Rate limiting delay between queries (ms)
const QUERY_DELAY_MS = 1000;

/**
 * Aircraft type Q-IDs from Wikidata
 * These represent the categories of aircraft we want in the search database
 */
const AIRCRAFT_TYPE_QIDS: Record<string, string> = {
  'Q127771': 'Fighter aircraft',
  'Q170877': 'Bomber',
  'Q15056993': 'Attack aircraft',
  'Q28885102': 'Multirole combat aircraft',
  'Q180352': 'Reconnaissance aircraft',
  'Q753779': 'Trainer aircraft',
  'Q210932': 'Airliner',
  'Q197380': 'Transport aircraft',
  'Q1420024': 'Business jet',
  'Q11436': 'Aircraft (general)',
  'Q127134': 'Biplane',
  'Q34486': 'Helicopter',
  'Q484000': 'UAV',
};

// ============================================================================
// Types
// ============================================================================

interface AircraftEntry {
  id: string;
  name: string;
  aliases: string[];
}

interface AircraftListOutput {
  generatedAt: string;
  count: number;
  aircraft: AircraftEntry[];
}

interface SparqlResponse<T> {
  results: {
    bindings: T[];
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Delay execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// SPARQL Execution
// ============================================================================

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Execute a SPARQL query against Wikidata with retry logic
 * @param query The SPARQL query string
 * @returns Array of result bindings
 */
async function executeSparql<T>(query: string): Promise<T[]> {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': USER_AGENT,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SPARQL query failed (${response.status}): ${errorText.slice(0, 200)}`);
      }

      const data = (await response.json()) as SparqlResponse<T>;
      return data.results.bindings;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`  Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);

      if (attempt < MAX_RETRIES) {
        console.log(`  Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError || new Error('SPARQL query failed after all retries');
}

// ============================================================================
// Aircraft Query
// ============================================================================

/**
 * Result type for aircraft SPARQL query
 */
interface AircraftQueryResult {
  aircraft: { value: string };
  aircraftLabel: { value: string };
  aliases?: { value: string };
}

/**
 * Number of results per page for pagination
 */
const PAGE_SIZE = 500;

/**
 * Build SPARQL query for aircraft of a specific type
 * Fetches ID, label, and aliases (skos:altLabel) for aircraft with images
 *
 * @param typeQid The Wikidata Q-ID for the aircraft type
 * @param offset Pagination offset
 * @returns SPARQL query string
 */
function buildAircraftQuery(typeQid: string, offset: number): string {
  return `
SELECT DISTINCT
  ?aircraft
  ?aircraftLabel
  (GROUP_CONCAT(DISTINCT ?alias; SEPARATOR="|") AS ?aliases)
WHERE {
  # Aircraft of specified type with an image
  ?aircraft wdt:P31 wd:${typeQid} .
  ?aircraft wdt:P18 ?image .

  # Get English label
  ?aircraft rdfs:label ?aircraftLabel .
  FILTER(LANG(?aircraftLabel) = "en")

  # Filter out items without proper labels (just Q-numbers)
  FILTER(!STRSTARTS(?aircraftLabel, "Q"))

  # Get English aliases (optional)
  OPTIONAL {
    ?aircraft skos:altLabel ?alias .
    FILTER(LANG(?alias) = "en")
  }
}
GROUP BY ?aircraft ?aircraftLabel
ORDER BY ?aircraftLabel
LIMIT ${PAGE_SIZE}
OFFSET ${offset}
  `.trim();
}

/**
 * Fetch all aircraft of a specific type from Wikidata
 * Handles pagination automatically
 *
 * @param typeQid The Wikidata Q-ID for the aircraft type
 * @param typeName Human-readable name for logging
 * @returns Array of raw aircraft query results
 */
async function fetchAircraftByType(
  typeQid: string,
  typeName: string
): Promise<AircraftQueryResult[]> {
  console.log(`\nFetching ${typeName} (${typeQid})...`);

  const allResults: AircraftQueryResult[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const query = buildAircraftQuery(typeQid, offset);
    const results = await executeSparql<AircraftQueryResult>(query);

    if (results.length === 0) {
      hasMore = false;
    } else {
      allResults.push(...results);
      console.log(`  Fetched ${results.length} aircraft (total: ${allResults.length})`);

      if (results.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        offset += PAGE_SIZE;
        // Rate limiting between paginated requests
        await delay(QUERY_DELAY_MS);
      }
    }
  }

  console.log(`  Total ${typeName}: ${allResults.length}`);
  return allResults;
}

// ============================================================================
// Alias Extraction
// ============================================================================

/**
 * Maximum alias length to include (longer aliases are filtered out)
 */
const MAX_ALIAS_LENGTH = 50;

/**
 * Extract Wikidata entity ID from URI
 * @param uri Full Wikidata entity URI
 * @returns Entity ID (e.g., "Q123")
 */
function extractEntityId(uri: string): string {
  const match = uri.match(/Q\d+$/);
  return match ? match[0] : uri;
}

/**
 * Extract designation from aircraft name
 * Examples:
 *   "General Dynamics F-16 Fighting Falcon" -> "F-16"
 *   "Lockheed Martin F-22 Raptor" -> "F-22"
 *   "Boeing 747" -> "747"
 *
 * @param name Aircraft name
 * @returns Extracted designation or null
 */
function extractDesignation(name: string): string | null {
  // Pattern for military designations (F-16, Su-27, MiG-29, etc.)
  const militaryPattern = /\b([A-Z]{1,3}[.-]?\d{1,3}[A-Z]?)\b/;
  const militaryMatch = name.match(militaryPattern);
  if (militaryMatch) {
    return militaryMatch[1];
  }

  // Pattern for commercial aircraft (747, A320, etc.)
  const commercialPattern = /\b([A-Z]?\d{2,3}[A-Z]?)\b/;
  const commercialMatch = name.match(commercialPattern);
  if (commercialMatch) {
    return commercialMatch[1];
  }

  return null;
}

/**
 * Process and filter aliases for an aircraft
 * - Parse pipe-separated Wikidata aliases
 * - Extract designation from name
 * - Deduplicate
 * - Filter out non-useful aliases
 *
 * @param rawAliases Pipe-separated alias string from Wikidata
 * @param name Aircraft name
 * @returns Array of clean, useful aliases
 */
function processAliases(rawAliases: string | undefined, name: string): string[] {
  const aliasSet = new Set<string>();
  const nameLower = name.toLowerCase();

  // Parse Wikidata aliases
  if (rawAliases) {
    const aliases = rawAliases.split('|');
    for (const alias of aliases) {
      const trimmed = alias.trim();
      if (trimmed) {
        aliasSet.add(trimmed);
      }
    }
  }

  // Extract designation from name
  const designation = extractDesignation(name);
  if (designation) {
    aliasSet.add(designation);
  }

  // Filter and clean aliases
  const result: string[] = [];
  for (const alias of aliasSet) {
    // Skip if too long
    if (alias.length > MAX_ALIAS_LENGTH) {
      continue;
    }

    // Skip if identical to name (case-insensitive)
    if (alias.toLowerCase() === nameLower) {
      continue;
    }

    // Skip if it's just whitespace or punctuation
    if (!/[a-zA-Z0-9]/.test(alias)) {
      continue;
    }

    result.push(alias);
  }

  // Sort alphabetically
  return result.sort((a, b) => a.localeCompare(b));
}

/**
 * Convert raw SPARQL result to AircraftEntry
 */
function resultToEntry(result: AircraftQueryResult): AircraftEntry {
  const id = extractEntityId(result.aircraft.value);
  const name = result.aircraftLabel.value;
  const aliases = processAliases(result.aliases?.value, name);

  return { id, name, aliases };
}

// ============================================================================
// Deduplication and Aggregation
// ============================================================================

/**
 * Statistics for each aircraft type
 */
interface TypeStats {
  qid: string;
  name: string;
  count: number;
}

/**
 * Merge two aircraft entries (combine aliases)
 */
function mergeEntries(existing: AircraftEntry, incoming: AircraftEntry): AircraftEntry {
  const allAliases = new Set([...existing.aliases, ...incoming.aliases]);
  return {
    id: existing.id,
    name: existing.name,
    aliases: Array.from(allAliases).sort((a, b) => a.localeCompare(b)),
  };
}

/**
 * Fetch all aircraft from all types and aggregate/deduplicate
 * @returns Object containing deduplicated aircraft list and statistics
 */
async function fetchAllAircraft(): Promise<{
  aircraft: AircraftEntry[];
  stats: TypeStats[];
}> {
  const aircraftMap = new Map<string, AircraftEntry>();
  const stats: TypeStats[] = [];

  const typeEntries = Object.entries(AIRCRAFT_TYPE_QIDS);

  for (let i = 0; i < typeEntries.length; i++) {
    const [qid, name] = typeEntries[i];

    // Rate limiting between different type queries
    if (i > 0) {
      await delay(QUERY_DELAY_MS);
    }

    try {
      const results = await fetchAircraftByType(qid, name);

      let typeCount = 0;
      for (const result of results) {
        const entry = resultToEntry(result);

        // Check for existing entry
        const existing = aircraftMap.get(entry.id);
        if (existing) {
          // Merge aliases from duplicate
          aircraftMap.set(entry.id, mergeEntries(existing, entry));
        } else {
          aircraftMap.set(entry.id, entry);
          typeCount++;
        }
      }

      stats.push({ qid, name, count: results.length });
      console.log(`  New unique aircraft: ${typeCount}`);
    } catch (error) {
      console.error(`  Failed to fetch ${name}: ${error}`);
      stats.push({ qid, name, count: 0 });
    }
  }

  // Convert map to sorted array
  const aircraft = Array.from(aircraftMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return { aircraft, stats };
}

/**
 * Print statistics summary
 */
function printStats(stats: TypeStats[], totalUnique: number): void {
  console.log('\n========================================');
  console.log('Statistics Summary');
  console.log('========================================');

  let totalFetched = 0;
  for (const stat of stats) {
    console.log(`  ${stat.name}: ${stat.count}`);
    totalFetched += stat.count;
  }

  console.log('----------------------------------------');
  console.log(`  Total fetched (with duplicates): ${totalFetched}`);
  console.log(`  Unique aircraft: ${totalUnique}`);
  console.log(`  Duplicates merged: ${totalFetched - totalUnique}`);
}

// ============================================================================
// JSON Output
// ============================================================================

/**
 * Write aircraft list to JSON file
 * @param aircraft Array of aircraft entries
 */
function writeOutput(aircraft: AircraftEntry[]): void {
  const output: AircraftListOutput = {
    generatedAt: new Date().toISOString(),
    count: aircraft.length,
    aircraft,
  };

  // Pretty-print with 2-space indentation
  const json = JSON.stringify(output, null, 2);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, json, 'utf-8');
  console.log(`\nOutput written to: ${OUTPUT_PATH}`);
  console.log(`File size: ${(json.length / 1024).toFixed(2)} KB`);
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const startTime = Date.now();

  console.log('Aircraft List Generator');
  console.log('=======================');
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`Aircraft types: ${Object.keys(AIRCRAFT_TYPE_QIDS).length}`);
  console.log('');

  // Fetch all aircraft
  const { aircraft, stats } = await fetchAllAircraft();

  // Print statistics
  printStats(stats, aircraft.length);

  // Write output
  writeOutput(aircraft);

  // Summary
  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCompleted in ${elapsedSeconds}s`);
  console.log(`Aircraft count: ${aircraft.length}`);

  // Verify minimum count
  if (aircraft.length < 200) {
    console.warn(`\nWARNING: Only ${aircraft.length} aircraft found. Expected 200+`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
