/**
 * Fetch complete clue data for a selected aircraft.
 * Includes specs, context, trivia (from Wikipedia), and photo URL.
 */

import type { SelectedAircraft } from './select-aircraft.js';
import type { GameClues, SpecsClue, ContextClue } from './types.js';

const USER_AGENT =
  'Mozilla/5.0 (compatible; TallyGame/1.0; +https://github.com/tally-game)';

/**
 * Wikipedia summary API response.
 */
interface WikipediaSummary {
  title: string;
  extract: string;
  description?: string;
}

/**
 * Fetch Wikipedia summary for trivia.
 */
async function fetchWikipediaSummary(
  title: string
): Promise<WikipediaSummary | null> {
  try {
    const encodedTitle = encodeURIComponent(title.replace(/ /g, '_'));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Wikipedia summary fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch Wikipedia summary:', error);
    return null;
  }
}

/**
 * Extract a trivia-worthy sentence from Wikipedia summary.
 * Looks for distinctive facts about the aircraft.
 */
function extractTrivia(summary: WikipediaSummary | null): string | null {
  if (!summary?.extract) {
    return null;
  }

  const text = summary.extract;

  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

  // Skip the first sentence (usually just "X is an aircraft...")
  // Look for sentences with interesting keywords
  const interestingKeywords = [
    'famous',
    'notable',
    'first',
    'last',
    'only',
    'largest',
    'fastest',
    'shot down',
    'battle',
    'war',
    'combat',
    'served',
    'participated',
    'known for',
    'renamed',
    'converted',
    'museum',
    'memorial',
    'preserved',
    'film',
    'movie',
    'record',
    'prototype',
    'exported',
    'retired',
    'supersonic',
    'stealth',
    'nuclear',
    'top gun',
    'ace',
    'dogfight',
  ];

  for (const sentence of sentences.slice(1)) {
    const lower = sentence.toLowerCase();
    if (interestingKeywords.some((kw) => lower.includes(kw))) {
      return sentence.trim();
    }
  }

  // Fall back to second sentence if available
  if (sentences.length > 1) {
    return sentences[1].trim();
  }

  // Last resort: use description
  if (summary.description) {
    return summary.description;
  }

  return null;
}

/**
 * Remove aircraft name from trivia text to avoid giving away the answer.
 * Checks full name first, then individual words.
 * Also cleans up any resulting double spaces.
 */
function filterAircraftNameFromTrivia(
  trivia: string | null,
  aircraftName: string | null
): string | null {
  if (!trivia || !aircraftName) {
    return trivia;
  }

  let filtered = trivia;

  // First, try to remove the full aircraft name (case-insensitive)
  const fullNameRegex = new RegExp(
    aircraftName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'gi'
  );
  filtered = filtered.replace(fullNameRegex, '');

  // Then check individual words (only if 2+ chars to avoid removing common words)
  const words = aircraftName.split(/\s+/).filter((word) => word.length > 2);
  for (const word of words) {
    const wordRegex = new RegExp(
      `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      'gi'
    );
    filtered = filtered.replace(wordRegex, '');
  }

  // Clean up double spaces and trim
  filtered = filtered.replace(/\s{2,}/g, ' ').trim();

  // If we removed too much, return null
  if (filtered.length < 20) {
    return null;
  }

  return filtered;
}

/**
 * Build specs clue from aircraft data.
 */
function buildSpecsClue(aircraft: SelectedAircraft): SpecsClue {
  return {
    type: aircraft.typeName,
    weight: aircraft.maxTakeoffWeight,
    wingspan: aircraft.wingspan,
    firstFlight: aircraft.firstFlight,
  };
}

/**
 * Build context clue from aircraft data.
 */
function buildContextClue(aircraft: SelectedAircraft): ContextClue {
  return {
    nation: aircraft.country || 'Unknown',
    operators: aircraft.operators,
    status: aircraft.status,
  };
}

/**
 * Fetch complete clues for an aircraft.
 */
export async function fetchClues(aircraft: SelectedAircraft): Promise<GameClues> {
  console.log(`Fetching clues for ${aircraft.name}...`);

  // Fetch Wikipedia summary for trivia
  let trivia: string | null = null;
  if (aircraft.wikipediaTitle) {
    console.log(`  Fetching Wikipedia summary for ${aircraft.wikipediaTitle}...`);
    const summary = await fetchWikipediaSummary(aircraft.wikipediaTitle);
    trivia = extractTrivia(summary);
    trivia = filterAircraftNameFromTrivia(trivia, aircraft.typeName);
    if (trivia) {
      console.log(`  Found trivia: "${trivia.substring(0, 50)}..."`);
    }
  }

  return {
    specs: buildSpecsClue(aircraft),
    context: buildContextClue(aircraft),
    trivia,
    photo: aircraft.imageUrl,
  };
}
