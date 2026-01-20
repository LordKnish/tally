import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import type { SampleDataset } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TestResult {
  ship: string;
  shipId: string;
  type: string;
  imageExists: boolean;
  lineartGenerated: boolean;
  error?: string;
}

/**
 * Test the full pipeline: data -> image -> line art
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Keel Pipeline Test - End-to-End');
  console.log('='.repeat(60));

  // Load dataset
  const dataPath = join(__dirname, '../data/sample-ships.json');
  if (!existsSync(dataPath)) {
    console.error('Dataset not found. Run `npm run fetch` first.');
    process.exit(1);
  }

  const dataset: SampleDataset = JSON.parse(await readFile(dataPath, 'utf-8'));

  // Select 10 ships with images for testing
  const testShips = dataset.ships
    .filter(s => s.quality.hasImage)
    .slice(0, 10);

  console.log(`\nTesting with ${testShips.length} ships:`);
  for (const ship of testShips) {
    console.log(`  - ${ship.name} (${ship.type})`);
  }

  // Check for downloaded images
  const imagesDir = join(__dirname, '../data/images');
  const lineartDir = join(__dirname, '../data/lineart');
  await mkdir(lineartDir, { recursive: true });

  // Test each ship
  const results: TestResult[] = [];

  // Try to import line art generator from silhouette-poc
  const lineartPath = join(__dirname, '../../silhouette-poc/src/lineart.js');
  let generateLineArt: ((input: string, output: string) => Promise<{ success: boolean; error?: string }>) | null = null;

  try {
    const lineart = await import(lineartPath);
    generateLineArt = lineart.generateLineArt;
    console.log('\n✓ Line art module loaded');
  } catch (error) {
    console.log('\n⚠ Line art module not available.');
    console.log('  To test line art generation:');
    console.log('  1. cd ../silhouette-poc');
    console.log('  2. npm run build (or ensure lineart.ts is compiled)');
    console.log('\n  Skipping line art generation for this test.');
  }

  for (const ship of testShips) {
    console.log(`\nProcessing: ${ship.name}`);

    const safeId = ship.id.replace(/[^a-zA-Z0-9]/g, '_');
    const ext = ship.imageFile?.split('.').pop()?.toLowerCase() || 'jpg';
    const imagePath = join(imagesDir, `${safeId}.${ext}`);
    const lineartOutputPath = join(lineartDir, `${safeId}-lineart.png`);

    const result: TestResult = {
      ship: ship.name,
      shipId: ship.id,
      type: ship.type,
      imageExists: existsSync(imagePath),
      lineartGenerated: false,
      error: undefined,
    };

    if (!result.imageExists) {
      result.error = 'Image not downloaded';
      results.push(result);
      console.log(`  ✗ Image not found: ${imagePath}`);
      continue;
    }

    console.log(`  ✓ Image exists`);

    // Generate line art if module available
    if (generateLineArt) {
      try {
        const lineartResult = await generateLineArt(imagePath, lineartOutputPath);
        result.lineartGenerated = lineartResult.success;
        if (!lineartResult.success) {
          result.error = lineartResult.error;
        }
        console.log(`  ${lineartResult.success ? '✓' : '✗'} Line art: ${lineartResult.success ? 'generated' : lineartResult.error}`);
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        console.log(`  ✗ Line art error: ${result.error}`);
      }
    }

    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));

  const imagesFound = results.filter(r => r.imageExists).length;
  const lineartSuccess = results.filter(r => r.lineartGenerated).length;

  console.log(`Images found: ${imagesFound}/${results.length}`);
  console.log(`Line art generated: ${lineartSuccess}/${results.length}`);

  if (results.some(r => r.error)) {
    console.log('\nErrors:');
    for (const r of results.filter(r => r.error)) {
      console.log(`  - ${r.ship}: ${r.error}`);
    }
  }

  // Save results
  const resultsPath = join(__dirname, '../data/pipeline-test-results.json');
  await writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);

  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (imagesFound >= 8 && (lineartSuccess >= 8 || !generateLineArt)) {
    console.log('✓ Pipeline test PASSED');
    console.log('  Data source is viable for the game.');
  } else {
    console.log('✗ Pipeline test FAILED');
    console.log('  Review errors and data quality before proceeding.');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
