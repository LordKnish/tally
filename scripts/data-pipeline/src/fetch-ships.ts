import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  buildWarshipQuery,
  buildCountQuery,
  getSparqlEndpoint,
  commonsFileToUrl,
  extractEntityId,
  SHIP_TYPES,
} from './sparql.js';
import type { Ship, WikidataResult, SampleDataset } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Execute SPARQL query against Wikidata.
 */
async function executeSparql<T>(query: string): Promise<T[]> {
  const endpoint = getSparqlEndpoint();
  const url = `${endpoint}?query=${encodeURIComponent(query)}`;

  console.log('Executing SPARQL query...');

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/sparql-results+json',
      'User-Agent': 'KeelGame/1.0 (https://github.com/keel-game; contact@example.com)',
    },
  });

  if (!response.ok) {
    throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.results.bindings as T[];
}

/**
 * Transform Wikidata result into Ship object.
 */
function transformResult(result: WikidataResult): Ship {
  const imageFile = result.image?.value
    ? result.image.value.split('/').pop() || undefined
    : undefined;

  return {
    id: extractEntityId(result.ship.value),
    name: result.shipLabel.value,
    type: result.typeLabel.value,
    typeId: extractEntityId(result.type.value),
    className: result.classLabel?.value,
    classId: result.class ? extractEntityId(result.class.value) : undefined,
    country: result.countryLabel?.value,
    countryId: result.country ? extractEntityId(result.country.value) : undefined,
    imageFile,
    imageUrl: imageFile ? commonsFileToUrl(imageFile) : undefined,
    wikipediaTitle: result.article?.value
      ? decodeURIComponent(result.article.value.split('/').pop() || '')
      : undefined,
    wikipediaUrl: result.article?.value,
    commissioned: result.commissioned?.value,
    length: result.length ? parseFloat(result.length.value) : undefined,
    beam: result.beam ? parseFloat(result.beam.value) : undefined,
    quality: {
      hasImage: !!result.image,
      hasClass: !!result.class,
      hasCountry: !!result.country,
      hasSpecs: !!(result.length || result.beam),
      hasWikipedia: !!result.article,
    },
  };
}

/**
 * Fetch ships and build sample dataset.
 */
async function fetchSampleDataset(): Promise<SampleDataset> {
  const ships: Ship[] = [];
  const seenIds = new Set<string>();

  // Fetch a diverse sample: specific types to ensure variety
  const typesToFetch: (keyof typeof SHIP_TYPES)[] = [
    'battleship',
    'aircraftCarrier',
    'destroyer',
    'cruiser',
    'submarine',
  ];

  for (const shipType of typesToFetch) {
    console.log(`\nFetching ${shipType}s...`);

    const query = buildWarshipQuery({
      shipType,
      requireImage: true,
      limit: 25,  // 25 per type = ~125 total, filter to 100
    });

    try {
      const results = await executeSparql<WikidataResult>(query);
      console.log(`  Found ${results.length} results`);

      for (const result of results) {
        const ship = transformResult(result);

        // Deduplicate
        if (!seenIds.has(ship.id)) {
          seenIds.add(ship.id);
          ships.push(ship);
        }
      }

      // Rate limit: wait 1 second between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`  Error fetching ${shipType}:`, error);
    }
  }

  // Calculate stats
  const stats = {
    total: ships.length,
    withImages: ships.filter(s => s.quality.hasImage).length,
    withClass: ships.filter(s => s.quality.hasClass).length,
    withCountry: ships.filter(s => s.quality.hasCountry).length,
    withSpecs: ships.filter(s => s.quality.hasSpecs).length,
    withWikipedia: ships.filter(s => s.quality.hasWikipedia).length,
    byType: {} as Record<string, number>,
    byCountry: {} as Record<string, number>,
  };

  for (const ship of ships) {
    stats.byType[ship.type] = (stats.byType[ship.type] || 0) + 1;
    if (ship.country) {
      stats.byCountry[ship.country] = (stats.byCountry[ship.country] || 0) + 1;
    }
  }

  return {
    version: '1.0.0',
    fetchedAt: new Date().toISOString(),
    query: 'Multiple type-specific queries (battleship, carrier, destroyer, cruiser, submarine)',
    ships,
    stats,
  };
}

/**
 * Main entry point.
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Keel Data Pipeline - Fetch Ships from Wikidata');
  console.log('='.repeat(60));

  // First, get total counts
  console.log('\nChecking Wikidata coverage...');
  try {
    const countQuery = buildCountQuery();
    const countResult = await executeSparql<{ count: { value: string } }>(countQuery);
    const totalWithImages = parseInt(countResult[0]?.count?.value || '0');
    console.log(`Total warships with images in Wikidata: ${totalWithImages}`);
  } catch (error) {
    console.log('Could not get total count (query may have timed out)');
  }

  // Fetch sample dataset
  console.log('\nBuilding sample dataset...');
  const dataset = await fetchSampleDataset();

  // Output directory
  const outputDir = join(__dirname, '../data');
  await mkdir(outputDir, { recursive: true });

  // Save dataset
  const outputPath = join(outputDir, 'sample-ships.json');
  await writeFile(outputPath, JSON.stringify(dataset, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total ships: ${dataset.stats.total}`);
  console.log(`With images: ${dataset.stats.withImages} (${((dataset.stats.withImages/dataset.stats.total)*100).toFixed(1)}%)`);
  console.log(`With class: ${dataset.stats.withClass} (${((dataset.stats.withClass/dataset.stats.total)*100).toFixed(1)}%)`);
  console.log(`With country: ${dataset.stats.withCountry} (${((dataset.stats.withCountry/dataset.stats.total)*100).toFixed(1)}%)`);
  console.log(`With specs: ${dataset.stats.withSpecs} (${((dataset.stats.withSpecs/dataset.stats.total)*100).toFixed(1)}%)`);
  console.log(`With Wikipedia: ${dataset.stats.withWikipedia} (${((dataset.stats.withWikipedia/dataset.stats.total)*100).toFixed(1)}%)`);

  console.log('\nBy Type:');
  for (const [type, count] of Object.entries(dataset.stats.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  console.log('\nBy Country (top 10):');
  const topCountries = Object.entries(dataset.stats.byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [country, count] of topCountries) {
    console.log(`  ${country}: ${count}`);
  }

  console.log(`\nOutput: ${outputPath}`);
}

main().catch(console.error);
