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
  "C#+", // 3 (+150c)
  "D", // 4 (+200c)
  "D+", // 5 (+250c)
  "D#", // 6 (+300c)
  "D#+", // 7 (+350c)
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

/**
 * Defines parameters and characteristics of different tuning systems.
 * Each entry includes a name, description, and an optional `centsAdjustment` function
 * which calculates the deviation in cents for a given pitch class index (relative to C=0)
 * compared to standard 12-tone Equal Temperament (12-TET).
 */
export const TUNING_SYSTEMS: Record<
  TuningSystem,
  {
    name: string;
    description: string;
    /** Optional function returning cents adjustment relative to 12-TET for a given pitch class index. */
    centsAdjustment?: (pitchClass: PitchClassIndex) => number;
  }
> = (() => {
  // --- Helper: Calculate cents from ratio ---
  const ratioToCents = (ratio: number): number => 1200 * Math.log2(ratio);

  // --- Pythagorean Calculations ---
  // Based on stacking perfect fifths (3/2 ratio) relative to C=0
  const pythagoreanFifthCents = ratioToCents(3 / 2); // ~701.955 cents
  // Cents values derived from sequence of fifths (0=C, 1=G, 2=D, ..., 11=F)
  // Using standard derivation where F is down a fifth from C.
  const pythagoreanNoteCents: number[] = [
    0, // C (0 fifths)
    (pythagoreanFifthCents * 7) % 1200, // C# (7 fifths) ~113.69
    (pythagoreanFifthCents * 2) % 1200, // D (2 fifths) ~203.91
    (pythagoreanFifthCents * 9) % 1200, // D# (9 fifths) ~317.60
    (pythagoreanFifthCents * 4) % 1200, // E (4 fifths) ~407.82
    (1200 + ratioToCents(2 / 3)) % 1200, // F (Down 1 fifth) ~498.04
    (pythagoreanFifthCents * 6) % 1200, // F# (6 fifths) ~611.73
    (pythagoreanFifthCents * 1) % 1200, // G (1 fifth) ~701.96
    (pythagoreanFifthCents * 8) % 1200, // G# (8 fifths) ~815.64
    (pythagoreanFifthCents * 3) % 1200, // A (3 fifths) ~905.87
    (pythagoreanFifthCents * 10) % 1200, // A# (10 fifths) ~1019.55
    (pythagoreanFifthCents * 5) % 1200, // B (5 fifths) ~1109.78
  ];
  // Calculate adjustments relative to 12-TET
  const pythagoreanAdjustments = pythagoreanNoteCents.map(
    (cents, i) => cents - i * 100
  );

  // --- Just Intonation (5-Limit, C-Major context) Calculations ---
  // WARNING: JI is highly context-dependent. These values represent ONE common set of 12 notes
  // derived from C major ratios (1/1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8) plus common additions.
  const justNoteCents: number[] = [
    ratioToCents(1 / 1), // C: 0
    ratioToCents(25 / 16), // C#: ~70.67 (Major Third above A) - *Example derivation*
    ratioToCents(9 / 8), // D: ~203.91
    ratioToCents(6 / 5), // Eb: ~315.64 (Minor Third above C)
    ratioToCents(5 / 4), // E: ~386.31
    ratioToCents(4 / 3), // F: ~498.04
    ratioToCents(45 / 32), // F#: ~590.22 (Major Third above D) - *Example derivation*
    ratioToCents(3 / 2), // G: ~701.96
    ratioToCents(8 / 5), // Ab: ~813.69 (Minor Sixth above C)
    ratioToCents(5 / 3), // A: ~884.36
    ratioToCents(9 / 5), // Bb: ~1017.60 (Minor Seventh above C) - *Example derivation*
    ratioToCents(15 / 8), // B: ~1088.27
  ];
  // Calculate adjustments relative to 12-TET
  const justAdjustments = justNoteCents.map((cents, i) => cents - i * 100);

  // --- Return the TUNING_SYSTEMS object ---
  return {
    equalTemperament: {
      name: "12-tone Equal Temperament",
      description: "Standard tuning with 12 equal semitones per octave.",
      centsAdjustment: () => 0, // No adjustment relative to itself
    },
    pythagorean: {
      name: "Pythagorean Tuning",
      description:
        "Based on stacking pure perfect fifths (3/2 ratio). Cents adjustments calculated relative to 12-TET C=0.",
      centsAdjustment: (pitchClass: PitchClassIndex): number => {
        return pythagoreanAdjustments[pitchClass] ?? 0; // Return adjustment or 0 if index out of bounds
      },
    },
    justIntonation: {
      name: "Just Intonation (5-limit, C-Major context)",
      description:
        "Uses pure frequency ratios based on primes 2, 3, 5. Cents adjustments calculated relative to 12-TET C=0 using common C-Major derived ratios (WARNING: context-dependent).",
      centsAdjustment: (pitchClass: PitchClassIndex): number => {
        return justAdjustments[pitchClass] ?? 0; // Return adjustment or 0 if index out of bounds
      },
    },
    quarterTone: {
      name: "24-tone Equal Temperament",
      description: "Quarter-tone system with 24 equal divisions per octave.",
      // Base notes align with 12-TET; microtones are handled by modifier/cents properties.
      centsAdjustment: () => 0,
    },
    custom: {
      name: "Custom Tuning",
      description: "Placeholder for user-defined tuning systems.",
      // No default adjustment function provided
    },
  };
})(); // Immediately invoke the function to create and assign the object

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
