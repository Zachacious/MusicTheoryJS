/**
 * @module Note/Frequency
 * @description
 * This module focuses specifically on the conversion between Note objects and their corresponding
 * frequencies in Hertz (Hz). It provides functions to calculate frequency from a note (including
 * microtonal adjustments), determine the nearest note for a given frequency, retune notes based
 * on a different A4 reference, and calculate frequency ratios.
 *
 * This separation can help manage dependencies within the Note module structure.
 * Assumes standard A4=440Hz tuning unless otherwise specified (e.g., in `retune`).
 */

import {
  A4_FREQUENCY,
  A4_MIDI,
  CENTS_PER_OCTAVE,
  SEMITONES_PER_OCTAVE,
} from "./constants";
import { EnharmonicPreference, Note } from "./types";
// Import necessary calculation functions - note potential dependencies
import { calculateCentsDeviation, noteToMidi } from "./calculations";

// Import necessary creation functions
import { createNoteFromFrequency } from "./creation";

/**
 * Calculates the frequency in Hertz (Hz) for a given Note object.
 * Uses A4_FREQUENCY (typically 440Hz) as the standard tuning reference.
 * Accounts for microtonal deviations specified by the `note.cents` property.
 * Uses cached value if available on the Note object.
 *
 * @param note - The Note object for which to calculate the frequency.
 * @returns The calculated frequency in Hz.
 * @throws {Error} If the input note is invalid.
 * @remarks This implementation calculates the base 12-TET frequency from the note's
 * integer MIDI value and then applies a frequency multiplier based on the `note.cents`
 * property, if present. For more complex tuning systems or modifier-based calculations,
 * ensure the Note object is created appropriately or use calculation functions that
 * incorporate those details if needed elsewhere.
 * @example
 * ```ts
 * const a4 = createNote({ midi: 69 });
 * const freqA4 = noteToFrequency(a4); // 440
 *
 * const c4 = createNote({ midi: 60 });
 * const freqC4 = noteToFrequency(c4); // ~261.63
 *
 * const c4plus20 = createNote({ midi: 60, cents: 20 });
 * const freqC4plus20 = noteToFrequency(c4plus20); // ~264.66 (20 cents sharp)
 * ```
 */
export function noteToFrequency(note: Note): number {
  if (!note) {
    throw new Error("Invalid note provided to noteToFrequency.");
  }
  // Return cached value if available (assuming Note object might have it)
  // Note: This caching depends on the creation functions populating it.
  if (note.frequency !== undefined) {
    return note.frequency;
  }

  // Get the base integer MIDI note (ignores cents for this step)
  const midi = noteToMidi(note);

  // Calculate the number of semitones away from the reference A4
  const halfStepsFromA4 = midi - A4_MIDI;

  // Calculate base equal temperament frequency relative to A4_FREQUENCY
  let frequency =
    A4_FREQUENCY * Math.pow(2, halfStepsFromA4 / SEMITONES_PER_OCTAVE);

  // Apply cents deviation, if present on the note object, as a frequency ratio
  if (note.cents !== undefined && note.cents !== 0) {
    // Ratio = 2^(cents / 1200)
    const centsRatio = Math.pow(2, note.cents / CENTS_PER_OCTAVE);
    frequency *= centsRatio;
  }
  // Note: This version doesn't explicitly re-apply microtonalModifier or tuningSystem here.
  // It relies on `note.cents` accurately representing the total deviation for microtonal notes.

  return frequency;
}

/**
 * Converts a frequency in Hertz (Hz) to the nearest Note object in the
 * standard 12-tone equal temperament system.
 * Calculates the cents deviation from the determined note's exact pitch.
 *
 * @param frequency - The frequency value in Hz. Must be positive.
 * @param [options] - Optional parameters.
 * @param [options.prefer='sharp'] - Preferred spelling ('sharp' or 'flat') for enharmonically ambiguous notes.
 * @param [options.includeCachedValues=true] - If true, includes calculated `midi`, `notation`, `frequency`, and `cents` properties on the returned object.
 * @returns A Note object representing the nearest 12-TET pitch, potentially including a `cents` property indicating the deviation.
 * @throws {Error} If the frequency is non-positive or results in an out-of-range MIDI value.
 * @see {@link createNoteFromFrequency} which is used internally.
 * @example
 * ```ts
 * const noteA4 = frequencyToNote(440); // Creates A4, cents ≈ 0
 * console.log(formatNote(noteA4), noteA4.cents); // "A4", 0 (approx)
 *
 * const noteA4Sharpish = frequencyToNote(442); // Creates A4, cents ≈ +7.8
 * console.log(formatNote(noteA4Sharpish), noteA4Sharpish.cents?.toFixed(1)); // "A4", "7.8"
 *
 * const noteDb4 = frequencyToNote(270, { prefer: 'flat' }); // Creates Db4, cents ≈ -38.9
 * console.log(formatNote(noteDb4), noteDb4.cents?.toFixed(1)); // "Db4", "-38.9"
 * ```
 */
export function frequencyToNote(
  frequency: number,
  options?: {
    prefer?: EnharmonicPreference;
    includeCachedValues?: boolean;
  }
): Note {
  const prefer = options?.prefer ?? "sharp";
  // Default to true unless explicitly false
  const includeCachedValues = options?.includeCachedValues !== false;

  // --- Input Validation ---
  if (typeof frequency !== "number" || frequency <= 0) {
    throw new Error(
      `Invalid frequency: ${frequency}. Must be a positive number.`
    );
  }
  // --- End Validation ---

  // Calculate the precise cents deviation from the *nearest* 12-TET pitch
  // calculateCentsDeviation handles the logic of finding the nearest midi and the difference
  const centsDeviation = calculateCentsDeviation(frequency);

  // Delegate the actual note creation to createNoteFromFrequency,
  // providing the calculated cents. This ensures consistency.
  // createNoteFromFrequency handles finding the nearest MIDI and creating the Note object.
  return createNoteFromFrequency({
    frequency, // Pass original frequency for potential caching/reference
    prefer,
    includeCachedValues,
    cents: centsDeviation, // Provide the calculated deviation
  });
}

/**
 * Creates a new Note object representing the same relative pitch as the input note,
 * but adjusted for a different tuning standard (i.e., a different frequency for A4).
 *
 * @param note - The original Note object.
 * @param [newA4Frequency=A4_FREQUENCY] - The new reference frequency for A4 (e.g., 432 Hz). Defaults to the standard 440 Hz.
 * @param [options] - Optional parameters for the new note creation.
 * @param [options.prefer='sharp'] - Preferred spelling for the resulting note.
 * @param [options.includeCachedValues=true] - Whether to include cached values on the returned note.
 * @returns A new Note object with its frequency adjusted for the new tuning standard.
 * @throws {Error} If the input note is invalid or the new A4 frequency is non-positive.
 * @example
 * ```ts
 * const c4_standard = createNote({ midi: 60 }); // C4 in A4=440Hz tuning
 * const c4_tunedDown = retune(c4_standard, 432); // C4 in A4=432Hz tuning
 *
 * console.log(noteToFrequency(c4_standard)); // ~261.63 Hz
 * console.log(noteToFrequency(c4_tunedDown)); // ~256.87 Hz (Lower frequency)
 * ```
 */
export function retune(
  note: Note,
  newA4Frequency: number = A4_FREQUENCY,
  options?: {
    prefer?: EnharmonicPreference;
    includeCachedValues?: boolean;
  }
): Note {
  if (!note) {
    throw new Error("Invalid note provided for retuning.");
  }
  if (typeof newA4Frequency !== "number" || newA4Frequency <= 0) {
    throw new Error(
      `Invalid new A4 frequency: ${newA4Frequency}. Must be positive.`
    );
  }

  const prefer = options?.prefer ?? "sharp";
  const includeCachedValues = options?.includeCachedValues !== false;

  // Get the note's original frequency based on the *standard* A4=440 tuning.
  // We use the function from this module for consistency.
  const originalStandardFreq = noteToFrequency(note);

  // If the new reference is the same as the standard, no change needed, but
  // we still create a new object potentially with different options (prefer/cache).
  // Let createNoteFromFrequency handle this.

  // Calculate the ratio between the new reference A4 and the standard A4
  const referenceRatio = newA4Frequency / A4_FREQUENCY;

  // Apply this ratio to the note's frequency (as calculated in standard tuning)
  // This finds the equivalent frequency in the new tuning system.
  const newFrequency = originalStandardFreq * referenceRatio;

  // Create a new note object based on this adjusted frequency.
  // createNoteFromFrequency will determine the nearest note/cents in the new context.
  // We pass the original note's cents/modifier info if present, as retuning
  // primarily affects the base frequency, not necessarily the microtonal offset *relative*
  // to its base 12-TET note within the *new* system.
  return createNoteFromFrequency({
    frequency: newFrequency,
    prefer,
    includeCachedValues,
    // Pass original microtonal info - createNoteFromFrequency will calculate new cents deviation
    cents: note.cents,
    microtonalModifier: note.microtonalModifier,
    tuningSystem: (note as any).tuningSystem, // Pass tuning system if present
  });
}

/**
 * Calculates the frequency ratio between two Note objects.
 *
 * @param note1 - The first Note (denominator in the ratio).
 * @param note2 - The second Note (numerator in the ratio).
 * @returns The frequency ratio (note2 frequency / note1 frequency).
 * @throws {Error} If either input note is invalid.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 * const g4 = createNote({ midi: 67 }); // Perfect Fifth = 7 semitones
 * const ratio = getFrequencyRatio(c4, g4); // Approx 1.498 (close to 3/2)
 *
 * const c4_just = createNoteByRatio(c4, 1/1); // Assume base C4 is 1/1
 * const g4_just = createNoteByRatio(c4, 3/2);
 * const justRatio = getFrequencyRatio(c4_just, g4_just); // Should be exactly 1.5
 * ```
 */
export function getFrequencyRatio(note1: Note, note2: Note): number {
  if (!note1 || !note2) {
    throw new Error("Invalid note(s) provided to getFrequencyRatio.");
  }

  // Calculate the frequency for each note using the standard method from this module
  const freq1 = noteToFrequency(note1);
  const freq2 = noteToFrequency(note2);

  if (freq1 === 0) {
    throw new Error("Cannot calculate ratio: frequency of note1 is zero.");
  }

  // Return the ratio
  return freq2 / freq1;
}

/**
 * Creates a new Note that is related to a reference Note by a specific frequency ratio.
 * This version calculates the target frequency and uses `createNoteFromFrequency`.
 * Useful for generating notes in Just Intonation or other ratio-based systems directly
 * from frequency calculations.
 *
 * @param referenceNote - The Note object to use as the starting point (e.g., the tonic or 1/1).
 * @param ratio - The frequency ratio to apply (e.g., 3/2 for a Perfect Fifth). Must be positive.
 * @param [options] - Optional parameters for the new note creation.
 * @param [options.prefer='sharp'] - Preferred enharmonic spelling for the resulting note.
 * @returns A new Note object representing the calculated pitch.
 * @throws {Error} If the reference note is invalid or the ratio is non-positive.
 * @see {@link Note/Creation.createNoteByRatio} for an alternative implementation using cents transposition.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 *
 * // Create a Just Perfect Fifth (3/2 ratio) above C4
 * const g4_just = createNoteByRatio(c4, 3/2);
 * // -> G4 with cents slightly sharper than equal temperament (~ +1.96 cents)
 *
 * // Create a Just Major Third (5/4 ratio) above C4
 * const e4_just = createNoteByRatio(c4, 5/4);
 * // -> E4 with cents slightly flatter than equal temperament (~ -13.69 cents)
 * ```
 */
export function createNoteByRatio(
  referenceNote: Note,
  ratio: number,
  options?: { prefer?: EnharmonicPreference }
): Note {
  if (!referenceNote) {
    throw new Error("Invalid reference note provided to createNoteByRatio.");
  }
  if (typeof ratio !== "number" || ratio <= 0) {
    throw new Error(`Invalid ratio: ${ratio}. Must be a positive number.`);
  }

  // Calculate the reference frequency using the standard function
  const refFreq = noteToFrequency(referenceNote);

  // Calculate the target frequency by applying the ratio
  const newFreq = refFreq * ratio;

  // Create the new note directly from the calculated target frequency
  // Pass along the preference option.
  return createNoteFromFrequency({
    frequency: newFreq,
    prefer: options?.prefer,
    // Let createNoteFromFrequency handle calculating cents and includeCachedValues defaults
  });
}
