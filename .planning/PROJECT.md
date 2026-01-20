# Tally - Daily Aircraft Guessing Game

## Project Overview
Tally is a daily aircraft guessing game where players identify mystery aircraft from silhouettes and progressive clues. Players have 5 turns to correctly guess the aircraft, with additional clues revealed after each incorrect guess.

## Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Vercel Serverless Functions
- **Database:** PostgreSQL (Neon)
- **Data Source:** Wikidata SPARQL API + Wikipedia
- **Image Processing:** Sharp + Photon for silhouette generation
- **Search:** Fuse.js for fuzzy aircraft matching

## Core Architecture

### Game Flow
1. Player sees aircraft silhouette
2. 5 turns to guess correctly
3. Progressive clue reveal on wrong guesses:
   - Turn 2: Specs (type, wingspan, weight, first flight)
   - Turn 3: Context (nation, operators, status)
   - Turn 4: Trivia fact from Wikipedia
   - Turn 5: Actual photo revealed
4. Win/Loss determined, stats tracked

### Game Modes (6 total)
- **Daily Tally** (`main`) - Modern military aircraft (1980+)
- **Commercial** - Airliners & business jets (1980+)
- **WW2** - WWII military aircraft (1935-1950)
- **WW1** - WWI aircraft (1910-1925)
- **Helicopters** - All rotary-wing aircraft
- **Drones** - UAVs and unmanned aircraft

### Data Storage
- `tally_game_data` - Daily game data per mode (PostgreSQL)
- `tally_used_aircraft` - Tracks used aircraft to prevent repeats
- `public/game-data-{mode}.json` - Static fallback game data
- `public/ship-list.json` - Searchable aircraft database (needs rename)

## Key Files
- `src/App.tsx` - Main game logic and state
- `api/cron/generate-game.ts` - Daily game generation via Vercel Cron
- `api/game/today.ts` - API endpoint for fetching daily game
- `src/types/game.ts` - Core type definitions
- `src/types/modes.ts` - Game mode configuration

## Current State
The game was recently migrated from "Keel" (a ship guessing game) to "Tally" (aircraft). Core functionality works but retains some legacy ship-related naming and needs polish for a complete v1.0 release.

## Development Notes
- Manual game generation: `GET /api/cron/generate-game?mode=main&manual=true&secret=...`
- Vercel Cron triggers daily at midnight UTC
- Uses Wikidata Q-IDs for aircraft type queries
