/**
 * @module Scale/Constants
 * @description
 * Defines constants related to musical scales, primarily focusing on predefined
 * scale patterns and mode information. This provides a quick way to access the
 * interval structures of many common and less common scales.
 */

import { ScaleName, ScalePattern } from "./types";

/**
 * A comprehensive mapping of common scale names to their corresponding interval patterns.
 * Each pattern is represented as an array of numbers (`ScalePattern`), where each number
 * indicates the interval (in semitones) from the root note of the scale.
 * The root note itself is always represented by 0.
 *
 * @readonly
 * @type {Record<ScaleName, ScalePattern>}
 * @example
 * ```ts
 * // Get the pattern for a Major scale
 * const majorPattern = SCALE_PATTERNS.major; // [0, 2, 4, 5, 7, 9, 11]
 *
 * // Get the pattern for Minor Pentatonic
 * const minorPentPattern = SCALE_PATTERNS.minorPentatonic; // [0, 3, 5, 7, 10]
 *
 * // Use with a scale building function (assuming one exists)
 * // const cMajorScale = buildScale(cNote, SCALE_PATTERNS.major);
 * ```
 */
export const SCALE_PATTERNS: Record<ScaleName, ScalePattern> = Object.freeze({
  // Freeze top-level object
  // Common scales
  major: Object.freeze([0, 2, 4, 5, 7, 9, 11]),
  minor: Object.freeze([0, 2, 3, 5, 7, 8, 10]), // Natural Minor
  harmonicMinor: Object.freeze([0, 2, 3, 5, 7, 8, 11]),
  melodicMinor: Object.freeze([0, 2, 3, 5, 7, 9, 11]), // Ascending form often implied

  // Modes of major (for convenience and clarity)
  ionian: Object.freeze([0, 2, 4, 5, 7, 9, 11]), // Same as major
  dorian: Object.freeze([0, 2, 3, 5, 7, 9, 10]),
  phrygian: Object.freeze([0, 1, 3, 5, 7, 8, 10]),
  lydian: Object.freeze([0, 2, 4, 6, 7, 9, 11]),
  mixolydian: Object.freeze([0, 2, 4, 5, 7, 9, 10]),
  aeolian: Object.freeze([0, 2, 3, 5, 7, 8, 10]), // Same as natural minor
  locrian: Object.freeze([0, 1, 3, 5, 6, 8, 10]),

  // Pentatonic scales
  majorPentatonic: Object.freeze([0, 2, 4, 7, 9]),
  minorPentatonic: Object.freeze([0, 3, 5, 7, 10]),

  // Blues and jazzy scales
  blues: Object.freeze([0, 3, 5, 6, 7, 10]), // Hexatonic (6-note) blues scale
  diminished: Object.freeze([0, 2, 3, 5, 6, 8, 9, 11]), // Whole-Half diminished scale pattern
  wholeTone: Object.freeze([0, 2, 4, 6, 8, 10]), // Hexatonic scale with only whole steps
  altered: Object.freeze([0, 1, 3, 4, 6, 8, 10]), // Altered scale (Super Locrian), 7th mode of melodic minor

  // Other scales
  chromatic: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), // All 12 semitones
  octatonic: Object.freeze([0, 2, 3, 5, 6, 8, 9, 11]), // Same as diminished (WH) - often context implies WH or HW variant
  bebopDominant: Object.freeze([0, 2, 4, 5, 7, 9, 10, 11]), // Mixolydian with added major 7th
  hungarianMinor: Object.freeze([0, 2, 3, 6, 7, 8, 11]), // Also known as Gypsy Minor
  doubleHarmonic: Object.freeze([0, 1, 4, 5, 7, 8, 11]), // Also known as Byzantine scale or Major Phrygian
  enigmatic: Object.freeze([0, 1, 4, 6, 8, 10, 11]),
  neapolitan: Object.freeze([0, 1, 3, 5, 7, 9, 11]), // Neapolitan Major
  persian: Object.freeze([0, 1, 4, 5, 6, 8, 11]),
  hirajoshi: Object.freeze([0, 2, 3, 7, 8]), // Common Japanese pentatonic scale variant
  inSen: Object.freeze([0, 1, 5, 7, 10]), // Japanese pentatonic scale
  yo: Object.freeze([0, 3, 5, 7, 10]), // Japanese pentatonic scale (matches minor pentatonic)
  // Add more scales as needed...
});

/**
 * A mapping from standard mode names (derived from the Major scale) to their
 * corresponding 1-based index or degree within that sequence.
 * Ionian (Major) is the 1st mode, Dorian the 2nd, etc.
 *
 * @readonly
 * @type {Readonly<Record<string, number>>}
 * @example
 * ```ts
 * MODE_INDICES['ionian']; // 1
 * MODE_INDICES['dorian']; // 2
 * MODE_INDICES['locrian']; // 7
 * ```
 */
export const MODE_INDICES: Readonly<Record<string, number>> = Object.freeze({
  ionian: 1,
  dorian: 2,
  phrygian: 3,
  lydian: 4,
  mixolydian: 5,
  aeolian: 6,
  locrian: 7,
});

/**
 * An array containing the standard names of the seven modes derived from the
 * Major scale, listed in their conventional order (Ionian to Locrian).
 *
 * @readonly
 * @type {ReadonlyArray<string>}
 */
export const MODE_NAMES: ReadonlyArray<string> = Object.freeze([
  // Freeze array
  "ionian",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "aeolian",
  "locrian",
]);
