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
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  console.log('Aircraft List Generator');
  console.log('=======================');
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`Aircraft types: ${Object.keys(AIRCRAFT_TYPE_QIDS).length}`);
  console.log('');

  // TODO: Implement in subsequent tasks
  console.log('Script skeleton created. Implementation pending.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
