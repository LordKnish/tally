/**
 * Aircraft type Wikidata entity IDs.
 */
export const AIRCRAFT_TYPES = {
  aircraft: 'Q11436',           // General aircraft
  fighterAircraft: 'Q127771',   // Fighter aircraft
  bomber: 'Q170877',            // Bomber
  transportAircraft: 'Q197380', // Transport aircraft
  helicopter: 'Q34486',         // Helicopter
  airliner: 'Q210932',          // Airliner
  uav: 'Q484000',               // Unmanned aerial vehicle
  militaryAircraft: 'Q216916',  // Military aircraft
  biplane: 'Q127134',           // Biplane (useful for WW1)
  jetAircraft: 'Q6879',         // Jet aircraft
} as const;

/**
 * Wikidata property IDs for aircraft.
 */
export const PROPERTIES = {
  instanceOf: 'P31',
  subclassOf: 'P279',
  image: 'P18',
  country: 'P17',              // Country of origin
  operator: 'P137',            // Operator (air force, airline)
  manufacturer: 'P176',        // Manufacturer
  length: 'P2043',             // Length
  wingspan: 'P2050',           // Wingspan
  height: 'P2048',             // Height
  maxTakeoffWeight: 'P2067',   // Maximum takeoff weight
  firstFlight: 'P619',         // Date of first flight
  introduced: 'P729',          // Service entry date
  retired: 'P730',             // Retirement date
  conflict: 'P607',            // Conflict participated in
  productionEnd: 'P2669',      // Production end date
  numberBuilt: 'P1092',        // Number built
} as const;

export interface QueryOptions {
  /** Aircraft type to query (defaults to all military aircraft) */
  aircraftType?: keyof typeof AIRCRAFT_TYPES;
  /** Only include aircraft with images */
  requireImage?: boolean;
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Build SPARQL query for aircraft with optional filters.
 */
export function buildAircraftQuery(options: QueryOptions = {}): string {
  const {
    aircraftType,
    requireImage = true,
    limit = 100,
    offset = 0,
  } = options;

  const typeFilter = aircraftType
    ? `wd:${AIRCRAFT_TYPES[aircraftType]}`
    : `wd:${AIRCRAFT_TYPES.militaryAircraft}`;

  // Use subclass traversal to include all aircraft types
  const instancePattern = aircraftType
    ? `?aircraft wdt:P31 ${typeFilter} .`
    : `?aircraft wdt:P31/wdt:P279* ${typeFilter} .`;

  const imagePattern = requireImage
    ? `?aircraft wdt:P18 ?image .`
    : `OPTIONAL { ?aircraft wdt:P18 ?image . }`;

  return `
SELECT DISTINCT
  ?aircraft ?aircraftLabel
  ?type ?typeLabel
  ?image
  ?country ?countryLabel
  ?manufacturer ?manufacturerLabel
  ?wingspan
  ?length
  ?maxTakeoffWeight
  ?firstFlight
  ?numberBuilt
  ?article
WHERE {
  ${instancePattern}
  ?aircraft wdt:P31 ?type .
  ${imagePattern}

  OPTIONAL { ?aircraft wdt:P17 ?country . }
  OPTIONAL { ?aircraft wdt:P176 ?manufacturer . }
  OPTIONAL { ?aircraft wdt:P2050 ?wingspan . }
  OPTIONAL { ?aircraft wdt:P2043 ?length . }
  OPTIONAL { ?aircraft wdt:P2067 ?maxTakeoffWeight . }
  OPTIONAL { ?aircraft wdt:P619 ?firstFlight . }
  OPTIONAL { ?aircraft wdt:P1092 ?numberBuilt . }

  # Get English Wikipedia article if exists
  OPTIONAL {
    ?article schema:about ?aircraft ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY ?aircraftLabel
LIMIT ${limit}
OFFSET ${offset}
  `.trim();
}

/**
 * Build query to count total aircraft with images.
 */
export function buildCountQuery(aircraftType?: keyof typeof AIRCRAFT_TYPES): string {
  const typeFilter = aircraftType
    ? `wd:${AIRCRAFT_TYPES[aircraftType]}`
    : `wd:${AIRCRAFT_TYPES.militaryAircraft}`;

  const instancePattern = aircraftType
    ? `?aircraft wdt:P31 ${typeFilter} .`
    : `?aircraft wdt:P31/wdt:P279* ${typeFilter} .`;

  return `
SELECT (COUNT(DISTINCT ?aircraft) AS ?count)
WHERE {
  ${instancePattern}
  ?aircraft wdt:P18 ?image .
}
  `.trim();
}

/**
 * Build query for specific mode filters.
 */
export function buildModeQuery(
  mode: 'main' | 'commercial' | 'ww2' | 'ww1' | 'helicopters' | 'drones',
  options: { limit?: number; offset?: number } = {}
): string {
  const { limit = 100, offset = 0 } = options;

  let typeFilter: string;
  let additionalFilters = '';

  switch (mode) {
    case 'main':
      // Modern military aircraft (1980+)
      typeFilter = `wd:${AIRCRAFT_TYPES.militaryAircraft}`;
      additionalFilters = `
        ?aircraft wdt:P619 ?firstFlight .
        FILTER(YEAR(?firstFlight) >= 1980)
      `;
      break;
    case 'commercial':
      // Airliners and commercial aircraft
      typeFilter = `wd:${AIRCRAFT_TYPES.airliner}`;
      additionalFilters = `
        ?aircraft wdt:P619 ?firstFlight .
        FILTER(YEAR(?firstFlight) >= 1980)
      `;
      break;
    case 'ww2':
      // WW2 era military aircraft (1935-1950)
      typeFilter = `wd:${AIRCRAFT_TYPES.militaryAircraft}`;
      additionalFilters = `
        ?aircraft wdt:P619 ?firstFlight .
        FILTER(YEAR(?firstFlight) >= 1935 && YEAR(?firstFlight) <= 1950)
      `;
      break;
    case 'ww1':
      // WW1 era aircraft (1910-1925)
      typeFilter = `wd:${AIRCRAFT_TYPES.aircraft}`;
      additionalFilters = `
        ?aircraft wdt:P619 ?firstFlight .
        FILTER(YEAR(?firstFlight) >= 1910 && YEAR(?firstFlight) <= 1925)
      `;
      break;
    case 'helicopters':
      // All helicopters
      typeFilter = `wd:${AIRCRAFT_TYPES.helicopter}`;
      break;
    case 'drones':
      // UAVs and unmanned aircraft
      typeFilter = `wd:${AIRCRAFT_TYPES.uav}`;
      break;
    default:
      typeFilter = `wd:${AIRCRAFT_TYPES.militaryAircraft}`;
  }

  return `
SELECT DISTINCT
  ?aircraft ?aircraftLabel
  ?type ?typeLabel
  ?image
  ?country ?countryLabel
  ?manufacturer ?manufacturerLabel
  ?wingspan
  ?length
  ?maxTakeoffWeight
  ?firstFlight
  ?numberBuilt
  ?article
WHERE {
  ?aircraft wdt:P31/wdt:P279* ${typeFilter} .
  ?aircraft wdt:P31 ?type .
  ?aircraft wdt:P18 ?image .
  ${additionalFilters}

  OPTIONAL { ?aircraft wdt:P17 ?country . }
  OPTIONAL { ?aircraft wdt:P176 ?manufacturer . }
  OPTIONAL { ?aircraft wdt:P2050 ?wingspan . }
  OPTIONAL { ?aircraft wdt:P2043 ?length . }
  OPTIONAL { ?aircraft wdt:P2067 ?maxTakeoffWeight . }
  OPTIONAL { ?aircraft wdt:P619 ?firstFlight . }
  OPTIONAL { ?aircraft wdt:P1092 ?numberBuilt . }

  OPTIONAL {
    ?article schema:about ?aircraft ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY ?aircraftLabel
LIMIT ${limit}
OFFSET ${offset}
  `.trim();
}

/**
 * Get the Wikidata SPARQL endpoint URL.
 */
export function getSparqlEndpoint(): string {
  return 'https://query.wikidata.org/sparql';
}

/**
 * Convert Commons filename to full URL.
 * The filename from Wikidata may already be URL-encoded, so we need to handle both cases.
 */
export function commonsFileToUrl(filename: string): string {
  // Remove "File:" prefix if present
  let cleanName = filename.replace(/^(File:|Image:)/i, '');

  // First decode if it's already URL-encoded (from Wikidata)
  try {
    cleanName = decodeURIComponent(cleanName);
  } catch {
    // If decoding fails, it wasn't encoded
  }

  // Replace spaces with underscores (Commons convention)
  cleanName = cleanName.replace(/ /g, '_');

  // Now properly encode for URL, but preserve underscores
  const encoded = encodeURIComponent(cleanName)
    .replace(/%5F/g, '_')  // Keep underscores
    .replace(/%2F/g, '/'); // Keep slashes if any

  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}`;
}

/**
 * Extract Wikidata entity ID from URI.
 * Example: "http://www.wikidata.org/entity/Q12345" -> "Q12345"
 */
export function extractEntityId(uri: string): string {
  const match = uri.match(/Q\d+$/);
  return match ? match[0] : uri;
}

// Legacy exports for backwards compatibility
/** @deprecated Use AIRCRAFT_TYPES instead */
export const SHIP_TYPES = AIRCRAFT_TYPES;
/** @deprecated Use buildAircraftQuery instead */
export const buildWarshipQuery = buildAircraftQuery;
