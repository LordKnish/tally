import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import type { SampleDataset, Ship } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface DownloadResult {
  shipId: string;
  shipName: string;
  success: boolean;
  filename?: string;
  error?: string;
  sizeKb?: number;
}

/**
 * Download a single image from Commons.
 */
async function downloadImage(
  ship: Ship,
  outputDir: string
): Promise<DownloadResult> {
  if (!ship.imageUrl) {
    return {
      shipId: ship.id,
      shipName: ship.name,
      success: false,
      error: 'No image URL',
    };
  }

  // Create safe filename
  const safeId = ship.id.replace(/[^a-zA-Z0-9]/g, '_');
  const ext = ship.imageFile?.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${safeId}.${ext}`;
  const outputPath = join(outputDir, filename);

  // Skip if already downloaded
  if (existsSync(outputPath)) {
    return {
      shipId: ship.id,
      shipName: ship.name,
      success: true,
      filename,
      error: 'Already exists',
    };
  }

  try {
    // Add width parameter for reasonable size (1200px wide)
    const sizedUrl = `${ship.imageUrl}?width=1200`;

    const response = await fetch(sizedUrl, {
      headers: {
        // Wikimedia requires a browser-like User-Agent or proper bot identification
        'User-Agent': 'Mozilla/5.0 (compatible; KeelGame/1.0; +https://github.com/keel-game)',
        'Accept': 'image/*,*/*',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(outputPath, buffer);

    return {
      shipId: ship.id,
      shipName: ship.name,
      success: true,
      filename,
      sizeKb: Math.round(buffer.length / 1024),
    };
  } catch (error) {
    return {
      shipId: ship.id,
      shipName: ship.name,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Download images for all ships in dataset.
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Keel Data Pipeline - Download Ship Images');
  console.log('='.repeat(60));

  // Load dataset
  const dataPath = join(__dirname, '../data/sample-ships.json');
  const dataset: SampleDataset = JSON.parse(await readFile(dataPath, 'utf-8'));

  console.log(`\nLoaded ${dataset.ships.length} ships from dataset`);

  // Create output directory
  const outputDir = join(__dirname, '../data/images');
  await mkdir(outputDir, { recursive: true });

  // Download images with rate limiting
  const results: DownloadResult[] = [];
  const shipsWithImages = dataset.ships.filter(s => s.imageUrl);

  console.log(`\nDownloading ${shipsWithImages.length} images...`);

  for (let i = 0; i < shipsWithImages.length; i++) {
    const ship = shipsWithImages[i];
    console.log(`[${i + 1}/${shipsWithImages.length}] ${ship.name}...`);

    const result = await downloadImage(ship, outputDir);
    results.push(result);

    if (result.success) {
      const sizeInfo = result.sizeKb ? ` (${result.sizeKb}kb)` : '';
      console.log(`  ✓ ${result.filename}${sizeInfo}`);
    } else {
      console.log(`  ✗ ${result.error}`);
    }

    // Rate limit: 500ms between downloads
    if (i < shipsWithImages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary
  const successful = results.filter(r => r.success && r.error !== 'Already exists');
  const alreadyExisted = results.filter(r => r.error === 'Already exists');
  const failed = results.filter(r => !r.success);

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Downloaded: ${successful.length}`);
  console.log(`Already existed: ${alreadyExisted.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed downloads:');
    for (const r of failed.slice(0, 10)) {
      console.log(`  - ${r.shipName}: ${r.error}`);
    }
    if (failed.length > 10) {
      console.log(`  ... and ${failed.length - 10} more`);
    }
  }

  // Save download results
  const resultsPath = join(__dirname, '../data/download-results.json');
  await writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);
  console.log(`Images saved to: ${outputDir}`);
}

main().catch(console.error);
