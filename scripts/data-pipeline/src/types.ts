/**
 * Core ship data structure for Keel game.
 */
export interface Ship {
  /** Wikidata entity ID (e.g., "Q12345") */
  id: string;

  /** Ship name (e.g., "USS Enterprise") */
  name: string;

  /** Ship type (e.g., "aircraft carrier", "destroyer") */
  type: string;

  /** Wikidata ID of ship type */
  typeId: string;

  /** Ship class name (e.g., "Yorktown-class") */
  className?: string;

  /** Wikidata ID of ship class */
  classId?: string;

  /** Country of origin (e.g., "United States") */
  country?: string;

  /** Wikidata ID of country */
  countryId?: string;

  /** Wikimedia Commons image filename */
  imageFile?: string;

  /** Full Commons URL to image */
  imageUrl?: string;

  /** Wikipedia article title */
  wikipediaTitle?: string;

  /** Wikipedia article URL */
  wikipediaUrl?: string;

  /** Commissioned date (ISO string) */
  commissioned?: string;

  /** Decommissioned date (ISO string) */
  decommissioned?: string;

  /** Length in meters */
  length?: number;

  /** Beam (width) in meters */
  beam?: number;

  /** Wars/conflicts participated in */
  conflicts?: string[];

  /** Data quality flags */
  quality: {
    hasImage: boolean;
    hasClass: boolean;
    hasCountry: boolean;
    hasSpecs: boolean;
    hasWikipedia: boolean;
  };
}

/**
 * Result of a Wikidata SPARQL query.
 */
export interface WikidataResult {
  ship: { value: string };
  shipLabel: { value: string };
  type: { value: string };
  typeLabel: { value: string };
  image?: { value: string };
  class?: { value: string };
  classLabel?: { value: string };
  country?: { value: string };
  countryLabel?: { value: string };
  length?: { value: string };
  beam?: { value: string };
  commissioned?: { value: string };
  article?: { value: string };
}

/**
 * Sample dataset with metadata.
 */
export interface SampleDataset {
  version: string;
  fetchedAt: string;
  query: string;
  ships: Ship[];
  stats: {
    total: number;
    withImages: number;
    withClass: number;
    withCountry: number;
    withSpecs: number;
    withWikipedia: number;
    byType: Record<string, number>;
    byCountry: Record<string, number>;
  };
}
