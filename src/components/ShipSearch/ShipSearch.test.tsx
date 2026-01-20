import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShipSearch } from './ShipSearch';

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

describe('ShipSearch', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockClassList),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the search input', async () => {
    render(<ShipSearch onSelect={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Search for a ship class')).toBeInTheDocument();
    });
  });

  it('shows loading placeholder while class list loads', () => {
    render(<ShipSearch onSelect={vi.fn()} />);
    expect(screen.getByPlaceholderText('Loading classes...')).toBeInTheDocument();
  });

  it('shows normal placeholder after loading', async () => {
    render(<ShipSearch onSelect={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a ship class...')).toBeInTheDocument();
    });
  });

  it('shows error message when class list fails to load', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<ShipSearch onSelect={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load ship classes/)).toBeInTheDocument();
    });
  });

  it('shows search results when typing', async () => {
    const user = userEvent.setup();
    render(<ShipSearch onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a ship class...')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Search for a ship class');
    await user.type(input, 'Fle');

    await waitFor(() => {
      expect(screen.getByText('Fletcher-class destroyer')).toBeInTheDocument();
    });
  });

  it('calls onSelect when a class is selected', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ShipSearch onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a ship class...')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Search for a ship class');
    await user.type(input, 'Fletcher');

    await waitFor(() => {
      expect(screen.getByText('Fletcher-class destroyer')).toBeInTheDocument();
    });

    // Click on the first result
    await user.click(screen.getByText('Fletcher-class destroyer'));

    expect(onSelect).toHaveBeenCalledWith({
      id: 'class:fletcher-class-destroyer',
      name: 'Fletcher-class destroyer',
    });
  });

  it('clears input after selection', async () => {
    const user = userEvent.setup();
    render(<ShipSearch onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a ship class...')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Search for a ship class');
    await user.type(input, 'Fletcher');

    await waitFor(() => {
      expect(screen.getByText('Fletcher-class destroyer')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Fletcher-class destroyer'));

    expect(input).toHaveValue('');
  });

  it('disables input when disabled prop is true', async () => {
    render(<ShipSearch onSelect={vi.fn()} disabled />);

    await waitFor(() => {
      const input = screen.getByLabelText('Search for a ship class');
      expect(input).toBeDisabled();
    });
  });

  it('does not show results for queries shorter than 2 characters', async () => {
    const user = userEvent.setup();
    render(<ShipSearch onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a ship class...')).toBeInTheDocument();
    });

    const input = screen.getByLabelText('Search for a ship class');
    await user.type(input, 'F');

    // Should not show any results
    expect(screen.queryByText('Fletcher-class destroyer')).not.toBeInTheDocument();
  });
});
