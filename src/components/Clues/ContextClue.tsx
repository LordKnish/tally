import type { ContextClue as ContextClueData } from '../../types/game';
import { ClueCard } from './ClueCard';
import './ContextClue.css';

/** Map of nation names to flag emojis */
const nationFlags: Record<string, string> = {
  'United States': '🇺🇸',
  'USA': '🇺🇸',
  'United Kingdom': '🇬🇧',
  'UK': '🇬🇧',
  'Britain': '🇬🇧',
  'Great Britain': '🇬🇧',
  'Germany': '🇩🇪',
  'Japan': '🇯🇵',
  'France': '🇫🇷',
  'Italy': '🇮🇹',
  'Russia': '🇷🇺',
  'Soviet Union': '🇷🇺',
  'USSR': '🇷🇺',
  'China': '🇨🇳',
  'Spain': '🇪🇸',
  'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Sweden': '🇸🇪',
  'Norway': '🇳🇴',
  'Denmark': '🇩🇰',
  'Finland': '🇫🇮',
  'Poland': '🇵🇱',
  'Greece': '🇬🇷',
  'Turkey': '🇹🇷',
  'Brazil': '🇧🇷',
  'Argentina': '🇦🇷',
  'Chile': '🇨🇱',
  'Australia': '🇦🇺',
  'Canada': '🇨🇦',
  'India': '🇮🇳',
  'South Korea': '🇰🇷',
  'North Korea': '🇰🇵',
  'Austria-Hungary': '🇦🇹',
  'Austria': '🇦🇹',
  'Hungary': '🇭🇺',
  'Mexico': '🇲🇽',
  'Thailand': '🇹🇭',
  'Indonesia': '🇮🇩',
  'Egypt': '🇪🇬',
  'Israel': '🇮🇱',
  'South Africa': '🇿🇦',
  'New Zealand': '🇳🇿',
  'Pakistan': '🇵🇰',
  'Iran': '🇮🇷',
  'Iraq': '🇮🇶',
  'Taiwan': '🇹🇼',
  'Singapore': '🇸🇬',
  'Malaysia': '🇲🇾',
  'Philippines': '🇵🇭',
  'Vietnam': '🇻🇳',
  'Ukraine': '🇺🇦',
  'Romania': '🇷🇴',
  'Bulgaria': '🇧🇬',
  'Yugoslavia': '🇷🇸',
  'Serbia': '🇷🇸',
  'Croatia': '🇭🇷',
  'Czech Republic': '🇨🇿',
  'Czechoslovakia': '🇨🇿',
  'Slovakia': '🇸🇰',
  'Ireland': '🇮🇪',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Peru': '🇵🇪',
  'Colombia': '🇨🇴',
  'Venezuela': '🇻🇪',
  'Cuba': '🇨🇺',
  'Saudi Arabia': '🇸🇦',
  'United Arab Emirates': '🇦🇪',
  'UAE': '🇦🇪',
  'Qatar': '🇶🇦',
  'Kuwait': '🇰🇼',
  'Switzerland': '🇨🇭',
};

/**
 * Get flag emoji for a nation, returns empty string if not found
 */
function getFlagForNation(nation: string): string {
  return nationFlags[nation] || '';
}

export interface ContextClueProps {
  /** Context data to display */
  data: ContextClueData;
  /** Whether the clue is revealed */
  revealed: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * ContextClue displays historical context (Turn 3).
 * Shows: Nation, Operators, Status.
 */
export function ContextClue({
  data,
  revealed,
  className = '',
}: ContextClueProps) {
  const operatorsText =
    data.operators.length > 0
      ? data.operators.join(', ')
      : null;

  const flag = getFlagForNation(data.nation);

  return (
    <ClueCard
      title="Historical Context"
      variant="context"
      revealed={revealed}
      className={className}
    >
      <dl className="context-clue">
        <div className="context-clue__item">
          <dt className="context-clue__label">Country of Origin</dt>
          <dd className="context-clue__value">
            {flag && <span className="context-clue__flag" aria-hidden="true">{flag}</span>}
            {data.nation}
          </dd>
        </div>

        <div className="context-clue__item">
          <dt className="context-clue__label">Operators</dt>
          <dd className="context-clue__value">
            {operatorsText ?? (
              <span className="context-clue__none">None recorded</span>
            )}
          </dd>
        </div>

        <div className="context-clue__item">
          <dt className="context-clue__label">Status</dt>
          <dd className="context-clue__value">
            {data.status ?? (
              <span className="context-clue__none">Unknown</span>
            )}
          </dd>
        </div>
      </dl>
    </ClueCard>
  );
}
