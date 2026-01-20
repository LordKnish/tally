/**
 * Vercel Serverless Function for game generation.
 * Triggered by Vercel Cron at 12:00 AM UTC daily (main mode).
 * Can also be triggered manually for any mode.
 *
 * Query parameters:
 *   mode: 'main' | 'commercial' | 'ww2' | 'ww1' | 'helicopters' | 'drones'
 *   all: 'true' = bonus modes only, 'everything' = all modes including main
 *   manual: If 'true', allows manual trigger with secret
 *   secret: CRON_SECRET for manual triggers
 *
 * All modes store in Neon PostgreSQL.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import sharp from 'sharp';
import * as photon from '@silvia-odwyer/photon-node';

// ============================================================================
// Types
// ============================================================================

interface SpecsClue {
  class: string | null;
  manufacturer: string | null;
  wingspan: string | null;
  firstFlight: string | null;
}

interface ContextClue {
  nation: string;
  conflicts: string[];
  status: string | null;
}

interface GameClues {
  specs: SpecsClue;
  context: ContextClue;
  trivia: string | null;
  photo: string;
}

interface AircraftIdentity {
  id: string;
  name: string;
  aliases: string[];
}

interface GameData {
  date: string;
  aircraft: AircraftIdentity;
  silhouette: string;
  clues: GameClues;
}

interface WikidataAircraftResult {
  aircraft: { value: string };
  aircraftLabel: { value: string };
  image?: { value: string };
  class?: { value: string };
  classLabel?: { value: string };
  country?: { value: string };
  countryLabel?: { value: string };
  manufacturer?: { value: string };
  manufacturerLabel?: { value: string };
  manufacturerCountry?: { value: string };
  manufacturerCountryLabel?: { value: string };
  wingspan?: { value: string };
  length?: { value: string };
  firstFlight?: { value: string };
  introduced?: { value: string };
  retired?: { value: string };
  status?: { value: string };
  statusLabel?: { value: string };
  conflict?: { value: string };
  conflictLabel?: { value: string };
  article?: { value: string };
}

interface SelectedAircraft {
  id: string;
  name: string;
  imageUrl: string;
  className: string | null;
  country: string | null;
  wingspan: string | null;
  length: string | null;
  manufacturer: string | null;
  firstFlight: string | null;
  introduced: string | null;
  retired: string | null;
  status: string | null;
  conflicts: string[];
  wikipediaTitle: string | null;
}

interface WikipediaSummary {
  title: string;
  extract: string;
  description?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'Mozilla/5.0 (compatible; TallyGame/1.0; +https://github.com/tally-game)';
const CRON_SECRET = process.env.CRON_SECRET;

// ============================================================================
// Game Mode Configuration
// ============================================================================

type GameModeId = 'main' | 'commercial' | 'ww2' | 'ww1' | 'helicopters' | 'drones';

interface ModeConfig {
  id: GameModeId;
  name: string;
  yearMin: number | null;
  yearMax: number | null;
  aircraftTypes: string[];
}

/**
 * Aircraft type Q-IDs from Wikidata:
 * Q11436 = aircraft
 * Q127771 = fighter aircraft
 * Q170877 = bomber
 * Q197380 = transport aircraft
 * Q34486 = helicopter
 * Q210932 = airliner
 * Q484000 = UAV (unmanned aerial vehicle)
 * Q216916 = military aircraft
 * Q127134 = biplane
 * Q6879 = jet aircraft
 * Q15056993 = attack aircraft
 * Q28885102 = multirole combat aircraft
 * Q180352 = reconnaissance aircraft
 * Q1420024 = business jet
 * Q753779 = trainer aircraft
 */

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
    yearMin: 1980,
    yearMax: null,
    aircraftTypes: [
      'Q210932',    // airliner
      'Q197380',    // transport aircraft
      'Q1420024',   // business jet
    ],
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
  ww1: {
    id: 'ww1',
    name: 'WW1',
    yearMin: 1910,
    yearMax: 1925,
    aircraftTypes: [
      'Q11436',     // aircraft (general - WW1 era less specific)
      'Q127771',    // fighter aircraft
      'Q170877',    // bomber
      'Q127134',    // biplane
      'Q180352',    // reconnaissance aircraft
    ],
  },
  helicopters: {
    id: 'helicopters',
    name: 'Helicopters',
    yearMin: null,
    yearMax: null,
    aircraftTypes: [
      'Q34486',     // helicopter
    ],
  },
  drones: {
    id: 'drones',
    name: 'Drones',
    yearMin: null,
    yearMax: null,
    aircraftTypes: [
      'Q484000',    // UAV
    ],
  },
};

const ALL_MODE_IDS: GameModeId[] = ['main', 'commercial', 'ww2', 'ww1', 'helicopters', 'drones'];
const BONUS_MODE_IDS: GameModeId[] = ['commercial', 'ww2', 'ww1', 'helicopters', 'drones'];

// ============================================================================
// Database Functions (Neon PostgreSQL)
// ============================================================================

async function getUsedAircraftIds(mode: GameModeId = 'main'): Promise<string[]> {
  try {
    const result = await sql`SELECT wikidata_id FROM tally_used_aircraft WHERE mode = ${mode}`;
    return result.rows.map((row) => row.wikidata_id);
  } catch (error) {
    console.error(`Failed to fetch used aircraft for ${mode}:`, error);
    return [];
  }
}

async function markAircraftUsed(id: string, name: string, mode: GameModeId = 'main'): Promise<void> {
  try {
    await sql`
      INSERT INTO tally_used_aircraft (wikidata_id, name, used_date, mode)
      VALUES (${id}, ${name}, CURRENT_DATE, ${mode})
      ON CONFLICT (wikidata_id, mode) DO NOTHING
    `;
    console.log(`Marked ${name} (${id}) as used in ${mode}`);
  } catch (error) {
    console.error('Failed to mark aircraft as used:', error);
    throw error;
  }
}

async function saveGameData(gameData: GameData, mode: GameModeId = 'main'): Promise<void> {
  const { date, aircraft, silhouette, clues } = gameData;

  // Convert arrays to PostgreSQL array format
  const aliasesArray = `{${aircraft.aliases.map(a => `"${a.replace(/"/g, '\\"')}"`).join(',')}}`;
  const conflictsArray = `{${clues.context.conflicts.map(c => `"${c.replace(/"/g, '\\"')}"`).join(',')}}`;

  try {
    await sql`
      INSERT INTO tally_game_data (
        game_date,
        mode,
        aircraft_id,
        aircraft_name,
        aircraft_aliases,
        silhouette,
        clues_specs_class,
        clues_specs_manufacturer,
        clues_specs_wingspan,
        clues_specs_first_flight,
        clues_context_nation,
        clues_context_conflicts,
        clues_context_status,
        clues_trivia,
        clues_photo
      ) VALUES (
        ${date}::date,
        ${mode},
        ${aircraft.id},
        ${aircraft.name},
        ${aliasesArray}::text[],
        ${silhouette},
        ${clues.specs.class},
        ${clues.specs.manufacturer},
        ${clues.specs.wingspan},
        ${clues.specs.firstFlight},
        ${clues.context.nation},
        ${conflictsArray}::text[],
        ${clues.context.status},
        ${clues.trivia},
        ${clues.photo}
      )
      ON CONFLICT (game_date, mode) DO UPDATE SET
        aircraft_id = EXCLUDED.aircraft_id,
        aircraft_name = EXCLUDED.aircraft_name,
        aircraft_aliases = EXCLUDED.aircraft_aliases,
        silhouette = EXCLUDED.silhouette,
        clues_specs_class = EXCLUDED.clues_specs_class,
        clues_specs_manufacturer = EXCLUDED.clues_specs_manufacturer,
        clues_specs_wingspan = EXCLUDED.clues_specs_wingspan,
        clues_specs_first_flight = EXCLUDED.clues_specs_first_flight,
        clues_context_nation = EXCLUDED.clues_context_nation,
        clues_context_conflicts = EXCLUDED.clues_context_conflicts,
        clues_context_status = EXCLUDED.clues_context_status,
        clues_trivia = EXCLUDED.clues_trivia,
        clues_photo = EXCLUDED.clues_photo,
        updated_at = CURRENT_TIMESTAMP
    `;
    console.log(`Saved game data for ${mode} on ${date}`);
  } catch (error) {
    console.error(`Failed to save game data for ${mode}:`, error);
    throw error;
  }
}

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
  return ''; // No year filter
}

function buildCountQuery(excludeIds: string[], mode: ModeConfig): string {
  const excludeFilter =
    excludeIds.length > 0
      ? `FILTER(?aircraft NOT IN (${excludeIds.map((id) => `wd:${id}`).join(', ')}))`
      : '';

  const typeValues = mode.aircraftTypes.map((t) => `wd:${t}`).join(' ');
  const yearFilter = buildYearFilter(mode);

  return `
SELECT (COUNT(DISTINCT ?aircraft) AS ?count)
WHERE {
  VALUES ?type { ${typeValues} }
  ?aircraft wdt:P31 ?type .
  ?aircraft wdt:P18 ?image .

  # First flight date (P606)
  OPTIONAL { ?aircraft wdt:P606 ?firstFlight . }
  # Introduction date (P729) as fallback
  OPTIONAL { ?aircraft wdt:P729 ?introduced . }
  BIND(COALESCE(?firstFlight, ?introduced) AS ?flightDate)
  FILTER(BOUND(?flightDate))

  ${yearFilter}

  ?aircraft rdfs:label ?label .
  FILTER(LANG(?label) = "en")
  FILTER(!STRSTARTS(?label, "Q"))

  ${excludeFilter}
}
  `.trim();
}

function buildAircraftQuery(excludeIds: string[], offset: number, mode: ModeConfig): string {
  const excludeFilter =
    excludeIds.length > 0
      ? `FILTER(?aircraft NOT IN (${excludeIds.map((id) => `wd:${id}`).join(', ')}))`
      : '';

  const typeValues = mode.aircraftTypes.map((t) => `wd:${t}`).join(' ');
  const yearFilter = buildYearFilter(mode);

  return `
SELECT DISTINCT
  ?aircraft ?aircraftLabel
  ?image
  ?class ?classLabel
  ?country ?countryLabel
  ?manufacturer ?manufacturerLabel
  ?manufacturerCountry ?manufacturerCountryLabel
  ?wingspan ?length
  ?firstFlight ?introduced ?retired
  ?conflict ?conflictLabel
  ?status ?statusLabel
  ?article
WHERE {
  VALUES ?type { ${typeValues} }
  ?aircraft wdt:P31 ?type .
  ?aircraft wdt:P18 ?image .

  # First flight date (P606)
  OPTIONAL { ?aircraft wdt:P606 ?firstFlight . }
  # Introduction date (P729) as fallback
  OPTIONAL { ?aircraft wdt:P729 ?introduced . }
  BIND(COALESCE(?firstFlight, ?introduced) AS ?flightDate)
  FILTER(BOUND(?flightDate))

  ${yearFilter}

  ?aircraft rdfs:label ?label .
  FILTER(LANG(?label) = "en")
  FILTER(!STRSTARTS(?label, "Q"))

  ${excludeFilter}

  # Country of origin (P495)
  OPTIONAL { ?aircraft wdt:P495 ?country . }
  # Manufacturer (P176)
  OPTIONAL {
    ?aircraft wdt:P176 ?manufacturer .
    OPTIONAL { ?manufacturer wdt:P17 ?manufacturerCountry . }
  }
  # Wingspan (P2050) in meters
  OPTIONAL { ?aircraft wdt:P2050 ?wingspan . }
  # Length (P2043) in meters
  OPTIONAL { ?aircraft wdt:P2043 ?length . }
  # Conflicts (P607)
  OPTIONAL { ?aircraft wdt:P607 ?conflict . }
  # Retired date (P730)
  OPTIONAL { ?aircraft wdt:P730 ?retired . }
  # Service status (P1308)
  OPTIONAL { ?aircraft wdt:P1308 ?status . }

  OPTIONAL {
    ?article schema:about ?aircraft ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY ?aircraftLabel
LIMIT 1
OFFSET ${offset}
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

async function getEligibleAircraftCount(excludeIds: string[], mode: ModeConfig): Promise<number> {
  const query = buildCountQuery(excludeIds, mode);
  const results = await executeSparql<{ count: { value: string } }>(query);

  if (results.length === 0) {
    return 0;
  }

  return parseInt(results[0].count.value, 10);
}

// ============================================================================
// Aircraft Selection Functions
// ============================================================================

function extractEntityId(uri: string): string {
  const match = uri.match(/Q\d+$/);
  return match ? match[0] : uri;
}

function commonsFileToUrl(filename: string): string {
  let cleanName = filename.replace(/^(File:|Image:)/i, '');

  try {
    cleanName = decodeURIComponent(cleanName);
  } catch {
    // If decoding fails, it wasn't encoded
  }

  cleanName = cleanName.replace(/ /g, '_');

  const encoded = encodeURIComponent(cleanName)
    .replace(/%5F/g, '_')
    .replace(/%2F/g, '/');

  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}`;
}

function parseAircraftResult(results: WikidataAircraftResult[]): SelectedAircraft {
  const first = results[0];

  const conflicts = new Set<string>();
  for (const row of results) {
    if (row.conflictLabel?.value) {
      conflicts.add(row.conflictLabel.value);
    }
  }

  let country: string | null = null;
  if (first.countryLabel?.value) {
    country = first.countryLabel.value;
  } else if (first.manufacturerCountryLabel?.value) {
    country = first.manufacturerCountryLabel.value;
  }

  let wikipediaTitle: string | null = null;
  if (first.article?.value) {
    const match = first.article.value.match(/\/wiki\/(.+)$/);
    if (match) {
      wikipediaTitle = decodeURIComponent(match[1].replace(/_/g, ' '));
    }
  }

  let status: string | null = null;
  const retired = first.retired?.value
    ? new Date(first.retired.value).getFullYear().toString()
    : null;

  if (first.statusLabel?.value) {
    status = first.statusLabel.value;
  } else if (retired) {
    status = `Retired ${retired}`;
  } else {
    const conflictArray = Array.from(conflicts);
    const recentConflicts = conflictArray.filter((c) => {
      const lower = c.toLowerCase();
      return (
        lower.includes('iraq') ||
        lower.includes('afghan') ||
        lower.includes('gulf') ||
        lower.includes('syria') ||
        lower.includes('2000') ||
        lower.includes('2010') ||
        lower.includes('2020')
      );
    });
    if (recentConflicts.length > 0) {
      status = 'Active or recently active';
    }
  }

  const firstFlight = first.firstFlight?.value
    ? new Date(first.firstFlight.value).getFullYear().toString()
    : first.introduced?.value
      ? new Date(first.introduced.value).getFullYear().toString()
      : null;

  return {
    id: extractEntityId(first.aircraft.value),
    name: first.aircraftLabel.value,
    imageUrl: first.image?.value
      ? commonsFileToUrl(first.image.value.split('/').pop() || '')
      : '',
    className: first.classLabel?.value || null,
    country,
    wingspan: first.wingspan?.value ? `${Math.round(parseFloat(first.wingspan.value))}m` : null,
    length: first.length?.value ? `${Math.round(parseFloat(first.length.value))}m` : null,
    manufacturer: first.manufacturerLabel?.value || null,
    firstFlight,
    introduced: first.introduced?.value
      ? new Date(first.introduced.value).getFullYear().toString()
      : null,
    retired,
    status,
    conflicts: Array.from(conflicts),
    wikipediaTitle,
  };
}

async function selectRandomAircraft(excludeIds: string[], mode: ModeConfig): Promise<SelectedAircraft | null> {
  console.log(`Counting eligible aircraft for ${mode.name} (excluding ${excludeIds.length})...`);

  const count = await getEligibleAircraftCount(excludeIds, mode);
  console.log(`Found ${count} eligible aircraft`);

  if (count === 0) {
    return null;
  }

  const offset = Math.floor(Math.random() * count);
  console.log(`Selecting aircraft at offset ${offset}...`);

  const query = buildAircraftQuery(excludeIds, offset, mode);
  const results = await executeSparql<WikidataAircraftResult>(query);

  if (results.length === 0) {
    console.warn('No aircraft found at offset, retrying...');
    const newOffset = Math.floor(Math.random() * count);
    const retryResults = await executeSparql<WikidataAircraftResult>(
      buildAircraftQuery(excludeIds, newOffset, mode)
    );
    if (retryResults.length === 0) {
      return null;
    }
    return parseAircraftResult(retryResults);
  }

  return parseAircraftResult(results);
}

// ============================================================================
// Clue Functions
// ============================================================================

async function fetchWikipediaSummary(title: string): Promise<WikipediaSummary | null> {
  try {
    const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Wikipedia summary fetch failed: ${response.status}`);
      return null;
    }

    return (await response.json()) as WikipediaSummary;
  } catch (error) {
    console.warn('Failed to fetch Wikipedia summary:', error);
    return null;
  }
}

function extractTrivia(summary: WikipediaSummary | null): string | null {
  if (!summary?.extract) {
    return null;
  }

  const text = summary.extract;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

  const interestingKeywords = [
    // General notable facts
    'famous', 'notable', 'first', 'last', 'only', 'largest', 'fastest',
    'known for', 'renamed', 'converted', 'museum', 'memorial',
    'preserved', 'film', 'movie', 'prototype', 'experimental',
    // Combat and military
    'shot down', 'crashed', 'battle', 'war', 'attack', 'served', 'participated',
    'combat', 'ace', 'dogfight', 'squadron', 'mission', 'sortie',
    'carrier', 'airbase', 'bombing', 'raid', 'interception',
    // Performance records
    'speed record', 'altitude record', 'payload', 'range record',
    'world record', 'broke the', 'set a',
    // Aviation technology
    'maiden flight', 'test flight', 'maiden voyage',
    'stealth', 'supersonic', 'hypersonic', 'jet', 'propeller', 'turboprop',
    'cockpit', 'ejection', 'radar', 'avionics', 'afterburner',
    // Production and service
    'mass produced', 'exported', 'license', 'variant', 'derivative',
  ];

  for (const sentence of sentences.slice(1)) {
    const lower = sentence.toLowerCase();
    if (interestingKeywords.some((kw) => lower.includes(kw))) {
      return sentence.trim();
    }
  }

  if (sentences.length > 1) {
    return sentences[1].trim();
  }

  if (summary.description) {
    return summary.description;
  }

  return null;
}

function buildSpecsClue(aircraft: SelectedAircraft): SpecsClue {
  return {
    class: aircraft.className,
    manufacturer: aircraft.manufacturer,
    wingspan: aircraft.wingspan,
    firstFlight: aircraft.firstFlight,
  };
}

function buildContextClue(aircraft: SelectedAircraft): ContextClue {
  return {
    nation: aircraft.country || 'Unknown',
    conflicts: aircraft.conflicts,
    status: aircraft.status,
  };
}

async function fetchClues(aircraft: SelectedAircraft): Promise<GameClues> {
  console.log(`Fetching clues for ${aircraft.name}...`);

  let trivia: string | null = null;
  if (aircraft.wikipediaTitle) {
    console.log(`  Fetching Wikipedia summary for ${aircraft.wikipediaTitle}...`);
    const summary = await fetchWikipediaSummary(aircraft.wikipediaTitle);
    trivia = extractTrivia(summary);
    if (trivia) {
      console.log(`  Found trivia: "${trivia.substring(0, 50)}..."`);
    }
  }

  return {
    specs: buildSpecsClue(aircraft),
    context: buildContextClue(aircraft),
    trivia,
    photo: aircraft.imageUrl,
  };
}

// ============================================================================
// Line Art Generation (Photon + Sharp for preprocessing)
// ============================================================================

const REMOVEBG_API_KEY = process.env.REMOVEBG_API_KEY;

async function downloadImage(url: string): Promise<Buffer> {
  console.log(`  Downloading image from ${url.substring(0, 60)}...`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'image/*,*/*',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function removeBackgroundWithAPI(imageBuffer: Buffer): Promise<Buffer> {
  if (!REMOVEBG_API_KEY) {
    console.warn('  No REMOVEBG_API_KEY set, using edge detection only');
    return imageBuffer;
  }

  console.log('  Removing background via remove.bg API...');

  const formData = new FormData();
  const uint8Array = new Uint8Array(imageBuffer);
  formData.append('image_file', new Blob([uint8Array]), 'image.png');
  formData.append('size', 'regular');
  formData.append('format', 'png');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': REMOVEBG_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`  remove.bg API failed: ${response.status} - ${errorText}`);
    console.warn('  Falling back to edge detection only');
    return imageBuffer;
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateLineArtFromUrl(imageUrl: string): Promise<string> {
  const start = Date.now();

  // 1. Download image
  const inputBuffer = await downloadImage(imageUrl);

  // 2. Resize and preprocess with Sharp
  console.log('  Preprocessing image...');
  const preprocessed = await sharp(inputBuffer)
    .resize(800, null, { withoutEnlargement: true })
    .png()
    .toBuffer();

  // 3. Remove background (if API key available)
  const noBgBuffer = await removeBackgroundWithAPI(preprocessed);

  // 4. Generate line art (sharpened edges)
  console.log('  Generating line art...');

  // Get original alpha channel
  const { data: origData, info } = await sharp(noBgBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Sharpen first for more detail
  const sharpened = await sharp(noBgBuffer).sharpen({ sigma: 2 }).toBuffer();

  // Edge detection with Photon laplace
  const image = photon.PhotonImage.new_from_byteslice(new Uint8Array(sharpened));
  photon.laplace(image);
  const edges = Buffer.from(image.get_bytes());

  const { data: edgeData } = await sharp(edges)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Create transparent PNG - black lines where edges detected
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const origAlpha = origData[i * 4 + 3]!;
    const edgeVal = edgeData[i]!;
    const idx = i * 4;

    if (origAlpha > 128 && edgeVal < 180) {
      // Edge detected - black line with varying opacity
      rgba[idx] = 0;       // R
      rgba[idx + 1] = 0;   // G
      rgba[idx + 2] = 0;   // B
      rgba[idx + 3] = Math.min(255, (180 - edgeVal) * 2); // A
    }
  }

  const lineArt = await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();

  const timeMs = Date.now() - start;
  const { width, height } = await sharp(lineArt).metadata();
  console.log(`  Line art generated in ${timeMs}ms (${width}x${height})`);

  return lineArt.toString('base64');
}

// ============================================================================
// Single Mode Generation
// ============================================================================

interface GenerationResult {
  success: boolean;
  mode: GameModeId;
  aircraft?: { id: string; name: string; class: string | null };
  date?: string;
  error?: string;
  silhouetteSizeKB?: number;
}

async function generateForMode(
  mode: ModeConfig,
  gameDate: string,
  requireTrivia: boolean = true
): Promise<GenerationResult> {
  const MAX_RETRIES = 10;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Generating: ${mode.name}`);
  console.log(`${'='.repeat(60)}`);

  // 1. Load used aircraft for this mode
  const usedIds = await getUsedAircraftIds(mode.id);
  console.log(`Used aircraft in ${mode.id}: ${usedIds.length}`);

  // 2. Select random aircraft (with trivia if required)
  const excludeIds = [...usedIds];
  let aircraft: SelectedAircraft | null = null;
  let clues: GameClues | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\nSelecting random aircraft (attempt ${attempt}/${MAX_RETRIES})...`);
    aircraft = await selectRandomAircraft(excludeIds, mode);

    if (!aircraft) {
      return {
        success: false,
        mode: mode.id,
        error: 'No eligible aircraft found',
      };
    }

    console.log(`\nSelected: ${aircraft.name} (${aircraft.id})`);
    console.log(`  Country: ${aircraft.country || 'Unknown'}`);
    console.log(`  Class: ${aircraft.className || 'Unknown'}`);
    console.log(`  First Flight: ${aircraft.firstFlight || 'Unknown'}`);

    // 3. Fetch clues
    console.log('\nFetching clue data...');
    clues = await fetchClues(aircraft);

    if (!requireTrivia || clues.trivia) {
      if (clues.trivia) {
        console.log('  Trivia found, proceeding with this aircraft.');
      }
      break;
    }

    console.log('  No trivia found, trying another aircraft...');
    excludeIds.push(aircraft.id);
    aircraft = null;
    clues = null;
  }

  if (!aircraft || !clues) {
    return {
      success: false,
      mode: mode.id,
      error: requireTrivia
        ? `No aircraft with trivia found after ${MAX_RETRIES} attempts`
        : 'No eligible aircraft found',
    };
  }

  // 4. Generate line art
  console.log('\nGenerating line art...');
  let silhouette: string;
  try {
    silhouette = await generateLineArtFromUrl(aircraft.imageUrl);
  } catch (error) {
    return {
      success: false,
      mode: mode.id,
      error: `Failed to generate line art: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // 5. Build game data
  const aircraftIdentity: AircraftIdentity = {
    id: aircraft.id,
    name: aircraft.name,
    aliases: [],
  };

  if (aircraft.className) {
    aircraftIdentity.aliases.push(aircraft.className);
  }

  const gameData: GameData = {
    date: gameDate,
    aircraft: aircraftIdentity,
    silhouette: `data:image/png;base64,${silhouette}`,
    clues,
  };

  // 6. Save to database
  console.log('\nSaving game data to database...');
  await saveGameData(gameData, mode.id);

  // 7. Mark aircraft as used
  await markAircraftUsed(aircraft.id, aircraft.name, mode.id);

  console.log(`\n${mode.name} generation complete!`);

  return {
    success: true,
    mode: mode.id,
    aircraft: { id: aircraft.id, name: aircraft.name, class: aircraft.className },
    date: gameDate,
    silhouetteSizeKB: Math.round(silhouette.length / 1024),
  };
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<VercelResponse> {
  // Check for manual trigger via query param
  const isManualTrigger = request.query.manual === 'true';
  const forceDate = typeof request.query.date === 'string' ? request.query.date : null;
  const generateAll = request.query.all === 'true';
  const requestedMode = typeof request.query.mode === 'string' ? request.query.mode : null;

  // Verify authorization
  const authHeader = request.headers.authorization;
  const querySecret = request.query.secret;

  const isAuthorized =
    !CRON_SECRET ||
    authHeader === `Bearer ${CRON_SECRET}` ||
    querySecret === CRON_SECRET;

  if (!isAuthorized) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const gameDate = forceDate || new Date().toISOString().split('T')[0];

  try {
    console.log('='.repeat(60));
    console.log(`Tally Game Generator (${isManualTrigger ? 'Manual Trigger' : 'Vercel Cron'})`);
    console.log(`Date: ${gameDate}`);
    if (request.query.all === 'everything') {
      console.log('Mode: ALL MODES (including main)');
    } else if (generateAll) {
      console.log('Mode: ALL BONUS MODES (excluding main)');
    } else if (requestedMode) {
      console.log(`Mode: ${requestedMode}`);
    } else {
      console.log('Mode: main (default)');
    }
    console.log('='.repeat(60));

    // Determine which modes to generate
    let modesToGenerate: GameModeId[];

    if (request.query.all === 'everything') {
      // Generate ALL modes including main
      modesToGenerate = ALL_MODE_IDS;
    } else if (generateAll) {
      // Generate all bonus modes (excludes main)
      modesToGenerate = BONUS_MODE_IDS;
    } else if (requestedMode && ALL_MODE_IDS.includes(requestedMode as GameModeId)) {
      modesToGenerate = [requestedMode as GameModeId];
    } else {
      // Default to main mode
      modesToGenerate = ['main'];
    }

    // Generate each mode
    const results: GenerationResult[] = [];

    for (const modeId of modesToGenerate) {
      const mode = GAME_MODES[modeId];
      // Only require trivia for main mode
      const requireTrivia = modeId === 'main';
      const result = await generateForMode(mode, gameDate, requireTrivia);
      results.push(result);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Generation Summary');
    console.log('='.repeat(60));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    for (const result of results) {
      if (result.success) {
        console.log(`  ✓ ${result.mode}: ${result.aircraft?.name} (${result.aircraft?.class})`);
      } else {
        console.log(`  ✗ ${result.mode}: ${result.error}`);
      }
    }

    console.log(`\nTotal: ${successful.length}/${results.length} modes generated successfully`);

    return response.status(200).json({
      success: failed.length === 0,
      date: gameDate,
      generated: successful.length,
      failed: failed.length,
      results,
    });
  } catch (error) {
    console.error('Generation failed:', error);
    return response.status(500).json({
      success: false,
      error: 'Generation failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
