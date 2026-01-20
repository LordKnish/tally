-- Tally Game Database Schema
-- Run this SQL against your Neon PostgreSQL database to set up the schema

-- Table: tally_used_aircraft
-- Tracks aircraft that have already been used in daily games to prevent repeats
CREATE TABLE IF NOT EXISTS tally_used_aircraft (
    id SERIAL PRIMARY KEY,
    wikidata_id VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    used_date DATE NOT NULL DEFAULT CURRENT_DATE,
    mode VARCHAR(50) NOT NULL DEFAULT 'main',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wikidata_id, mode)
);

-- Index for faster lookups by wikidata_id
CREATE INDEX IF NOT EXISTS idx_tally_used_aircraft_wikidata_id ON tally_used_aircraft(wikidata_id);
-- Index for mode-specific queries
CREATE INDEX IF NOT EXISTS idx_tally_used_aircraft_mode ON tally_used_aircraft(mode);

-- Table: tally_game_data
-- Stores the daily game data including aircraft info, clues, and silhouette
CREATE TABLE IF NOT EXISTS tally_game_data (
    id SERIAL PRIMARY KEY,
    game_date DATE NOT NULL,
    mode VARCHAR(50) NOT NULL DEFAULT 'main',
    aircraft_id VARCHAR(20) NOT NULL,
    aircraft_name VARCHAR(255) NOT NULL,
    aircraft_aliases TEXT[] DEFAULT '{}',
    silhouette TEXT NOT NULL,
    clues_specs_class VARCHAR(255),
    clues_specs_manufacturer VARCHAR(100),
    clues_specs_wingspan VARCHAR(50),
    clues_specs_first_flight VARCHAR(20),
    clues_context_nation VARCHAR(100),
    clues_context_conflicts TEXT[] DEFAULT '{}',
    clues_context_status VARCHAR(255),
    clues_trivia TEXT,
    clues_photo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_date, mode)
);

-- Index for faster lookups by game_date
CREATE INDEX IF NOT EXISTS idx_tally_game_data_date ON tally_game_data(game_date);
-- Index for mode-specific queries
CREATE INDEX IF NOT EXISTS idx_tally_game_data_mode ON tally_game_data(mode);

-- Optional: Create a function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION tally_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on tally_game_data changes
DROP TRIGGER IF EXISTS update_tally_game_data_updated_at ON tally_game_data;
CREATE TRIGGER update_tally_game_data_updated_at
    BEFORE UPDATE ON tally_game_data
    FOR EACH ROW
    EXECUTE FUNCTION tally_update_updated_at_column();
