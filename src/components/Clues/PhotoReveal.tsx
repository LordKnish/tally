import { ClueCard } from './ClueCard';
import './PhotoReveal.css';

export interface PhotoRevealProps {
  /** URL of the aircraft photo (not used, photo displays in silhouette area) */
  photoUrl: string;
  /** Aircraft name for alt text */
  aircraftName: string;
  /** Whether the photo is revealed */
  revealed: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * PhotoReveal shows the "Historical Photo" clue card hint (Turn 5).
 * The actual photo is displayed in the Silhouette component, not here.
 */
export function PhotoReveal({
  revealed,
  className = '',
}: PhotoRevealProps) {
  return (
    <ClueCard
      title="Historical Photo"
      variant="photo"
      revealed={revealed}
      className={className}
    >
      <div className="photo-reveal">
        <p className="photo-reveal__hint">
          {revealed
            ? `See the historical photograph above`
            : 'Photo will be revealed above'}
        </p>
      </div>
    </ClueCard>
  );
}
