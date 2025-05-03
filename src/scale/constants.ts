/**
 * Scale patterns and constants
 */

import { ScaleName, ScalePattern } from "./types";

/**
 * Map of scale names to their semitone interval patterns
 */
export const SCALE_PATTERNS: Record<ScaleName, ScalePattern> = {
  // Common scales
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],

  // Modes of major (for convenience)
  ionian: [0, 2, 4, 5, 7, 9, 11], // Same as major
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10], // Same as natural minor
  locrian: [0, 1, 3, 5, 6, 8, 10],

  // Pentatonic scales
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],

  // Blues and jazzy scales
  blues: [0, 3, 5, 6, 7, 10],
  diminished: [0, 2, 3, 5, 6, 8, 9, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
  altered: [0, 1, 3, 4, 6, 8, 10], // 7th mode of melodic minor

  // Other scales
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  octatonic: [0, 2, 3, 5, 6, 8, 9, 11], // Diminished scale
  bebopDominant: [0, 2, 4, 5, 7, 9, 10, 11],
  hungarianMinor: [0, 2, 3, 6, 7, 8, 11],
  doubleHarmonic: [0, 1, 4, 5, 7, 8, 11], // Byzantine scale
  enigmatic: [0, 1, 4, 6, 8, 10, 11],
  neapolitan: [0, 1, 3, 5, 7, 9, 11],
  persian: [0, 1, 4, 5, 6, 8, 11],
  hirajoshi: [0, 2, 3, 7, 8], // Japanese scale
  inSen: [0, 1, 5, 7, 10], // Japanese scale
  yo: [0, 3, 5, 7, 10], // Japanese scale
};

/**
 * Map of mode names to their indices in a 7-note scale
 */
export const MODE_INDICES: Record<string, number> = {
  ionian: 1,
  dorian: 2,
  phrygian: 3,
  lydian: 4,
  mixolydian: 5,
  aeolian: 6,
  locrian: 7,
};

/**
 * Array of mode names in order
 */
export const MODE_NAMES = [
  "ionian",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "aeolian",
  "locrian",
];

/**
 * The following section is for future reference when implementing
 * the chord module. It's commented out for now.
 */
/*
// Common chord formulas as scale degree indexes (0-based)
export const CHORD_FORMULAS = {
  // Triads
  major: [0, 2, 4],       // 1, 3, 5
  minor: [0, 2, 4],       // 1, b3, 5 (assumes minor scale)
  diminished: [0, 2, 4],  // 1, b3, b5 (assumes diminished scale)
  augmented: [0, 2, 4],   // 1, 3, #5 (adjusted when applied)
  sus2: [0, 1, 4],        // 1, 2, 5
  sus4: [0, 3, 4],        // 1, 4, 5
  
  // Seventh chords
  maj7: [0, 2, 4, 6],     // 1, 3, 5, 7
  dom7: [0, 2, 4, 6],     // 1, 3, 5, b7 (adjusted when applied)
  min7: [0, 2, 4, 6],     // 1, b3, 5, b7 (assumes minor/dorian)
  minMaj7: [0, 2, 4, 6],  // 1, b3, 5, 7 (assumes harmonic minor)
  dim7: [0, 2, 4, 6],     // 1, b3, b5, bb7 (assumes diminished)
  halfDim7: [0, 2, 4, 6], // 1, b3, b5, b7 (assumes locrian)
  aug7: [0, 2, 4, 6]      // 1, 3, #5, b7 (adjusted when applied)
};
*/
