import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  );
}

// Mock class list data for tests (ship-list.json now contains classes)
const mockClassList = {
  generatedAt: '2026-01-18T00:00:00Z',
  count: 3,
  classes: [
    { id: 'class:test-class', name: 'Test-class frigate' },
    { id: 'class:nimitz-class', name: 'Nimitz-class aircraft carrier' },
    { id: 'class:bismarck-class', name: 'Bismarck-class battleship' },
  ],
};

// Mock game data for tests
const mockGameData = {
  date: '2026-01-18',
  ship: {
    id: 'Q123',
    name: 'HMS Test Ship',
    aliases: ['Test Ship', 'TS'],
  },
  silhouette: 'data:image/png;base64,test',
  clues: {
    specs: {
      class: 'Test Class',
      displacement: '1000 tons',
      length: '100m',
      commissioned: '1940',
    },
    context: {
      nation: 'United Kingdom',
      conflicts: ['World War II'],
      status: 'Museum Ship',
    },
    trivia: 'A test trivia fact',
    photo: 'https://example.com/photo.jpg',
  },
};

describe('App', () => {
  beforeEach(() => {
    // Mock fetch to return different data based on URL
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (String(url).includes('ship-list.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockClassList),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGameData),
      } as Response);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    renderApp();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the Keel title after loading', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByText('Keel')).toBeInTheDocument();
    });
  });

  it('renders the mode name as tagline after loading', async () => {
    renderApp();
    await waitFor(() => {
      // Default mode is 'main' which has name 'Daily Keel'
      expect(screen.getByText('Daily Keel')).toBeInTheDocument();
    });
  });

  it('renders the silhouette component', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByAltText('Mystery warship silhouette')).toBeInTheDocument();
    });
  });

  it('renders the turn indicator', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole('group', { name: /Turn/ })).toBeInTheDocument();
    });
  });

  it('renders the class search input', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByLabelText('Search for a ship class')).toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    renderApp();
    await waitFor(() => {
      expect(screen.getByText(/Failed to load game data/)).toBeInTheDocument();
    });
  });
});
