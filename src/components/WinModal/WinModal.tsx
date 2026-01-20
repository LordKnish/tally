import { useState, useCallback } from 'react';
import type { GuessResult } from '../../types/game';
import './WinModal.css';

export interface WinModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Aircraft type name (e.g., "F-16 Fighting Falcon") */
  className: string;
  /** Specific aircraft name (e.g., "F-16C Block 50") */
  aircraftName: string;
  /** Number of guesses it took */
  guessCount: number;
  /** Total turns allowed */
  totalTurns: number;
  /** Guess results for emoji display */
  guessResults: GuessResult[];
  /** Time taken to solve (in seconds) */
  timeTaken: number;
  /** Mode name for share text (e.g., "Daily", "WW2", "Cold War") */
  modeName: string;
  /** Callback when modal is closed */
  onClose: () => void;
}

/**
 * WinModal displays the victory screen with share functionality.
 * Shows aircraft type name prominently, specific name secondary, stats, and share button.
 */
export function WinModal({
  isOpen,
  className,
  aircraftName,
  guessCount,
  totalTurns,
  guessResults,
  timeTaken,
  modeName,
  onClose,
}: WinModalProps) {
  const [copied, setCopied] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) {
      return `${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const generateShareText = useCallback(() => {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const resultEmojis = guessResults
      .map((result) => (result === 'correct' ? '🟢' : '🔴'))
      .join('');

    const timeStr = formatTime(timeTaken);

    return `✈️ Tally ${modeName} ${today}\n✈️ ${guessCount}/${totalTurns} • ⏱️ ${timeStr}\n${resultEmojis}\n\nPlay at: ${window.location.href}`;
  }, [guessResults, guessCount, totalTurns, timeTaken, modeName]);

  const handleCopy = useCallback(async () => {
    const shareText = generateShareText();

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [generateShareText]);

  const handleShareToX = useCallback(() => {
    const shareText = generateShareText();
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  }, [generateShareText]);

  if (!isOpen) return null;

  // Display type name as primary with aircraft name in parentheses
  const displayText = `${className} (${aircraftName})`;

  return (
    <div className="win-modal-overlay" onClick={onClose}>
      <div className="win-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="win-modal__close"
          onClick={onClose}
          aria-label="Close modal"
          type="button"
        >
          ×
        </button>

        <div className="win-modal__content">
          <h2 className="win-modal__title">🎉 Congratulations!</h2>
          <p className="win-modal__class-name">You identified {displayText}</p>

          <div className="win-modal__stats">
            <div className="win-modal__stat">
              <span className="win-modal__stat-value">{guessCount}/{totalTurns}</span>
              <span className="win-modal__stat-label">Guesses</span>
            </div>
            <div className="win-modal__stat">
              <span className="win-modal__stat-value">{formatTime(timeTaken)}</span>
              <span className="win-modal__stat-label">Time</span>
            </div>
          </div>

          <div className="win-modal__result">
            {guessResults.map((result, index) => (
              <span
                key={index}
                className={`win-modal__dot win-modal__dot--${result}`}
                aria-label={result}
              />
            ))}
          </div>

          <div className="win-modal__share-buttons">
            <button
              className="win-modal__share-button"
              onClick={handleCopy}
              type="button"
            >
              {copied ? '✓ Copied!' : 'Copy 📋'}
            </button>
            <button
              className="win-modal__share-button win-modal__share-button--x"
              onClick={handleShareToX}
              type="button"
            >
              Share on X
            </button>
          </div>

          <p className="win-modal__share-preview">{generateShareText()}</p>
        </div>
      </div>
    </div>
  );
}
