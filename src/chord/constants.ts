/**
 * Constants related to chords
 */

import { ChordCategory, ChordFormula, ChordQuality } from "./types";

/**
 * Map of chord qualities to their interval formulas
 * The key is the scale degree (1, 3, 5, etc.)
 * The value is the semitone adjustment (0=natural, -1=flat, 1=sharp)
 */
export const CHORD_FORMULAS: Record<ChordQuality, ChordFormula> = {
  // Triads
  major: { 1: 0, 3: 0, 5: 0 },
  minor: { 1: 0, 3: -1, 5: 0 },
  augmented: { 1: 0, 3: 0, 5: 1 },
  diminished: { 1: 0, 3: -1, 5: -1 },
  sus2: { 1: 0, 2: 0, 5: 0 },
  sus4: { 1: 0, 4: 0, 5: 0 },

  // Seventh chords
  maj7: { 1: 0, 3: 0, 5: 0, 7: 0 },
  min7: { 1: 0, 3: -1, 5: 0, 7: -1 },
  dom7: { 1: 0, 3: 0, 5: 0, 7: -1 },
  "7": { 1: 0, 3: 0, 5: 0, 7: -1 }, // Same as dom7
  minMaj7: { 1: 0, 3: -1, 5: 0, 7: 0 },
  dim7: { 1: 0, 3: -1, 5: -1, 7: -2 },
  "half-dim7": { 1: 0, 3: -1, 5: -1, 7: -1 },
  aug7: { 1: 0, 3: 0, 5: 1, 7: -1 },

  // Extended chords
  maj9: { 1: 0, 3: 0, 5: 0, 7: 0, 9: 0 },
  min9: { 1: 0, 3: -1, 5: 0, 7: -1, 9: 0 },
  "9": { 1: 0, 3: 0, 5: 0, 7: -1, 9: 0 },
  maj11: { 1: 0, 3: 0, 5: 0, 7: 0, 9: 0, 11: 0 },
  min11: { 1: 0, 3: -1, 5: 0, 7: -1, 9: 0, 11: 0 },
  "11": { 1: 0, 3: 0, 5: 0, 7: -1, 9: 0, 11: 0 },
  maj13: { 1: 0, 3: 0, 5: 0, 7: 0, 9: 0, 11: 0, 13: 0 },
  min13: { 1: 0, 3: -1, 5: 0, 7: -1, 9: 0, 11: 0, 13: 0 },
  "13": { 1: 0, 3: 0, 5: 0, 7: -1, 9: 0, 11: 0, 13: 0 },

  // Altered chords
  "7b5": { 1: 0, 3: 0, 5: -1, 7: -1 },
  "7#5": { 1: 0, 3: 0, 5: 1, 7: -1 },
  "7b9": { 1: 0, 3: 0, 5: 0, 7: -1, 9: -1 },
  "7#9": { 1: 0, 3: 0, 5: 0, 7: -1, 9: 1 },
  "7#11": { 1: 0, 3: 0, 5: 0, 7: -1, 11: 1 },
  "7b13": { 1: 0, 3: 0, 5: 0, 7: -1, 13: -1 },

  // Add chords
  add9: { 1: 0, 3: 0, 5: 0, 9: 0 },
  add11: { 1: 0, 3: 0, 5: 0, 11: 0 },
  add13: { 1: 0, 3: 0, 5: 0, 13: 0 },

  // Already defined sus chords earlier
  "7sus4": { 1: 0, 4: 0, 5: 0, 7: -1 },
  "9sus4": { 1: 0, 4: 0, 5: 0, 7: -1, 9: 0 },

  // Sixth chords
  "6": { 1: 0, 3: 0, 5: 0, 6: 0 },
  min6: { 1: 0, 3: -1, 5: 0, 6: 0 },
  "6/9": { 1: 0, 3: 0, 5: 0, 6: 0, 9: 0 },
  "min6/9": { 1: 0, 3: -1, 5: 0, 6: 0, 9: 0 },
};

/**
 * Map of chord qualities to their categories
 */
export const CHORD_CATEGORIES: Record<ChordQuality, ChordCategory> = {
  // Triads
  major: "triad",
  minor: "triad",
  augmented: "triad",
  diminished: "triad",
  sus2: "suspended",
  sus4: "suspended",

  // Seventh chords
  maj7: "seventh",
  min7: "seventh",
  dom7: "seventh",
  "7": "seventh",
  minMaj7: "seventh",
  dim7: "seventh",
  "half-dim7": "seventh",
  aug7: "seventh",

  // Extended chords
  maj9: "extended",
  min9: "extended",
  "9": "extended",
  maj11: "extended",
  min11: "extended",
  "11": "extended",
  maj13: "extended",
  min13: "extended",
  "13": "extended",

  // Altered chords
  "7b5": "altered",
  "7#5": "altered",
  "7b9": "altered",
  "7#9": "altered",
  "7#11": "altered",
  "7b13": "altered",

  // Add chords
  add9: "added tone",
  add11: "added tone",
  add13: "added tone",

  // Sus chords (some already defined above)
  "7sus4": "suspended",
  "9sus4": "suspended",

  // Sixth chords
  "6": "special",
  min6: "special",
  "6/9": "special",
  "min6/9": "special",
};

/**
 * Map of scale degrees to semitones from root
 */
export const SCALE_DEGREE_SEMITONES: Record<number, number> = {
  1: 0, // Root
  2: 2, // Major 2nd
  3: 4, // Major 3rd
  4: 5, // Perfect 4th
  5: 7, // Perfect 5th
  6: 9, // Major 6th
  7: 11, // Major 7th
  9: 14, // Major 9th
  11: 17, // Perfect 11th
  13: 21, // Major 13th
};

/**
 * Mapping for chord symbol string parsing
 */
export const CHORD_SYMBOL_MAP: Record<string, ChordQuality> = {
  // Major triads and variations
  "": "major",
  M: "major",
  maj: "major",
  Δ: "major",

  // Minor triads
  m: "minor",
  min: "minor",
  "-": "minor",

  // Augmented triads
  aug: "augmented",
  "+": "augmented",

  // Diminished triads
  dim: "diminished",
  o: "diminished",

  // Suspended chords
  sus2: "sus2",
  sus4: "sus4",
  sus: "sus4", // Default sus is sus4

  // Seventh chords
  "7": "7",
  dom7: "7",
  M7: "maj7",
  maj7: "maj7",
  Δ7: "maj7",
  m7: "min7",
  min7: "min7",
  "-7": "min7",
  mM7: "minMaj7",
  minMaj7: "minMaj7",
  "-Δ7": "minMaj7",
  dim7: "dim7",
  o7: "dim7",
  m7b5: "half-dim7",
  ø: "half-dim7",
  ø7: "half-dim7",

  // Extended chords
  maj9: "maj9",
  Δ9: "maj9",
  "9": "9",
  min9: "min9",
  m9: "min9",
  "-9": "min9",
  maj11: "maj11",
  Δ11: "maj11",
  "11": "11",
  min11: "min11",
  m11: "min11",
  "-11": "min11",
  maj13: "maj13",
  Δ13: "maj13",
  "13": "13",
  min13: "min13",
  m13: "min13",
  "-13": "min13",

  // Add chords
  add9: "add9",
  add11: "add11",
  add13: "add13",

  // Sixth chords
  "6": "6",
  m6: "min6",
  min6: "min6",
  "-6": "min6",
  "6/9": "6/9",
  "m6/9": "min6/9",
  "min6/9": "min6/9",
  "-6/9": "min6/9",

  // Altered dominants
  "7b5": "7b5",
  "7#5": "7#5",
  "7+5": "7#5",
  "7b9": "7b9",
  "7#9": "7#9",
  "7#11": "7#11",
  "7b13": "7b13",

  // Sus with dominants
  "7sus": "7sus4",
  "7sus4": "7sus4",
  "9sus": "9sus4",
  "9sus4": "9sus4",
};

/**
 * Common chord progressions in popular music
 */
export const COMMON_PROGRESSIONS: Record<string, string[]> = {
  // Common chord progressions
  "1-4-5": ["I", "IV", "V"],
  "1-5-6-4": ["I", "V", "vi", "IV"],
  "1-6-4-5": ["I", "vi", "IV", "V"],
  "2-5-1": ["ii", "V", "I"],
  blues: [
    "I7",
    "IV7",
    "I7",
    "I7",
    "IV7",
    "IV7",
    "I7",
    "I7",
    "V7",
    "IV7",
    "I7",
    "V7",
  ],
  andalusian: ["i", "VII", "VI", "V"],
  pop1: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"],
  lament: ["I", "vii°", "vi", "V"],
};

/**
 * Regex pattern for parsing chord symbols
 */
export const CHORD_SYMBOL_REGEX = new RegExp(
  // Root note (required)
  "^([A-Ga-g])" +
    // Optional accidental
    "(#|b|##|bb)?" +
    // Quality (optional, will default to major)
    "(M|maj|min|m|-|aug|\\+|dim|o|Δ|sus2|sus4|sus)?" +
    // Extension/alteration
    "(7|9|11|13|6|7b5|7\\+5|7#5|7b9|7#9|7#11|7b13|maj7|Δ7|M7|m7|min7|-7|mM7|minMaj7|-Δ7|dim7|o7|\\+7|m7b5|ø|ø7|" +
    "maj9|Δ9|M9|m9|min9|-9|maj11|Δ11|M11|m11|min11|-11|maj13|Δ13|M13|m13|min13|-13|add9|add11|add13|6/9|m6/9|min6/9|-6/9|" +
    "7sus4?|9sus4?)?" +
    // Optional slash bass note
    "(?:\\/([A-Ga-g][#b]?))?" +
    "$"
);

/**
 * Roman numeral to scale degree mapping
 */
export const ROMAN_NUMERALS: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
};

/**
 * Scale degree to roman numeral mapping
 */
export const SCALE_DEGREES_TO_ROMAN: Record<number, Record<string, string>> = {
  1: { true: "I", false: "i" },
  2: { true: "II", false: "ii" },
  3: { true: "III", false: "iii" },
  4: { true: "IV", false: "iv" },
  5: { true: "V", false: "v" },
  6: { true: "VI", false: "vi" },
  7: { true: "VII", false: "vii" },
};

/**
 * Common voicings for different chord types
 */
export const COMMON_VOICINGS: Record<ChordCategory, number[][]> = {
  triad: [
    [0, 1, 2], // Root position
    [1, 2, 0], // 1st inversion
    [2, 0, 1], // 2nd inversion
  ],
  seventh: [
    [0, 1, 2, 3], // Root position
    [1, 2, 3, 0], // 1st inversion
    [2, 3, 0, 1], // 2nd inversion
    [3, 0, 1, 2], // A3rd inversion
  ],
  extended: [
    [0, 2, 3, 6], // Shell voicing with extensions
    [0, 1, 3, 6], // Another common extended voicing
    [0, 3, 6, 8], // Upper structure voicing
  ],
  altered: [
    [0, 1, 2, 3], // Basic
    [0, 2, 3, 4], // Altered with extension
    [0, 3, 4, 6], // Spread altered
  ],
  suspended: [
    [0, 1, 2], // Basic sus
    [1, 2, 0], // Inverted sus
    [0, 2, 1], // Alternative voicing
  ],
  "added tone": [
    [0, 1, 2, 4], // Add chord typical voicing
    [0, 4, 1, 2], // Extension first
    [0, 1, 4, 2], // Middle extension
  ],
  slash: [
    [0, 1, 2, 3], // Default slash, bass note handled separately
    [1, 2, 3, 0], // Alt voicing
    [0, 2, 1, 3], // Spread voicing
  ],
  special: [
    [0, 1, 2, 3], // Basic special
    [0, 1, 3, 2], // Alt special
    [0, 3, 1, 2], // Another special voicing
  ],
};
