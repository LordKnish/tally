/**
 * Track ships that have already been used in daily games.
 * Prevents duplicates across game generations.
 * Each mode has its own used ships file for independent tracking.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { UsedShipsData, UsedShipEntry } from './types.js';
import type { GameModeId } from './modes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Get the file path for a mode's used ships data.
 */
function getUsedShipsPath(mode: GameModeId): string {
  return join(__dirname, `../data/used-ships-${mode}.json`);
}

/**
 * Load used ships data from file for a specific mode.
 */
async function loadUsedShips(mode: GameModeId): Promise<UsedShipsData> {
  const path = getUsedShipsPath(mode);
  try {
    if (!existsSync(path)) {
      return { ships: [] };
    }
    const data = await readFile(path, 'utf-8');
    return JSON.parse(data) as UsedShipsData;
  } catch {
    return { ships: [] };
  }
}

/**
 * Save used ships data to file for a specific mode.
 */
async function saveUsedShips(mode: GameModeId, data: UsedShipsData): Promise<void> {
  const path = getUsedShipsPath(mode);
  // Ensure data directory exists
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(path, JSON.stringify(data, null, 2));
}

/**
 * Get list of all used ship IDs for a mode.
 */
export async function getUsedShipIds(mode: GameModeId): Promise<string[]> {
  const data = await loadUsedShips(mode);
  return data.ships.map((s) => s.id);
}

/**
 * Check if a ship has already been used in a mode.
 */
export async function isShipUsed(id: string, mode: GameModeId): Promise<boolean> {
  const ids = await getUsedShipIds(mode);
  return ids.includes(id);
}

/**
 * Mark a ship as used in a mode.
 */
export async function markShipUsed(id: string, name: string, mode: GameModeId): Promise<void> {
  const data = await loadUsedShips(mode);

  // Check if already exists
  if (data.ships.some((s) => s.id === id)) {
    console.log(`Ship ${name} (${id}) already marked as used in ${mode}`);
    return;
  }

  const entry: UsedShipEntry = {
    id,
    name,
    usedDate: new Date().toISOString().split('T')[0],
  };

  data.ships.push(entry);
  await saveUsedShips(mode, data);
  console.log(`Marked ${name} (${id}) as used in ${mode}`);
}

/**
 * Get count of used ships for a mode.
 */
export async function getUsedShipCount(mode: GameModeId): Promise<number> {
  const data = await loadUsedShips(mode);
  return data.ships.length;
}

/**
 * Clear all used ships for a mode (for testing).
 */
export async function clearUsedShips(mode: GameModeId): Promise<void> {
  await saveUsedShips(mode, { ships: [] });
}
