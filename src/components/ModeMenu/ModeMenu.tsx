import { useState, useEffect, useRef } from 'react';
import {
  GAME_MODES,
  ALL_MODE_IDS,
  type GameModeId,
  type ModeResult,
} from '../../types/modes';
import './ModeMenu.css';

interface ModeMenuProps {
  currentMode: GameModeId;
  completions: Partial<Record<GameModeId, ModeResult>>;
  onSelectMode: (mode: GameModeId) => void;
}

export function ModeMenu({ currentMode, completions, onSelectMode }: ModeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleModeClick = (modeId: GameModeId) => {
    onSelectMode(modeId);
    setIsOpen(false);
  };

  return (
    <div className="mode-menu">
      <button
        ref={buttonRef}
        className="mode-menu__button"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-label="Game modes menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="mode-menu__hamburger">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {isOpen && (
        <>
          <div className="mode-menu__backdrop" onClick={() => setIsOpen(false)} />
          <div ref={menuRef} className="mode-menu__panel" role="menu">
            <div className="mode-menu__header">
              <h2 className="mode-menu__title">Game Modes</h2>
              <button
                className="mode-menu__close"
                onClick={() => setIsOpen(false)}
                type="button"
                aria-label="Close menu"
              >
                &times;
              </button>
            </div>
            <ul className="mode-menu__list">
              {ALL_MODE_IDS.map((modeId) => {
                const config = GAME_MODES[modeId];
                const isCompleted = !!completions[modeId];
                const isCurrent = modeId === currentMode;

                return (
                  <li key={modeId}>
                    <button
                      className={`mode-menu__item ${isCurrent ? 'mode-menu__item--current' : ''} ${isCompleted ? 'mode-menu__item--completed' : ''}`}
                      onClick={() => handleModeClick(modeId)}
                      type="button"
                      role="menuitem"
                      aria-current={isCurrent ? 'true' : undefined}
                    >
                      <span className="mode-menu__item-icon">{config.icon}</span>
                      <div className="mode-menu__item-info">
                        <span className="mode-menu__item-name">{config.name}</span>
                        <span className="mode-menu__item-desc">{config.description}</span>
                      </div>
                      <span className="mode-menu__item-status">
                        {isCompleted && <span className="mode-menu__check" aria-label="Completed">&#x2713;</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
