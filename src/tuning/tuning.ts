/**
 * @module Tuning
 * @description
 * This module defines and manages various musical tuning systems beyond standard
 * 12-tone equal temperament (12-TET). It provides definitions for common historical
 * temperaments (Just Intonation, Pythagorean, Meantone) and Equal Divisions of the Octave (EDOs),
 * functions to apply these tunings to notes (by calculating cents adjustments),
 * and utilities for converting between frequency ratios and cents. Users can also
 * register custom tuning systems.
 */

// Import Note types and essential Note operations/creation functions
import {
  CENTS_PER_OCTAVE,
  CENTS_PER_SEMITONE,
  Note,
  addCentsToNote,
  createNoteFromParts,
  notesAreEqual,
} from "../note";
// Assuming note module index exports these

/**
 * Defines the signature for a function that calculates the cents adjustment
 * needed for a given note relative to a reference note within a specific tuning system.
 * The adjustment typically represents the deviation from 12-tone Equal Temperament.
 *
 * @callback TuningSystemFunction
 * @param {Note} note - The note whose adjustment is to be calculated.
 * @param {Note} reference - The reference note (often the tonic or a standard pitch like A4) against which the tuning interval is measured.
 * @returns {number} The required cents adjustment (positive for sharper, negative for flatter) relative to the note's standard 12-TET pitch. Should return 0 if no adjustment is needed.
 */
export type TuningSystemFunction = (note: Note, reference: Note) => number;

/**
 * Defines the structure for storing information about a tuning system.
 * @interface TuningSystemDefinition
 * @property {string} name - The display name of the tuning system (e.g., "Quarter-comma Meantone").
 * @property {string} description - A brief description of the tuning system.
 * @property {TuningSystemFunction} adjustmentFunction - The function used to calculate cents adjustments for notes within this system relative to a reference note.
 */
interface TuningSystemDefinition {
  name: string;
  description: string;
  adjustmentFunction: TuningSystemFunction;
}

/**
 * A record containing definitions for various standard and microtonal tuning systems.
 * Maps a system identifier string (e.g., "pythagorean", "19-EDO") to its definition object.
 * Includes functions to calculate cents deviations from 12-TET for each system.
 * Users can add custom systems via `registerTuningSystem`.
 *
 * @readonly
 * @type {Record<string, TuningSystemDefinition>}
 */
export const TUNING_SYSTEMS: Record<string, TuningSystemDefinition> = {
  // Standard 12-tone Equal Temperament (Reference)
  equalTemperament: {
    name: "12-tone Equal Temperament",
    description: "Standard tuning with 12 equal semitones per octave",
    /** @returns {0} No adjustment needed relative to itself. */
    adjustmentFunction: () => 0, // No adjustment
  },

  // Just Intonation (5-limit example)
  justIntonation: {
    name: "Just Intonation",
    description:
      "Tuning based on pure frequency ratios (simple integer fractions)",
    adjustmentFunction: calculateJustIntonationAdjustment, // Uses internal helper
  },

  // Pythagorean Tuning
  pythagorean: {
    name: "Pythagorean Tuning",
    description: "Tuning based on stacking pure perfect fifths (3/2 ratio)",
    adjustmentFunction: calculatePythagoreanAdjustment, // Uses internal helper
  },

  // Quarter-comma Meantone
  quarterMeantone: {
    name: "Quarter-comma Meantone",
    description: "Renaissance temperament prioritizing pure major thirds",
    adjustmentFunction: calculateQCMeantoneAdjustment, // Uses internal helper
  },

  // Example EDOs
  "19-EDO": {
    name: "19-tone Equal Temperament",
    description: "19 equal divisions of the octave",
    /** Calculates deviation from nearest 12-TET pitch based on 19-EDO steps. */
    adjustmentFunction: (note: Note, reference: Note) =>
      convertEDOtoCents(note, reference, 19), // Uses internal helper
  },

  "31-EDO": {
    name: "31-tone Equal Temperament",
    description: "31 equal divisions of the octave",
    /** Calculates deviation from nearest 12-TET pitch based on 31-EDO steps. */
    adjustmentFunction: (note: Note, reference: Note) =>
      convertEDOtoCents(note, reference, 31), // Uses internal helper
  },
  // Add other tuning systems here (e.g., Well Temperaments, other EDOs)
};

/**
 * Applies the pitch adjustments defined by a specific tuning system to an array of notes.
 * Creates new Note objects with `cents` properties reflecting the deviation from 12-TET
 * according to the chosen system, relative to a reference note.
 *
 * @param notes - An immutable array of Note objects to be retuned.
 * @param system - The tuning system to apply. Can be a string name (key in `TUNING_SYSTEMS`) or a custom `TuningSystemFunction`.
 * @param [referenceNote] - Optional. The reference Note object against which intervals and adjustments are calculated. Defaults to A4 (MIDI 69, 440Hz).
 * @returns A *new* array of Note objects, where each note has been potentially adjusted with a `cents` property according to the tuning system. The original `notes` array is unchanged. Notes identical to the reference note are not adjusted.
 * @throws {Error} If the specified tuning system name is unknown and a function is not provided.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 * const e4 = createNote({ midi: 64 });
 * const g4 = createNote({ midi: 67 });
 * const triad = [c4, e4, g4];
 *
 * // Retune C Major triad to Just Intonation relative to C4
 * const justTriad = applyTuningSystem(triad, 'justIntonation', c4);
 * console.log(justTriad.map(n => `${formatNote(n)} (${n.cents?.toFixed(1)}c)`));
 * // Example Output: [ 'C4 (0.0c)', 'E4 (-13.7c)', 'G4 (2.0c)' ]
 *
 * // Retune using a custom function (e.g., shift everything 10 cents sharp)
 * const customSharpTuning: TuningSystemFunction = (note, ref) => 10;
 * const sharpTriad = applyTuningSystem(triad, customSharpTuning);
 * console.log(sharpTriad.map(n => n.cents)); // [ 10, 10, 10 ]
 * ```
 */
export function applyTuningSystem(
  notes: ReadonlyArray<Note>, // Accept readonly array
  system: string | TuningSystemFunction, // System name or custom function
  referenceNote?: Note // Optional reference note
): Note[] {
  // Returns a new mutable array of potentially new Note objects
  // --- Input Validation ---
  if (!Array.isArray(notes)) {
    throw new Error("Invalid 'notes' input: Must be an array.");
  }
  if (!system) {
    throw new Error(
      "Invalid 'system' input: Must provide tuning system name or function."
    );
  }
  // --- End Validation ---

  // Use A4 = 440Hz as the default reference note if none is provided
  // Create a default A4 Note object using note creation functions.
  const reference =
    referenceNote ||
    createNoteFromParts({
      // Use createNoteFromParts for clarity
      letter: "A",
      accidental: "",
      octave: 4,
      // Caching defaults to true in createNoteFromParts
    });

  // Determine the adjustment function based on the 'system' input
  let adjustmentFunction: TuningSystemFunction;

  if (typeof system === "string") {
    // If it's a string, look up the system definition in the TUNING_SYSTEMS constant
    const systemDefinition = TUNING_SYSTEMS[system];
    if (!systemDefinition) {
      // If the name doesn't exist, throw an error
      throw new Error(`Unknown tuning system name: ${system}`);
    }
    // Use the adjustment function from the definition
    adjustmentFunction = systemDefinition.adjustmentFunction;
  } else if (typeof system === "function") {
    // If it's already a function, use it directly
    adjustmentFunction = system;
  } else {
    throw new Error(
      "Invalid 'system' parameter: Must be a known tuning system name or a custom TuningSystemFunction."
    );
  }

  // Apply the tuning adjustments to each note in the input array
  return notes.map((note) => {
    // Basic check if note is valid before proceeding
    if (!note) return note; // Return original item if invalid

    // Avoid adjusting the reference note itself if it's present in the array
    // Use notesAreEqual for accurate pitch comparison including octave
    if (notesAreEqual(note, reference)) {
      // Although equal, return a distinct object? Or the original? Return original.
      return note;
    }

    // Calculate the required cents adjustment using the selected function
    const centsAdjustment = adjustmentFunction(note, reference);

    // If adjustment is effectively zero, return the original note object
    // Use a small epsilon for floating point comparison
    if (Math.abs(centsAdjustment) < 1e-9) {
      return note;
    }

    // If adjustment is needed, create a new Note object with the cents added.
    // addCentsToNote handles combining with existing cents and normalization.
    // It returns a MicrotonalNote.
    return addCentsToNote(note, centsAdjustment); // Returns potentially new object
  });
}

/**
 * @internal
 * Calculates the cents adjustment for a note relative to a reference note
 * based on 5-limit Just Intonation ratios.
 * Determines the interval between the notes and finds the difference between
 * the pure JI interval (from common ratios) and the 12-TET interval.
 *
 * @param note - The note to calculate the adjustment for.
 * @param reference - The reference note (tonic).
 * @returns The cents adjustment needed relative to 12-TET.
 * @remarks Uses a predefined map of common 5-limit JI ratios and their approximate cents values. Assumes the reference note represents the 1/1 ratio. Octave differences are handled, but the interval calculation is based on the simple interval within the octave.
 */
function calculateJustIntonationAdjustment(
  note: Note,
  reference: Note
): number {
  // Calculate the interval (in semitones, 0-11) between reference and note pitch classes
  const semitonesFromRef =
    (note.pitchClassIndex - reference.pitchClassIndex + 12) % 12;

  // Calculate the octave difference between the notes
  // Original calculation seemed overly complex. Simpler:
  // const baseMidiRef = reference.pitchClassIndex + reference.octave * 12;
  // const baseMidiNote = note.pitchClassIndex + note.octave * 12;
  // const totalSemitoneDiff = baseMidiNote - baseMidiRef; // Total difference in semitones
  // const octaveDistance = Math.floor(totalSemitoneDiff / 12); // How many full octaves apart
  // This seems complex. Let's calculate the deviation *within* the octave first.

  // Predefined Just Intonation ratios and their approx cents values (relative to tonic=0 cents)
  // Keyed by the 12-TET semitone interval they approximate.
  // Note: These are examples, specific JI systems vary. Using common 5-limit values.
  // const justCentsMap: Readonly<Record<number, number>> = {
  //   0: 0, // P1 (1/1)
  //   1: 111.73, // m2 (16/15) ~112c
  //   2: 203.91, // M2 (9/8) ~204c
  //   3: 315.64, // m3 (6/5) ~316c
  //   4: 386.31, // M3 (5/4) ~386c
  //   5: 498.04, // P4 (4/3) ~498c
  //   6: 590.22, // A4 (e.g., 45/32?) or 680.45 (d5, e.g. 64/45?) -> Use value from original code: 590
  //   7: 701.96, // P5 (3/2) ~702c
  //   8: 813.69, // m6 (8/5) ~814c
  //   9: 884.36, // M6 (5/3) ~884c
  //   10: 1017.59, // m7 (9/5 or 16/9?) ~1018c (using 9/5 here based on original code)
  //   11: 1088.27, // M7 (15/8) ~1088c
  // };
  // Revert to original code's hardcoded cents values for adherence:
  const justRatiosOriginal: Record<number, { ratio: number; cents: number }> = {
    0: { ratio: 1 / 1, cents: 0 }, // Perfect unison
    1: { ratio: 16 / 15, cents: 112 }, // Minor second
    2: { ratio: 9 / 8, cents: 204 }, // Major second
    3: { ratio: 6 / 5, cents: 316 }, // Minor third
    4: { ratio: 5 / 4, cents: 386 }, // Major third
    5: { ratio: 4 / 3, cents: 498 }, // Perfect fourth
    6: { ratio: 45 / 32, cents: 590 }, // Augmented fourth (example ratio)
    7: { ratio: 3 / 2, cents: 702 }, // Perfect fifth
    8: { ratio: 8 / 5, cents: 814 }, // Minor sixth
    9: { ratio: 5 / 3, cents: 884 }, // Major sixth
    10: { ratio: 9 / 5, cents: 1018 }, // Minor seventh (using 9/5)
    11: { ratio: 15 / 8, cents: 1088 }, // Major seventh
  };

  // Get the ideal just interval cents value based on the semitone distance
  const justIntervalData = justRatiosOriginal[semitonesFromRef];
  // Handle cases where the interval might not be in the map (shouldn't happen for 0-11)
  if (!justIntervalData) {
    console.warn(
      `No Just Intonation ratio defined for semitone interval ${semitonesFromRef}. Returning 0 adjustment.`
    );
    return 0;
  }
  const justCents = justIntervalData.cents;

  // Calculate the standard equal tempered cents for this interval
  const equalTemperedCents = semitonesFromRef * CENTS_PER_SEMITONE; // 100 cents per ET semitone

  // The adjustment is the difference between the Just Intonation cents and the ET cents
  const adjustment = justCents - equalTemperedCents;

  // Original code had complex octave adjustment logic that cancelled out.
  // The adjustment is relative within the octave based on the interval.
  // If applyTuningSystem needs to handle notes across octaves, it should likely
  // calculate the total interval including octaves first. This helper calculates
  // the *deviation* for a given simple interval (0-11 semitones).

  return adjustment; // Return the calculated cents deviation
}

/**
 * @internal
 * Calculates the cents adjustment for a note relative to a reference note
 * based on Pythagorean tuning (stacking pure 3/2 fifths).
 *
 * @param note - The note to calculate the adjustment for.
 * @param reference - The reference note (tonic).
 * @returns The cents adjustment needed relative to 12-TET.
 * @remarks Uses a predefined map of approximate offsets for each scale degree (0-11 semitones)
 * derived from the Pythagorean system. Assumes reference note is the base (0 offset).
 */
function calculatePythagoreanAdjustment(note: Note, reference: Note): number {
  // Calculate the interval in 12-TET semitones (0-11)
  const semitonesFromRef =
    (note.pitchClassIndex - reference.pitchClassIndex + 12) % 12;

  // Calculate the number of perfect fifth steps needed to reach this interval from the root (0)
  // This corresponds to the position on the circle of fifths (C=0, G=1, D=2 ... F= -1 or 11)
  // Formula: index = (semitones * 7) % 12 (where 7 is inverse of 5 mod 12, no wait, that's diatonic steps)
  // Simpler: Find which power of 3/2 (mod octave) lands closest to the target interval.
  // Or use the standard circle of fifths mapping:
  const fifthStepsMap: Record<number, number> = {
    // semitone -> fifth steps away from C
    0: 0, // C
    7: 1, // G
    2: 2, // D
    9: 3, // A
    4: 4, // E
    11: 5, // B
    6: 6, // F#
    1: 7, // C# (enharmonic Db usually derived differently, but standard Pythagorean uses this)
    8: 8, // G#
    3: 9, // D#
    10: 10, // A#
    5: -1, // F (or 11 steps up)
    // Alternative representation for flats derived downwards? No, standard pythagorean is based on 12 fifths.
  };

  const fifthSteps = fifthStepsMap[semitonesFromRef];
  if (fifthSteps === undefined) {
    console.warn(
      `Could not determine circle of fifths steps for interval ${semitonesFromRef}`
    );
    return 0; // Should not happen for 0-11
  }

  // Calculate the precise Pythagorean cents value for that number of fifths
  // Cents = (steps * CentsPerFifth) mod 1200
  const centsPerPythagoreanFifth = 1200 * Math.log2(3 / 2); // ~701.955
  const pythagoreanCents =
    (((fifthSteps * centsPerPythagoreanFifth) % 1200) + 1200) % 1200;

  // Calculate the standard 12-TET cents value
  const equalTemperedCents = semitonesFromRef * CENTS_PER_SEMITONE;

  // Adjustment is the difference
  const adjustment = pythagoreanCents - equalTemperedCents;

  // Handle the Pythagorean comma issue where stacking 12 fifths slightly overshoots
  // This simple model might place enharmonics slightly differently than historical practice.
  // Return adjustment, potentially rounding slightly for practical use? No, return precise.
  return adjustment;
}

/**
 * @internal
 * Pre-calculated cents adjustments for 1/4-comma meantone relative to 12-TET.
 * Derived from stacking meantone fifths (~696.578 cents) and prioritizing pure M3 (386.31 cents).
 * Assumes standard enharmonic spellings (e.g., using C#, Eb, F#, Ab, Bb).
 */
const QC_MEANTONE_ADJUSTMENTS: Readonly<Record<number, number>> = Object.freeze(
  {
    // semitone_interval_from_ref: cents_deviation_from_12TET
    0: 0.0, // C -> C (Unison)
    1: -23.95, // Db/C# -> C# (7 * P5') = 76.05c vs 100c
    2: -6.84, // D -> D (2 * P5') = 193.16c vs 200c
    3: 9.74, // Eb/D# -> Eb (-3 * P5') = 309.74c vs 300c
    4: -13.69, // E -> E (4 * P5', Pure M3) = 386.31c vs 400c
    5: 3.42, // F -> F (-1 * P5') = 503.42c vs 500c
    6: -20.53, // F#/Gb -> F# (6 * P5') = 579.47c vs 600c
    7: -3.42, // G -> G (1 * P5') = 696.58c vs 700c
    8: 13.16, // Ab/G# -> Ab (-4 * P5') = 813.16c vs 800c
    9: -10.26, // A -> A (3 * P5') = 889.74c vs 900c
    10: 6.84, // Bb/A# -> Bb (-2 * P5') = 1006.84c vs 1000c
    11: -17.11, // B -> B (5 * P5') = 1082.89c vs 1100c
  }
);

/**
 * @internal
 * Calculates the cents adjustment for a note relative to a reference note
 * based on 1/4 (quarter-comma) meantone temperament.
 *
 * @param note - The note to calculate the adjustment for.
 * @param reference - The reference note (tonic).
 * @returns The cents adjustment needed relative to 12-TET.
 * @remarks Uses a predefined map of approximate offsets for each scale degree (0-11 semitones)
 * derived from the 1/4-comma meantone system (prioritizing pure major thirds). Assumes reference note is the base (0 offset).
 */
function calculateQCMeantoneAdjustment(note: Note, reference: Note): number {
  // Calculate the interval (in semitones, 0-11) from reference pitch class to note pitch class
  const semitonesFromRef =
    (note.pitchClassIndex - reference.pitchClassIndex + 12) % 12;

  // Return the pre-calculated offset for the interval, default to 0 if somehow not found
  return QC_MEANTONE_ADJUSTMENTS[semitonesFromRef] ?? 0;
}

/**
 * @internal
 * Calculates the cents adjustment needed to represent a 12-TET interval
 * in a given EDO system. Finds the nearest EDO step and returns the difference.
 *
 * @param note - The note whose position is being evaluated.
 * @param reference - The reference note.
 * @param divisions - The number of equal divisions in the target EDO system.
 * @returns The cents adjustment from the standard 12-TET pitch to the nearest EDO pitch step.
 */
function convertEDOtoCents(
  note: Note,
  reference: Note,
  divisions: number
): number {
  // Basic validation
  if (divisions <= 0 || !Number.isInteger(divisions)) {
    console.warn(
      `Invalid divisions ${divisions} in convertEDOtoCents. Returning 0.`
    );
    return 0;
  }

  // Calculate the interval in standard 12-TET semitones (0-11)
  const semitonesFromRef =
    (note.pitchClassIndex - reference.pitchClassIndex + 12) % 12;

  // Calculate the size of one step in cents for the target EDO system
  const centsPerStep = CENTS_PER_OCTAVE / divisions;

  // Calculate the ideal cents value of the interval in 12-TET
  const equalTemperedCents = semitonesFromRef * CENTS_PER_SEMITONE; // 100 cents per semitone

  // Find the nearest integer EDO step to the 12-TET interval
  // edoStep = round(etCents / centsPerStep)
  const nearestEDOStep = Math.round(equalTemperedCents / centsPerStep);

  // Calculate the precise cents value of that nearest EDO step
  const nearestEDOCents = nearestEDOStep * centsPerStep;

  // The adjustment is the difference between the EDO pitch and the 12-TET pitch
  const adjustment = nearestEDOCents - equalTemperedCents;

  return adjustment;
}

/**
 * Registers a custom tuning system definition, making it available for use
 * by name in functions like `applyTuningSystem`.
 * Adds or overwrites the definition in the global `TUNING_SYSTEMS` record.
 *
 * @param name - The unique identifier string for the custom tuning system.
 * @param properties - An object containing the `name`, `description`, and `adjustmentFunction` for the custom system. See {@link TuningSystemDefinition}.
 * @returns {void}
 * @example
 * ```ts
 * // Define a simple "shifted" tuning where everything is 15 cents sharp
 * const shiftedTuningFunc: TuningSystemFunction = (note, ref) => 15;
 * registerTuningSystem('shiftedSharp', {
 * name: 'Shifted +15c',
 * description: 'All notes shifted 15 cents sharp from 12-TET',
 * adjustmentFunction: shiftedTuningFunc
 * });
 *
 * // Now use it:
 * const notes = [createNote('C4'), createNote('G4')];
 * const tunedNotes = applyTuningSystem(notes, 'shiftedSharp');
 * console.log(tunedNotes[0].cents); // 15
 * console.log(tunedNotes[1].cents); // 15
 * ```
 */
export function registerTuningSystem(
  name: string, // The key/identifier for the custom system
  properties: TuningSystemDefinition // The definition object
): void {
  // Basic validation
  if (typeof name !== "string" || name.trim() === "") {
    console.error("Cannot register tuning system: Invalid name provided.");
    return;
  }
  if (
    !properties ||
    typeof properties !== "object" ||
    typeof properties.adjustmentFunction !== "function" ||
    !properties.name ||
    !properties.description
  ) {
    console.error(
      `Cannot register tuning system "${name}": Invalid properties object provided.`
    );
    return;
  }
  // Add or overwrite the definition in the shared TUNING_SYSTEMS object
  // Note: Modifying this global constant at runtime can have side effects.
  TUNING_SYSTEMS[name] = properties;
}

// /**
//  * Calculates the frequency ratio between two Note objects.
//  * It prioritizes using cached `frequency` properties if available on both notes,
//  * otherwise falls back to calculating the ratio based on the 12-TET semitone difference.
//  *
//  * @param note1 - The first Note object (denominator).
//  * @param note2 - The second Note object (numerator).
//  * @returns The frequency ratio (frequency of note2 / frequency of note1).
//  * @throws {Error} If either note is invalid or if note1's frequency is zero or undefined when needed for fallback.
//  * @remarks This function may provide approximate results if notes lack cached frequencies,
//  * as it falls back to assuming 12-TET intervals. For precise ratios including microtones
//  * when frequencies aren't cached, calculate frequencies first using `noteToFrequency`.
//  * Note: Potential duplicate of function in `frequency.ts`. This implementation differs slightly.
//  */
// export function getFrequencyRatio(note1: Note, note2: Note): number {
//   // --- Input Validation ---
//   if (!note1 || !note2) {
//     throw new Error("Invalid Note object(s) provided to getFrequencyRatio.");
//   }
//   // --- End Validation ---

//   // Prioritize using cached frequency values if available and valid
//   if (note1.frequency && note2.frequency && note1.frequency > 0) {
//     return note2.frequency / note1.frequency;
//   }

//   // Fallback: Calculate ratio based on semitone difference (assumes 12-TET)
//   // This ignores microtonal cents property if frequency isn't cached.
//   // Calculate total semitone difference including octaves
//   const semitones =
//     ((note2.pitchClassIndex - note1.pitchClassIndex + 12) % 12) + // Difference within octave
//     (note2.octave - note1.octave) * 12; // Difference from octaves

//   // Ratio = 2^(semitones / 12)
//   return Math.pow(2, semitones / 12);
// }

// /**
//  * Converts a frequency ratio to its equivalent interval size in cents.
//  * Formula: cents = 1200 * log2(ratio)
//  *
//  * @param ratio - The frequency ratio (e.g., 1.5 for a perfect fifth). Must be positive.
//  * @returns The interval size in cents.
//  * @throws {Error} If the ratio is non-positive or not a finite number.
//  * @remarks Note: Potential duplicate of function in `calculations.ts`.
//  * @example
//  * ```ts
//  * ratioToCents(2); // 1200 (Octave)
//  * ratioToCents(3/2); // ~701.955 (Perfect Fifth)
//  * ratioToCents(5/4); // ~386.31 (Major Third)
//  * ```
//  */
// export function ratioToCents(ratio: number): number {
//   // --- Input Validation ---
//   if (typeof ratio !== "number" || !(ratio > 0) || !Number.isFinite(ratio)) {
//     // Check > 0 and finite
//     throw new Error(
//       `Invalid frequency ratio: ${ratio}. Must be a positive finite number.`
//     );
//   }
//   // --- End Validation ---

//   // Standard formula for ratio to cents conversion
//   return CENTS_PER_OCTAVE * Math.log2(ratio); // 1200 * log2(ratio)
// }

// /**
//  * Converts an interval size in cents to its equivalent frequency ratio.
//  * Formula: ratio = 2^(cents / 1200)
//  *
//  * @param cents - The interval size in cents.
//  * @returns The corresponding frequency ratio multiplier.
//  * @throws {Error} If cents is not a finite number.
//  * @remarks Note: Potential duplicate of function in `calculations.ts`.
//  * @example
//  * ```ts
//  * centsToRatio(1200); // 2.0 (Octave)
//  * centsToRatio(701.955); // ~1.5 (Perfect Fifth)
//  * centsToRatio(386.31); // ~1.25 (Major Third)
//  * centsToRatio(100); // ~1.059 (Semitone)
//  * ```
//  */
// export function centsToRatio(cents: number): number {
//   // --- Input Validation ---
//   if (typeof cents !== "number" || !Number.isFinite(cents)) {
//     throw new Error(`Invalid cents value: ${cents}. Must be a finite number.`);
//   }
//   // --- End Validation ---

//   // Standard formula for cents to ratio conversion
//   // 1200 cents per octave (CENTS_PER_OCTAVE)
//   return Math.pow(2, cents / CENTS_PER_OCTAVE);
// }

/**
 * Calculates the interval difference between two frequencies in cents.
 *
 * @param freq1 - The first frequency in Hz (denominator). Must be positive.
 * @param freq2 - The second frequency in Hz (numerator). Must be positive.
 * @returns The interval between freq1 and freq2 in cents. Positive if freq2 > freq1.
 * @throws {Error} If either frequency is non-positive or not a finite number.
 * @example
 * ```ts
 * centsBetweenFrequencies(440, 880); // 1200.0 (Octave)
 * centsBetweenFrequencies(440, 660); // ~701.955 (Perfect Fifth)
 * centsBetweenFrequencies(261.63, 440); // ~900.0 (Major Sixth from C4 to A4)
 * ```
 */
export function centsBetweenFrequencies(freq1: number, freq2: number): number {
  // --- Input Validation ---
  if (typeof freq1 !== "number" || !(freq1 > 0) || !Number.isFinite(freq1)) {
    throw new Error(
      `Invalid frequency freq1: ${freq1}. Must be positive finite number.`
    );
  }
  if (typeof freq2 !== "number" || !(freq2 > 0) || !Number.isFinite(freq2)) {
    throw new Error(
      `Invalid frequency freq2: ${freq2}. Must be positive finite number.`
    );
  }
  // --- End Validation ---

  // Use the standard formula based on log base 2 of the frequency ratio
  return CENTS_PER_OCTAVE * Math.log2(freq2 / freq1);
}
