-- Migration: Update clue fields
-- Run this SQL to migrate existing tally_game_data table
-- Changes:
--   - Rename clues_specs_first_flight -> clues_specs_capacity
--   - Rename clues_context_status -> clues_context_first_flight

-- Step 1: Add new columns
ALTER TABLE tally_game_data
ADD COLUMN IF NOT EXISTS clues_specs_capacity VARCHAR(50),
ADD COLUMN IF NOT EXISTS clues_context_first_flight VARCHAR(20);

-- Step 2: Migrate data from old columns to new columns
-- Note: first_flight moves from specs to context, status is being removed
UPDATE tally_game_data
SET clues_context_first_flight = clues_specs_first_flight
WHERE clues_context_first_flight IS NULL AND clues_specs_first_flight IS NOT NULL;

-- Step 3: Drop old columns (optional - run after verifying migration worked)
-- Uncomment these lines after confirming the migration is successful:
-- ALTER TABLE tally_game_data DROP COLUMN IF EXISTS clues_specs_first_flight;
-- ALTER TABLE tally_game_data DROP COLUMN IF EXISTS clues_context_status;
