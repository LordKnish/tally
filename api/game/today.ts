/**
 * API endpoint to fetch today's game data.
 * GET /api/game/today?mode=main
 *
 * Query parameters:
 *   mode: 'main' | 'commercial' | 'ww2' | 'ww1' | 'helicopters' | 'drones'
 *         Defaults to 'main' if not specified.
 *   all: If present, returns a summary of all available modes
 *
 * All modes are fetched from PostgreSQL database.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

type GameModeId = 'main' | 'commercial' | 'ww2' | 'goldenage';

const VALID_MODES: GameModeId[] = ['main', 'commercial', 'ww2', 'goldenage'];

interface GameData {
  date: string;
  aircraft: {
    id: string;
    name: string;
    aliases: string[];
  };
  silhouette: string;
  clues: {
    specs: {
      class: string | null;
      manufacturer: string | null;
      wingspan: string | null;
      capacity: string | null;
    };
    context: {
      nation: string;
      firstFlight: string | null;
      conflicts: string[];
    };
    trivia: string | null;
    photo: string;
  };
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<VercelResponse> {
  // Allow CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    // Get today's date in UTC
    const today = new Date().toISOString().split('T')[0];

    // Handle 'all' query - return available modes with status
    if ('all' in request.query) {
      const result = await sql`
        SELECT mode, game_date, aircraft_name, clues_specs_class
        FROM tally_game_data
        WHERE game_date = ${today}::date
        ORDER BY mode
      `;

      const availableModes = new Map(
        result.rows.map((row) => [
          row.mode || 'main',
          {
            date: row.game_date?.toISOString().split('T')[0] || null,
            aircraft: row.aircraft_name,
            class: row.clues_specs_class,
          },
        ])
      );

      const modes = VALID_MODES.map((modeId) => {
        const data = availableModes.get(modeId);
        return {
          mode: modeId,
          available: !!data,
          date: data?.date || null,
          aircraft: data?.aircraft || null,
          class: data?.class || null,
          endpoint: `/api/game/today?mode=${modeId}`,
        };
      });

      return response.status(200).json({
        success: true,
        date: today,
        modes,
        usage: {
          single: 'curl /api/game/today?mode=ww2',
          list: 'curl /api/game/today?all',
        },
      });
    }

    // Parse and validate mode parameter
    const modeParam = request.query.mode;
    const mode: GameModeId =
      typeof modeParam === 'string' && VALID_MODES.includes(modeParam as GameModeId)
        ? (modeParam as GameModeId)
        : 'main';

    // Fetch today's game from database for the specified mode
    const result = await sql`
      SELECT
        game_date,
        aircraft_id,
        aircraft_name,
        aircraft_aliases,
        silhouette,
        clues_specs_class,
        clues_specs_manufacturer,
        clues_specs_wingspan,
        clues_specs_capacity,
        clues_context_nation,
        clues_context_first_flight,
        clues_context_conflicts,
        clues_trivia,
        clues_photo
      FROM tally_game_data
      WHERE game_date = ${today}::date AND (mode = ${mode} OR (mode IS NULL AND ${mode} = 'main'))
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return response.status(404).json({
        success: false,
        mode,
        error: `No game found for today in mode '${mode}'. Run: curl "/api/cron/generate-game?manual=true&secret=YOUR_SECRET&mode=${mode}"`,
        date: today,
      });
    }

    const row = result.rows[0];

    // Transform database row to GameData format
    const gameData: GameData = {
      date: row.game_date.toISOString().split('T')[0],
      aircraft: {
        id: row.aircraft_id,
        name: row.aircraft_name,
        aliases: row.aircraft_aliases || [],
      },
      silhouette: row.silhouette,
      clues: {
        specs: {
          class: row.clues_specs_class,
          manufacturer: row.clues_specs_manufacturer,
          wingspan: row.clues_specs_wingspan,
          capacity: row.clues_specs_capacity,
        },
        context: {
          nation: row.clues_context_nation,
          firstFlight: row.clues_context_first_flight,
          conflicts: row.clues_context_conflicts || [],
        },
        trivia: row.clues_trivia,
        photo: row.clues_photo,
      },
    };

    // Cache for 5 minutes
    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

    return response.status(200).json({
      success: true,
      mode,
      ...gameData,
    });
  } catch (error) {
    console.error('Failed to fetch game data:', error);
    return response.status(500).json({
      success: false,
      error: 'Failed to fetch game data',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
