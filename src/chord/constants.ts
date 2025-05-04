/**
 * @module Chord/Constants
 * @description
 * This module defines various constants related to musical chords, including standard chord formulas,
 * quality categories, interval mappings, symbol parsing data, common progressions, Roman numeral conversions,
 * and example voicings. These constants provide foundational data for chord creation, analysis, and parsing.
 */

// Import Chord type definitions used within this file
import { ChordCategory, ChordFormula, ChordQuality } from "./types";

/**
 * A comprehensive mapping of chord quality names (`ChordQuality`) to their corresponding interval formulas (`ChordFormula`).
 *
 * The `ChordFormula` object maps scale degree numbers (1, 3, 5, 7, 9, 11, 13) to a semitone alteration
 * relative to the *major scale* interval for that degree.
 * - `0`: Represents the natural interval found in the major scale (or the standard perfect interval for 4th/5th).
 * - `-1`: Represents the interval flattened by one semitone (e.g., b3, b7, b5, b9, b13).
 * - `+1`: Represents the interval sharpened by one semitone (e.g., #5, #9, #11).
 * - `-2`: Represents the interval flattened by two semitones (e.g., bb7 for dim7).
 *
 * The base intervals (alteration 0) are defined relative to the root (1=0st, 2=2st, 3=4st, 4=5st, 5=7st, 6=9st, 7=11st, 9=14st, 11=17st, 13=21st).
 * See `SCALE_DEGREE_SEMITONES`.
 *
 * @readonly
 * @type {Record<ChordQuality, ChordFormula>}
 * @example Formula Interpretation:
 * ```
 * // major: { 1:0, 3:0, 5:0 } -> Root, Major 3rd, Perfect 5th
 * // minor: { 1:0, 3:-1, 5:0 } -> Root, Minor 3rd (Major 3rd - 1st), Perfect 5th
 * // dom7:  { 1:0, 3:0, 5:0, 7:-1 } -> Root, Major 3rd, Perfect 5th, Minor 7th (Major 7th - 1st)
 * // dim7:  { 1:0, 3:-1, 5:-1, 7:-2 } -> Root, Minor 3rd, Diminished 5th (P5 - 1st), Diminished 7th (Major 7th - 2st)
 * ```
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
  "7#11": { 1: 0, 3: 0, 5: 0, 7: -1, 11: 1 }, // Note: Often implies 9th is present too
  "7b13": { 1: 0, 3: 0, 5: 0, 7: -1, 13: -1 }, // Note: Often implies 9th, 11th present

  // Add chords
  add9: { 1: 0, 3: 0, 5: 0, 9: 0 }, // Major triad + M9
  add11: { 1: 0, 3: 0, 5: 0, 11: 0 }, // Major triad + P11
  add13: { 1: 0, 3: 0, 5: 0, 13: 0 }, // Major triad + M13

  // Already defined sus chords earlier
  "7sus4": { 1: 0, 4: 0, 5: 0, 7: -1 }, // R, P4, P5, m7
  "9sus4": { 1: 0, 4: 0, 5: 0, 7: -1, 9: 0 }, // R, P4, P5, m7, M9

  // Sixth chords
  "6": { 1: 0, 3: 0, 5: 0, 6: 0 }, // Major 6: R, M3, P5, M6
  min6: { 1: 0, 3: -1, 5: 0, 6: 0 }, // Minor 6: R, m3, P5, M6
  "6/9": { 1: 0, 3: 0, 5: 0, 6: 0, 9: 0 }, // R, M3, P5, M6, M9
  "min6/9": { 1: 0, 3: -1, 5: 0, 6: 0, 9: 0 }, // R, m3, P5, M6, M9
};

/**
 * A mapping of chord qualities (`ChordQuality`) to broader harmonic categories (`ChordCategory`).
 * Useful for classifying chords based on their general type or function.
 * @readonly
 * @type {Record<ChordQuality, ChordCategory>}
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
  "7": "seventh", // Alias for dom7
  minMaj7: "seventh",
  dim7: "seventh",
  "half-dim7": "seventh", // m7b5
  aug7: "seventh",

  // Extended chords (9ths, 11ths, 13ths)
  maj9: "extended",
  min9: "extended",
  "9": "extended", // Dominant 9
  maj11: "extended",
  min11: "extended",
  "11": "extended", // Dominant 11
  maj13: "extended",
  min13: "extended",
  "13": "extended", // Dominant 13

  // Altered chords (typically altered dominants)
  "7b5": "altered",
  "7#5": "altered",
  "7b9": "altered",
  "7#9": "altered",
  "7#11": "altered",
  "7b13": "altered",

  // Add chords (Triad + added tone)
  add9: "added tone",
  add11: "added tone",
  add13: "added tone",

  // Sus chords with extensions
  "7sus4": "suspended", // Could also be categorized as seventh?
  "9sus4": "suspended", // Could also be categorized as extended?

  // Sixth chords
  "6": "special", // Sometimes 'added tone'
  min6: "special", // Sometimes 'added tone'
  "6/9": "special", // Complex category
  "min6/9": "special", // Complex category
};

/**
 * A mapping of standard scale degree numbers (1-based index, up to 13th)
 * to their corresponding interval size in **semitones** relative to the root,
 * assuming a **Major scale** context for diatonic degrees (2, 3, 6, 7, 9, 11, 13)
 * and **Perfect** intervals for 4th and 5th.
 *
 * This serves as the baseline for calculating specific chord tone intervals
 * when combined with alterations from `CHORD_FORMULAS`.
 *
 * @readonly
 * @type {Record<number, number>}
 * @example
 * ```ts
 * SCALE_DEGREE_SEMITONES[1]; // 0 (Root)
 * SCALE_DEGREE_SEMITONES[3]; // 4 (Major Third)
 * SCALE_DEGREE_SEMITONES[7]; // 11 (Major Seventh)
 * SCALE_DEGREE_SEMITONES[9]; // 14 (Major Ninth = Octave + Major Second)
 * ```
 */
export const SCALE_DEGREE_SEMITONES: Record<number, number> = {
  1: 0, // Root
  2: 2, // Major 2nd
  3: 4, // Major 3rd
  4: 5, // Perfect 4th
  5: 7, // Perfect 5th
  6: 9, // Major 6th
  7: 11, // Major 7th
  // Extensions (compound intervals)
  9: 14, // Major 9th (12 + 2)
  11: 17, // Perfect 11th (12 + 5)
  13: 21, // Major 13th (12 + 9)
};

/**
 * A mapping from various common string representations and aliases used in chord symbols
 * to the canonical `ChordQuality` name used internally by the library.
 * Useful for parsing user input or standard chord notation. Keys are literal strings.
 *
 * @readonly
 * @type {Record<string, ChordQuality>}
 * @example
 * ```ts
 * CHORD_SYMBOL_MAP['maj7']; // 'maj7'
 * CHORD_SYMBOL_MAP['M7'];   // 'maj7'
 * CHORD_SYMBOL_MAP['Δ7'];  // 'maj7'
 * CHORD_SYMBOL_MAP['m'];    // 'minor'
 * CHORD_SYMBOL_MAP['-'];    // 'minor'
 * CHORD_SYMBOL_MAP['dom7']; // '7'
 * CHORD_SYMBOL_MAP['o'];    // 'diminished'
 * CHORD_SYMBOL_MAP['ø'];    // 'half-dim7'
 * ```
 */
export const CHORD_SYMBOL_MAP: Record<string, ChordQuality> = {
  // Major triads and variations (Default is major if only root is given)
  "": "major", // Empty string often implies major
  M: "major",
  maj: "major",
  Δ: "major", // Delta symbol sometimes used for major triad

  // Minor triads
  m: "minor",
  min: "minor",
  "-": "minor",

  // Augmented triads
  aug: "augmented",
  "+": "augmented",

  // Diminished triads
  dim: "diminished",
  o: "diminished", // Degree symbol

  // Suspended chords
  sus2: "sus2",
  sus4: "sus4",
  sus: "sus4", // Default 'sus' usually implies sus4

  // Seventh chords
  "7": "7", // Dominant 7th is often the default '7'
  dom7: "7", // Explicit dominant 7th
  M7: "maj7",
  maj7: "maj7",
  Δ7: "maj7", // Delta 7 for Major 7th
  m7: "min7",
  min7: "min7",
  "-7": "min7",
  mM7: "minMaj7", // Minor Major 7th
  minMaj7: "minMaj7",
  "-Δ7": "minMaj7", // Common symbol for minMaj7
  dim7: "dim7",
  o7: "dim7", // Fully diminished 7th
  m7b5: "half-dim7", // Minor 7 flat 5 (Half-diminished)
  ø: "half-dim7", // Half-diminished symbol
  ø7: "half-dim7", // Often redundant, ø implies 7th
  aug7: "aug7", // Augmented 7th (Dom7 #5)
  "7#5": "7#5",
  "7+5": "7#5", // Alias for 7#5

  // Extended chords (9, 11, 13 often imply dominant 7th unless specified)
  maj9: "maj9",
  M9: "maj9",
  Δ9: "maj9",
  "9": "9", // Dominant 9
  min9: "min9",
  m9: "min9",
  "-9": "min9",
  maj11: "maj11",
  M11: "maj11",
  Δ11: "maj11",
  "11": "11", // Dominant 11
  min11: "min11",
  m11: "min11",
  "-11": "min11",
  maj13: "maj13",
  M13: "maj13",
  Δ13: "maj13",
  "13": "13", // Dominant 13
  min13: "min13",
  m13: "min13",
  "-13": "min13",

  // Add chords (Triad + added note)
  add9: "add9", // Major triad + 9th
  add11: "add11", // Major triad + 11th
  add13: "add13", // Major triad + 13th

  // Sixth chords
  "6": "6", // Major 6th chord (Maj triad + M6)
  m6: "min6",
  min6: "min6",
  "-6": "min6", // Minor 6th chord (min triad + M6)
  "6/9": "6/9", // 6th chord with added 9th
  "m6/9": "min6/9",
  "min6/9": "min6/9",
  "-6/9": "min6/9", // Minor 6/9

  // Altered dominants (explicit alterations)
  "7b5": "7b5",
  // "7#5" already mapped above
  "7b9": "7b9",
  "7#9": "7#9",
  "7#11": "7#11", // Dominant 7 sharp 11
  "7b13": "7b13", // Dominant 7 flat 13

  // Sus chords with dominant 7th quality implied
  "7sus": "7sus4", // Default sus is sus4
  "7sus4": "7sus4",
  "9sus": "9sus4", // Default sus is sus4
  "9sus4": "9sus4",
};

/**
 * A record containing examples of common chord progressions in popular music and jazz.
 * Keys are descriptive names, values are arrays of strings representing chords,
 * typically using Roman numeral analysis notation (e.g., "I", "IV", "V", "ii", "vi").
 * @readonly
 * @type {Record<string, string[]>}
 */
export const COMMON_PROGRESSIONS: Record<string, string[]> = {
  // Common chord progressions using Roman numerals
  "1-4-5": ["I", "IV", "V"], // Major Key: I-IV-V
  "1-5-6-4": ["I", "V", "vi", "IV"], // Common Pop Progression
  "1-6-4-5": ["I", "vi", "IV", "V"], // 50s Progression
  "2-5-1": ["ii", "V", "I"], // Jazz ii-V-I (Major)
  blues: [
    // Standard 12-bar blues (dominant 7ths common)
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
    "V7", // Common turnaround V7
  ],
  andalusian: ["i", "VII", "VI", "V"], // Andalusian Cadence (Minor key: Am G F E)
  pop1: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"], // Pachelbel's Canon derivative
  lament: ["I", "vii°", "vi", "V"], // Descending bass lament (often Minor: i-VII-VI-V)
};

/**
 * A regular expression designed to parse common chord symbols into components:
 * 1. Root Note (A-G)
 * 2. Accidental (#, b, ##, bb) - optional
 * 3. Chord Quality/Extension/Alteration string - optional (defaults to major)
 * 4. Slash Bass Note (Root + Accidental) - optional
 *
 * @readonly
 * @type {RegExp}
 * @remarks This regex attempts to capture many common variations but may not cover all edge cases
 * or highly complex chord symbols. Parsing logic using this regex needs to handle the captured groups carefully,
 * especially the complex 3rd group for quality/extensions. The bass note capture (Group 4) is simplified.
 */
export const CHORD_SYMBOL_REGEX = new RegExp(
  // 1. Root note (A-G, case-insensitive) - Capture Group 1
  "^([A-Ga-g])" +
    // 2. Optional Accidental (#, b, ##, bb) - Capture Group 2
    "(#|b|##|bb)?" +
    // 3. Quality/Extension/Alteration string (complex, many options) - Capture Group 3 (Optional)
    // This large group tries to match known quality/extension symbols from CHORD_SYMBOL_MAP and formulas
    "(M|maj|min|m|-|aug|\\+|dim|o|Δ|sus2|sus4|sus|7|9|11|13|6|7b5|7\\+5|7#5|7b9|7#9|7#11|7b13|maj7|Δ7|M7|m7|min7|-7|mM7|minMaj7|-Δ7|dim7|o7|\\+7|m7b5|ø|ø7|" +
    "maj9|Δ9|M9|m9|min9|-9|maj11|Δ11|M11|m11|min11|-11|maj13|Δ13|M13|m13|min13|-13|add9|add11|add13|6/9|m6/9|min6/9|-6/9|" +
    "7sus4?|9sus4?)?" + // Added '?' to make this group optional
    // 4. Optional Slash Bass note (e.g., "/C#") - Capture Group 4 (Root+Acc of bass)
    // Uses non-capturing group `(?:...)` for the slash itself
    "(?:\\/([A-Ga-g][#b]?))?" + // Capture Group 4 only contains the Bass Note + Accidental part
    // End of string anchor
    "$"
);

/**
 * A mapping from standard Roman numeral representations (case-insensitive)
 * to their corresponding 1-based scale degree number (1-7).
 * @readonly
 * @type {Record<string, number>}
 */
export const ROMAN_NUMERALS: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  // Lowercase versions map to the same degree number
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
};

/**
 * A mapping from 1-based scale degree numbers (1-7) to objects containing
 * their standard uppercase (Major/Augmented quality assumed) and lowercase (minor/diminished quality assumed)
 * Roman numeral string representations.
 * Useful for generating Roman numeral analysis notation.
 * @readonly
 * @type {Record<number, Record<string, string>>}
 * @property {object} 1 - { true: "I", false: "i" }
 * @property {object} 2 - { true: "II", false: "ii" }
 * @property {object} 3 - { true: "III", false: "iii" }
 * @property {object} 4 - { true: "IV", false: "iv" }
 * @property {object} 5 - { true: "V", false: "v" }
 * @property {object} 6 - { true: "VI", false: "vi" }
 * @property {object} 7 - { true: "VII", false: "vii" }
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
 * Provides examples of common chord voicings categorized by chord type (`ChordCategory`).
 * Each voicing is represented as an array of numbers, where each number is the 0-based index
 * of the chord tone (0=Root, 1=Third, 2=Fifth, 3=Seventh, 4=Ninth, etc., based on the standard chord formula).
 * The order typically represents lowest to highest voice, but interpretation depends on context.
 * @readonly
 * @type {Record<ChordCategory, number[][]>}
 * @remarks These are just illustrative examples and not exhaustive lists of all possible voicings.
 * The exact notes generated from these indices depend on the specific chord formula (e.g., the '1' index maps to a Major 3rd for a Major chord, but a minor 3rd for a Minor chord). Assumes standard chord structure (R, 3, 5, 7, 9, 11, 13) for indexing.
 */
export const COMMON_VOICINGS: Record<ChordCategory, number[][]> = {
  triad: [
    [0, 1, 2], // Root position (Indices for R, 3, 5)
    [1, 2, 0], // 1st inversion (Indices for 3, 5, R)
    [2, 0, 1], // 2nd inversion (Indices for 5, R, 3)
  ],
  seventh: [
    [0, 1, 2, 3], // Root position (Indices R, 3, 5, 7)
    [1, 2, 3, 0], // 1st inversion (Indices 3, 5, 7, R)
    [2, 3, 0, 1], // 2nd inversion (Indices 5, 7, R, 3)
    [3, 0, 1, 2], // 3rd inversion (Indices 7, R, 3, 5)
  ],
  extended: [
    // Examples for 9ths, 11ths, 13ths - often omit notes
    [0, 2, 3, 4], // Example: R, 5, 7, 9 ? (Indices map 0=R, 1=3, 2=5, 3=7, 4=9, 5=11, 6=13)
    [0, 1, 3, 4], // Example: R, 3, 7, 9 ?
    [0, 3, 4, 6], // Example: R, 7, 9, 13 ?
  ],
  altered: [
    // Examples for altered dominant chords
    [0, 1, 2, 3], // Example: R, 3, b5, b7 ? Indices depend on specific alteration mapping.
    [0, 2, 3, 4], // Example: R, 5, b7, b9 ?
    [0, 3, 4, 6], // Example: R, b7, b9, #11 ?
  ],
  suspended: [
    // Examples for sus chords
    [0, 1, 2], // Example: R, SusNote (2 or 4), 5 ? Index 1 represents the suspended tone.
    [1, 2, 0], // Inverted sus
    [0, 2, 1], // Alternative voicing
  ],
  "added tone": [
    // Examples for add chords
    [0, 1, 2, 4], // Example: R, 3, 5, 9 (assuming 4 maps to 9th index)
    [0, 4, 1, 2], // Added tone in middle
    [0, 1, 4, 2], // Added tone differently
  ],
  slash: [
    // Examples - base voicing assumed, bass handled separately by definition
    [0, 1, 2, 3], // Default voicing structure assumed
    [1, 2, 3, 0], // Inverted voicing structure
    [0, 2, 1, 3], // Spread voicing structure
  ],
  special: [
    // Examples for 6th chords etc.
    [0, 1, 2, 3], // Example: R, 3, 5, 6 (assuming 3 maps to 6th index)
    [0, 1, 3, 2], // Alt voicing
    [0, 3, 1, 2], // Another voicing
  ],
};
