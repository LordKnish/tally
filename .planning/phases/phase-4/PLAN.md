# Phase 4: Aviation-Specific Clue Enhancement

## Objective
Update clue content to be aviation-specific, fix frontend/backend mismatches, and improve clue quality for a better gameplay experience.

## Execution Context
- Single-session phase
- Fixes data contract between frontend and backend
- Improves trivia extraction with aviation keywords
- Addresses Commercial mode low aircraft count issue

## Context

### Current Clue Structure Analysis

**Specs Clue (Turn 2)**
| Frontend expects | Backend provides | Status |
|-----------------|------------------|--------|
| `wingspan` | `wingspan` | OK |
| `weight` | N/A | **MISSING** |
| `firstFlight` | `firstFlight` | OK |
| N/A | `class` | Not displayed |
| N/A | `manufacturer` | Not displayed |

**Context Clue (Turn 3)**
| Frontend expects | Backend provides | Status |
|-----------------|------------------|--------|
| `nation` | `nation` | OK |
| `operators` | N/A | **MISSING** (shows "None recorded") |
| `status` | `status` | OK |
| N/A | `conflicts` | Not displayed |

### Known Issues
1. Frontend/backend clue field mismatch
2. Commercial mode only has 6 eligible aircraft
3. Trivia keywords are general, not aviation-specific

### Aviation-Specific Wikidata Properties
| Property | Name | Usage |
|----------|------|-------|
| P2050 | wingspan | Already used |
| P2067 | mass | For weight |
| P176 | manufacturer | For manufacturer clue |
| P137 | operator | For operators list |
| P607 | conflict | For historical context |
| P606 | first flight | Already used |
| P2210 | maximum speed | Potential new clue |
| P2051 | range | Potential new clue |

## Tasks

### Task 1: Fix clue type definitions
**Files:** `src/types/game.ts`, `api/game/today.ts`
**Action:**
1. Update `SpecsClue` interface to include `manufacturer` field
2. Update `ContextClue` interface:
   - Rename `operators` to `conflicts` to match backend
   - Add comment about what conflicts means
3. Ensure both files have matching interfaces
- Commit: `fix(phase-4): align clue type definitions between frontend and backend`

### Task 2: Update SpecsClue component
**Files:** `src/components/Clues/SpecsClue.tsx`
**Action:**
1. Replace `weight` with `manufacturer`
2. Update labels:
   - "Weight" → "Manufacturer"
3. Keep: Wingspan, First Flight
4. Consider adding: Aircraft class (if useful without giving away answer)
- Commit: `feat(phase-4): update SpecsClue to show manufacturer`

### Task 3: Update ContextClue component
**Files:** `src/components/Clues/ContextClue.tsx`
**Action:**
1. Replace `operators` with `conflicts`
2. Update labels:
   - "Operators" → "Conflicts" or "Notable Conflicts"
3. Format conflicts as comma-separated list
4. Show "No conflicts recorded" when empty
- Commit: `feat(phase-4): update ContextClue to show conflicts`

### Task 4: Enhance trivia extraction keywords
**Files:** `api/cron/generate-game.ts`
**Action:**
1. Add aviation-specific keywords to `interestingKeywords` array:
   - maiden flight, combat, ace, dogfight, squadron
   - carrier, airbase, bombing, mission, sortie
   - speed record, altitude record, payload
   - stealth, supersonic, jet, propeller
   - cockpit, ejection, radar, avionics
2. Prioritize sentences with these keywords
- Commit: `feat(phase-4): enhance trivia extraction with aviation keywords`

### Task 5: Expand Commercial mode aircraft types
**Files:** `api/cron/generate-game.ts`, `scripts/test-game-generation.ts`
**Action:**
1. Add additional Q-IDs to commercial mode:
   - Q206592 (jet aircraft) - subset filter may help
   - Q329014 (cargo aircraft)
   - Q1261534 (wide-body aircraft)
   - Q2996551 (narrow-body aircraft)
2. Consider relaxing year filter (1970+ instead of 1980+)
3. Update test script with same Q-IDs
4. Run test:modes to verify improvement
- Commit: `feat(phase-4): expand Commercial mode aircraft coverage`

### Task 6: Add role/mission type to specs clue
**Files:** `api/cron/generate-game.ts`, `src/types/game.ts`, `api/game/today.ts`, `src/components/Clues/SpecsClue.tsx`
**Action:**
1. The backend already fetches `classLabel` (aircraft class/role)
2. Add `role` field to SpecsClue interface
3. Store aircraft class as `role` (e.g., "Fighter aircraft", "Bomber")
4. Display in SpecsClue as "Role" or "Type"
5. Only show if it doesn't give away the answer (check if role == aircraft name)
- Commit: `feat(phase-4): add aircraft role to specs clue`

### Task 7: Update tests for new clue structure
**Files:** `src/App.test.tsx`, component test files if needed
**Action:**
1. Update mock game data to use new clue structure
2. Verify tests pass with new field names
3. Add test for conflicts display
- Commit: `test(phase-4): update tests for new clue structure`

### Task 8: Verify build and tests
**Action:**
1. Run `npm run build`
2. Run `npm test`
3. Run `npm run test:modes` to verify Commercial mode improvement
4. Fix any issues
- Commit if fixes needed: `fix(phase-4): fix issues from verification`

## Verification
- [ ] SpecsClue shows: Wingspan, Manufacturer, First Flight
- [ ] ContextClue shows: Nation, Conflicts, Status
- [ ] Trivia extraction uses aviation keywords
- [ ] Commercial mode has more eligible aircraft
- [ ] Type definitions match between frontend and backend
- [ ] All tests pass
- [ ] Build succeeds

## Success Criteria
- Frontend and backend clue structures match
- More relevant aviation-specific trivia
- Commercial mode has >20 eligible aircraft
- No breaking changes to existing gameplay

## Output
- Updated clue components with aviation-specific fields
- Enhanced trivia extraction
- Expanded Commercial mode coverage
- Aligned type definitions
