import './GuessHistory.css';

/**
 * Single guess entry in the history
 */
export interface GuessEntry {
  /** Name of the guessed aircraft (e.g., "F-16 Fighting Falcon") */
  aircraftName: string;
  /** Whether the guess was correct */
  correct: boolean;
}

export interface GuessHistoryProps {
  /** Array of previous guesses */
  guesses: GuessEntry[];
}

/**
 * Displays the history of previous guesses.
 * Shows aircraft names with green/gray styling for correct/wrong.
 * New entries animate in with cardReveal animation.
 */
export function GuessHistory({ guesses }: GuessHistoryProps) {
  if (guesses.length === 0) {
    return null;
  }

  return (
    <div className="guess-history" role="list" aria-label="Guess history">
      <h3 className="guess-history__title">Your Guesses</h3>
      <ul className="guess-history__list">
        {guesses.map((guess, index) => (
          <li
            key={`${guess.aircraftName}-${index}`}
            className={`guess-history__item ${
              guess.correct
                ? 'guess-history__item--correct'
                : 'guess-history__item--wrong'
            }`}
            role="listitem"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="guess-history__icon" aria-hidden="true">
              {guess.correct ? '\u2713' : '\u2717'}
            </span>
            <span className="guess-history__aircraft-name">{guess.aircraftName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
