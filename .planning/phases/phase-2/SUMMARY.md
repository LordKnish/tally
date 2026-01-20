# Phase 2: Aircraft Database Population Script - Summary

## Status: COMPLETED

## Objective
Create a comprehensive script to populate `aircraft-list.json` with real aircraft data from Wikidata, replacing the legacy ship data.

## Commits (10 total)

| Hash | Type | Description |
|------|------|-------------|
| `b1ec1d3` | feat | create aircraft list generation script skeleton |
| `33e4c38` | feat | implement SPARQL query execution with rate limiting |
| `98198a4` | feat | implement aircraft SPARQL query with aliases |
| `23ca887` | feat | implement alias extraction and processing |
| `553b7a7` | feat | implement aircraft deduplication and aggregation |
| `8d8160e` | feat | implement JSON output for aircraft list |
| `7a70e2c` | chore | add npm script for aircraft list generation |
| `04f921b` | refactor | update useAircraftSearch for new JSON format with aliases |
| `1d04274` | feat | generate initial aircraft list from Wikidata |
| `ac1b474` | fix | update AircraftSearch tests for new JSON format |

## Key Results

### Aircraft Generated: 3,848 unique aircraft

| Category | Count |
|----------|-------|
| Attack aircraft | 1,889 |
| Aircraft (general) | 1,589 |
| UAV | 136 |
| Business jet | 88 |
| Trainer aircraft | 50 |
| Helicopter | 45 |
| Airliner | 43 |
| Multirole combat | 27 |
| Fighter aircraft | 2 |
| Bomber | 0* |
| Reconnaissance | 0* |
| Transport | 0* |
| Biplane | 0* |

*Note: Some categories returned 0 because aircraft are classified under parent categories (e.g., bombers under "Attack aircraft").

### Files Created/Modified

**New Files:**
- `scripts/generate-aircraft-list.ts` - Wikidata population script
- `public/aircraft-list.json` - 575 KB of aircraft data

**Modified Files:**
- `package.json` - Added `generate:aircraft` npm script
- `src/hooks/useAircraftSearch.ts` - Updated for new JSON format with aliases
- `src/hooks/useAircraftSearch.test.ts` - Updated tests
- `src/components/AircraftSearch/AircraftSearch.test.tsx` - Fixed mock data

### New JSON Format
```json
{
  "generatedAt": "2026-01-20T...",
  "count": 3848,
  "aircraft": [
    {
      "id": "Q12345",
      "name": "F-16 Fighting Falcon",
      "aliases": ["F-16", "Viper", "Fighting Falcon"]
    }
  ]
}
```

### New npm Script
```bash
npm run generate:aircraft
```

## Deviations from Plan
1. **AircraftSearch.test.tsx needed updates**: Test file had outdated mock data using old `classes` format instead of `aircraft` array

## Verification Results
- **Build**: SUCCESS
- **Tests**: 59 tests passed across 7 test files

## Key Features Implemented
1. **Batched SPARQL queries** - One query per aircraft type to avoid timeouts
2. **Rate limiting** - 1-second delay between queries
3. **Alias extraction** - From skos:altLabel and name parsing
4. **Deduplication** - Same aircraft from multiple types merged
5. **Alias search** - Fuse.js now searches both name and aliases

## Next Phase
Phase 3: Game Mode Validation & Fixes
