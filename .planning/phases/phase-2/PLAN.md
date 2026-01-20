# Phase 2: Aircraft Database Population Script

## Objective
Create a comprehensive script to populate `aircraft-list.json` with real aircraft data from Wikidata, replacing the legacy ship data and enabling proper aircraft search functionality.

## Execution Context
- Single-session phase
- Requires network access to Wikidata SPARQL endpoint
- Uses existing SPARQL infrastructure from generate-game.ts
- Research completed: see RESEARCH.md

## Context

### Critical Issue
The current `aircraft-list.json` contains ship data (frigates, destroyers) from the legacy Keel game. This must be replaced with actual aircraft data.

### Current Format (ships - wrong)
```json
{
  "classes": [{ "id": "class:ada-class-corvette", "name": "Ada-class corvette" }]
}
```

### Target Format (aircraft - correct)
```json
{
  "aircraft": [
    { "id": "Q12345", "name": "F-16 Fighting Falcon", "aliases": ["F-16", "Viper"] }
  ]
}
```

### Aircraft Types to Include
From the game modes in generate-game.ts:
- Q127771 (Fighter aircraft) - main, ww2
- Q170877 (Bomber) - main, ww2
- Q15056993 (Attack aircraft) - main, ww2
- Q28885102 (Multirole combat) - main
- Q180352 (Reconnaissance) - main, ww2, ww1
- Q753779 (Trainer) - main, ww2
- Q210932 (Airliner) - commercial
- Q197380 (Transport) - commercial
- Q1420024 (Business jet) - commercial
- Q11436 (Aircraft general) - ww1
- Q127134 (Biplane) - ww1
- Q34486 (Helicopter) - helicopters
- Q484000 (UAV) - drones

## Tasks

### Task 1: Create scripts directory and base script
**Files:** `scripts/generate-aircraft-list.ts`
**Action:**
1. Create `scripts/` directory
2. Create base script file with TypeScript setup
3. Add SPARQL endpoint constants (reuse from generate-game.ts)
4. Add aircraft type Q-ID configuration

### Task 2: Implement SPARQL query function
**Files:** `scripts/generate-aircraft-list.ts`
**Action:**
1. Implement `executeSparql<T>()` function (port from generate-game.ts)
2. Add proper User-Agent header
3. Add error handling and retry logic
4. Add delay between queries to respect rate limits

### Task 3: Implement aircraft query with aliases
**Files:** `scripts/generate-aircraft-list.ts`
**Action:**
1. Create SPARQL query that fetches:
   - Aircraft ID and label
   - skos:altLabel aliases (English)
   - P18 image existence (for validation)
2. Query per aircraft type Q-ID
3. Handle pagination with OFFSET for large result sets
4. Use GROUP_CONCAT for aliases

### Task 4: Implement alias extraction logic
**Files:** `scripts/generate-aircraft-list.ts`
**Action:**
1. Parse Wikidata aliases from skos:altLabel
2. Extract designations from names (e.g., "F-16" from "General Dynamics F-16")
3. Deduplicate aliases
4. Filter out non-useful aliases (too long, duplicates of name)

### Task 5: Implement deduplication and aggregation
**Files:** `scripts/generate-aircraft-list.ts`
**Action:**
1. Aggregate results from all aircraft type queries
2. Deduplicate by Wikidata ID (same aircraft may appear in multiple types)
3. Sort alphabetically by name
4. Generate output statistics

### Task 6: Implement JSON output
**Files:** `scripts/generate-aircraft-list.ts`
**Action:**
1. Format output as new JSON structure:
   ```json
   {
     "generatedAt": "ISO timestamp",
     "count": number,
     "aircraft": [{ "id", "name", "aliases" }]
   }
   ```
2. Write to `public/aircraft-list.json`
3. Add pretty-printing for readability

### Task 7: Add npm script for generation
**Files:** `package.json`
**Action:**
1. Add script: `"generate:aircraft": "npx tsx scripts/generate-aircraft-list.ts"`
2. Ensure tsx is available (add to devDependencies if needed)

### Task 8: Update useAircraftSearch hook
**Files:** `src/hooks/useAircraftSearch.ts`, `src/hooks/useAircraftSearch.test.ts`
**Action:**
1. Update `AircraftListEntry` interface to include `aliases?: string[]`
2. Change `data.classes` to `data.aircraft` in JSON parsing
3. Update `AircraftListData` interface
4. Update Fuse.js keys to search aliases: `keys: ['name', 'aliases']`
5. Update tests to use new format

### Task 9: Run script and generate aircraft data
**Action:**
1. Run `npm run generate:aircraft`
2. Verify output in `public/aircraft-list.json`
3. Check aircraft count (should be 200+ aircraft)
4. Verify aliases are populated

### Task 10: Verify and test
**Action:**
1. Run `npm run build` - verify no TypeScript errors
2. Run `npm test` - verify all tests pass
3. Run dev server and test search functionality
4. Verify searching for "F-16" returns F-16 Fighting Falcon
5. Verify searching for "Viper" returns F-16 (via alias)

## Verification
- [ ] `scripts/generate-aircraft-list.ts` created and runs successfully
- [ ] `public/aircraft-list.json` contains aircraft (not ships)
- [ ] Aircraft count is 200+ entries
- [ ] Aliases are populated for major aircraft
- [ ] `npm run generate:aircraft` script works
- [ ] `useAircraftSearch` updated and tests pass
- [ ] Search works for aircraft names AND aliases
- [ ] `npm run build` succeeds
- [ ] `npm test` passes

## Success Criteria
- Ship data completely replaced with aircraft data
- All 6 game mode aircraft types represented
- Fuzzy search works on both names and aliases
- Script can be re-run to update aircraft list
- No breaking changes to application

## Output
- `scripts/generate-aircraft-list.ts` - Population script
- `public/aircraft-list.json` - Updated with real aircraft data
- Updated `useAircraftSearch` hook with alias support
- New npm script `generate:aircraft`
