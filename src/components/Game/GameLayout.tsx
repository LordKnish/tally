import type { ReactNode } from 'react';
import './GameLayout.css';

export interface GameLayoutProps {
  /** Content for the header area */
  header?: ReactNode;
  /** Content for the silhouette area */
  silhouette: ReactNode;
  /** Content for the turn indicator */
  turnIndicator: ReactNode;
  /** Content for the clues area */
  clues: ReactNode;
  /** Content for the guess history area */
  guessHistory?: ReactNode;
  /** Content for the search/input area */
  search?: ReactNode;
  /** Content for the footer/search area (deprecated, use search) */
  footer?: ReactNode;
  /** Additional CSS class name */
  className?: string;
}

/**
 * GameLayout provides the main structure for the game UI.
 * Mobile-first responsive layout with:
 * - Header (title)
 * - Silhouette display
 * - Turn indicator
 * - Clues stack
 * - Guess history
 * - Search input (sticky footer)
 */
export function GameLayout({
  header,
  silhouette,
  turnIndicator,
  clues,
  guessHistory,
  search,
  footer,
  className = '',
}: GameLayoutProps) {
  // Use search prop if provided, fall back to footer for backwards compatibility
  const searchContent = search ?? footer;

  return (
    <div className={`game-layout ${className}`.trim()}>
      {header && <header className="game-layout__header">{header}</header>}

      <main className="game-layout__main">
        <section className="game-layout__silhouette" aria-label="Aircraft silhouette">
          {silhouette}
        </section>

        <div className="game-layout__turn-indicator">{turnIndicator}</div>

        <section className="game-layout__clues" aria-label="Clues">
          {clues}
        </section>

        {guessHistory && (
          <section className="game-layout__guess-history" aria-label="Guess history">
            {guessHistory}
          </section>
        )}
      </main>

      {searchContent && (
        <footer className="game-layout__footer">
          <div className="game-layout__search">{searchContent}</div>
        </footer>
      )}
    </div>
  );
}
