/**
 * Game mode types for multi-mode support in Tally frontend.
 */

export type GameModeId = 'main' | 'commercial' | 'ww2' | 'ww1' | 'helicopters' | 'drones';

export interface GameModeConfig {
  id: GameModeId;
  name: string;
  description: string;
  icon: string;
  dataFile: string;
  /** URL path for this mode (e.g., "/ww2", "/commercial") */
  path: string;
}

/**
 * All game modes with their frontend configuration.
 */
export const GAME_MODES: Record<GameModeId, GameModeConfig> = {
  main: {
    id: 'main',
    name: 'Daily Tally',
    description: 'Modern military aircraft (1980+)',
    icon: '✈️',
    dataFile: '/game-data-main.json',
    path: '/',
  },
  commercial: {
    id: 'commercial',
    name: 'Commercial',
    description: 'Airliners & business jets (1980+)',
    icon: '🛫',
    dataFile: '/game-data-commercial.json',
    path: '/commercial',
  },
  ww2: {
    id: 'ww2',
    name: 'WW2',
    description: 'World War 2 military aircraft',
    icon: '🎖️',
    dataFile: '/game-data-ww2.json',
    path: '/ww2',
  },
  ww1: {
    id: 'ww1',
    name: 'WW1',
    description: 'World War 1 aircraft',
    icon: '🔴',
    dataFile: '/game-data-ww1.json',
    path: '/ww1',
  },
  helicopters: {
    id: 'helicopters',
    name: 'Helicopters',
    description: 'Rotary-wing aircraft',
    icon: '🚁',
    dataFile: '/game-data-helicopters.json',
    path: '/helicopters',
  },
  drones: {
    id: 'drones',
    name: 'Drones',
    description: 'UAVs and unmanned aircraft',
    icon: '🤖',
    dataFile: '/game-data-drones.json',
    path: '/drones',
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

/**
 * Result of completing a mode.
 */
export interface ModeResult {
  isWin: boolean;
  guessCount: number;
  timeTaken: number;
  guessResults: ('correct' | 'wrong')[];
  aircraftId: string; // Track which aircraft this completion is for
}

/**
 * Daily completion tracking across all modes.
 */
export interface DailyCompletion {
  date: string;
  modes: Partial<Record<GameModeId, ModeResult>>;
}

/**
 * Get mode ID from URL path.
 * Returns 'main' if path doesn't match any mode.
 */
export function getModeByPath(path: string): GameModeId {
  const mode = ALL_MODE_IDS.find((modeId) => GAME_MODES[modeId].path === path);
  return mode || 'main';
}
