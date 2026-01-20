import { readFile, readdir, stat, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { SampleDataset } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ValidationReport {
  timestamp: string;
  datasetStats: SampleDataset['stats'];
  imageStats: {
    totalDownloaded: number;
    totalSizeKb: number;
    avgSizeKb: number;
    byExtension: Record<string, number>;
  };
  qualityIssues: {
    missingImages: string[];
    missingClass: string[];
    missingCountry: string[];
    missingWikipedia: string[];
    duplicateNames: string[];
  };
  recommendations: string[];
}

async function main() {
  console.log('='.repeat(60));
  console.log('Keel Data Pipeline - Data Validation');
  console.log('='.repeat(60));

  // Load dataset
  const dataPath = join(__dirname, '../data/sample-ships.json');
  const dataset: SampleDataset = JSON.parse(await readFile(dataPath, 'utf-8'));

  console.log(`\nDataset: ${dataset.ships.length} ships`);
  console.log(`Fetched: ${dataset.fetchedAt}`);

  // Check downloaded images
  const imagesDir = join(__dirname, '../data/images');
  let imageFiles: string[] = [];
  let totalImageSize = 0;
  const byExtension: Record<string, number> = {};

  try {
    imageFiles = await readdir(imagesDir);
    for (const file of imageFiles) {
      const fileStat = await stat(join(imagesDir, file));
      totalImageSize += fileStat.size;
      const ext = file.split('.').pop()?.toLowerCase() || 'unknown';
      byExtension[ext] = (byExtension[ext] || 0) + 1;
    }
  } catch {
    console.log('No images directory found');
  }

  // Find quality issues
  const missingImages: string[] = [];
  const missingClass: string[] = [];
  const missingCountry: string[] = [];
  const missingWikipedia: string[] = [];
  const nameCount: Record<string, number> = {};

  for (const ship of dataset.ships) {
    if (!ship.quality.hasImage) missingImages.push(ship.name);
    if (!ship.quality.hasClass) missingClass.push(ship.name);
    if (!ship.quality.hasCountry) missingCountry.push(ship.name);
    if (!ship.quality.hasWikipedia) missingWikipedia.push(ship.name);

    nameCount[ship.name] = (nameCount[ship.name] || 0) + 1;
  }

  const duplicateNames = Object.entries(nameCount)
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  // Generate recommendations
  const recommendations: string[] = [];

  if (missingImages.length > dataset.ships.length * 0.1) {
    recommendations.push('High rate of missing images - consider filtering query');
  }
  if (missingClass.length > dataset.ships.length * 0.3) {
    recommendations.push('Many ships missing class info - may need class fallback logic');
  }
  if (missingCountry.length > dataset.ships.length * 0.2) {
    recommendations.push('Many ships missing country - check operator property as fallback');
  }
  if (missingWikipedia.length > dataset.ships.length * 0.3) {
    recommendations.push('Many ships lack Wikipedia articles - will need alternative descriptions');
  }
  if (duplicateNames.length > 0) {
    recommendations.push(`${duplicateNames.length} duplicate ship names - need disambiguation`);
  }
  if (imageFiles.length > 0 && imageFiles.length < dataset.ships.length * 0.8) {
    recommendations.push('Low image download success rate - check URLs and rate limiting');
  }

  // Print report
  console.log('\n' + '-'.repeat(40));
  console.log('Data Quality');
  console.log('-'.repeat(40));
  console.log(`Ships with images: ${dataset.stats.withImages}/${dataset.stats.total} (${((dataset.stats.withImages/dataset.stats.total)*100).toFixed(1)}%)`);
  console.log(`Ships with class: ${dataset.stats.withClass}/${dataset.stats.total} (${((dataset.stats.withClass/dataset.stats.total)*100).toFixed(1)}%)`);
  console.log(`Ships with country: ${dataset.stats.withCountry}/${dataset.stats.total} (${((dataset.stats.withCountry/dataset.stats.total)*100).toFixed(1)}%)`);
  console.log(`Ships with specs: ${dataset.stats.withSpecs}/${dataset.stats.total} (${((dataset.stats.withSpecs/dataset.stats.total)*100).toFixed(1)}%)`);
  console.log(`Ships with Wikipedia: ${dataset.stats.withWikipedia}/${dataset.stats.total} (${((dataset.stats.withWikipedia/dataset.stats.total)*100).toFixed(1)}%)`);

  if (imageFiles.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('Downloaded Images');
    console.log('-'.repeat(40));
    console.log(`Total files: ${imageFiles.length}`);
    console.log(`Total size: ${(totalImageSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`Average size: ${Math.round(totalImageSize / imageFiles.length / 1024)} KB`);
    console.log('By extension:');
    for (const [ext, count] of Object.entries(byExtension)) {
      console.log(`  .${ext}: ${count}`);
    }
  }

  if (duplicateNames.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('Duplicate Names');
    console.log('-'.repeat(40));
    for (const name of duplicateNames.slice(0, 10)) {
      console.log(`  - ${name} (${nameCount[name]}x)`);
    }
  }

  if (recommendations.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('Recommendations');
    console.log('-'.repeat(40));
    for (const rec of recommendations) {
      console.log(`  ! ${rec}`);
    }
  }

  // Save report
  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    datasetStats: dataset.stats,
    imageStats: {
      totalDownloaded: imageFiles.length,
      totalSizeKb: Math.round(totalImageSize / 1024),
      avgSizeKb: imageFiles.length > 0 ? Math.round(totalImageSize / imageFiles.length / 1024) : 0,
      byExtension,
    },
    qualityIssues: {
      missingImages,
      missingClass,
      missingCountry,
      missingWikipedia,
      duplicateNames,
    },
    recommendations,
  };

  const reportPath = join(__dirname, '../data/validation-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);
}

main().catch(console.error);
