/**
 * Vercel Serverless Function for game generation.
 * Triggered by Vercel Cron at 12:00 AM UTC daily (main mode).
 * Can also be triggered manually for any mode.
 *
 * Query parameters:
 *   mode: 'main' | 'ww2' | 'coldwar' | 'carrier' | 'submarine' | 'coastguard'
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
  displacement: string | null;
  length: string | null;
  commissioned: string | null;
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

interface ShipIdentity {
  id: string;
  name: string;
  aliases: string[];
}

interface GameData {
  date: string;
  ship: ShipIdentity;
  silhouette: string;
  clues: GameClues;
}

interface WikidataShipResult {
  ship: { value: string };
  shipLabel: { value: string };
  image?: { value: string };
  class?: { value: string };
  classLabel?: { value: string };
  country?: { value: string };
  countryLabel?: { value: string };
  operator?: { value: string };
  operatorLabel?: { value: string };
  operatorCountry?: { value: string };
  operatorCountryLabel?: { value: string };
  length?: { value: string };
  displacement?: { value: string };
  commissioned?: { value: string };
  decommissioned?: { value: string };
  status?: { value: string };
  statusLabel?: { value: string };
  conflict?: { value: string };
  conflictLabel?: { value: string };
  article?: { value: string };
}

interface SelectedShip {
  id: string;
  name: string;
  imageUrl: string;
  className: string | null;
  country: string | null;
  length: string | null;
  displacement: string | null;
  commissioned: string | null;
  decommissioned: string | null;
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
const USER_AGENT = 'Mozilla/5.0 (compatible; KeelGame/1.0; +https://github.com/keel-game)';
const CRON_SECRET = process.env.CRON_SECRET;

// ============================================================================
// Game Mode Configuration
// ============================================================================

type GameModeId = 'main' | 'ww2' | 'coldwar' | 'carrier' | 'submarine' | 'coastguard';

interface ModeConfig {
  id: GameModeId;
  name: string;
  yearMin: number | null;
  yearMax: number | null;
  shipTypes: string[];
}

const GAME_MODES: Record<GameModeId, ModeConfig> = {
  main: {
    id: 'main',
    name: 'Daily Keel',
    yearMin: 1980,
    yearMax: null,
    shipTypes: ['Q174736', 'Q182531', 'Q17205', 'Q104843', 'Q161705', 'Q170013', 'Q2811', 'Q2607934'],
  },
  ww2: {
    id: 'ww2',
    name: 'WW2',
    yearMin: 1939,
    yearMax: 1945,
    shipTypes: ['Q174736', 'Q182531', 'Q17205', 'Q104843', 'Q161705', 'Q170013', 'Q2811'],
  },
  coldwar: {
    id: 'coldwar',
    name: 'Cold War',
    yearMin: 1947,
    yearMax: 1991,
    shipTypes: ['Q174736', 'Q182531', 'Q17205', 'Q104843', 'Q161705', 'Q170013', 'Q2811'],
  },
  carrier: {
    id: 'carrier',
    name: 'Aircraft Carrier',
    yearMin: null,
    yearMax: null,
    shipTypes: ['Q17205'],
  },
  submarine: {
    id: 'submarine',
    name: 'Submarine',
    yearMin: null,
    yearMax: null,
    shipTypes: ['Q4818021', 'Q2811', 'Q683570', 'Q17005311', 'Q757587', 'Q757554'],
  },
  coastguard: {
    id: 'coastguard',
    name: 'Small Ships',
    yearMin: null,
    yearMax: null,
    shipTypes: ['Q331795', 'Q11479409', 'Q10316200', 'Q683363'],
  },
};

const ALL_MODE_IDS: GameModeId[] = ['main', 'ww2', 'coldwar', 'carrier', 'submarine', 'coastguard'];
const BONUS_MODE_IDS: GameModeId[] = ['ww2', 'coldwar', 'carrier', 'submarine', 'coastguard'];

// Legacy constant for backward compatibility
const SHIP_TYPES = GAME_MODES.main.shipTypes;

// ============================================================================
// Database Functions (Neon PostgreSQL)
// ============================================================================

async function getUsedShipIds(mode: GameModeId = 'main'): Promise<string[]> {
  try {
    const result = await sql`SELECT wikidata_id FROM used_ships WHERE mode = ${mode}`;
    return result.rows.map((row) => row.wikidata_id);
  } catch (error) {
    console.error(`Failed to fetch used ships for ${mode}:`, error);
    return [];
  }
}

async function markShipUsed(id: string, name: string, mode: GameModeId = 'main'): Promise<void> {
  try {
    await sql`
      INSERT INTO used_ships (wikidata_id, name, used_date, mode)
      VALUES (${id}, ${name}, CURRENT_DATE, ${mode})
      ON CONFLICT (wikidata_id, mode) DO NOTHING
    `;
    console.log(`Marked ${name} (${id}) as used in ${mode}`);
  } catch (error) {
    console.error('Failed to mark ship as used:', error);
    throw error;
  }
}

async function saveGameData(gameData: GameData, mode: GameModeId = 'main'): Promise<void> {
  const { date, ship, silhouette, clues } = gameData;

  // Convert arrays to PostgreSQL array format
  const aliasesArray = `{${ship.aliases.map(a => `"${a.replace(/"/g, '\\"')}"`).join(',')}}`;
  const conflictsArray = `{${clues.context.conflicts.map(c => `"${c.replace(/"/g, '\\"')}"`).join(',')}}`;

  try {
    await sql`
      INSERT INTO game_data (
        game_date,
        mode,
        ship_id,
        ship_name,
        ship_aliases,
        silhouette,
        clues_specs_class,
        clues_specs_displacement,
        clues_specs_length,
        clues_specs_commissioned,
        clues_context_nation,
        clues_context_conflicts,
        clues_context_status,
        clues_trivia,
        clues_photo
      ) VALUES (
        ${date}::date,
        ${mode},
        ${ship.id},
        ${ship.name},
        ${aliasesArray}::text[],
        ${silhouette},
        ${clues.specs.class},
        ${clues.specs.displacement},
        ${clues.specs.length},
        ${clues.specs.commissioned},
        ${clues.context.nation},
        ${conflictsArray}::text[],
        ${clues.context.status},
        ${clues.trivia},
        ${clues.photo}
      )
      ON CONFLICT (game_date, mode) DO UPDATE SET
        ship_id = EXCLUDED.ship_id,
        ship_name = EXCLUDED.ship_name,
        ship_aliases = EXCLUDED.ship_aliases,
        silhouette = EXCLUDED.silhouette,
        clues_specs_class = EXCLUDED.clues_specs_class,
        clues_specs_displacement = EXCLUDED.clues_specs_displacement,
        clues_specs_length = EXCLUDED.clues_specs_length,
        clues_specs_commissioned = EXCLUDED.clues_specs_commissioned,
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
    return `FILTER(YEAR(?commissioned) >= ${mode.yearMin} && YEAR(?commissioned) <= ${mode.yearMax})`;
  }
  if (mode.yearMin !== null) {
    return `FILTER(YEAR(?commissioned) >= ${mode.yearMin})`;
  }
  if (mode.yearMax !== null) {
    return `FILTER(YEAR(?commissioned) <= ${mode.yearMax})`;
  }
  return ''; // No year filter
}

function buildCountQuery(excludeIds: string[], mode: ModeConfig): string {
  const excludeFilter =
    excludeIds.length > 0
      ? `FILTER(?ship NOT IN (${excludeIds.map((id) => `wd:${id}`).join(', ')}))`
      : '';

  const typeValues = mode.shipTypes.map((t) => `wd:${t}`).join(' ');
  const yearFilter = buildYearFilter(mode);

  return `
SELECT (COUNT(DISTINCT ?ship) AS ?count)
WHERE {
  VALUES ?type { ${typeValues} }
  ?ship wdt:P31 ?type .
  ?ship wdt:P18 ?image .
  ?ship wdt:P729 ?commissioned .
  ?ship wdt:P289 ?class .

  OPTIONAL { ?ship wdt:P2043 ?length . }
  OPTIONAL { ?ship wdt:P2386 ?displacement . }
  FILTER(BOUND(?length) || BOUND(?displacement))

  ${yearFilter}

  ?ship rdfs:label ?label .
  FILTER(LANG(?label) = "en")
  FILTER(!STRSTARTS(?label, "Q"))

  ${excludeFilter}
}
  `.trim();
}

function buildShipQuery(excludeIds: string[], offset: number, mode: ModeConfig): string {
  const excludeFilter =
    excludeIds.length > 0
      ? `FILTER(?ship NOT IN (${excludeIds.map((id) => `wd:${id}`).join(', ')}))`
      : '';

  const typeValues = mode.shipTypes.map((t) => `wd:${t}`).join(' ');
  const yearFilter = buildYearFilter(mode);

  return `
SELECT DISTINCT
  ?ship ?shipLabel
  ?image
  ?class ?classLabel
  ?country ?countryLabel
  ?operator ?operatorLabel
  ?operatorCountry ?operatorCountryLabel
  ?length ?displacement
  ?commissioned
  ?conflict ?conflictLabel
  ?decommissioned
  ?status ?statusLabel
  ?article
WHERE {
  VALUES ?type { ${typeValues} }
  ?ship wdt:P31 ?type .
  ?ship wdt:P18 ?image .
  ?ship wdt:P729 ?commissioned .
  ?ship wdt:P289 ?class .

  OPTIONAL { ?ship wdt:P2043 ?length . }
  OPTIONAL { ?ship wdt:P2386 ?displacement . }
  FILTER(BOUND(?length) || BOUND(?displacement))

  ${yearFilter}

  ?ship rdfs:label ?label .
  FILTER(LANG(?label) = "en")
  FILTER(!STRSTARTS(?label, "Q"))

  ${excludeFilter}

  OPTIONAL { ?ship wdt:P17 ?country . }
  OPTIONAL {
    ?ship wdt:P137 ?operator .
    OPTIONAL { ?operator wdt:P17 ?operatorCountry . }
  }
  OPTIONAL { ?ship wdt:P607 ?conflict . }
  OPTIONAL { ?ship wdt:P730 ?decommissioned . }
  OPTIONAL { ?ship wdt:P1308 ?status . }

  OPTIONAL {
    ?article schema:about ?ship ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY ?shipLabel
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

async function getEligibleShipCount(excludeIds: string[], mode: ModeConfig): Promise<number> {
  const query = buildCountQuery(excludeIds, mode);
  const results = await executeSparql<{ count: { value: string } }>(query);

  if (results.length === 0) {
    return 0;
  }

  return parseInt(results[0].count.value, 10);
}

// ============================================================================
// Ship Selection Functions
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

function parseShipResult(results: WikidataShipResult[]): SelectedShip {
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
  } else if (first.operatorCountryLabel?.value) {
    country = first.operatorCountryLabel.value;
  } else if (first.operatorLabel?.value) {
    country = first.operatorLabel.value;
  }

  let wikipediaTitle: string | null = null;
  if (first.article?.value) {
    const match = first.article.value.match(/\/wiki\/(.+)$/);
    if (match) {
      wikipediaTitle = decodeURIComponent(match[1].replace(/_/g, ' '));
    }
  }

  let status: string | null = null;
  const decommissioned = first.decommissioned?.value
    ? new Date(first.decommissioned.value).getFullYear().toString()
    : null;

  if (first.statusLabel?.value) {
    status = first.statusLabel.value;
  } else if (decommissioned) {
    status = `Decommissioned ${decommissioned}`;
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

  return {
    id: extractEntityId(first.ship.value),
    name: first.shipLabel.value,
    imageUrl: first.image?.value
      ? commonsFileToUrl(first.image.value.split('/').pop() || '')
      : '',
    className: first.classLabel?.value || null,
    country,
    length: first.length?.value ? `${Math.round(parseFloat(first.length.value))}m` : null,
    displacement: first.displacement?.value
      ? `${Math.round(parseFloat(first.displacement.value)).toLocaleString()} tons`
      : null,
    commissioned: first.commissioned?.value
      ? new Date(first.commissioned.value).getFullYear().toString()
      : null,
    decommissioned,
    status,
    conflicts: Array.from(conflicts),
    wikipediaTitle,
  };
}

async function selectRandomShip(excludeIds: string[], mode: ModeConfig): Promise<SelectedShip | null> {
  console.log(`Counting eligible ships for ${mode.name} (excluding ${excludeIds.length})...`);

  const count = await getEligibleShipCount(excludeIds, mode);
  console.log(`Found ${count} eligible ships`);

  if (count === 0) {
    return null;
  }

  const offset = Math.floor(Math.random() * count);
  console.log(`Selecting ship at offset ${offset}...`);

  const query = buildShipQuery(excludeIds, offset, mode);
  const results = await executeSparql<WikidataShipResult>(query);

  if (results.length === 0) {
    console.warn('No ship found at offset, retrying...');
    const newOffset = Math.floor(Math.random() * count);
    const retryResults = await executeSparql<WikidataShipResult>(
      buildShipQuery(excludeIds, newOffset, mode)
    );
    if (retryResults.length === 0) {
      return null;
    }
    return parseShipResult(retryResults);
  }

  return parseShipResult(results);
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
    'famous', 'notable', 'first', 'last', 'only', 'largest', 'fastest',
    'sunk', 'battle', 'war', 'attack', 'served', 'participated',
    'known for', 'renamed', 'converted', 'museum', 'memorial',
    'preserved', 'film', 'movie',
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

function buildSpecsClue(ship: SelectedShip): SpecsClue {
  return {
    class: ship.className,
    displacement: ship.displacement,
    length: ship.length,
    commissioned: ship.commissioned,
  };
}

function buildContextClue(ship: SelectedShip): ContextClue {
  return {
    nation: ship.country || 'Unknown',
    conflicts: ship.conflicts,
    status: ship.status,
  };
}

async function fetchClues(ship: SelectedShip): Promise<GameClues> {
  console.log(`Fetching clues for ${ship.name}...`);

  let trivia: string | null = null;
  if (ship.wikipediaTitle) {
    console.log(`  Fetching Wikipedia summary for ${ship.wikipediaTitle}...`);
    const summary = await fetchWikipediaSummary(ship.wikipediaTitle);
    trivia = extractTrivia(summary);
    if (trivia) {
      console.log(`  Found trivia: "${trivia.substring(0, 50)}..."`);
    }
  }

  return {
    specs: buildSpecsClue(ship),
    context: buildContextClue(ship),
    trivia,
    photo: ship.imageUrl,
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
  ship?: { id: string; name: string; class: string | null };
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

  // 1. Load used ships for this mode
  const usedIds = await getUsedShipIds(mode.id);
  console.log(`Used ships in ${mode.id}: ${usedIds.length}`);

  // 2. Select random ship (with trivia if required)
  const excludeIds = [...usedIds];
  let ship: SelectedShip | null = null;
  let clues: GameClues | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\nSelecting random ship (attempt ${attempt}/${MAX_RETRIES})...`);
    ship = await selectRandomShip(excludeIds, mode);

    if (!ship) {
      return {
        success: false,
        mode: mode.id,
        error: 'No eligible ships found',
      };
    }

    console.log(`\nSelected: ${ship.name} (${ship.id})`);
    console.log(`  Country: ${ship.country || 'Unknown'}`);
    console.log(`  Class: ${ship.className || 'Unknown'}`);
    console.log(`  Commissioned: ${ship.commissioned || 'Unknown'}`);

    // 3. Fetch clues
    console.log('\nFetching clue data...');
    clues = await fetchClues(ship);

    if (!requireTrivia || clues.trivia) {
      if (clues.trivia) {
        console.log('  Trivia found, proceeding with this ship.');
      }
      break;
    }

    console.log('  No trivia found, trying another ship...');
    excludeIds.push(ship.id);
    ship = null;
    clues = null;
  }

  if (!ship || !clues) {
    return {
      success: false,
      mode: mode.id,
      error: requireTrivia
        ? `No ship with trivia found after ${MAX_RETRIES} attempts`
        : 'No eligible ships found',
    };
  }

  // 4. Generate line art
  console.log('\nGenerating line art...');
  let silhouette: string;
  try {
    silhouette = await generateLineArtFromUrl(ship.imageUrl);
  } catch (error) {
    return {
      success: false,
      mode: mode.id,
      error: `Failed to generate line art: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // 5. Build game data
  const shipIdentity: ShipIdentity = {
    id: ship.id,
    name: ship.name,
    aliases: [],
  };

  if (ship.className) {
    shipIdentity.aliases.push(ship.className);
  }

  const gameData: GameData = {
    date: gameDate,
    ship: shipIdentity,
    silhouette: `data:image/png;base64,${silhouette}`,
    clues,
  };

  // 6. Save to database
  console.log('\nSaving game data to database...');
  await saveGameData(gameData, mode.id);

  // 7. Mark ship as used
  await markShipUsed(ship.id, ship.name, mode.id);

  console.log(`\n${mode.name} generation complete!`);

  return {
    success: true,
    mode: mode.id,
    ship: { id: ship.id, name: ship.name, class: ship.className },
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
    console.log(`Keel Game Generator (${isManualTrigger ? 'Manual Trigger' : 'Vercel Cron'})`);
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
        console.log(`  ✓ ${result.mode}: ${result.ship?.name} (${result.ship?.class})`);
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
