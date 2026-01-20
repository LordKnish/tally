import type { SpecsClue as SpecsClueData } from '../../types/game';
import { ClueCard } from './ClueCard';
import './SpecsClue.css';

export interface SpecsClueProps {
  /** Specs data to display */
  data: SpecsClueData;
  /** Whether the clue is revealed */
  revealed: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * SpecsClue displays aircraft technical specifications (Turn 2).
 * Shows: Manufacturer, Wingspan, First Flight date.
 */
export function SpecsClue({
  data,
  revealed,
  className = '',
}: SpecsClueProps) {
  const specs = [
    { label: 'Manufacturer', value: data.manufacturer },
    { label: 'Wingspan', value: data.wingspan },
    { label: 'First Flight', value: data.firstFlight },
  ];

  return (
    <ClueCard
      title="Specifications"
      variant="specs"
      revealed={revealed}
      className={className}
    >
      <dl className="specs-clue">
        {specs.map(({ label, value }) => (
          <div key={label} className="specs-clue__item">
            <dt className="specs-clue__label">{label}</dt>
            <dd className="specs-clue__value">
              {value ?? <span className="specs-clue__unknown">Unknown</span>}
            </dd>
          </div>
        ))}
      </dl>
    </ClueCard>
  );
}
