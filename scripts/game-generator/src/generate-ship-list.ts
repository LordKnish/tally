/**
 * Generate class list for autocomplete in the game UI.
 * Queries Wikidata for all unique ship classes from eligible ships (>1950, has image).
 *
 * Usage: npm run generate:ship-list
 * Output: public/ship-list.json (contains classes, not individual ships)
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ClassListData, ClassListEntry } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../../..');
const OUTPUT_PATH = join(PROJECT_ROOT, 'public/ship-list.json');

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT =
  'Mozilla/5.0 (compatible; KeelGame/1.0; +https://github.com/keel-game)';

/**
 * Ship type Wikidata IDs to query.
 */
const SHIP_TYPES = [
  'Q174736', // destroyer
  'Q182531', // battleship
  'Q17205', // aircraft carrier
  'Q104843', // cruiser
  'Q161705', // frigate
  'Q170013', // corvette
  'Q2811', // submarine
  'Q2607934', // guided missile destroyer
];

interface ClassResult {
  classLabel: { value: string };
}

/**
 * Generate a synthetic ID from a class name.
 * Normalizes the name to create a stable identifier.
 */
function generateClassId(className: string): string {
  return (
    'class:' +
    className
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  );
}

/**
 * Fetch all unique ship class names from Wikidata.
 */
async function fetchAllClasses(): Promise<ClassListEntry[]> {
  const classes: ClassListEntry[] = [];
  const seenNames = new Set<string>();

  const typeValues = SHIP_TYPES.map((t) => `wd:${t}`).join(' ');

  console.log('Fetching ship classes from Wikidata...');

  const query = `
SELECT DISTINCT ?classLabel
WHERE {
  VALUES ?type { ${typeValues} }
  ?ship wdt:P31 ?type .                   # Instance of specific ship type
  ?ship wdt:P18 ?image .                  # Has image
  ?ship wdt:P729 ?commissioned .          # Has commissioned date
  ?ship wdt:P289 ?class .                 # Has vessel class

  # Filter for ships commissioned after 1980
  FILTER(YEAR(?commissioned) > 1980)

  # Must have English class label (not Q-number)
  ?class rdfs:label ?classLabel .
  FILTER(LANG(?classLabel) = "en")
  FILTER(!STRSTARTS(?classLabel, "Q"))
}
ORDER BY ?classLabel
  `.trim();

  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('query', query);
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`SPARQL query failed: ${response.status}`);
  }

  const data = await response.json();
  const results: ClassResult[] = data.results.bindings;

  for (const result of results) {
    const name = result.classLabel.value;
    // Normalize name for deduplication (case-insensitive)
    const normalizedName = name.toLowerCase().trim();
    if (!seenNames.has(normalizedName)) {
      seenNames.add(normalizedName);
      classes.push({
        id: generateClassId(name),
        name,
      });
    }
  }

  return classes;
}

/**
 * Generate class list JSON file.
 */
async function generateClassList(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Keel Class List Generator');
  console.log('='.repeat(60));

  console.log('\nFetching classes from Wikidata...');
  const classes = await fetchAllClasses();

  console.log(`\nFound ${classes.length} unique classes`);

  // Sort alphabetically
  classes.sort((a, b) => a.name.localeCompare(b.name));

  const classListData: ClassListData = {
    generatedAt: new Date().toISOString(),
    count: classes.length,
    classes,
  };

  // Write output
  console.log('\nWriting class list...');
  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
  await writeFile(OUTPUT_PATH, JSON.stringify(classListData, null, 2));
  console.log(`  Written to: ${OUTPUT_PATH}`);
  console.log(
    `  File size: ${Math.round(JSON.stringify(classListData).length / 1024)}KB`
  );

  // Show sample
  console.log('\nSample classes:');
  for (const cls of classes.slice(0, 10)) {
    console.log(`  - ${cls.name} (${cls.id})`);
  }
  if (classes.length > 10) {
    console.log(`  ... and ${classes.length - 10} more`);
  }
}

// Run
generateClassList().catch((error) => {
  console.error('Generation failed:', error);
  process.exit(1);
});
