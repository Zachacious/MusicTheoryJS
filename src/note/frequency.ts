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

import { A4_FREQUENCY, A4_MIDI, SEMITONES_PER_OCTAVE } from "./constants";
import { EnharmonicPreference, Note } from "./types";
// Import necessary calculation functions - note potential dependencies
import { calculateCentsDeviation, getMidiWithCents } from "./calculations";

// Import necessary creation functions
import { createNoteFromFrequency } from "./creation";

/**
 * Calculates the frequency in Hertz (Hz) for a given Note object.
 * Uses A4_FREQUENCY (typically 440Hz) as the standard tuning reference.
 * Accurately accounts for all microtonal deviations (cents, modifier, tuning system)
 * by using the note's precise fractional MIDI representation.
 * Uses cached value if available on the Note object.
 *
 * @param note - The Note object for which to calculate the frequency.
 * @returns The calculated frequency in Hz.
 * @throws {Error} If the input note is invalid.
 * @example
 * ```ts
 * const a4 = createNote({ midi: 69 }); // A4
 * const freqA4 = noteToFrequency(a4); // 440
 *
 * const c4 = createNote({ midi: 60 }); // C4
 * const freqC4 = noteToFrequency(c4); // ~261.63
 *
 * const c4plus20 = createNote({ midi: 60, cents: 20 }); // C4 + 20 cents
 * const freqC4plus20 = noteToFrequency(c4plus20); // ~264.66
 *
 * // Note created with modifier mapping to +50 cents
 * const dPlus4 = createNote({ letter: 'D', octave: 4, microtonalModifier: '+'});
 * const freqDPlus4 = noteToFrequency(dPlus4); // ~305.5 Hz (Freq for MIDI 62.5)
 * ```
 */
export function noteToFrequency(note: Note): number {
  if (!note) {
    throw new Error("Invalid note provided to noteToFrequency.");
  }
  // Return cached value if available
  if (note.frequency !== undefined) {
    return note.frequency;
  }

  // Get the precise fractional MIDI number, including all adjustments
  const midiWithCents = getMidiWithCents(note);

  // Calculate frequency using the standard formula relative to A4
  // f = A4_freq * 2^((midi_float - A4_midi) / 12)
  const frequency =
    A4_FREQUENCY *
    Math.pow(2, (midiWithCents - A4_MIDI) / SEMITONES_PER_OCTAVE);

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
 * The resulting note's cents deviation will be calculated relative to the new tuning standard.
 *
 * @param note - The original Note object.
 * @param [newA4Frequency=A4_FREQUENCY] - The new reference frequency for A4 (e.g., 432 Hz). Defaults to the standard 440 Hz.
 * @param [options] - Optional parameters for the new note creation.
 * @param [options.prefer='sharp'] - Preferred spelling for the resulting note.
 * @param [options.includeCachedValues=true] - Whether to include cached values on the returned note.
 * @returns A new Note object with its frequency context adjusted for the new tuning standard.
 * @throws {Error} If the input note is invalid or the new A4 frequency is non-positive.
 * @example
 * ```ts
 * const c4_standard = createNote({ midi: 60 }); // C4 in A4=440Hz tuning (~261.63 Hz)
 * const c4_tunedDown = retune(c4_standard, 432); // Retunes C4 identity to A4=432Hz (~256.87 Hz)
 *
 * // A note slightly sharp in standard tuning
 * const a4_sharpish = createNote({ midi: 69, cents: 10 }); // A4 + 10 cents (~442.54 Hz)
 * const a4_sharpish_tuned = retune(a4_sharpish, 432); // Retunes A4+10c identity to A4=432Hz context
 * // Its new frequency will be ~435.03 Hz. createNoteFromFrequency will find it's nearest to A4 (432 Hz)
 * // in the new system and assign appropriate cents deviation (~+7.8 cents relative to 432Hz A4).
 * console.log(a4_sharpish_tuned.letter, a4_sharpish_tuned.octave, a4_sharpish_tuned.cents?.toFixed(1)); // A 4 "7.8"
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

  // Use the now-correct noteToFrequency function to get original frequency
  // This calculation implicitly uses the STANDARD A4_FREQUENCY context.
  const originalStandardFreq = noteToFrequency(note);

  // Calculate the ratio between the new reference A4 and the standard A4
  const referenceRatio = newA4Frequency / A4_FREQUENCY;

  // Apply this ratio to the note's frequency (as calculated in standard tuning)
  const newFrequency = originalStandardFreq * referenceRatio;

  // Create a new note object based on this adjusted frequency.
  // Let createNoteFromFrequency determine the nearest note and cents deviation
  // *relative to the standard A4=440* based on this new absolute frequency.
  // Do NOT pass the original cents/modifier/tuning info here.
  return createNoteFromFrequency({
    frequency: newFrequency,
    prefer,
    includeCachedValues,
    // Explicitly DO NOT pass: cents, microtonalModifier, tuningSystem from original note
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
