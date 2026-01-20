import type { ReactNode } from 'react';
import './ClueCard.css';

export type ClueVariant = 'specs' | 'context' | 'trivia' | 'photo';

export interface ClueCardProps {
  /** Title of the clue card */
  title: string;
  /** Visual variant for different clue types */
  variant: ClueVariant;
  /** Whether the clue is revealed */
  revealed: boolean;
  /** Content to display when revealed */
  children: ReactNode;
  /** Additional CSS class name */
  className?: string;
}

/**
 * ClueCard is a reusable wrapper for all clue types.
 * Shows a "?" placeholder when hidden, animates on reveal.
 */
export function ClueCard({
  title,
  variant,
  revealed,
  children,
  className = '',
}: ClueCardProps) {
  return (
    <div
      className={`clue-card clue-card--${variant} ${revealed ? 'clue-card--revealed' : ''} ${className}`.trim()}
      role="region"
      aria-label={title}
    >
      <h4 className="clue-card__title">{title}</h4>
      <div className="clue-card__content">
        {revealed ? (
          <div className="clue-card__revealed-content">{children}</div>
        ) : (
          <div className="clue-card__hidden" aria-label="Clue not yet revealed">
            ?
          </div>
        )}
      </div>
    </div>
  );
}
