import './HelpModal.css';

export interface HelpModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
}

/**
 * HelpModal displays How to Play instructions and credits.
 * Styled in the NYT Games aesthetic.
 */
export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="help-modal__close"
          onClick={onClose}
          aria-label="Close modal"
          type="button"
        >
          ×
        </button>

        <div className="help-modal__content">
          <h2 className="help-modal__title">How to Play</h2>

          <div className="help-modal__section">
            <p className="help-modal__intro">
              Identify the mystery aircraft in 5 guesses or fewer.
            </p>
          </div>

          <div className="help-modal__section">
            <h3 className="help-modal__subtitle">Each Turn</h3>
            <ul className="help-modal__list">
              <li>View the aircraft silhouette and any revealed clues</li>
              <li>Search for an aircraft and submit your guess</li>
              <li>After each wrong guess, a new clue is revealed</li>
            </ul>
          </div>

          <div className="help-modal__section">
            <h3 className="help-modal__subtitle">Clues</h3>
            <ul className="help-modal__list">
              <li><strong>Turn 1:</strong> Silhouette only</li>
              <li><strong>Turn 2:</strong> Aircraft specifications</li>
              <li><strong>Turn 3:</strong> Historical context</li>
              <li><strong>Turn 4:</strong> Trivia fact</li>
              <li><strong>Turn 5:</strong> Photograph revealed</li>
            </ul>
          </div>

          <div className="help-modal__section">
            <h3 className="help-modal__subtitle">Scoring</h3>
            <ul className="help-modal__list">
              <li>
                <span className="help-modal__dot help-modal__dot--correct" /> Correct guess
              </li>
              <li>
                <span className="help-modal__dot help-modal__dot--wrong" /> Wrong guess
              </li>
            </ul>
          </div>

          <div className="help-modal__divider" />

          <div className="help-modal__credits">
            <p className="help-modal__credits-text">
              Created by{' '}
              <a
                href="https://x.com/Mr_Knish"
                target="_blank"
                rel="noopener noreferrer"
                className="help-modal__link"
              >
                Knish
              </a>
            </p>
            <p className="help-modal__credits-subtext">A new aircraft every day • Tally-ho!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
