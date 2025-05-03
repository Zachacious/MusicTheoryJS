/**
 * Functions for detecting scales from a set of notes
 */

import { ScaleName, ScalePattern } from "./types";

import { Note } from "../note";
import { SCALE_PATTERNS } from "./constants";

/**
 * Result of a scale detection operation
 */
export interface ScaleMatch {
  name: ScaleName;
  pattern: ScalePattern;
  root: Note;
  confidence: number; // 0-1, representing how well the notes match the scale
  missingNotes: number; // How many scale notes are not in the input
  extraNotes: number; // How many input notes are not in the scale
}

/**
 * Detect possible scales that contain a given set of notes
 */
export function detectScales(
  notes: Note[],
  options: {
    minConfidence?: number; // Minimum confidence score (0-1) to include in results
    maxResults?: number; // Maximum number of results to return
  } = {}
): ScaleMatch[] {
  if (notes.length < 2) {
    throw new Error("At least 2 notes are required to detect scales");
  }

  const minConfidence = options.minConfidence ?? 0.6; // Default to 60% confidence
  const maxResults = options.maxResults ?? 5; // Default to top 5 matches

  // Extract unique pitch classes
  const uniquePitchClasses = new Set<number>();
  for (const note of notes) {
    uniquePitchClasses.add(note.pitchClassIndex);
  }
  const pitchClassArray = Array.from(uniquePitchClasses);

  // Try each potential root note
  const allMatches: ScaleMatch[] = [];

  for (const root of notes) {
    const rootPitchClass = root.pitchClassIndex;

    // Normalize pitch classes relative to the root
    const normalizedPitchClasses = pitchClassArray.map(
      (pc) => (pc - rootPitchClass + 12) % 12
    );

    // Match against known scale patterns
    for (const [name, pattern] of Object.entries(SCALE_PATTERNS)) {
      // Calculate how well the notes match this scale
      const matchScore = calculateMatchScore(normalizedPitchClasses, pattern);

      // Only include matches above the confidence threshold
      if (matchScore.confidence >= minConfidence) {
        allMatches.push({
          name: name as ScaleName,
          pattern,
          root,
          ...matchScore,
        });
      }
    }
  }

  // Sort matches by confidence (highest first)
  allMatches.sort((a, b) => b.confidence - a.confidence);

  // Return top matches
  return allMatches.slice(0, maxResults);
}

/**
 * Calculate how well a set of pitch classes matches a scale pattern
 */
function calculateMatchScore(
  pitchClasses: number[],
  scalePattern: ScalePattern
): { confidence: number; missingNotes: number; extraNotes: number } {
  // Count matching notes
  let matchingNotes = 0;
  const unmatchedPitchClasses = new Set(pitchClasses);

  // Check each note in the scale pattern
  for (const scalePitchClass of scalePattern) {
    if (unmatchedPitchClasses.has(scalePitchClass)) {
      matchingNotes++;
      unmatchedPitchClasses.delete(scalePitchClass);
    }
  }

  // Count missing scale notes
  const missingNotes = scalePattern.length - matchingNotes;

  // Count extra notes (notes that are not in the scale)
  const extraNotes = unmatchedPitchClasses.size;

  // Calculate confidence score
  // Higher weight for matching notes, lower penalties for missing/extra
  const totalRelevantNotes =
    pitchClasses.length + (scalePattern.length - matchingNotes);
  const confidence =
    totalRelevantNotes > 0
      ? (matchingNotes * 2 - missingNotes - extraNotes) / totalRelevantNotes
      : 0;

  // Normalize confidence to 0-1 range
  const normalizedConfidence = Math.max(0, Math.min(1, confidence));

  return {
    confidence: normalizedConfidence,
    missingNotes,
    extraNotes,
  };
}

/**
 * Find the most likely key for a set of notes
 */
export function detectKey(
  notes: Note[]
): { root: Note; mode: "major" | "minor"; confidence: number } | null {
  // Detect all possible scales
  const matches = detectScales(notes, {
    minConfidence: 0.4, // Lower threshold to catch more possibilities
    maxResults: 10, // Check more scales
  });

  // Filter to just major and minor scales
  const keyMatches = matches.filter(
    (match) => match.name === "major" || match.name === "minor"
  );

  if (keyMatches.length === 0) {
    return null;
  }

  // Return the highest confidence match
  const bestMatch = keyMatches[0];

  return {
    root: bestMatch.root,
    mode: bestMatch.name === "major" ? "major" : "minor",
    confidence: bestMatch.confidence,
  };
}
