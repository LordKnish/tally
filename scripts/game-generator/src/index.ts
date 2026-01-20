/**
 * Main entry point for game generation.
 * Generates game data files for one or more modes.
 *
 * Usage:
 *   npm run generate              # Generate main mode only
 *   npm run generate -- --all     # Generate all 6 modes
 *   npm run generate -- --mode=ww2  # Generate specific mode
 *
 * Output: public/game-data-{mode}.json
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { selectRandomShip } from './select-ship.js';
import { fetchClues } from './fetch-clues.js';
import { generateLineArtFromUrl } from './generate-lineart.js';
import { getUsedShipIds, markShipUsed } from './used-ships.js';
import { GAME_MODES, ALL_MODE_IDS, type GameModeId } from './modes.js';
import type { GameData, ShipIdentity } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../../..');

/**
 * Get output path for a mode's game data.
 */
function getOutputPath(mode: GameModeId): string {
  return join(PROJECT_ROOT, `public/game-data-${mode}.json`);
}

/**
 * Generate game data for a specific mode.
 */
async function generateGame(mode: GameModeId): Promise<boolean> {
  const modeConfig = GAME_MODES[mode];
  const outputPath = getOutputPath(mode);

  console.log('='.repeat(60));
  console.log(`Generating: ${modeConfig.name}`);
  console.log(`Description: ${modeConfig.description}`);
  console.log('='.repeat(60));

  // 1. Load used ships for this mode
  const usedIds = await getUsedShipIds(mode);
  console.log(`\nUsed ships in ${mode}: ${usedIds.length}`);

  // 2. Select random ship
  console.log('\nSelecting random ship...');
  const ship = await selectRandomShip(usedIds, modeConfig);

  if (!ship) {
    console.error(`No eligible ships found for ${mode}! Check query or reset used ships.`);
    return false;
  }

  console.log(`\nSelected: ${ship.name} (${ship.id})`);
  console.log(`  Country: ${ship.country || 'Unknown'}`);
  console.log(`  Class: ${ship.className || 'Unknown'}`);
  console.log(`  Commissioned: ${ship.commissioned || 'Unknown'}`);

  // 3. Fetch clues
  console.log('\nFetching clue data...');
  const clues = await fetchClues(ship);

  // 4. Generate line art
  console.log('\nGenerating line art...');
  let silhouette: string;
  try {
    silhouette = await generateLineArtFromUrl(ship.imageUrl);
  } catch (error) {
    console.error('Failed to generate line art:', error);
    return false;
  }

  // 5. Build game data
  const shipIdentity: ShipIdentity = {
    id: ship.id,
    name: ship.name,
    className: ship.className,
    aliases: [],
  };

  // Add class name as alias if available (for backward compatibility)
  if (ship.className) {
    shipIdentity.aliases.push(ship.className);
  }

  const gameData: GameData = {
    date: new Date().toISOString().split('T')[0],
    ship: shipIdentity,
    silhouette: `data:image/png;base64,${silhouette}`,
    clues,
  };

  // 6. Write output
  console.log('\nWriting game data...');
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
  await writeFile(outputPath, JSON.stringify(gameData, null, 2));
  console.log(`  Written to: ${outputPath}`);

  // 7. Mark ship as used in this mode
  await markShipUsed(ship.id, ship.name, mode);

  // Summary
  console.log('\n' + '-'.repeat(60));
  console.log(`${modeConfig.name} Generation Complete!`);
  console.log('-'.repeat(60));
  console.log(`Ship: ${ship.name}`);
  console.log(`Date: ${gameData.date}`);
  console.log(`Clues:`);
  console.log(`  Specs: ${clues.specs.class || 'N/A'}, ${clues.specs.commissioned || 'N/A'}`);
  console.log(`  Nation: ${clues.context.nation}`);
  console.log(`  Conflicts: ${clues.context.conflicts.length > 0 ? clues.context.conflicts.join(', ') : 'None recorded'}`);
  console.log(`  Trivia: ${clues.trivia ? clues.trivia.substring(0, 60) + '...' : 'N/A'}`);
  console.log(`  Photo: ${clues.photo.substring(0, 60)}...`);
  console.log(`\nSilhouette size: ${Math.round(silhouette.length / 1024)}KB`);

  return true;
}

/**
 * Generate game data for all modes.
 */
async function generateAllModes(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Keel Game Generator - All Modes');
  console.log('='.repeat(60));
  console.log(`\nGenerating ${ALL_MODE_IDS.length} modes...\n`);

  const results: { mode: GameModeId; success: boolean }[] = [];

  for (const mode of ALL_MODE_IDS) {
    try {
      const success = await generateGame(mode);
      results.push({ mode, success });
    } catch (error) {
      console.error(`\nError generating ${mode}:`, error);
      results.push({ mode, success: false });
    }
    console.log('\n');
  }

  // Final summary
  console.log('='.repeat(60));
  console.log('All Modes Generation Summary');
  console.log('='.repeat(60));
  for (const { mode, success } of results) {
    const modeConfig = GAME_MODES[mode];
    console.log(`  ${success ? '✓' : '✗'} ${modeConfig.name} (${mode})`);
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`\nTotal: ${successCount}/${results.length} modes generated successfully`);

  if (successCount < results.length) {
    process.exit(1);
  }
}

/**
 * Parse command line arguments.
 */
function parseArgs(): { all: boolean; mode: GameModeId | null } {
  const args = process.argv.slice(2);
  let all = false;
  let mode: GameModeId | null = null;

  for (const arg of args) {
    if (arg === '--all') {
      all = true;
    } else if (arg.startsWith('--mode=')) {
      const value = arg.split('=')[1] as GameModeId;
      if (ALL_MODE_IDS.includes(value)) {
        mode = value;
      } else {
        console.error(`Unknown mode: ${value}`);
        console.error(`Valid modes: ${ALL_MODE_IDS.join(', ')}`);
        process.exit(1);
      }
    }
  }

  return { all, mode };
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  const { all, mode } = parseArgs();

  if (all) {
    await generateAllModes();
  } else {
    // Generate single mode (default: main)
    const targetMode = mode || 'main';
    console.log('='.repeat(60));
    console.log('Keel Game Generator');
    console.log('='.repeat(60));

    const success = await generateGame(targetMode);
    if (!success) {
      process.exit(1);
    }
  }
}

// Run
main().catch((error) => {
  console.error('Generation failed:', error);
  process.exit(1);
});
