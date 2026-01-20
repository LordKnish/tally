# Phase 2 Research: Aircraft Database Population Script

## Current State Analysis

### Critical Issue
The current `aircraft-list.json` contains **ship data** (frigates, destroyers, corvettes, submarines) from the legacy Keel game - NOT aircraft! This is a data migration issue that must be resolved.

### Existing Infrastructure
The project already has:
- SPARQL query infrastructure in `api/cron/generate-game.ts`
- Wikidata Q-IDs for aircraft types defined
- Database tables for tracking used aircraft per mode
- Fuse.js search with fuzzy matching in `useAircraftSearch.ts`

### Current aircraft-list.json Format
```json
{
  "generatedAt": "2026-01-19T09:02:42.095Z",
  "count": 49,
  "classes": [
    { "id": "class:ada-class-corvette", "name": "Ada-class corvette" }
  ]
}
```

**Problem**: This format uses ship class IDs/names. Need to populate with actual aircraft.

---

## Wikidata Aircraft Q-IDs

### Already Used in generate-game.ts

| Q-ID | Type | Used In Modes |
|------|------|---------------|
| Q127771 | Fighter aircraft | main, ww2 |
| Q170877 | Bomber | main, ww2 |
| Q15056993 | Attack aircraft | main, ww2 |
| Q28885102 | Multirole combat aircraft | main |
| Q180352 | Reconnaissance aircraft | main, ww2, ww1 |
| Q753779 | Trainer aircraft | main, ww2 |
| Q210932 | Airliner | commercial |
| Q197380 | Transport aircraft | commercial |
| Q1420024 | Business jet | commercial |
| Q11436 | Aircraft (general) | ww1 |
| Q127134 | Biplane | ww1 |
| Q34486 | Helicopter | helicopters |
| Q484000 | UAV | drones |

### Additional Relevant Q-IDs

| Q-ID | Type | Notes |
|------|------|-------|
| Q206592 | Jet aircraft | Modern aircraft class |
| Q4120025 | Jet airliner | More specific than Q210932 |
| Q1062135 | Business jet | Alternative to Q1420024 |
| Q216916 | Military aircraft | Broad category |
| Q6879 | Jet aircraft (alt) | May overlap with Q206592 |

---

## SPARQL Best Practices

### Query Pattern for Aircraft with Images

The existing code uses:
```sparql
VALUES ?type { wd:Q127771 wd:Q170877 ... }
?aircraft wdt:P31 ?type .
?aircraft wdt:P18 ?image .
```

### Alternative: Subclass Hierarchy
For more comprehensive coverage, use:
```sparql
?aircraft wdt:P31/wdt:P279* wd:Q11436 .  # All instances of aircraft or subclasses
```

**Trade-off**: More comprehensive but slower. The current `VALUES` approach is faster for targeted queries.

### Key Properties for Aircraft Data

| Property | Name | Usage |
|----------|------|-------|
| P31 | instance of | Filter by aircraft type |
| P279 | subclass of | Navigate type hierarchy |
| P18 | image | Required for silhouette generation |
| P606 | first flight | Filter by era |
| P729 | service entry | Fallback for first flight |
| P495 | country of origin | Clue data |
| P176 | manufacturer | Clue data |
| P2050 | wingspan | Clue data |
| P2043 | length | Clue data |
| P607 | conflict | Clue data |
| P730 | retired | Status info |
| P1308 | service status | Active/retired |

---

## Getting Aliases (Alternate Names)

### Using skos:altLabel
Wikidata stores aliases as `skos:altLabel`:

```sparql
SELECT ?aircraft ?aircraftLabel
       (GROUP_CONCAT(DISTINCT ?alias; separator="|") as ?aliases)
WHERE {
  ?aircraft wdt:P31 wd:Q127771 .
  OPTIONAL { ?aircraft skos:altLabel ?alias FILTER(LANG(?alias) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?aircraft ?aircraftLabel
```

### Using Label Service for Aliases
Add `?NAMEAltLabel` pattern:
```sparql
SELECT ?aircraft ?aircraftLabel ?aircraftAltLabel
WHERE {
  ?aircraft wdt:P31 wd:Q127771 .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

### Common Aircraft Name Patterns
Aircraft often have:
- Full name: "Lockheed Martin F-16 Fighting Falcon"
- Short designation: "F-16"
- Nickname: "Viper"
- NATO reporting name: (for Russian aircraft)

---

## Query Optimization & Rate Limits

### Wikidata Query Service Limits
- **Timeout**: 60 seconds per query
- **Parallel queries**: 5 per IP
- **For large datasets**: Use dumps, not live queries

### Optimization Techniques

1. **Use Subqueries with Label Service**
   - Apply labels in outer query, LIMIT in inner subquery
   - Prevents materializing all results before limiting

2. **Invert Property Paths**
   - Try `^wdt:P279*/^wdt:P31` instead of `wdt:P31/wdt:P279*`
   - Can help avoid timeouts

3. **Batch Processing**
   - Query each aircraft type separately
   - Merge results locally
   - Avoid single massive query

4. **Use explain=details**
   - Append to query URL for debugging

### Recommended Approach for Population Script

Instead of one massive query, use batched approach:
1. Query each Q-ID type separately
2. Limit results per query (e.g., 500)
3. Offset pagination for large types
4. Aggregate and deduplicate locally
5. Save to JSON file

---

## Recommended Script Architecture

### Node.js Script Pattern
```javascript
// scripts/generate-aircraft-list.ts
async function generateAircraftList() {
  const allAircraft = new Map();

  // Query each aircraft type
  for (const qId of AIRCRAFT_TYPES) {
    const results = await queryAircraftByType(qId);
    for (const aircraft of results) {
      // Dedupe by Wikidata ID
      if (!allAircraft.has(aircraft.id)) {
        allAircraft.set(aircraft.id, aircraft);
      }
    }
  }

  // Format for aircraft-list.json
  const output = {
    generatedAt: new Date().toISOString(),
    count: allAircraft.size,
    aircraft: Array.from(allAircraft.values())
  };

  await writeFile('public/aircraft-list.json', JSON.stringify(output, null, 2));
}
```

### Output Format Recommendation
```json
{
  "generatedAt": "2026-01-20T...",
  "count": 500,
  "aircraft": [
    {
      "id": "Q1",
      "name": "F-16 Fighting Falcon",
      "aliases": ["F-16", "Viper", "Fighting Falcon"],
      "type": "fighter"
    }
  ]
}
```

### Alias Generation Strategy
1. Use `skos:altLabel` from Wikidata
2. Extract designation from name (e.g., "F-16" from "General Dynamics F-16")
3. Include manufacturer name variations
4. Add common nicknames

---

## What NOT to Hand-Roll

1. **SPARQL Query Execution**: Use existing `executeSparql` function from generate-game.ts
2. **Fuzzy Search**: Keep using Fuse.js (already implemented)
3. **Rate Limiting**: Respect Wikidata's limits, add delays between queries

---

## Potential Pitfalls

1. **Timeout on Large Queries**: Don't query all aircraft at once
2. **Missing Images**: Many aircraft lack P18 images - decide how to handle
3. **Duplicate Entries**: Same aircraft may appear under multiple type Q-IDs
4. **Language Issues**: Ensure English labels with fallback
5. **Data Quality**: Some Wikidata entries have incomplete data

---

## Sources

- [Wikidata SPARQL Query Examples](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/queries/examples)
- [Wikidata Aircraft (Q11436)](https://www.wikidata.org/wiki/Q11436)
- [Wikidata Fighter Aircraft (Q127771)](https://www.wikidata.org/wiki/Q127771)
- [Wikidata P279 Subclass Property](https://www.wikidata.org/wiki/Property:P279)
- [Wikidata SPARQL Query Limits](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/query_limits)
- [Wikidata SPARQL Query Optimization](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/query_optimization)
- [Wikidata skos:altLabel for Aliases](https://en.wikibooks.org/wiki/SPARQL/SERVICE_-_Label)
- [Research in Programming Wikidata/Aircraft](https://en.wikiversity.org/wiki/Research_in_programming_Wikidata/Aircraft)
