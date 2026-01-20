# Phase 1: Legacy Nomenclature Cleanup - Summary

## Status: COMPLETED

## Objective
Remove all ship/Keel references and establish consistent aircraft terminology throughout the codebase.

## Commits (16 total)

| Hash | Type | Description |
|------|------|-------------|
| `77defb9` | refactor | rename ship-list.json to aircraft-list.json |
| `8ad4600` | refactor | rename useShipSearch hook to useAircraftSearch |
| `89f45db` | refactor | rename ShipSearch component to AircraftSearch |
| `1402a61` | refactor | update App.tsx imports for AircraftSearch |
| `6ec5c89` | refactor | update Silhouette component terminology |
| `e1a72d1` | refactor | update TriviaClue component terminology |
| `f7e9e8c` | refactor | update PhotoReveal component terminology |
| `093386c` | refactor | update GuessHistory component terminology |
| `55d2956` | refactor | update WinModal component terminology |
| `69053b6` | refactor | update GameLayout aria-label |
| `053bf50` | refactor | migrate localStorage key to tally prefix |
| `309c0e8` | refactor | update CSS comments from Keel to Tally |
| `ea96921` | refactor | remove ShipIdentity type alias |
| `f4104c4` | refactor | rename App.css class names |
| `d6ea1bd` | test | update App.test.tsx for aircraft terminology |
| `1df8c27` | fix | fix remaining terminology issue in SubmitButton |

## Key Changes

### File Renames
- `public/ship-list.json` → `public/aircraft-list.json`
- `src/hooks/useShipSearch.ts` → `src/hooks/useAircraftSearch.ts`
- `src/hooks/useShipSearch.test.ts` → `src/hooks/useAircraftSearch.test.ts`
- `src/components/ShipSearch/` → `src/components/AircraftSearch/`

### Type/Interface Renames
- `ShipListEntry` → `AircraftListEntry`
- `UseShipSearchReturn` → `UseAircraftSearchReturn`
- `ShipSearchProps` → `AircraftSearchProps`
- `ShipSearch` → `AircraftSearch`
- `useShipSearch` → `useAircraftSearch`
- Removed deprecated `ShipIdentity` type alias

### Prop Renames (across multiple components)
- `shipName` → `aircraftName`

### UI Text Updates
- Sharing text: "⚓ Keel" → "✈️ Tally", "🚢" → "✈️"
- Placeholders: "Type a ship class..." → "Type an aircraft..."
- Aria-labels: "Ship silhouette" → "Aircraft silhouette"
- Error messages: "Failed to load ship classes" → "Failed to load aircraft"

### CSS Class Renames
- `.ship-search*` → `.aircraft-search*`
- `.guess-history__ship-name` → `.guess-history__aircraft-name`
- `.game-result__ship-detail` → `.game-result__aircraft-detail`

### localStorage Migration
- Key changed from `keel-daily-completion` to `tally-daily-completion`
- Migration logic added to preserve existing user data

## Deviations from Plan
1. **Task 15 merged into earlier tasks**: Internal terminology changes were already covered by Tasks 4 and 8
2. **Additional fix**: SubmitButton.tsx JSDoc comment had a remaining "ship" reference not in original plan

## Verification Results
- Build: SUCCESS (79 modules transformed)
- Tests: SUCCESS (58 tests passed across 7 test files)
- Remaining ship/keel references: Only intentional legacy key for migration

## Files Changed (22 files)
- public/aircraft-list.json
- src/hooks/useAircraftSearch.ts
- src/hooks/useAircraftSearch.test.ts
- src/hooks/useModeCompletion.ts
- src/components/AircraftSearch/AircraftSearch.tsx
- src/components/AircraftSearch/AircraftSearch.css
- src/components/AircraftSearch/AircraftSearch.test.tsx
- src/components/AircraftSearch/SubmitButton.tsx
- src/components/Silhouette/Silhouette.tsx
- src/components/Silhouette/Silhouette.test.tsx
- src/components/Clues/TriviaClue.tsx
- src/components/Clues/PhotoReveal.tsx
- src/components/GuessHistory/GuessHistory.tsx
- src/components/GuessHistory/GuessHistory.css
- src/components/GuessHistory/GuessHistory.test.tsx
- src/components/WinModal/WinModal.tsx
- src/components/Game/GameLayout.tsx
- src/types/game.ts
- src/styles/animations.css
- src/index.css
- src/App.tsx
- src/App.css
- src/App.test.tsx

## Next Phase
Phase 2: Aircraft Database Population Script
