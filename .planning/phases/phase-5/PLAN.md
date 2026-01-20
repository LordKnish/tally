# Phase 5: Silhouette Generation Improvements

## Objective
Improve silhouette quality and reliability for aircraft images by tuning edge detection parameters, handling different image types, and adding fallback mechanisms.

## Execution Context
- Single-session phase
- Modifies `api/cron/generate-game.ts` line art generation
- May add image quality validation
- Testing requires generating sample silhouettes

## Context

### Current Implementation Analysis

**Location:** `api/cron/generate-game.ts` lines 726-845

**Current Pipeline:**
1. Download image from Wikimedia Commons
2. Resize to max 800px width (Sharp)
3. Remove background via remove.bg API (if key available)
4. Sharpen image (sigma: 2)
5. Apply Laplace edge detection (Photon)
6. Convert edges to transparent PNG with black lines

**Current Parameters:**
- Resize: 800px max width
- Sharpen sigma: 2
- Edge threshold: `edgeVal < 180` for line detection
- Line opacity: `(180 - edgeVal) * 2`
- Alpha threshold: `origAlpha > 128` for background masking

**Known Issues:**
1. No fallback if remove.bg fails or quota exceeded
2. Single edge detection approach may not suit all image types
3. No validation of source image quality
4. No handling of different orientations
5. Fixed parameters may produce poor results for some aircraft

### Dependencies
- `sharp` - Image preprocessing and output
- `@silvia-odwyer/photon-node` - Edge detection (Laplace filter)
- `remove.bg` API - Background removal (optional)

## Tasks

### Task 1: Add image quality validation
**Files:** `api/cron/generate-game.ts`
**Action:**
1. After downloading image, check dimensions (min 200x200)
2. Check file size (min 10KB to avoid placeholder images)
3. Detect if image is mostly transparent/blank
4. Log warnings for low-quality images
5. Return validation result to allow retry with different aircraft
- Commit: `feat(phase-5): add image quality validation before silhouette generation`

### Task 2: Improve edge detection parameters
**Files:** `api/cron/generate-game.ts`
**Action:**
1. Increase output resolution from 800 to 1000px for better detail
2. Add contrast enhancement before edge detection
3. Tune edge threshold based on image histogram
4. Use Sobel edge detection as alternative to Laplace for cleaner lines
5. Add line thickness control
- Commit: `feat(phase-5): improve edge detection parameters for cleaner silhouettes`

### Task 3: Add fallback edge detection without remove.bg
**Files:** `api/cron/generate-game.ts`
**Action:**
1. When no REMOVEBG_API_KEY, use alternative approach:
   - Apply threshold to separate aircraft from background
   - Use Canny-style edge detection
   - Attempt automatic background color detection
2. Improve existing edge-only path quality
3. Log which method was used
- Commit: `feat(phase-5): add fallback silhouette generation without remove.bg`

### Task 4: Handle different image orientations
**Files:** `api/cron/generate-game.ts`
**Action:**
1. Detect image aspect ratio (portrait vs landscape)
2. For extreme aspect ratios, crop to center
3. Ensure consistent output dimensions for display
4. Add padding for square output if needed
- Commit: `feat(phase-5): handle different image orientations and aspect ratios`

### Task 5: Add silhouette quality scoring
**Files:** `api/cron/generate-game.ts`
**Action:**
1. After generating silhouette, calculate quality score:
   - Edge density (too few = blank, too many = noisy)
   - Connectedness (isolated dots vs continuous lines)
   - Coverage area (aircraft should cover 20-80% of frame)
2. Log quality score
3. Optionally reject low-quality silhouettes
- Commit: `feat(phase-5): add silhouette quality scoring`

### Task 6: Create silhouette test script
**Files:** `scripts/test-silhouette-generation.ts` (new)
**Action:**
1. Create script to test silhouette generation with sample images
2. Test with various aircraft types (jet, prop, biplane, helicopter-like)
3. Test with/without remove.bg
4. Output comparison images for manual review
5. Report quality scores
- Commit: `feat(phase-5): add silhouette generation test script`

### Task 7: Verify and test
**Action:**
1. Run `npm run build` to verify no TypeScript errors
2. Run silhouette test script with sample images
3. Review generated silhouettes for quality
4. Fix any issues found
- Commit if fixes needed: `fix(phase-5): address issues from silhouette testing`

## Verification
- [ ] Image quality validation prevents bad source images
- [ ] Edge detection produces clean, recognizable silhouettes
- [ ] Fallback works when remove.bg unavailable
- [ ] Different orientations handled consistently
- [ ] Quality scoring provides useful feedback
- [ ] Test script allows easy verification
- [ ] Build succeeds

## Success Criteria
- Silhouettes are recognizable as aircraft shapes
- No blank or overly noisy silhouettes
- Consistent quality across different aircraft types
- Graceful degradation without remove.bg API
- Quality metrics available for monitoring

## Output
- Improved silhouette generation pipeline
- Image quality validation
- Silhouette quality scoring
- Test script for manual verification
