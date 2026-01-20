/**
 * Game mode configuration for multi-mode support in Tally.
 * Defines filters for each game mode (year range, aircraft types).
 */

export type GameModeId = 'main' | 'commercial' | 'ww2' | 'ww1' | 'helicopters' | 'drones';

export interface ModeConfig {
  id: GameModeId;
  name: string;
  description: string;
  yearMin: number | null;  // null = no minimum
  yearMax: number | null;  // null = no maximum
  aircraftTypes: string[]; // Wikidata Q-IDs
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

/**
 * All game modes with their configuration.
 */
export const GAME_MODES: Record<GameModeId, ModeConfig> = {
  main: {
    id: 'main',
    name: 'Daily Tally',
    description: 'Modern military aircraft (1980+)',
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
    description: 'Airliners & business jets (1980+)',
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
    description: 'World War 2 military aircraft (1935-1950)',
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
    description: 'World War 1 aircraft (1910-1925)',
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
    description: 'Rotary-wing aircraft',
    yearMin: null,
    yearMax: null,
    aircraftTypes: [
      'Q34486',     // helicopter
    ],
  },
  drones: {
    id: 'drones',
    name: 'Drones',
    description: 'UAVs and unmanned aircraft',
    yearMin: null,
    yearMax: null,
    aircraftTypes: [
      'Q484000',    // UAV
    ],
  },
};

/**
 * All mode IDs in order.
 */
export const ALL_MODE_IDS: GameModeId[] = ['main', 'commercial', 'ww2', 'ww1', 'helicopters', 'drones'];

/**
 * Bonus mode IDs (excludes main).
 */
export const BONUS_MODE_IDS: GameModeId[] = ['commercial', 'ww2', 'ww1', 'helicopters', 'drones'];
