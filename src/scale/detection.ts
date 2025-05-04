/**
 * Functions for detecting scales from a set of notes
 */

import { Note, noteToFrequency } from "../note";
import { ScaleName, ScalePattern } from "./types";

import { SCALE_PATTERNS } from "./constants";
import { intervalInCents } from "../note/calculations";

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

/**
 * Detect if a set of notes forms a known microtonal scale
 */
export function detectMicrotonalScale(notes: Note[]): {
  name: string;
  system: string;
  rootIndex: number;
  confidence: number;
}[] {
  const results: {
    name: string;
    system: string;
    rootIndex: number;
    confidence: number;
  }[] = [];

  // Get intervals between adjacent notes in cents
  const intervalsCents: number[] = [];
  for (let i = 0; i < notes.length - 1; i++) {
    intervalsCents.push(intervalInCents(notes[i], notes[i + 1]));
  }

  // Check for common EDO patterns
  const edoResults = detectEDOpattern(intervalsCents);
  results.push(...edoResults);

  // Check for just intonation patterns
  const justResults = detectJustIntonation(notes);
  results.push(...justResults);

  return results.sort((a, b) => b.confidence - a.confidence);
}

// Helper functions
/**
 * Try to detect if a set of interval patterns matches a known EDO system
 * @param intervals - Array of intervals in cents
 */
function detectEDOpattern(
  intervals: number[]
): { name: string; system: string; rootIndex: number; confidence: number }[] {
  const results: {
    name: string;
    system: string;
    rootIndex: number;
    confidence: number;
  }[] = [];

  // Common EDO systems to check
  const edoSystems = [24, 19, 31, 22, 17, 53];

  for (const edo of edoSystems) {
    // Calculate the step size in cents for this EDO
    const stepSize = 1200 / edo;

    // Count how many intervals are close to EDO steps
    let matchingIntervals = 0;
    const tolerance = stepSize * 0.2; // 20% tolerance

    for (const interval of intervals) {
      // Find the closest step in this EDO
      const closestStep = Math.round(interval / stepSize);
      const closestCents = closestStep * stepSize;

      // Check if close enough
      if (Math.abs(interval - closestCents) <= tolerance) {
        matchingIntervals++;
      }
    }

    // Calculate confidence
    const confidence = matchingIntervals / intervals.length;

    // If enough intervals match this EDO, add to results
    if (confidence >= 0.7) {
      // Try to identify common scales within this EDO
      const edoScale = identifyEDOscale(intervals, edo);

      results.push({
        name: edoScale || `Unknown ${edo}-EDO scale`,
        system: `${edo}-EDO`,
        rootIndex: 0, // Assuming first note is root
        confidence: confidence,
      });
    }
  }

  return results;
}

/**
 * Identify specific scale types within an EDO system
 */
function identifyEDOscale(intervals: number[], edo: number): string | null {
  // Step size in cents
  const stepSize = 1200 / edo;

  // Convert intervals to step counts
  const steps = intervals.map((cents) => Math.round(cents / stepSize));

  // Look up common scales in this EDO
  switch (edo) {
    case 24: // Quarter-tone system
      if (
        arrayEquals(
          steps,
          [2, 2, 1, 2, 2, 2, 1].map((s) => s * 2)
        )
      ) {
        return "Quarter-tone Major";
      }
      if (
        arrayEquals(
          steps,
          [2, 1, 2, 2, 1, 2, 2].map((s) => s * 2)
        )
      ) {
        return "Quarter-tone Minor";
      }
      break;

    case 19:
      if (arrayEquals(steps, [3, 1, 3, 3, 3, 3, 3])) {
        return "19-EDO Major";
      }
      if (arrayEquals(steps, [3, 3, 1, 3, 3, 3, 3])) {
        return "19-EDO Minor";
      }
      break;

    case 31:
      if (arrayEquals(steps, [5, 5, 3, 5, 5, 5, 3])) {
        return "31-EDO Major";
      }
      if (arrayEquals(steps, [5, 3, 5, 5, 3, 5, 5])) {
        return "31-EDO Minor";
      }
      break;
  }

  return null;
}

/**
 * Helper to check array equality
 */
function arrayEquals(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((val, idx) => val === b[idx]);
}

/**
 * Detect if notes form a just intonation pattern
 */
function detectJustIntonation(
  notes: Note[]
): { name: string; system: string; rootIndex: number; confidence: number }[] {
  const results: {
    name: string;
    system: string;
    rootIndex: number;
    confidence: number;
  }[] = [];

  // For each potential root note
  for (let rootIndex = 0; rootIndex < notes.length; rootIndex++) {
    const rootNote = notes[rootIndex];
    const rootFreq = noteToFrequency(rootNote);

    // Calculate frequency ratios from root
    const ratios = notes.map((note) => noteToFrequency(note) / rootFreq);

    // Just intonation tolerance (in ratio space)
    const tolerance = 0.015;

    // Check against common just intonation patterns
    const majorJustRatios = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2];
    const minorJustRatios = [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2];

    // Check for major scale in just intonation
    let majorMatches = 0;
    for (const ratio of ratios) {
      if (
        majorJustRatios.some(
          (justRatio) => Math.abs(ratio - justRatio) < tolerance
        )
      ) {
        majorMatches++;
      }
    }

    // Check for minor scale in just intonation
    let minorMatches = 0;
    for (const ratio of ratios) {
      if (
        minorJustRatios.some(
          (justRatio) => Math.abs(ratio - justRatio) < tolerance
        )
      ) {
        minorMatches++;
      }
    }

    // Calculate confidence for major
    const majorConfidence = majorMatches / ratios.length;
    if (majorConfidence > 0.75) {
      results.push({
        name: "Just Intonation Major",
        system: "Just Intonation",
        rootIndex,
        confidence: majorConfidence,
      });
    }

    // Calculate confidence for minor
    const minorConfidence = minorMatches / ratios.length;
    if (minorConfidence > 0.75) {
      results.push({
        name: "Just Intonation Minor",
        system: "Just Intonation",
        rootIndex,
        confidence: minorConfidence,
      });
    }
  }

  return results;
}
