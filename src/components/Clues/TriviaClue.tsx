import { ClueCard } from './ClueCard';
import './TriviaClue.css';

export interface TriviaClueProps {
  /** Trivia text to display */
  text: string | null;
  /** Whether the clue is revealed */
  revealed: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * TriviaClue displays an interesting fact about the aircraft (Turn 4).
 * Styled as a quote for visual distinction.
 */
export function TriviaClue({
  text,
  revealed,
  className = '',
}: TriviaClueProps) {
  return (
    <ClueCard
      title="Did You Know?"
      variant="trivia"
      revealed={revealed}
      className={className}
    >
      {text ? (
        <blockquote className="trivia-clue">
          <p className="trivia-clue__text">{text}</p>
        </blockquote>
      ) : (
        <p className="trivia-clue__none">No trivia available for this aircraft.</p>
      )}
    </ClueCard>
  );
}
