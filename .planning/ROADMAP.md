# Tally Roadmap

## v1.0 - Complete Aircraft Guessing Game
> Fully migrate to plane-specific guessing with proper data population, working game modes, and aviation-specific clues.

### Phase 1: Legacy Nomenclature Cleanup [COMPLETED]
**Objective:** Remove all ship/Keel references and establish consistent aircraft terminology throughout the codebase.
**Status:** COMPLETED (16 commits, 22 files changed)
**Scope:**
- Rename `ship-list.json` to `aircraft-list.json`
- Update component props (shipName -> aircraftName, etc.)
- Fix comments and JSDoc referencing ships
- Update error messages and UI text
- Change sharing text from "Keel" to "Tally"
- Update localStorage keys from `keel-*` to `tally-*`
- Update aria-labels for accessibility

### Phase 2: Aircraft Database Population Script [COMPLETED]
**Objective:** Create comprehensive scripts to populate the searchable aircraft database from Wikidata.
**Status:** COMPLETED (10 commits, 3,848 aircraft generated)
**Scope:**
- Create script to fetch all relevant aircraft from Wikidata by category
- Generate aircraft list covering all 6 game modes
- Include proper aliases and alternate names
- Output to `aircraft-list.json` with correct format
- Add type information for search filtering
- Ensure comprehensive coverage (military, commercial, historical, rotorcraft, UAVs)

### Phase 3: Game Mode Validation & Fixes [COMPLETED]
**Objective:** Ensure game modes work correctly with proper aircraft selection and clue generation.
**Status:** COMPLETED (5 commits, all modes validated)
**Scope:**
- Test and fix Daily Tally (main) mode
- Test and fix Commercial mode
- Test and fix WW2 mode
- Test and fix Golden Age mode (formerly WW1)
- Validate aircraft selection criteria per mode
- Ensure no cross-mode contamination

### Phase 4: Aviation-Specific Clue Enhancement [COMPLETED]
**Objective:** Update clue content to be aviation-specific and improve clue quality.
**Status:** COMPLETED (9 commits)
**Scope:**
- Aligned frontend/backend clue type definitions
- SpecsClue displays: Role, Manufacturer, Wingspan, First Flight
- ContextClue displays: Nation, Notable Conflicts, Status
- Added 30+ aviation-specific trivia extraction keywords
- Fixed Commercial mode with subclass path (6→157 aircraft)
- Consolidated to 4 modes (removed Helicopters/Drones, WW1→Golden Age)
- All modes now have 100+ aircraft
- Updated tests for new clue structure

### Phase 5: Silhouette Generation Improvements [SKIPPED]
**Objective:** Improve silhouette quality and reliability for aircraft images.
**Status:** SKIPPED - Silhouette generation works from Keel, no changes needed
**Scope:** N/A - existing implementation sufficient

### Phase 6: Final Polish & Testing
**Objective:** Complete end-to-end testing and polish for v1.0 release.
**Research:** No
**Scope:**
- End-to-end gameplay testing for all modes
- Mobile responsiveness verification
- Performance optimization
- Error handling improvements
- Stats and sharing functionality verification
- Documentation updates
