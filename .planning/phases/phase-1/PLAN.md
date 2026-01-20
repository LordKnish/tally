# Phase 1: Legacy Nomenclature Cleanup

## Objective
Remove all ship/Keel references and establish consistent aircraft terminology throughout the codebase.

## Execution Context
- Single-session phase (estimated ~30 tasks)
- No external dependencies or research needed
- Safe refactoring - primarily find/replace with verification

## Context
The Tally game was migrated from "Keel" (ship guessing) but retains legacy naming throughout:
- Files named with "ship" (ship-list.json, ShipSearch component)
- Props and types use "ship" terminology
- Comments and JSDoc reference ships
- Sharing text says "Keel" instead of "Tally"
- localStorage key uses `keel-daily-completion`

## Terminology Mapping
| Old Term | New Term |
|----------|----------|
| ship | aircraft |
| Ship | Aircraft |
| shipName | aircraftName |
| ShipListEntry | AircraftListEntry |
| useShipSearch | useAircraftSearch |
| ShipSearch | AircraftSearch |
| ship-list.json | aircraft-list.json |
| keel | tally |
| Keel | Tally |
| warship | aircraft |

## Tasks

### Task 1: Rename public data file
**Files:** `public/ship-list.json`
**Action:**
1. Rename `public/ship-list.json` to `public/aircraft-list.json`
2. Update fetch URL in `src/hooks/useShipSearch.ts` (line 77)

### Task 2: Rename useShipSearch hook
**Files:** `src/hooks/useShipSearch.ts`, `src/hooks/useShipSearch.test.ts`
**Action:**
1. Rename file to `useAircraftSearch.ts`
2. Rename test file to `useAircraftSearch.test.ts`
3. Rename `ShipListEntry` interface to `AircraftListEntry`
4. Rename `UseShipSearchReturn` to `UseAircraftSearchReturn`
5. Rename `useShipSearch` function to `useAircraftSearch`
6. Update all comments referencing ship/class to aircraft
7. Update all test descriptions and assertions

### Task 3: Rename ShipSearch component
**Files:** `src/components/ShipSearch/ShipSearch.tsx`, `src/components/ShipSearch/ShipSearch.css`, `src/components/ShipSearch/ShipSearch.test.tsx`, `src/components/ShipSearch/SubmitButton.tsx`
**Action:**
1. Rename directory from `ShipSearch` to `AircraftSearch`
2. Rename `ShipSearch.tsx` to `AircraftSearch.tsx`
3. Rename `ShipSearch.css` to `AircraftSearch.css`
4. Rename `ShipSearch.test.tsx` to `AircraftSearch.test.tsx`
5. Update component name from `ShipSearch` to `AircraftSearch`
6. Update props interface from `ShipSearchProps` to `AircraftSearchProps`
7. Update import from `useShipSearch` to `useAircraftSearch`
8. Update CSS class names from `.ship-search*` to `.aircraft-search*`
9. Update all placeholder text and aria-labels:
   - "Search for a ship class" → "Search for an aircraft"
   - "Type a ship class..." → "Type an aircraft..."
   - "Failed to load ship classes" → "Failed to load aircraft"
10. Update test descriptions and assertions
11. Update SubmitButton JSDoc comment

### Task 4: Update App.tsx imports and usage
**Files:** `src/App.tsx`
**Action:**
1. Update import from `ShipSearch` to `AircraftSearch`
2. Update import from `ShipListEntry` to `AircraftListEntry`
3. Update component usage `<ShipSearch` to `<AircraftSearch`
4. Update callback parameter type from `ShipListEntry` to `AircraftListEntry`

### Task 5: Update Silhouette component
**Files:** `src/components/Silhouette/Silhouette.tsx`, `src/components/Silhouette/Silhouette.test.tsx`
**Action:**
1. Rename `shipName` prop to `aircraftName`
2. Update JSDoc comment "Ship name" → "Aircraft name"
3. Update component description "ship line art" → "aircraft silhouette"
4. Update default alt text "Ship silhouette" → "Aircraft silhouette"
5. Update photo alt text "Historical photograph of ship" → "Historical photograph of aircraft"
6. Update test assertions

### Task 6: Update TriviaClue component
**Files:** `src/components/Clues/TriviaClue.tsx`
**Action:**
1. Update JSDoc "about the ship" → "about the aircraft"
2. Update fallback text "No trivia available for this ship" → "No trivia available for this aircraft"

### Task 7: Update PhotoReveal component
**Files:** `src/components/Clues/PhotoReveal.tsx`
**Action:**
1. Rename `shipName` prop to `aircraftName`
2. Update JSDoc comments

### Task 8: Update GuessHistory component
**Files:** `src/components/GuessHistory/GuessHistory.tsx`, `src/components/GuessHistory/GuessHistory.css`, `src/components/GuessHistory/GuessHistory.test.tsx`
**Action:**
1. Rename `shipName` property in `GuessEntry` to `aircraftName`
2. Update CSS class `.guess-history__ship-name` to `.guess-history__aircraft-name`
3. Update CSS comment "Ship Name" → "Aircraft Name"
4. Update test data to use `aircraftName`

### Task 9: Update WinModal component
**Files:** `src/components/WinModal/WinModal.tsx`, `src/components/WinModal/WinModal.css`
**Action:**
1. Rename `shipName` prop to `aircraftName`
2. Update sharing text from "⚓ Keel" to "✈️ Tally" and "🚢" to "✈️"
3. Update JSDoc comments
4. Update CSS class `.win-modal__ship-name` to `.win-modal__aircraft-name` if used

### Task 10: Update GameLayout component
**Files:** `src/components/Game/GameLayout.tsx`
**Action:**
1. Update aria-label "Ship silhouette" → "Aircraft silhouette"

### Task 11: Update localStorage key
**Files:** `src/hooks/useModeCompletion.ts`
**Action:**
1. Change `STORAGE_KEY` from `'keel-daily-completion'` to `'tally-daily-completion'`
2. Add migration logic to preserve existing user data (read old key, write to new, delete old)

### Task 12: Update CSS comments
**Files:** `src/styles/animations.css`, `src/index.css`
**Action:**
1. Update "Keel Animation Keyframes" → "Tally Animation Keyframes"
2. Update "Keel Design System" → "Tally Design System"

### Task 13: Update game.ts type alias
**Files:** `src/types/game.ts`
**Action:**
1. Remove or update `ShipIdentity` type alias (line 110)
2. If keeping for backwards compatibility, add deprecation comment

### Task 14: Update App.css class
**Files:** `src/App.css`
**Action:**
1. Rename `.game-result__ship-detail` to `.game-result__aircraft-detail`
2. Update any usage of this class in components

### Task 15: Update App.tsx internal references
**Files:** `src/App.tsx`
**Action:**
1. Update `shipName` property in guess entries to `aircraftName`
2. Update all props passed to child components

### Task 16: Update test files
**Files:** `src/App.test.tsx`
**Action:**
1. Update mock data from "ship" to "aircraft" terminology
2. Update test descriptions ("renders the Keel title" → "renders the Tally title")
3. Update assertions (expect 'Tally', 'Daily Tally', 'Aircraft silhouette')
4. Update mock data object names

### Task 17: Verify and run tests
**Action:**
1. Run `npm run build` to catch TypeScript errors
2. Run `npm test` to verify all tests pass
3. Fix any remaining references found during build/test

## Verification
- [ ] `npm run build` succeeds with no errors
- [ ] `npm test` passes all tests
- [ ] No grep matches for "ship" in src/ (excluding node_modules)
- [ ] No grep matches for "keel" in src/ (case insensitive, excluding node_modules)
- [ ] Game loads and basic gameplay works

## Success Criteria
- All ship/Keel terminology replaced with aircraft/Tally
- All tests pass
- Application builds successfully
- No breaking changes to game functionality
- User's existing localStorage data migrated to new key

## Output
- All source files updated with aircraft terminology
- CSS classes renamed consistently
- Tests updated and passing
- localStorage migration implemented
