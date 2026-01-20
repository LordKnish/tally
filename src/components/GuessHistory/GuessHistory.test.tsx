import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GuessHistory, type GuessEntry } from './GuessHistory';

describe('GuessHistory', () => {
  it('returns null when guesses array is empty', () => {
    const { container } = render(<GuessHistory guesses={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the title when there are guesses', () => {
    const guesses: GuessEntry[] = [{ aircraftName: 'F-16 Fighting Falcon', correct: false }];
    render(<GuessHistory guesses={guesses} />);
    expect(screen.getByText('Your Guesses')).toBeInTheDocument();
  });

  it('renders all guesses in the list', () => {
    const guesses: GuessEntry[] = [
      { aircraftName: 'F-16 Fighting Falcon', correct: false },
      { aircraftName: 'F-15 Eagle', correct: false },
      { aircraftName: 'Su-27 Flanker', correct: true },
    ];
    render(<GuessHistory guesses={guesses} />);

    expect(screen.getByText('F-16 Fighting Falcon')).toBeInTheDocument();
    expect(screen.getByText('F-15 Eagle')).toBeInTheDocument();
    expect(screen.getByText('Su-27 Flanker')).toBeInTheDocument();
  });

  it('applies correct styling class for correct guesses', () => {
    const guesses: GuessEntry[] = [{ aircraftName: 'Su-27 Flanker', correct: true }];
    render(<GuessHistory guesses={guesses} />);

    const item = screen.getByRole('listitem');
    expect(item).toHaveClass('guess-history__item--correct');
  });

  it('applies wrong styling class for incorrect guesses', () => {
    const guesses: GuessEntry[] = [{ aircraftName: 'F-16 Fighting Falcon', correct: false }];
    render(<GuessHistory guesses={guesses} />);

    const item = screen.getByRole('listitem');
    expect(item).toHaveClass('guess-history__item--wrong');
  });

  it('displays checkmark icon for correct guesses', () => {
    const guesses: GuessEntry[] = [{ aircraftName: 'Su-27 Flanker', correct: true }];
    render(<GuessHistory guesses={guesses} />);

    // Unicode checkmark
    expect(screen.getByText('\u2713')).toBeInTheDocument();
  });

  it('displays X icon for incorrect guesses', () => {
    const guesses: GuessEntry[] = [{ aircraftName: 'F-16 Fighting Falcon', correct: false }];
    render(<GuessHistory guesses={guesses} />);

    // Unicode X
    expect(screen.getByText('\u2717')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    const guesses: GuessEntry[] = [{ aircraftName: 'F-16 Fighting Falcon', correct: false }];
    render(<GuessHistory guesses={guesses} />);

    expect(screen.getByRole('list', { name: 'Guess history' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it('applies animation delay based on index', () => {
    const guesses: GuessEntry[] = [
      { aircraftName: 'Aircraft 1', correct: false },
      { aircraftName: 'Aircraft 2', correct: false },
      { aircraftName: 'Aircraft 3', correct: true },
    ];
    render(<GuessHistory guesses={guesses} />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveStyle({ animationDelay: '0ms' });
    expect(items[1]).toHaveStyle({ animationDelay: '50ms' });
    expect(items[2]).toHaveStyle({ animationDelay: '100ms' });
  });
});
