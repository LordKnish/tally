/**
 * Random aircraft selector from Wikidata.
 * Finds eligible aircraft based on mode filters and picks one randomly.
 */

import type { WikidataAircraftResult } from './types.js';
import type { ModeConfig } from './modes.js';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

const USER_AGENT =
  'Mozilla/5.0 (compatible; TallyGame/1.0; +https://github.com/tally-game)';

/**
 * Build year filter for SPARQL query based on mode config.
 * Uses first flight date (P619) instead of commissioned date.
 */
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

/**
 * Build SPARQL query for counting eligible aircraft.
 * Requires: image, first flight date, and wingspan OR length.
 */
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
  ?aircraft wdt:P31 ?type .                # Instance of specific aircraft type
  ?aircraft wdt:P18 ?image .               # Has image
  ?aircraft wdt:P619 ?firstFlight .        # Has first flight date

  # Require at least wingspan OR length
  OPTIONAL { ?aircraft wdt:P2050 ?wingspan . }
  OPTIONAL { ?aircraft wdt:P2043 ?length . }
  FILTER(BOUND(?wingspan) || BOUND(?length))

  ${yearFilter}

  # Must have English label (not Q-number)
  ?aircraft rdfs:label ?label .
  FILTER(LANG(?label) = "en")
  FILTER(!STRSTARTS(?label, "Q"))

  ${excludeFilter}
}
  `.trim();
}

/**
 * Build SPARQL query for fetching an aircraft at a specific offset.
 * Requires: wingspan OR length for specs clue.
 */
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
  ?type ?typeLabel
  ?country ?countryLabel
  ?manufacturer ?manufacturerLabel
  ?operator ?operatorLabel
  ?wingspan ?length
  ?maxTakeoffWeight
  ?firstFlight
  ?numberBuilt
  ?introduced
  ?retired
  ?status ?statusLabel
  ?article
WHERE {
  VALUES ?type { ${typeValues} }
  ?aircraft wdt:P31 ?type .                # Instance of specific aircraft type
  ?aircraft wdt:P18 ?image .               # Has image
  ?aircraft wdt:P619 ?firstFlight .        # Has first flight date

  # Require at least wingspan OR length
  OPTIONAL { ?aircraft wdt:P2050 ?wingspan . }
  OPTIONAL { ?aircraft wdt:P2043 ?length . }
  FILTER(BOUND(?wingspan) || BOUND(?length))

  ${yearFilter}

  # Must have English label
  ?aircraft rdfs:label ?label .
  FILTER(LANG(?label) = "en")
  FILTER(!STRSTARTS(?label, "Q"))

  ${excludeFilter}

  # Optional properties
  OPTIONAL { ?aircraft wdt:P17 ?country . }
  OPTIONAL { ?aircraft wdt:P176 ?manufacturer . }
  OPTIONAL { ?aircraft wdt:P137 ?operator . }
  OPTIONAL { ?aircraft wdt:P2067 ?maxTakeoffWeight . }
  OPTIONAL { ?aircraft wdt:P1092 ?numberBuilt . }
  OPTIONAL { ?aircraft wdt:P729 ?introduced . }       # Service entry date
  OPTIONAL { ?aircraft wdt:P730 ?retired . }          # Retirement date
  OPTIONAL { ?aircraft wdt:P1308 ?status . }          # Status

  # Get English Wikipedia article if exists
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

/**
 * Execute a SPARQL query against Wikidata.
 */
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

  const data = await response.json();
  return data.results.bindings as T[];
}

/**
 * Get count of eligible aircraft for a mode.
 */
async function getEligibleAircraftCount(excludeIds: string[], mode: ModeConfig): Promise<number> {
  const query = buildCountQuery(excludeIds, mode);
  const results = await executeSparql<{ count: { value: string } }>(query);

  if (results.length === 0) {
    return 0;
  }

  return parseInt(results[0].count.value, 10);
}

/**
 * Extract Wikidata entity ID from URI.
 */
function extractEntityId(uri: string): string {
  const match = uri.match(/Q\d+$/);
  return match ? match[0] : uri;
}

/**
 * Convert Commons filename to full URL.
 */
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

export interface SelectedAircraft {
  id: string;
  name: string;
  imageUrl: string;
  typeName: string;
  country: string | null;
  manufacturer: string | null;
  wingspan: string | null;
  length: string | null;
  maxTakeoffWeight: string | null;
  firstFlight: string | null;
  introduced: string | null;
  retired: string | null;
  status: string | null;
  operators: string[];
  numberBuilt: string | null;
  wikipediaTitle: string | null;
}

/**
 * Select a random eligible aircraft from Wikidata for a specific mode.
 * Returns null if no eligible aircraft are available.
 */
export async function selectRandomAircraft(
  excludeIds: string[],
  mode: ModeConfig
): Promise<SelectedAircraft | null> {
  console.log(`Counting eligible aircraft for ${mode.name} (excluding ${excludeIds.length})...`);

  const count = await getEligibleAircraftCount(excludeIds, mode);
  console.log(`Found ${count} eligible aircraft`);

  if (count === 0) {
    return null;
  }

  // Pick random offset
  const offset = Math.floor(Math.random() * count);
  console.log(`Selecting aircraft at offset ${offset}...`);

  const query = buildAircraftQuery(excludeIds, offset, mode);
  const results = await executeSparql<WikidataAircraftResult>(query);

  if (results.length === 0) {
    console.warn('No aircraft found at offset, retrying...');
    // Try a different offset
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

/**
 * Parse Wikidata results into SelectedAircraft.
 * Aggregates operators from multiple result rows.
 */
function parseAircraftResult(results: WikidataAircraftResult[]): SelectedAircraft {
  const first = results[0];

  // Aggregate operators from all rows (query may return multiple rows per aircraft)
  const operators = new Set<string>();
  for (const row of results) {
    if (row.operatorLabel?.value) {
      operators.add(row.operatorLabel.value);
    }
  }

  // Get country
  const country = first.countryLabel?.value || null;

  // Get manufacturer
  const manufacturer = first.manufacturerLabel?.value || null;

  // Extract Wikipedia title from URL
  let wikipediaTitle: string | null = null;
  if (first.article?.value) {
    const match = first.article.value.match(/\/wiki\/(.+)$/);
    if (match) {
      wikipediaTitle = decodeURIComponent(match[1].replace(/_/g, ' '));
    }
  }

  // Determine status from retired date or status label
  let status: string | null = null;
  const retired = first.retired?.value
    ? new Date(first.retired.value).getFullYear().toString()
    : null;

  if (first.statusLabel?.value) {
    status = first.statusLabel.value;
  } else if (retired) {
    status = `Retired ${retired}`;
  } else if (first.numberBuilt?.value) {
    const numBuilt = parseInt(first.numberBuilt.value, 10);
    if (numBuilt > 1000) {
      status = `${numBuilt.toLocaleString()} built`;
    }
  }

  // Format max takeoff weight
  let maxTakeoffWeight: string | null = null;
  if (first.maxTakeoffWeight?.value) {
    const weight = parseFloat(first.maxTakeoffWeight.value);
    if (weight > 1000) {
      maxTakeoffWeight = `${Math.round(weight / 1000).toLocaleString()} tonnes`;
    } else {
      maxTakeoffWeight = `${Math.round(weight).toLocaleString()} kg`;
    }
  }

  // Get aircraft type label
  const typeName = first.typeLabel?.value || 'Aircraft';

  return {
    id: extractEntityId(first.aircraft.value),
    name: first.aircraftLabel.value,
    imageUrl: first.image?.value
      ? commonsFileToUrl(first.image.value.split('/').pop() || '')
      : '',
    typeName,
    country,
    manufacturer,
    wingspan: first.wingspan?.value ? `${parseFloat(first.wingspan.value).toFixed(1)}m` : null,
    length: first.length?.value ? `${parseFloat(first.length.value).toFixed(1)}m` : null,
    maxTakeoffWeight,
    firstFlight: first.firstFlight?.value
      ? new Date(first.firstFlight.value).getFullYear().toString()
      : null,
    introduced: first.introduced?.value
      ? new Date(first.introduced.value).getFullYear().toString()
      : null,
    retired,
    status,
    operators: Array.from(operators),
    numberBuilt: first.numberBuilt?.value || null,
    wikipediaTitle,
  };
}

// Legacy alias for backwards compatibility
/** @deprecated Use selectRandomAircraft instead */
export const selectRandomShip = selectRandomAircraft;
/** @deprecated Use SelectedAircraft instead */
export type SelectedShip = SelectedAircraft;
