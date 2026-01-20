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
