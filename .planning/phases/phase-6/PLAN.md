# Phase 6: Final Polish & Testing

## Objective
Update API mode definitions to match consolidated modes, test game generation end-to-end, and verify the full game flow works.

## Execution Context
- Single-session phase
- Fix mode ID mismatches between backend files
- Test with actual curl commands
- Verify database and API work together

## Context

### Mode ID Mismatch Found
The `api/game/today.ts` still references old mode IDs:
```typescript
type GameModeId = 'main' | 'commercial' | 'ww2' | 'ww1' | 'helicopters' | 'drones';
```

Should be:
```typescript
type GameModeId = 'main' | 'commercial' | 'ww2' | 'goldenage';
```

### Current Mode Configuration (from Phase 4)
| Mode | ID | Aircraft Count |
|------|-----|----------------|
| Daily Tally | main | 263 |
| Commercial | commercial | 157 |
| WW2 | ww2 | 411 |
| Golden Age | goldenage | 566 |

### API Endpoints
- Generate game: `GET /api/cron/generate-game?manual=true&secret=CRON_SECRET&mode=MODE`
- Fetch game: `GET /api/game/today?mode=MODE`
- List modes: `GET /api/game/today?all`

### Environment Requirements
- `CRON_SECRET` - For manual game generation
- `POSTGRES_URL` - Neon database connection
- `REMOVEBG_API_KEY` - Optional, for better silhouettes

## Tasks

### Task 1: Update API mode definitions
**Files:** `api/game/today.ts`
**Action:**
1. Update `GameModeId` type to match generate-game.ts
2. Update `VALID_MODES` array
3. Remove references to ww1, helicopters, drones
- Commit: `fix(phase-6): align API mode IDs with consolidated modes`

### Task 2: Clean up placeholder game data files
**Files:** `public/game-data-*.json`
**Action:**
1. Remove obsolete placeholder files:
   - `public/game-data-ww1.json`
   - `public/game-data-helicopters.json`
   - `public/game-data-drones.json`
2. Keep `public/game-data-main.json` as fallback placeholder
- Commit: `chore(phase-6): remove obsolete placeholder game data files`

### Task 3: Verify build passes
**Action:**
1. Run `npm run build`
2. Run `npm test`
3. Fix any type errors or test failures
- Commit if fixes needed: `fix(phase-6): fix build/test issues`

### Task 4: Test game generation locally (manual)
**Action:**
1. Start local dev server: `npm run dev`
2. Generate a game via curl (requires deployed API or local Vercel dev)
3. Verify game data is stored in database
4. Verify game data can be fetched
- No commit - manual verification

### Task 5: Document deployment and testing steps
**Files:** Update README or create TESTING.md
**Action:**
1. Document how to generate games manually
2. Document environment variables needed
3. Document curl commands for testing
- Commit: `docs(phase-6): add deployment and testing documentation`

## Verification
- [ ] API mode types match generate-game.ts
- [ ] No obsolete placeholder files
- [ ] Build passes
- [ ] Tests pass
- [ ] curl commands documented

## Success Criteria
- Mode IDs consistent across all files
- No references to removed modes (ww1, helicopters, drones)
- Clear documentation for generating and testing games
- Ready for production deployment

## Output
- Consistent API mode definitions
- Clean public directory
- Testing documentation
