import { useState, useEffect, useRef, useCallback } from 'react';
import Fuse from 'fuse.js';

/**
 * Class list entry from public/ship-list.json
 * Note: Named ShipListEntry for backward compatibility - represents a ship class
 */
export interface ShipListEntry {
  id: string;
  name: string;
}

/**
 * Class list data structure (from ship-list.json)
 */
interface ClassListData {
  generatedAt: string;
  count: number;
  classes: ShipListEntry[];
}

/**
 * Fuse.js search result with score
 */
interface FuseResult {
  item: ShipListEntry;
  score?: number;
}

/**
 * Hook return type
 */
export interface UseShipSearchReturn {
  search: (query: string) => ShipListEntry[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fuse.js configuration for fuzzy class name matching.
 * - threshold: 0.3 allows for typos while staying relevant
 * - ignoreLocation: true matches anywhere in the name
 * - minMatchCharLength: 2 requires at least 2 chars before matching
 */
const FUSE_OPTIONS = {
  keys: ['name'],
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
 * Custom hook for fuzzy ship class search using Fuse.js.
 * Loads class list from /ship-list.json and provides search functionality.
 *
 * @returns Object with search function, loading state, and error state
 *
 * @example
 * const { search, isLoading, error } = useShipSearch();
 * const results = search('Fletcher'); // Returns classes matching "Fletcher"
 */
export function useShipSearch(): UseShipSearchReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fuseRef = useRef<Fuse<ShipListEntry> | null>(null);

  // Load class list on mount
  useEffect(() => {
    async function loadClassList() {
      try {
        const response = await fetch('/ship-list.json');
        if (!response.ok) {
          throw new Error(`Failed to load class list: ${response.status}`);
        }
        const data: ClassListData = await response.json();
        fuseRef.current = new Fuse(data.classes, FUSE_OPTIONS);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error loading class list'));
      } finally {
        setIsLoading(false);
      }
    }

    loadClassList();
  }, []);

  /**
   * Search for classes matching the query string.
   * Returns empty array if query is too short or no matches found.
   */
  const search = useCallback((query: string): ShipListEntry[] => {
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
