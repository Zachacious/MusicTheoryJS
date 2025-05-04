/**
 * @module Note/Constants
 * @description
 * This module defines and exports fundamental constants and mappings used throughout the music theory library,
 * particularly for calculations and representations related to musical notes. It includes definitions for
 * standard tuning references, interval sizes in semitones and cents, mappings between note names/accidentals
 * and pitch representations, microtonal adjustments, default spellings, and basic tuning system information.
 *
 * These constants provide a reliable foundation for consistent calculations.
 */

import {
  Accidental,
  MicrotonalModifier,
  NoteLetter,
  PitchClassIndex,
  TuningSystem,
} from "./types";

// Core music theory constants
/**
 * The number of equal-tempered semitones in a standard octave.
 * @readonly
 * @type {number}
 */
export const SEMITONES_PER_OCTAVE = 12;

/**
 * The number of cents in a standard equal-tempered semitone.
 * Cents are a logarithmic unit of measure used for musical intervals.
 * @readonly
 * @type {number}
 */
export const CENTS_PER_SEMITONE = 100;

/**
 * The total number of cents in a standard octave (12 semitones * 100 cents/semitone).
 * @readonly
 * @type {number}
 */
export const CENTS_PER_OCTAVE = SEMITONES_PER_OCTAVE * CENTS_PER_SEMITONE; // 1200 cents

/**
 * The standard MIDI note number for Middle C (C4).
 * @readonly
 * @type {number}
 */
export const MIDDLE_C_MIDI = 60;

/**
 * The standard scientific octave number for Middle C.
 * @readonly
 * @type {number}
 */
export const MIDDLE_C_OCTAVE = 4;

/**
 * The calculated MIDI note number for C0, derived from Middle C.
 * This serves as a base reference for MIDI calculations where octave 0 starts at C0.
 * @readonly
 * @type {number}
 */
export const C0_MIDI = MIDDLE_C_MIDI - MIDDLE_C_OCTAVE * SEMITONES_PER_OCTAVE; // Should be 12

/**
 * The standard reference frequency for A4 (the A above Middle C) in Hertz (Hz).
 * Default tuning standard for Western music (ISO 16).
 * @readonly
 * @type {number}
 */
export const A4_FREQUENCY = 440;

/**
 * The standard MIDI note number for A4 (the A above Middle C).
 * Corresponds to the A4_FREQUENCY in standard tuning.
 * @readonly
 * @type {number}
 */
export const A4_MIDI = 69;

// Letter to base pitch class index mapping
/**
 * A mapping from natural note letters (A-G) to their base pitch class index
 * within an octave (0-11, where C=0). Used for calculating pitch class from notation.
 * @readonly
 * @type {Readonly<Record<NoteLetter, PitchClassIndex>>}
 * @example
 * ```ts
 * NOTE_LETTER_BASE_INDEX['C']; // 0
 * NOTE_LETTER_BASE_INDEX['A']; // 9
 * ```
 */
export const NOTE_LETTER_BASE_INDEX: Readonly<
  Record<NoteLetter, PitchClassIndex>
> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// Accidental to semitone adjustment mapping
/**
 * A mapping from standard accidental symbols to their corresponding adjustment
 * value in semitones relative to the natural note. Includes double sharps/flats
 * and treats 'x' as a synonym for '##' (double sharp).
 * @readonly
 * @type {Readonly<Record<Accidental, number>>}
 * @example
 * ```ts
 * ACCIDENTAL_ADJUSTMENT['#'];  // 1
 * ACCIDENTAL_ADJUSTMENT['bb']; // -2
 * ACCIDENTAL_ADJUSTMENT[''];   // 0 (Natural)
 * ACCIDENTAL_ADJUSTMENT['x'];  // 2
 * ```
 */
export const ACCIDENTAL_ADJUSTMENT: Readonly<Record<Accidental, number>> = {
  bb: -2,
  b: -1,
  "": 0,
  "#": 1,
  "##": 2,
  x: 2, // Treat 'x' as double sharp
};

// Microtonal modifier to cents adjustment mapping
/**
 * A mapping from common microtonal modifier symbols to their corresponding
 * adjustment value in cents relative to the base note defined by letter and accidental.
 * Used for representing pitches outside standard 12-TET.
 * Note: Values for symbols like '↑'/'↓' are indicative and can be customized or context-dependent.
 * @readonly
 * @type {Readonly<Record<MicrotonalModifier, number>>}
 * @example
 * ```ts
 * MICROTONAL_CENTS_ADJUSTMENT['+'];  // 50 (Quarter sharp up)
 * MICROTONAL_CENTS_ADJUSTMENT['-'];  // -50 (Quarter flat down)
 * MICROTONAL_CENTS_ADJUSTMENT[''];   // 0
 * ```
 */
export const MICROTONAL_CENTS_ADJUSTMENT: Readonly<
  Record<MicrotonalModifier, number>
> = {
  "": 0,
  "+": 50, // quarter sharp
  "-": -50, // quarter flat
  "++": 150, // three-quarter sharp (example)
  "--": -150, // three-quarter flat (example)
  "↑": 25, // slight raise (example value)
  "↓": -25, // slight lower (example value)
};

// Default pitch class to note spelling mappings
/**
 * An array mapping pitch class indices (0-11) to their default note spellings
 * using sharps for ambiguous cases (e.g., index 1 maps to "C#").
 * @readonly
 * @type {ReadonlyArray<string>}
 */
export const SHARP_NAMES: ReadonlyArray<string> = [
  "C", // 0
  "C#", // 1
  "D", // 2
  "D#", // 3
  "E", // 4
  "F", // 5
  "F#", // 6
  "G", // 7
  "G#", // 8
  "A", // 9
  "A#", // 10
  "B", // 11
];

/**
 * An array mapping pitch class indices (0-11) to their default note spellings
 * using flats for ambiguous cases (e.g., index 1 maps to "Db").
 * @readonly
 * @type {ReadonlyArray<string>}
 */
export const FLAT_NAMES: ReadonlyArray<string> = [
  "C", // 0
  "Db", // 1
  "D", // 2
  "Eb", // 3
  "E", // 4
  "F", // 5
  "Gb", // 6
  "G", // 7
  "Ab", // 8
  "A", // 9
  "Bb", // 10
  "B", // 11
];

// Quarter-tone spelling with mixed sharps and flats
/**
 * An array mapping quarter-tone indices (0-23 in a 24-TET system) to a common
 * string representation. Uses '+' for quarter-sharp indications relative to the
 * preceding standard 12-TET note name in this specific mapping.
 * The exact interpretation might vary based on the microtonal system context.
 * @readonly
 * @type {ReadonlyArray<string>}
 * @example
 * ```ts
 * QUARTER_TONE_NAMES[0]; // "C"
 * QUARTER_TONE_NAMES[1]; // "C+" (C quarter-sharp)
 * QUARTER_TONE_NAMES[2]; // "C#"
 * QUARTER_TONE_NAMES[3]; // "C#+" (C sharp quarter-sharp, or approx Db quarter-sharp)
 * ```
 */
export const QUARTER_TONE_NAMES: ReadonlyArray<string> = [
  "C", // 0
  "C+", // 1 (+50c)
  "C#", // 2 (+100c)
  "C#+" /* or "Db+"? */, // 3 (+150c) Needs clear convention if Db+ is preferred
  "D", // 4 (+200c)
  "D+", // 5 (+250c)
  "D#", // 6 (+300c)
  "D#+" /* or "Eb+"? */, // 7 (+350c)
  "E", // 8 (+400c)
  "E+", // 9 (+450c) Note: E# is F
  "F", // 10 (+500c)
  "F+", // 11 (+550c)
  "F#", // 12 (+600c)
  "F#+", // 13 (+650c)
  "G", // 14 (+700c)
  "G+", // 15 (+750c)
  "G#", // 16 (+800c)
  "G#+", // 17 (+850c)
  "A", // 18 (+900c)
  "A+", // 19 (+950c)
  "A#", // 20 (+1000c)
  "A#+", // 21 (+1050c)
  "B", // 22 (+1100c)
  "B+", // 23 (+1150c) Note: B# is C
];

// Frequency ratios for just intonation (relative to the tonic)
/**
 * A record containing common frequency ratios used in Just Intonation systems,
 * expressed as fractions relative to the tonic (1/1).
 * These represent pure intervals based on simple integer ratios.
 * @readonly
 * @type {Record<string, number>}
 * @example
 * ```ts
 * JUST_INTONATION_RATIOS['3/2']; // 1.5 (Perfect Fifth)
 * JUST_INTONATION_RATIOS['5/4']; // 1.25 (Major Third)
 * ```
 */
export const JUST_INTONATION_RATIOS: Record<string, number> = {
  "1/1": 1, // Perfect unison
  "9/8": 9 / 8, // Major second (Pythagorean)
  "5/4": 5 / 4, // Major third (Just)
  "4/3": 4 / 3, // Perfect fourth (Pythagorean & Just)
  "3/2": 3 / 2, // Perfect fifth (Pythagorean & Just)
  "5/3": 5 / 3, // Major sixth (Just)
  "15/8": 15 / 8, // Major seventh (Just)
  "2/1": 2, // Octave
  // Example additions for minor intervals
  "6/5": 6 / 5, // Minor third (Just)
  "8/5": 8 / 5, // Minor sixth (Just)
  // These can vary depending on the specific Just Intonation variant
  "9/5": 9 / 5, // Minor seventh (Sometimes used)
  "16/9": 16 / 9, // Minor seventh (Pythagorean)
  "16/15": 16 / 15, // Minor second / Semitone (Just)
  // Note: A complete Just Intonation system requires more complex ratio handling.
};

// Tuning system definitions
/**
 * A record defining parameters and characteristics of different tuning systems.
 * Each entry includes a name, description, and an optional `centsAdjustment` function.
 * The `centsAdjustment` function calculates the deviation in cents for a given pitch class
 * relative to standard 12-tone Equal Temperament.
 * @readonly
 * @property {object} equalTemperament - Standard 12-TET. Cents adjustment is always 0.
 * @property {object} pythagorean - Tuning based on pure perfect fifths (3/2 ratio). Contains approximate cents adjustments.
 * @property {object} justIntonation - Tuning based on simple integer ratios. Contains approximate cents adjustments for a C major context.
 * @property {object} quarterTone - 24-TET system. Cents adjustment is 0 as microtones are handled explicitly.
 * @property {object} custom - Placeholder for user-defined systems.
 */
export const TUNING_SYSTEMS: Record<
  TuningSystem,
  {
    name: string;
    description: string;
    /** Optional function returning cents adjustment relative to 12-TET for a given pitch class index. */
    centsAdjustment?: (pitchClass: PitchClassIndex) => number;
  }
> = {
  equalTemperament: {
    name: "12-tone Equal Temperament",
    description: "Standard tuning with 12 equal semitones per octave",
    centsAdjustment: () => 0, // No adjustment relative to itself
  },
  pythagorean: {
    name: "Pythagorean Tuning",
    description: "Based on stacking pure perfect fifths (3/2 ratio)",
    // These adjustments are approximate relative to 12-TET C=0
    // Calculated based on powers of 3/2 ratio, modulo octave
    centsAdjustment: (pitchClass) => {
      // Example calculation relative to C=0 (can be more precise)
      const pythagoreanCents = [
        0, 113.69, 203.91, 317.6, 407.82, 521.51, 611.73, 701.96, 815.64,
        905.87, 1019.55, 1109.78,
      ];
      const etCents = pitchClass * 100;
      // Return deviation (example uses pre-calculated approximate values)
      const adjustmentsApprox = [
        0, -6.3, 3.9, -10.4, -0.2, -14.5, -4.3, 2.0, -8.4, 5.9, -12.5, -0.2,
      ]; // Rough example values
      return adjustmentsApprox[pitchClass];
    },
  },
  justIntonation: {
    name: "Just Intonation (5-limit)",
    description: "Uses pure frequency ratios based on primes 2, 3, 5",
    // These adjustments are approximate relative to 12-TET C=0, using common C major ratios
    centsAdjustment: (pitchClass) => {
      const justCents = [
        0, 111.73, 203.91, 315.64, 386.31, 498.04, 590.22, 701.96, 813.69,
        884.36, 1017.59, 1088.27,
      ]; // Example C-Major JI cents
      const etCents = pitchClass * 100;
      // Return deviation (example uses pre-calculated approximate values)
      const adjustmentsApprox = [
        0, 11.7, 3.9, 15.6, -13.7, -2.0, -9.8, 2.0, 13.7, -15.6, 17.6, -11.7,
      ]; // Rough C-Major JI vs ET
      return adjustmentsApprox[pitchClass];
    },
  },
  quarterTone: {
    name: "24-tone Equal Temperament",
    description: "Quarter-tone system with 24 equal divisions per octave",
    // Base notes align with 12-TET; microtones are handled by modifier/cents properties
    centsAdjustment: () => 0,
  },
  custom: {
    name: "Custom Tuning",
    description: "Placeholder for user-defined tuning systems",
    // No default adjustment function
  },
};

// Reverse lookup for pitch class index from letter and accidental string
/**
 * A reverse lookup table mapping a combined string of note letter and accidental
 * (e.g., "C#", "Bb", "F") directly to its corresponding PitchClassIndex (0-11).
 * This table is generated at runtime based on NOTE_LETTER_BASE_INDEX and ACCIDENTAL_ADJUSTMENT.
 * Useful for parsing note strings.
 * @readonly
 * @type {Record<string, PitchClassIndex>}
 * @example
 * ```ts
 * LETTER_ACCIDENTAL_TO_PITCH_CLASS['C#']; // 1
 * LETTER_ACCIDENTAL_TO_PITCH_CLASS['Bb']; // 10
 * LETTER_ACCIDENTAL_TO_PITCH_CLASS['E'];  // 4
 * ```
 */
export const LETTER_ACCIDENTAL_TO_PITCH_CLASS: Record<string, PitchClassIndex> =
  {};

// --- Runtime Initialization ---
/**
 * @internal
 * Initializes the LETTER_ACCIDENTAL_TO_PITCH_CLASS reverse lookup table.
 * This code runs once when the module is loaded.
 */
for (const [letter, baseIndex] of Object.entries(NOTE_LETTER_BASE_INDEX)) {
  for (const [accidental, adjustment] of Object.entries(
    ACCIDENTAL_ADJUSTMENT
  )) {
    // Calculate resulting pitch class index, handling modulo correctly
    const pitchClassIndex = ((baseIndex + adjustment + SEMITONES_PER_OCTAVE) %
      SEMITONES_PER_OCTAVE) as PitchClassIndex;
    // Store the mapping
    LETTER_ACCIDENTAL_TO_PITCH_CLASS[`${letter}${accidental}`] =
      pitchClassIndex;
  }
}
Object.freeze(LETTER_ACCIDENTAL_TO_PITCH_CLASS); // Ensure it's immutable after creation
