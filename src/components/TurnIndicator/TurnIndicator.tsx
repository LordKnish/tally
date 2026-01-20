import type { GuessResult } from '../../types/game';
import './TurnIndicator.css';

export interface TurnIndicatorProps {
  /** Current turn number (1-5) */
  currentTurn: number;
  /** Total number of turns (default: 5) */
  totalTurns?: number;
  /** Results of previous guesses */
  guessResults?: GuessResult[];
  /** Additional CSS class name */
  className?: string;
}

/**
 * TurnIndicator shows the current turn and guess history.
 * Displays 5 dots representing each turn, with colors indicating:
 * - Gray: upcoming turn
 * - Highlighted: current turn
 * - Green: correct guess
 * - Dark gray: wrong guess
 */
export function TurnIndicator({
  currentTurn,
  totalTurns = 5,
  guessResults = [],
  className = '',
}: TurnIndicatorProps) {
  const turns = Array.from({ length: totalTurns }, (_, i) => i + 1);

  const getTurnState = (turn: number): 'upcoming' | 'current' | 'correct' | 'wrong' => {
    if (turn < currentTurn) {
      const result = guessResults[turn - 1];
      return result === 'correct' ? 'correct' : 'wrong';
    }
    if (turn === currentTurn) {
      return 'current';
    }
    return 'upcoming';
  };

  return (
    <div
      className={`turn-indicator ${className}`.trim()}
      role="group"
      aria-label={`Turn ${currentTurn} of ${totalTurns}`}
    >
      {turns.map((turn) => {
        const state = getTurnState(turn);
        return (
          <div
            key={turn}
            className={`turn-indicator__dot turn-indicator__dot--${state}`}
            aria-label={`Turn ${turn}: ${state}`}
          />
        );
      })}
    </div>
  );
}
