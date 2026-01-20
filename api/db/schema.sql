-- Keel Game Database Schema
-- Run this SQL against your Neon PostgreSQL database to set up the schema

-- Table: used_ships
-- Tracks ships that have already been used in daily games to prevent repeats
CREATE TABLE IF NOT EXISTS used_ships (
    id SERIAL PRIMARY KEY,
    wikidata_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    used_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by wikidata_id
CREATE INDEX IF NOT EXISTS idx_used_ships_wikidata_id ON used_ships(wikidata_id);

-- Table: game_data
-- Stores the daily game data including ship info, clues, and silhouette
CREATE TABLE IF NOT EXISTS game_data (
    id SERIAL PRIMARY KEY,
    game_date DATE UNIQUE NOT NULL,
    ship_id VARCHAR(20) NOT NULL,
    ship_name VARCHAR(255) NOT NULL,
    ship_aliases TEXT[] DEFAULT '{}',
    silhouette TEXT NOT NULL,
    clues_specs_class VARCHAR(255),
    clues_specs_displacement VARCHAR(100),
    clues_specs_length VARCHAR(50),
    clues_specs_commissioned VARCHAR(20),
    clues_context_nation VARCHAR(100),
    clues_context_conflicts TEXT[] DEFAULT '{}',
    clues_context_status VARCHAR(255),
    clues_trivia TEXT,
    clues_photo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by game_date
CREATE INDEX IF NOT EXISTS idx_game_data_date ON game_data(game_date);

-- Optional: Create a function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on game_data changes
DROP TRIGGER IF EXISTS update_game_data_updated_at ON game_data;
CREATE TRIGGER update_game_data_updated_at
    BEFORE UPDATE ON game_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
