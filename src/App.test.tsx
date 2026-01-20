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

// Mock aircraft list data for tests (aircraft-list.json contains aircraft types)
const mockAircraftList = {
  generatedAt: '2026-01-18T00:00:00Z',
  count: 3,
  classes: [
    { id: 'type:f-16-fighting-falcon', name: 'F-16 Fighting Falcon' },
    { id: 'type:f-15-eagle', name: 'F-15 Eagle' },
    { id: 'type:su-27-flanker', name: 'Su-27 Flanker' },
  ],
};

// Mock game data for tests
const mockGameData = {
  date: '2026-01-18',
  aircraft: {
    id: 'Q123',
    name: 'F-16C Fighting Falcon',
    typeName: 'F-16 Fighting Falcon',
    aliases: ['F-16', 'Viper'],
  },
  silhouette: 'data:image/png;base64,test',
  clues: {
    specs: {
      type: 'Multirole Fighter',
      weight: '19,200 kg',
      wingspan: '9.96m',
      firstFlight: '1974',
    },
    context: {
      nation: 'United States',
      operators: ['USAF', 'Israel', 'Turkey'],
      status: 'In Production',
    },
    trivia: 'A test trivia fact about the aircraft',
    photo: 'https://example.com/photo.jpg',
  },
};

describe('App', () => {
  beforeEach(() => {
    // Mock fetch to return different data based on URL
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (String(url).includes('aircraft-list.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAircraftList),
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

  it('renders the Tally title after loading', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByText('Tally')).toBeInTheDocument();
    });
  });

  it('renders the mode name as tagline after loading', async () => {
    renderApp();
    await waitFor(() => {
      // Default mode is 'main' which has name 'Daily Tally'
      expect(screen.getByText('Daily Tally')).toBeInTheDocument();
    });
  });

  it('renders the silhouette component', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByAltText('Mystery aircraft silhouette')).toBeInTheDocument();
    });
  });

  it('renders the turn indicator', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole('group', { name: /Turn/ })).toBeInTheDocument();
    });
  });

  it('renders the aircraft search input', async () => {
    renderApp();
    await waitFor(() => {
      expect(screen.getByLabelText('Search for an aircraft')).toBeInTheDocument();
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
