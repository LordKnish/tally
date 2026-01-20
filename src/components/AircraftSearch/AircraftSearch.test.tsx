import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AircraftSearch } from './AircraftSearch';

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

describe('AircraftSearch', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAircraftList),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the search input', async () => {
    render(<AircraftSearch onSelect={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Search for an aircraft')).toBeInTheDocument();
    });
  });

  it('shows loading placeholder while aircraft list loads', () => {
    render(<AircraftSearch onSelect={vi.fn()} />);
    expect(screen.getByPlaceholderText('Loading aircraft...')).toBeInTheDocument();
  });

  it('shows normal placeholder after loading', async () => {
    render(<AircraftSearch onSelect={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type an aircraft name...')).toBeInTheDocument();
    });
  });

  it('shows error message when aircraft list fails to load', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<AircraftSearch onSelect={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load aircraft/)).toBeInTheDocument();
    });
  });

  it('shows search results when typing', async () => {
    const user = userEvent.setup();
    render(<AircraftSearch onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type an aircraft name...')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Search for an aircraft');
    await user.type(input, 'F-16');

    await waitFor(() => {
      expect(screen.getByText('F-16 Fighting Falcon')).toBeInTheDocument();
    });
  });

  it('calls onSelect when an aircraft is selected', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<AircraftSearch onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type an aircraft name...')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Search for an aircraft');
    await user.type(input, 'F-16');

    await waitFor(() => {
      expect(screen.getByText('F-16 Fighting Falcon')).toBeInTheDocument();
    });

    // Click on the first result
    await user.click(screen.getByText('F-16 Fighting Falcon'));

    expect(onSelect).toHaveBeenCalledWith({
      id: 'type:f-16-fighting-falcon',
      name: 'F-16 Fighting Falcon',
    });
  });

  it('clears input after selection', async () => {
    const user = userEvent.setup();
    render(<AircraftSearch onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type an aircraft name...')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Search for an aircraft');
    await user.type(input, 'F-16');

    await waitFor(() => {
      expect(screen.getByText('F-16 Fighting Falcon')).toBeInTheDocument();
    });

    await user.click(screen.getByText('F-16 Fighting Falcon'));

    expect(input).toHaveValue('');
  });

  it('disables input when disabled prop is true', async () => {
    render(<AircraftSearch onSelect={vi.fn()} disabled />);

    await waitFor(() => {
      const input = screen.getByLabelText('Search for an aircraft');
      expect(input).toBeDisabled();
    });
  });

  it('does not show results for queries shorter than 2 characters', async () => {
    const user = userEvent.setup();
    render(<AircraftSearch onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type an aircraft name...')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Search for an aircraft');
    await user.type(input, 'F');

    // Should not show any results
    expect(screen.queryByText('F-16 Fighting Falcon')).not.toBeInTheDocument();
  });
});
