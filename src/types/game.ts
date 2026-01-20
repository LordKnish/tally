/**
 * Game data types for Tally daily game UI.
 * Mirrors types from scripts/game-generator/src/types.ts for frontend use.
 */

/**
 * Specs clue shown on Turn 2.
 * Example: "Manufacturer: Lockheed Martin | Wingspan: 9.96m | First Flight: 1974"
 */
export interface SpecsClue {
  /** Aircraft class/role (e.g., "fighter aircraft", "bomber") - from Wikidata P31 */
  class: string | null;
  /** Manufacturer (e.g., "Lockheed Martin") - from Wikidata P176 */
  manufacturer: string | null;
  /** Wingspan (e.g., "9.96m") - from Wikidata P2050 */
  wingspan: string | null;
  /** First flight year (e.g., "1974") - from Wikidata P606 */
  firstFlight: string | null;
}

/**
 * Context clue shown on Turn 3.
 * Example: "Nation: USA | Conflicts: Gulf War, Afghanistan | Status: Active"
 */
export interface ContextClue {
  /** Country of origin (e.g., "United States") - from Wikidata P495 */
  nation: string;
  /** Notable conflicts the aircraft participated in - from Wikidata P607 */
  conflicts: string[];
  /** Current status (e.g., "In service", "Retired 2005") - from Wikidata P1308/P730 */
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
  /** Alternative names/designations for fuzzy matching (e.g., ["Viper", "Fighting Falcon"]) */
  aliases: string[];
}

/**
 * Type entry for search/autocomplete.
 */
export interface TypeListEntry {
  /** Synthetic ID based on normalized type name */
  id: string;
  /** Display name (e.g., "F-16 Fighting Falcon") */
  name: string;
}

/**
 * Complete game data output for a single day.
 * This is loaded from public/game-data.json
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
 * Result of a single guess.
 */
export type GuessResult = 'correct' | 'wrong';

/**
 * Current game state for UI rendering.
 */
export interface GameState {
  /** Current turn number (1-5) */
  currentTurn: number;
  /** Total turns allowed */
  totalTurns: number;
  /** Results of previous guesses */
  guessResults: GuessResult[];
  /** Whether game is complete */
  isComplete: boolean;
  /** Whether player won */
  isWin: boolean;
}

