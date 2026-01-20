import { useState, useCallback, useRef, useEffect } from 'react';
import { useShipSearch, type ShipListEntry } from '../../hooks/useShipSearch';
import './ShipSearch.css';

export interface ShipSearchProps {
  /** Callback when a class is selected */
  onSelect: (ship: ShipListEntry) => void;
  /** Whether the search is disabled */
  disabled?: boolean;
  /** Previously guessed class IDs to exclude from suggestions */
  excludeIds?: string[];
  /** Target ship class that should always appear in results when relevant */
  targetClass?: ShipListEntry;
}

/**
 * Ship class search autocomplete component.
 * Provides accessible fuzzy search for ship class names.
 */
export function ShipSearch({ onSelect, disabled = false, excludeIds = [], targetClass }: ShipSearchProps) {
  const { search, isLoading, error } = useShipSearch();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState<ShipListEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      setSelectedIndex(0);

      // Perform search and update items in the same handler
      if (value.length >= 2) {
        let results = search(value).filter(item => !excludeIds.includes(item.id));

        // Ensure target class is always in results if it matches the query
        if (targetClass && !excludeIds.includes(targetClass.id)) {
          const queryLower = value.toLowerCase();
          const targetMatches = targetClass.name.toLowerCase().includes(queryLower);
          const targetAlreadyIncluded = results.some(
            item => item.id === targetClass.id ||
                    item.name.toLowerCase() === targetClass.name.toLowerCase()
          );

          if (targetMatches && !targetAlreadyIncluded) {
            results = [targetClass, ...results];
          }
        }

        setItems(results);
        setOpen(results.length > 0);
      } else {
        setItems([]);
        setOpen(false);
      }
    },
    [search, excludeIds, targetClass]
  );

  const handleSelect = useCallback(
    (ship: ShipListEntry) => {
      onSelect(ship);
      setInputValue('');
      setItems([]);
      setOpen(false);
      setSelectedIndex(0);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || items.length === 0) {
        if (e.key === 'Escape') {
          setOpen(false);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
          break;
        case 'Enter': {
          e.preventDefault();
          const selected = items[selectedIndex];
          if (selected) {
            handleSelect(selected);
          }
          break;
        }
        case 'Escape':
          setOpen(false);
          break;
      }
    },
    [open, items, selectedIndex, handleSelect]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (open && listRef.current) {
      const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (inputRef.current && !inputRef.current.contains(target) &&
          listRef.current && !listRef.current.contains(target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  if (error) {
    return (
      <div className="ship-search ship-search--error">
        <p className="ship-search__error-message">
          Failed to load ship classes. Please refresh the page.
        </p>
      </div>
    );
  }

  return (
    <div className="ship-search">
      <div className="ship-search__input-wrapper">
        <svg
          className="ship-search__icon"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="ship-search__input"
          placeholder={isLoading ? 'Loading classes...' : 'Type a ship class...'}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          aria-label="Search for a ship class"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={open ? 'ship-search-list' : undefined}
          autoComplete="off"
        />
      </div>
      {open && items.length > 0 && (
        <ul
          ref={listRef}
          id="ship-search-list"
          className="ship-search__list"
          role="listbox"
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              className={`ship-search__item ${index === selectedIndex ? 'ship-search__item--selected' : ''}`}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
