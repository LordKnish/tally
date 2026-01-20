import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useShipSearch } from './useShipSearch';

// Mock class list data (ship-list.json now contains classes)
const mockClassList = {
  generatedAt: '2026-01-18T00:00:00Z',
  count: 5,
  classes: [
    { id: 'class:fletcher-class-destroyer', name: 'Fletcher-class destroyer' },
    { id: 'class:nimitz-class-carrier', name: 'Nimitz-class aircraft carrier' },
    { id: 'class:type-23-frigate', name: 'Type 23 frigate' },
    { id: 'class:bismarck-class-battleship', name: 'Bismarck-class battleship' },
    { id: 'class:yamato-class-battleship', name: 'Yamato-class battleship' },
  ],
};

describe('useShipSearch', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockClassList),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns loading true initially', () => {
    const { result } = renderHook(() => useShipSearch());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns loading false after class list loads', async () => {
    const { result } = renderHook(() => useShipSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns error null when load succeeds', async () => {
    const { result } = renderHook(() => useShipSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
  });

  it('returns error when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useShipSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('returns error when response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const { result } = renderHook(() => useShipSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('404');
  });

  it('search returns empty array for query shorter than 2 chars', async () => {
    const { result } = renderHook(() => useShipSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.search('F')).toEqual([]);
    expect(result.current.search('')).toEqual([]);
  });

  it('search returns matching classes', async () => {
    const { result } = renderHook(() => useShipSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const results = result.current.search('Fletcher');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toContain('Fletcher');
  });

  it('search handles fuzzy matching', async () => {
    const { result } = renderHook(() => useShipSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should find Bismarck even with a typo
    const results = result.current.search('Bismark');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toContain('Bismarck');
  });

  it('search returns max 8 results', async () => {
    // Create a mock with more than 8 matching classes
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          generatedAt: '2026-01-18T00:00:00Z',
          count: 10,
          classes: [
            { id: 'class:type-1', name: 'Type 1 frigate' },
            { id: 'class:type-2', name: 'Type 2 frigate' },
            { id: 'class:type-3', name: 'Type 3 frigate' },
            { id: 'class:type-4', name: 'Type 4 frigate' },
            { id: 'class:type-5', name: 'Type 5 frigate' },
            { id: 'class:type-6', name: 'Type 6 frigate' },
            { id: 'class:type-7', name: 'Type 7 frigate' },
            { id: 'class:type-8', name: 'Type 8 frigate' },
            { id: 'class:type-9', name: 'Type 9 frigate' },
            { id: 'class:type-10', name: 'Type 10 frigate' },
          ],
        }),
    } as Response);

    const { result } = renderHook(() => useShipSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const results = result.current.search('Type');
    expect(results.length).toBeLessThanOrEqual(8);
  });
});
