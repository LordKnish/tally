import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAircraftSearch } from './useAircraftSearch';

// Mock aircraft list data (aircraft-list.json contains aircraft types)
const mockAircraftList = {
  generatedAt: '2026-01-18T00:00:00Z',
  count: 5,
  classes: [
    { id: 'type:f-16-fighting-falcon', name: 'F-16 Fighting Falcon' },
    { id: 'type:f-15-eagle', name: 'F-15 Eagle' },
    { id: 'type:su-27-flanker', name: 'Su-27 Flanker' },
    { id: 'type:mig-29-fulcrum', name: 'MiG-29 Fulcrum' },
    { id: 'type:eurofighter-typhoon', name: 'Eurofighter Typhoon' },
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
          classes: [
            { id: 'type:f-1', name: 'F-1 Fighter' },
            { id: 'type:f-2', name: 'F-2 Fighter' },
            { id: 'type:f-3', name: 'F-3 Fighter' },
            { id: 'type:f-4', name: 'F-4 Fighter' },
            { id: 'type:f-5', name: 'F-5 Fighter' },
            { id: 'type:f-6', name: 'F-6 Fighter' },
            { id: 'type:f-7', name: 'F-7 Fighter' },
            { id: 'type:f-8', name: 'F-8 Fighter' },
            { id: 'type:f-9', name: 'F-9 Fighter' },
            { id: 'type:f-10', name: 'F-10 Fighter' },
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
});
