# Phase 3: Game Mode Validation & Fixes

## Objective
Ensure all 6 game modes work correctly by testing and fixing the game generation pipeline, removing legacy ship mode files, and validating proper aircraft selection per mode.

## Execution Context
- Single-session phase
- Requires testing against live Wikidata SPARQL (may need manual generation triggers)
- Focus on infrastructure validation, not UI testing

## Context

### Current Architecture
1. **API-first**: App fetches from `/api/game/today?mode=X`
2. **Fallback**: Static `/game-data-{mode}.json` files if API unavailable
3. **Database**: Neon PostgreSQL stores generated games in `tally_game_data`
4. **Generation**: `/api/cron/generate-game` creates daily games via Wikidata SPARQL

### Issues Found During Discovery

1. **Legacy ship mode files exist**: `game-data-carrier.json`, `game-data-submarine.json`, `game-data-coastguard.json`
2. **Missing aircraft mode files**: `game-data-commercial.json`, `game-data-ww1.json`, `game-data-helicopters.json`, `game-data-drones.json`
3. **Existing main.json is huge** (52K tokens) - likely contains ship data

### Game Modes Configuration
| Mode | Year Filter | Aircraft Types |
|------|-------------|----------------|
| main | 1980+ | Fighter, Bomber, Attack, Multirole, Recon, Trainer |
| commercial | 1980+ | Airliner, Transport, Business jet |
| ww2 | 1935-1950 | Fighter, Bomber, Attack, Recon, Trainer |
| ww1 | 1910-1925 | Aircraft general, Fighter, Bomber, Biplane, Recon |
| helicopters | Any | Helicopter |
| drones | Any | UAV |

## Tasks

### Task 1: Remove legacy ship mode files
**Files:** `public/game-data-*.json`
**Action:**
1. Delete `public/game-data-carrier.json`
2. Delete `public/game-data-submarine.json`
3. Delete `public/game-data-coastguard.json`
4. Delete `public/game-data-coldwar.json` (also legacy)
5. Delete `public/game-data-main.json` (contains ship data)
6. Delete `public/game-data-ww2.json` (may contain ship data)
- Commit: `chore(phase-3): remove legacy ship mode game data files`

### Task 2: Create placeholder game data files
**Files:** `public/game-data-*.json`
**Action:**
Create minimal valid placeholder files for all 6 modes that will be replaced by API data:
1. Create `public/game-data-main.json` (placeholder)
2. Create `public/game-data-commercial.json`
3. Create `public/game-data-ww2.json`
4. Create `public/game-data-ww1.json`
5. Create `public/game-data-helicopters.json`
6. Create `public/game-data-drones.json`

Each file should have minimal valid structure so the app doesn't crash if API is unavailable:
```json
{
  "date": "2026-01-01",
  "aircraft": { "id": "placeholder", "name": "Loading...", "aliases": [] },
  "silhouette": "",
  "clues": {
    "specs": { "class": null, "manufacturer": null, "wingspan": null, "firstFlight": null },
    "context": { "nation": "Unknown", "conflicts": [], "status": null },
    "trivia": null,
    "photo": ""
  }
}
```
- Commit: `feat(phase-3): create placeholder game data files for all modes`

### Task 3: Add fallback handling in App.tsx
**Files:** `src/App.tsx`
**Action:**
1. Find the game data fetching logic
2. Ensure proper fallback to static files when API returns 404
3. Add user-friendly error message when no game data available
4. Add loading state indicator
- Commit: `feat(phase-3): improve game data fallback and error handling`

### Task 4: Test generate-game API for main mode
**Action:**
1. Review the SPARQL query construction in `api/cron/generate-game.ts`
2. Check if queries properly filter for aircraft with images (P18)
3. Check if year filters work correctly
4. Verify the buildAircraftQuery function generates valid SPARQL
5. Document any issues found
- This is a code review task, no commit unless fixes needed

### Task 5: Verify mode configuration consistency
**Files:** `api/cron/generate-game.ts`, `src/types/modes.ts`
**Action:**
1. Compare GAME_MODES in both files
2. Ensure aircraft types match between backend and frontend
3. Ensure mode IDs are consistent
4. Fix any mismatches
- Commit if changes: `fix(phase-3): synchronize mode configuration between frontend and backend`

### Task 6: Add script to test game generation locally
**Files:** `scripts/test-game-generation.ts`
**Action:**
1. Create a script that simulates game generation for each mode
2. Query Wikidata with same SPARQL as generate-game.ts
3. Report eligible aircraft count per mode
4. Identify any modes with 0 eligible aircraft
5. Add to package.json: `"test:modes": "npx tsx scripts/test-game-generation.ts"`
- Commit: `feat(phase-3): add script to test game generation per mode`

### Task 7: Run mode tests and document results
**Action:**
1. Run `npm run test:modes`
2. Document aircraft counts per mode
3. Identify any modes needing query adjustments
4. If issues found, create follow-up tasks
- Commit if documentation needed: `docs(phase-3): document mode validation results`

### Task 8: Verify build and tests
**Action:**
1. Run `npm run build` - verify no TypeScript errors
2. Run `npm test` - verify all tests pass
3. Fix any issues found
- Commit if fixes: `fix(phase-3): fix issues from verification`

## Verification
- [ ] Legacy ship mode files removed
- [ ] All 6 aircraft mode files exist (even if placeholders)
- [ ] App handles missing API data gracefully
- [ ] Mode configuration consistent between frontend and backend
- [ ] Test script reports aircraft counts for all modes
- [ ] `npm run build` succeeds
- [ ] `npm test` passes

## Success Criteria
- No ship-related game data files remain
- All 6 modes have placeholder fallback files
- App doesn't crash when API unavailable
- Mode configurations are synchronized
- Script can validate game generation locally

## Output
- Cleaned up `public/` directory
- Placeholder game data files for all modes
- `scripts/test-game-generation.ts` for mode testing
- Documentation of mode validation results
