/**
 * Game data types for Tally daily game generation.
 */

/**
 * Specs clue shown on Turn 2.
 * Example: "Type: Multirole Fighter | Wingspan: 9.96m | Weight: 19,200 kg | First Flight: 1974"
 */
export interface SpecsClue {
  /** Aircraft type (e.g., "Multirole Fighter") */
  type: string | null;
  /** Maximum takeoff weight (e.g., "19,200 kg") */
  weight: string | null;
  /** Wingspan (e.g., "9.96m") */
  wingspan: string | null;
  /** First flight year (e.g., "1974") */
  firstFlight: string | null;
}

/**
 * Context clue shown on Turn 3.
 * Example: "Nation: USA | Operators: USAF, Israel, Turkey | Status: In Production"
 */
export interface ContextClue {
  /** Country of origin (e.g., "United States") */
  nation: string;
  /** List of operators/air forces */
  operators: string[];
  /** Current status (e.g., "In Production", "Retired", "Museum") */
  status: string | null;
}

/**
 * Complete clue set for all turns.
 */
export interface GameClues {
  /** Turn 2: Aircraft specifications */
  specs: SpecsClue;
  /** Turn 3: Historical context */
  context: ContextClue;
  /** Turn 4: Distinctive fact or trivia */
  trivia: string | null;
  /** Turn 5: Original photo URL */
  photo: string;
}

/**
 * Aircraft identity information for the game.
 */
export interface AircraftIdentity {
  /** Wikidata entity ID (e.g., "Q12345") */
  id: string;
  /** Primary display name (e.g., "F-16 Fighting Falcon") */
  name: string;
  /** Aircraft type/model name for matching (e.g., "F-16") */
  typeName: string;
  /** Alternative names/designations for fuzzy matching */
  aliases: string[];
}

/**
 * Complete game data output for a single day.
 * This is written to public/game-data.json
 */
export interface GameData {
  /** Date this game is for (ISO date: "2026-01-20") */
  date: string;
  /** Aircraft identity (hidden until win/loss) */
  aircraft: AircraftIdentity;
  /** Base64-encoded line art PNG */
  silhouette: string;
  /** All clues for turns 2-5 */
  clues: GameClues;
}

/**
 * Entry in the used aircraft tracking file.
 */
export interface UsedAircraftEntry {
  /** Wikidata entity ID */
  id: string;
  /** Aircraft name (for human readability) */
  name: string;
  /** Date when this aircraft was used */
  usedDate: string;
}

/**
 * Used aircraft tracking file structure.
 */
export interface UsedAircraftData {
  /** List of aircraft already featured */
  aircraft: UsedAircraftEntry[];
}

/**
 * Aircraft entry for autocomplete list.
 */
export interface AircraftListEntry {
  /** Primary name */
  name: string;
  /** Wikidata ID */
  id: string;
}

/**
 * Aircraft list for autocomplete (public/aircraft-list.json).
 */
export interface AircraftListData {
  /** Generated timestamp */
  generatedAt: string;
  /** Total aircraft count */
  count: number;
  /** All searchable aircraft */
  aircraft: AircraftListEntry[];
}

/**
 * Type entry for autocomplete list.
 */
export interface TypeListEntry {
  /** Synthetic ID based on normalized type name */
  id: string;
  /** Display name (e.g., "F-16 Fighting Falcon") */
  name: string;
}

/**
 * Type list for autocomplete (public/aircraft-list.json).
 */
export interface TypeListData {
  /** Generated timestamp */
  generatedAt: string;
  /** Total type count */
  count: number;
  /** All searchable types */
  types: TypeListEntry[];
}

/**
 * Raw aircraft data from Wikidata query.
 */
export interface WikidataAircraftResult {
  aircraft: { value: string };
  aircraftLabel: { value: string };
  image?: { value: string };
  type?: { value: string };
  typeLabel?: { value: string };
  country?: { value: string };
  countryLabel?: { value: string };
  manufacturer?: { value: string };
  manufacturerLabel?: { value: string };
  operator?: { value: string };
  operatorLabel?: { value: string };
  wingspan?: { value: string };
  length?: { value: string };
  maxTakeoffWeight?: { value: string };
  firstFlight?: { value: string };
  introduced?: { value: string };
  retired?: { value: string };
  status?: { value: string };
  statusLabel?: { value: string };
  conflict?: { value: string };
  conflictLabel?: { value: string };
  numberBuilt?: { value: string };
  article?: { value: string };
}

// Legacy aliases for backwards compatibility during migration
/** @deprecated Use AircraftIdentity instead */
export type ShipIdentity = AircraftIdentity;
/** @deprecated Use UsedAircraftEntry instead */
export type UsedShipEntry = UsedAircraftEntry;
/** @deprecated Use UsedAircraftData instead */
export type UsedShipsData = UsedAircraftData;
/** @deprecated Use AircraftListEntry instead */
export type ShipListEntry = AircraftListEntry;
/** @deprecated Use AircraftListData instead */
export type ShipListData = AircraftListData;
/** @deprecated Use TypeListEntry instead */
export type ClassListEntry = TypeListEntry;
/** @deprecated Use TypeListData instead */
export type ClassListData = TypeListData;
/** @deprecated Use WikidataAircraftResult instead */
export type WikidataShipResult = WikidataAircraftResult;
