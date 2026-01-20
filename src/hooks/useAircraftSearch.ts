import { useState, useEffect, useRef, useCallback } from 'react';
import Fuse from 'fuse.js';

/**
 * Aircraft list entry from public/aircraft-list.json
 * Represents an aircraft type for the search autocomplete
 */
export interface AircraftListEntry {
  id: string;
  name: string;
  aliases?: string[];
}

/**
 * Aircraft list data structure (from aircraft-list.json)
 */
interface AircraftListData {
  generatedAt: string;
  count: number;
  aircraft: AircraftListEntry[];
}

/**
 * Fuse.js search result with score
 */
interface FuseResult {
  item: AircraftListEntry;
  score?: number;
}

/**
 * Hook return type
 */
export interface UseAircraftSearchReturn {
  search: (query: string) => AircraftListEntry[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fuse.js configuration for fuzzy aircraft name matching.
 * - threshold: 0.3 allows for typos while staying relevant
 * - ignoreLocation: true matches anywhere in the name
 * - minMatchCharLength: 2 requires at least 2 chars before matching
 * - keys: search both name and aliases
 */
const FUSE_OPTIONS = {
  keys: ['name', 'aliases'],
  threshold: 0.3,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

/**
 * Maximum number of search results to return
 */
const MAX_RESULTS = 8;

/**
 * Custom hook for fuzzy aircraft search using Fuse.js.
 * Loads aircraft list from /aircraft-list.json and provides search functionality.
 *
 * @returns Object with search function, loading state, and error state
 *
 * @example
 * const { search, isLoading, error } = useAircraftSearch();
 * const results = search('F-16'); // Returns aircraft matching "F-16"
 */
export function useAircraftSearch(): UseAircraftSearchReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fuseRef = useRef<Fuse<AircraftListEntry> | null>(null);

  // Load aircraft list on mount
  useEffect(() => {
    async function loadAircraftList() {
      try {
        const response = await fetch('/aircraft-list.json');
        if (!response.ok) {
          throw new Error(`Failed to load aircraft list: ${response.status}`);
        }
        const data: AircraftListData = await response.json();
        fuseRef.current = new Fuse(data.aircraft, FUSE_OPTIONS);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error loading aircraft list'));
      } finally {
        setIsLoading(false);
      }
    }

    loadAircraftList();
  }, []);

  /**
   * Search for aircraft matching the query string.
   * Returns empty array if query is too short or no matches found.
   */
  const search = useCallback((query: string): AircraftListEntry[] => {
    // Return empty if query is too short or Fuse not initialized
    if (!fuseRef.current || query.length < 2) {
      return [];
    }

    const results: FuseResult[] = fuseRef.current.search(query);
    return results.slice(0, MAX_RESULTS).map((result) => result.item);
  }, []);

  return {
    search,
    isLoading,
    error,
  };
}
