/**
 * Hook for tracking game mode completion in localStorage.
 * Persists completion state across page refreshes and resets daily.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  type GameModeId,
  type ModeResult,
  type DailyCompletion,
  ALL_MODE_IDS,
} from '../types/modes';

const STORAGE_KEY = 'tally-daily-completion';
const LEGACY_STORAGE_KEY = 'keel-daily-completion';

/**
 * Get today's date in ISO format (YYYY-MM-DD).
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0] as string;
}

/**
 * Migrate data from legacy key if present.
 * Preserves user data from the old keel-daily-completion key.
 */
function migrateFromLegacyKey(): void {
  try {
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    const newData = localStorage.getItem(STORAGE_KEY);

    // Only migrate if legacy data exists and new key doesn't
    if (legacyData && !newData) {
      localStorage.setItem(STORAGE_KEY, legacyData);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else if (legacyData && newData) {
      // Both exist - just remove legacy key
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // Silently ignore migration errors
  }
}

/**
 * Load completion data from localStorage.
 * Returns empty completion if data is missing or from a different day.
 */
function loadCompletion(): DailyCompletion {
  try {
    // Attempt migration from legacy key
    migrateFromLegacyKey();

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { date: getToday(), modes: {} };
    }

    const data: DailyCompletion = JSON.parse(stored);
    // Reset if different day
    if (data.date !== getToday()) {
      return { date: getToday(), modes: {} };
    }
    return data;
  } catch {
    return { date: getToday(), modes: {} };
  }
}

/**
 * Save completion data to localStorage.
 */
function saveCompletion(data: DailyCompletion): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('Failed to save completion to localStorage');
  }
}

/**
 * Hook for tracking mode completion.
 *
 * @param mode - The game mode to track
 * @returns Completion state and functions
 */
export function useModeCompletion(mode: GameModeId) {
  const [completion, setCompletion] = useState<DailyCompletion>(loadCompletion);

  // Sync with localStorage on mount and when mode changes
  useEffect(() => {
    setCompletion(loadCompletion());
  }, [mode]);

  // Check if this mode is complete
  const isComplete = !!completion.modes[mode];
  const result = completion.modes[mode];

  // Mark the current mode as complete
  const markComplete = useCallback(
    (modeResult: ModeResult) => {
      setCompletion((prev) => {
        const updated: DailyCompletion = {
          date: getToday(),
          modes: { ...prev.modes, [mode]: modeResult },
        };
        saveCompletion(updated);
        return updated;
      });
    },
    [mode]
  );

  // Get the next playable mode (first incomplete mode)
  const getNextPlayableMode = useCallback((): GameModeId | null => {
    for (const modeId of ALL_MODE_IDS) {
      if (!completion.modes[modeId]) {
        return modeId;
      }
    }
    return null; // All modes complete
  }, [completion.modes]);

  return {
    /** Whether the current mode is complete */
    isComplete,
    /** The result if complete, undefined otherwise */
    result,
    /** Mark the current mode as complete with result */
    markComplete,
    /** All completion data for all modes */
    allCompletions: completion.modes,
    /** Get the next playable (incomplete) mode */
    getNextPlayableMode,
  };
}
