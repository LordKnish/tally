import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAircraftSearch } from './useAircraftSearch';

// Mock aircraft list data (aircraft-list.json contains aircraft from Wikidata)
const mockAircraftList = {
  generatedAt: '2026-01-18T00:00:00Z',
  count: 5,
  aircraft: [
    { id: 'Q188766', name: 'F-16 Fighting Falcon', aliases: ['F-16', 'Viper', 'Fighting Falcon'] },
    { id: 'Q187895', name: 'F-15 Eagle', aliases: ['F-15', 'Eagle'] },
    { id: 'Q1362', name: 'Su-27 Flanker', aliases: ['Su-27', 'Flanker'] },
    { id: 'Q178057', name: 'MiG-29 Fulcrum', aliases: ['MiG-29', 'Fulcrum'] },
    { id: 'Q183222', name: 'Eurofighter Typhoon', aliases: ['Typhoon', 'EF2000'] },
  ],
};

describe('useAircraftSearch', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAircraftList),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns loading true initially', () => {
    const { result } = renderHook(() => useAircraftSearch());
    expect(result.current.isLoading).toBe(true);
  });

  it('returns loading false after aircraft list loads', async () => {
    const { result } = renderHook(() => useAircraftSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns error null when load succeeds', async () => {
    const { result } = renderHook(() => useAircraftSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
  });

  it('returns error when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAircraftSearch());

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

    const { result } = renderHook(() => useAircraftSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('404');
  });

  it('search returns empty array for query shorter than 2 chars', async () => {
    const { result } = renderHook(() => useAircraftSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.search('F')).toEqual([]);
    expect(result.current.search('')).toEqual([]);
  });

  it('search returns matching aircraft', async () => {
    const { result } = renderHook(() => useAircraftSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const results = result.current.search('F-16');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toContain('F-16');
  });

  it('search handles fuzzy matching', async () => {
    const { result } = renderHook(() => useAircraftSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should find Eurofighter even with a typo
    const results = result.current.search('Eurofiter');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toContain('Eurofighter');
  });

  it('search returns max 8 results', async () => {
    // Create a mock with more than 8 matching aircraft
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          generatedAt: '2026-01-18T00:00:00Z',
          count: 10,
          aircraft: [
            { id: 'Q1', name: 'F-1 Fighter', aliases: ['F-1'] },
            { id: 'Q2', name: 'F-2 Fighter', aliases: ['F-2'] },
            { id: 'Q3', name: 'F-3 Fighter', aliases: ['F-3'] },
            { id: 'Q4', name: 'F-4 Fighter', aliases: ['F-4'] },
            { id: 'Q5', name: 'F-5 Fighter', aliases: ['F-5'] },
            { id: 'Q6', name: 'F-6 Fighter', aliases: ['F-6'] },
            { id: 'Q7', name: 'F-7 Fighter', aliases: ['F-7'] },
            { id: 'Q8', name: 'F-8 Fighter', aliases: ['F-8'] },
            { id: 'Q9', name: 'F-9 Fighter', aliases: ['F-9'] },
            { id: 'Q10', name: 'F-10 Fighter', aliases: ['F-10'] },
          ],
        }),
    } as Response);

    const { result } = renderHook(() => useAircraftSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const results = result.current.search('Fighter');
    expect(results.length).toBeLessThanOrEqual(8);
  });

  it('search matches on aliases', async () => {
    const { result } = renderHook(() => useAircraftSearch());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should find F-16 when searching for its alias "Viper"
    const results = result.current.search('Viper');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toContain('F-16');
  });
});
