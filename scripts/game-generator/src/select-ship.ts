/**
 * Random ship selector from Wikidata.
 * Finds eligible ships based on mode filters and picks one randomly.
 */

import type { WikidataShipResult } from './types.js';
import type { ModeConfig } from './modes.js';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

const USER_AGENT =
  'Mozilla/5.0 (compatible; KeelGame/1.0; +https://github.com/keel-game)';

/**
 * Build year filter for SPARQL query based on mode config.
 */
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

/**
 * Build SPARQL query for counting eligible ships.
 * Requires: image, commissioned date, and length OR displacement.
 */
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
  ?ship wdt:P31 ?type .                   # Instance of specific ship type
  ?ship wdt:P18 ?image .                  # Has image
  ?ship wdt:P729 ?commissioned .          # Has commissioned date
  ?ship wdt:P289 ?class .                 # Has ship class (required)

  # Require at least length OR displacement
  OPTIONAL { ?ship wdt:P2043 ?length . }
  OPTIONAL { ?ship wdt:P2386 ?displacement . }
  FILTER(BOUND(?length) || BOUND(?displacement))

  ${yearFilter}

  # Must have English label (not Q-number)
  ?ship rdfs:label ?label .
  FILTER(LANG(?label) = "en")
  FILTER(!STRSTARTS(?label, "Q"))

  ${excludeFilter}
}
  `.trim();
}

/**
 * Build SPARQL query for fetching a ship at a specific offset.
 * Requires: length OR displacement for specs clue.
 */
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
  ?ship wdt:P31 ?type .                   # Instance of specific ship type
  ?ship wdt:P18 ?image .                  # Has image
  ?ship wdt:P729 ?commissioned .          # Has commissioned date
  ?ship wdt:P289 ?class .                 # Has ship class (required)

  # Require at least length OR displacement
  OPTIONAL { ?ship wdt:P2043 ?length . }
  OPTIONAL { ?ship wdt:P2386 ?displacement . }
  FILTER(BOUND(?length) || BOUND(?displacement))

  ${yearFilter}

  # Must have English label
  ?ship rdfs:label ?label .
  FILTER(LANG(?label) = "en")
  FILTER(!STRSTARTS(?label, "Q"))

  ${excludeFilter}

  # Optional properties
  OPTIONAL { ?ship wdt:P17 ?country . }
  OPTIONAL {
    ?ship wdt:P137 ?operator .
    OPTIONAL { ?operator wdt:P17 ?operatorCountry . }
  }
  OPTIONAL { ?ship wdt:P607 ?conflict . }         # Conflicts (optional)
  OPTIONAL { ?ship wdt:P730 ?decommissioned . }   # Date withdrawn from service
  OPTIONAL { ?ship wdt:P1308 ?status . }          # Officeholder status

  # Get English Wikipedia article if exists
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
 * Get count of eligible ships for a mode.
 */
async function getEligibleShipCount(excludeIds: string[], mode: ModeConfig): Promise<number> {
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

export interface SelectedShip {
  id: string;
  name: string;
  imageUrl: string;
  className: string;
  country: string | null;
  length: string | null;
  displacement: string | null;
  commissioned: string | null;
  decommissioned: string | null;
  status: string | null;
  conflicts: string[];
  wikipediaTitle: string | null;
}

/**
 * Select a random eligible ship from Wikidata for a specific mode.
 * Returns null if no eligible ships are available.
 */
export async function selectRandomShip(
  excludeIds: string[],
  mode: ModeConfig
): Promise<SelectedShip | null> {
  console.log(`Counting eligible ships for ${mode.name} (excluding ${excludeIds.length})...`);

  const count = await getEligibleShipCount(excludeIds, mode);
  console.log(`Found ${count} eligible ships`);

  if (count === 0) {
    return null;
  }

  // Pick random offset
  const offset = Math.floor(Math.random() * count);
  console.log(`Selecting ship at offset ${offset}...`);

  const query = buildShipQuery(excludeIds, offset, mode);
  const results = await executeSparql<WikidataShipResult>(query);

  if (results.length === 0) {
    console.warn('No ship found at offset, retrying...');
    // Try a different offset
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

/**
 * Parse Wikidata results into SelectedShip.
 * Aggregates conflicts from multiple result rows.
 */
function parseShipResult(results: WikidataShipResult[]): SelectedShip {
  const first = results[0];

  // Aggregate conflicts from all rows (query may return multiple rows per ship)
  const conflicts = new Set<string>();
  for (const row of results) {
    if (row.conflictLabel?.value) {
      conflicts.add(row.conflictLabel.value);
    }
  }

  // Get country - prefer direct country, fallback to operator's country
  let country: string | null = null;
  if (first.countryLabel?.value) {
    country = first.countryLabel.value;
  } else if (first.operatorCountryLabel?.value) {
    country = first.operatorCountryLabel.value;
  } else if (first.operatorLabel?.value) {
    // If we have operator but no country, use operator name as hint
    country = first.operatorLabel.value;
  }

  // Extract Wikipedia title from URL
  let wikipediaTitle: string | null = null;
  if (first.article?.value) {
    const match = first.article.value.match(/\/wiki\/(.+)$/);
    if (match) {
      wikipediaTitle = decodeURIComponent(match[1].replace(/_/g, ' '));
    }
  }

  // Determine status from decommissioned date or status label
  let status: string | null = null;
  const decommissioned = first.decommissioned?.value
    ? new Date(first.decommissioned.value).getFullYear().toString()
    : null;

  if (first.statusLabel?.value) {
    status = first.statusLabel.value;
  } else if (decommissioned) {
    status = `Decommissioned ${decommissioned}`;
  } else {
    // If no decommission date, assume active or status unknown
    // Check if it participated in recent conflicts to infer active status
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
    className: first.classLabel!.value,
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
