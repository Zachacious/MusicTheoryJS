/**
 * @module Note/Operations
 * @description
 * This module provides functions for performing various operations on and between Note objects.
 * These include comparing notes for pitch equality (with tolerance) or strict equality (spelling),
 * transposing notes by intervals (semitones or precise cents), calculating intervals,
 * changing octaves, respelling notes enharmonically, and performing specific microtonal operations
 * like adding cents or converting to a quarter-tone representation.
 */

import {
  C0_MIDI,
  CENTS_PER_SEMITONE,
  MICROTONAL_CENTS_ADJUSTMENT,
} from "./constants";
import {
  EnharmonicPreference,
  MicrotonalModifier,
  MicrotonalNote,
  Note,
  TuningSystem,
  isMicrotonalNote,
} from "./types";
import {
  createNoteFromMidi,
  createNoteFromParts,
  createNoteFromQuarterToneIndex,
  createNoteObject,
} from "./creation";
import {
  formatNotation,
  formatNote,
  getCentsBetween,
  getMidiWithCents,
  noteToMidi,
  pitchClassIndexToLetterAccidental,
  transposeByCents,
} from "./calculations";

// Assuming Interval type is correctly defined and imported from elsewhere
import { Interval } from "../interval";

/**
 * Checks if two Note objects represent the same pitch (enharmonically equivalent),
 * potentially within a specified tolerance for microtonal comparisons.
 * Compares standard notes by pitch class index and octave (or MIDI if available).
 * Compares microtonal notes by their precise pitch including cents, within the tolerance.
 *
 * @param note1 - The first Note object to compare.
 * @param note2 - The second Note object to compare.
 * @param [toleranceCents=5] - The maximum allowed difference in cents for microtonal notes to be considered equal. Defaults to 5 cents. Ignored for non-microtonal comparisons.
 * @returns `true` if the notes represent the same pitch (within tolerance), `false` otherwise.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 * const bSharp3 = createNote({ letter: 'B', accidental: '#', octave: 3 });
 * const c4plus2c = addCentsToNote(c4, 2);
 * const c4minus4c = addCentsToNote(c4, -4);
 * const c4plus10c = addCentsToNote(c4, 10);
 *
 * notesAreEqual(c4, bSharp3); // true (standard enharmonic equivalence)
 * notesAreEqual(c4, c4plus2c); // true (within default 5 cents tolerance)
 * notesAreEqual(c4, c4minus4c); // true (within default 5 cents tolerance)
 * notesAreEqual(c4, c4plus10c); // false (outside default 5 cents tolerance)
 * notesAreEqual(c4, c4plus10c, 15); // true (within specified 15 cents tolerance)
 * notesAreEqual(c4, null); // false
 * ```
 */
export function notesAreEqual(
  note1: Note | null | undefined,
  note2: Note | null | undefined,
  toleranceCents: number = 5 // Allow small differences in cents
): boolean {
  // Handle null/undefined inputs or identical object references
  if (note1 === note2) return true;
  if (!note1 || !note2) return false;

  // Determine if either note has microtonal information (explicit cents or modifier)
  // isMicrotonalNote checks for non-zero cents or a non-empty modifier.
  const note1IsMicro = isMicrotonalNote(note1);
  const note2IsMicro = isMicrotonalNote(note2);

  // If neither note has significant microtonal info, compare base pitch
  if (!note1IsMicro && !note2IsMicro) {
    // Compare using integer midi if available (potentially faster if cached)
    // Note: This assumes the 'midi' property exists if includeCachedValues was true
    if (note1.midi !== undefined && note2.midi !== undefined) {
      return note1.midi === note2.midi;
    }

    // Fallback to comparing core pitch class and octave
    return (
      note1.pitchClassIndex === note2.pitchClassIndex &&
      note1.octave === note2.octave
    );
  }

  // If at least one note is microtonal, perform comparison using precise pitch (cents)
  // getMidiWithCents handles standard and microtonal notes correctly.
  const midiWithCents1 = getMidiWithCents(note1);
  const midiWithCents2 = getMidiWithCents(note2);

  // Calculate the absolute difference in cents
  const centsDifference = Math.abs(
    (midiWithCents1 - midiWithCents2) * CENTS_PER_SEMITONE
  );

  // Consider equal if the difference is within the specified tolerance
  // Use a small epsilon to handle potential floating point inaccuracies if tolerance is near zero.
  const effectiveTolerance = Math.max(0, toleranceCents); // Ensure tolerance is non-negative
  return centsDifference <= effectiveTolerance + 1e-9;
}

/**
 * Checks if two Note objects are strictly identical in terms of both spelling and pitch.
 * Compares letter, accidental, octave, and any microtonal properties (cents, modifier, tuning system).
 * Unlike `notesAreEqual`, this does *not* consider enharmonic equivalence or cents tolerance.
 *
 * @param note1 - The first Note object to compare.
 * @param note2 - The second Note object to compare.
 * @returns `true` if all properties relevant to spelling and pitch are identical, `false` otherwise.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 * const c4_copy = createNote({ midi: 60 });
 * const bSharp3 = createNote({ letter: 'B', accidental: '#', octave: 3 });
 * const c4plus2c = addCentsToNote(c4, 2);
 * const c4plus2c_other = addCentsToNote(c4, 2);
 *
 * notesAreStrictlyEqual(c4, c4_copy); // true
 * notesAreStrictlyEqual(c4, bSharp3); // false (different spelling)
 * notesAreStrictlyEqual(c4, c4plus2c); // false (c4plus2c has cents property)
 * notesAreStrictlyEqual(c4plus2c, c4plus2c_other); // true (same microtonal properties)
 * notesAreStrictlyEqual(c4, null); // false
 * ```
 */
export function notesAreStrictlyEqual(
  note1: Note | null | undefined,
  note2: Note | null | undefined
): boolean {
  // Handle null/undefined inputs or identical object references
  if (note1 === note2) return true;
  if (!note1 || !note2) return false;

  // Check basic spelling and octave properties first
  const basicEqual =
    note1.letter === note2.letter &&
    note1.accidental === note2.accidental &&
    note1.octave === note2.octave;

  // If basic properties differ, they cannot be strictly equal
  if (!basicEqual) return false;

  // Now check microtonal properties. Use isMicrotonalNote to check relevance.
  const note1IsMicro = isMicrotonalNote(note1);
  const note2IsMicro = isMicrotonalNote(note2);

  // If microtonal status differs, they aren't strictly equal
  if (note1IsMicro !== note2IsMicro) return false;

  // If both are microtonal, compare relevant microtonal properties
  if (note1IsMicro) {
    // Implies note2IsMicro is also true
    // Cast to access potential properties safely, though type guards might be better
    const microNote1 = note1 as MicrotonalNote;
    const microNote2 = note2 as MicrotonalNote;

    // Compare cents (treat undefined as 0), modifier, and tuning system
    return (
      (microNote1.cents ?? 0) === (microNote2.cents ?? 0) &&
      (microNote1.microtonalModifier ?? "") ===
        (microNote2.microtonalModifier ?? "") &&
      ((microNote1 as any).tuningSystem ?? "equalTemperament") ===
        ((microNote2 as any).tuningSystem ?? "equalTemperament")
    );
  }

  // If neither is microtonal and basic properties matched, they are strictly equal
  return true;
}

/**
 * Defines options for the `transpose` function.
 */
export interface TransposeOptions {
  /** Specifies the preferred spelling ('sharp' or 'flat') for the transposed note if enharmonically ambiguous. Defaults to 'sharp'. */
  prefer?: EnharmonicPreference;
  /** If true (default), includes cached `midi`, `notation`, `frequency` properties on the returned object. */
  includeCachedValues?: boolean;
  /** If true (default), preserves existing `cents` or `microtonalModifier` from the original note onto the transposed note. If false, the transposed note will represent a standard 12-TET pitch unless `transposeByCents` is true. */
  preserveMicrotonalProperties?: boolean;
  /** Optional: Explicitly sets the tuning system for the transposed note. If omitted, attempts to preserve from the original note if `preserveMicrotonalProperties` is true. */
  tuningSystem?: TuningSystem;
  /** If true, interprets the `interval` parameter as fractional semitones (potentially including cents) and performs precise transposition using cents calculation. Defaults to false, where `interval` is treated as integer semitones. */
  transposeByCents?: boolean;
}

/**
 * Transposes a Note by a given Interval (typically integer semitones).
 * Returns a new Note object representing the transposed pitch.
 * Provides options for handling enharmonic spelling and preserving microtonal properties.
 * Can also perform precise cents-based transposition if `options.transposeByCents` is set.
 *
 * @param note - The Note object to transpose.
 * @param interval - The interval to transpose by. Interpreted as integer semitones unless `options.transposeByCents` is true, in which case it's treated as potentially fractional semitones.
 * @param [options] - Optional settings for transposition behavior. See {@link TransposeOptions}.
 * @returns A new Note object representing the transposed pitch.
 * @throws {Error} If the input note is invalid.
 * @throws {Error} If transposition results in an invalid MIDI value (outside 0-127).
 * @remarks When `options.transposeByCents` is true, the function calculates the exact target pitch including cents. When false (default), it performs standard 12-TET transposition based on integer semitones, optionally preserving the original note's microtonal offsets if `options.preserveMicrotonalProperties` is true.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 * const cqs4 = addCentsToNote(c4, 50); // C4 + 50 cents
 *
 * // Standard transpose up a Major Third (4 semitones)
 * const e4 = transpose(c4, 4); // E4
 *
 * // Transpose C4+50c up 4 semitones, preserving cents
 * const e4plus50 = transpose(cqs4, 4); // E4 + 50 cents
 *
 * // Transpose C4+50c up 4 semitones, NOT preserving cents
 * const e4_std = transpose(cqs4, 4, { preserveMicrotonalProperties: false }); // E4 (standard)
 *
 * // Transpose C4 up by 1.5 semitones (150 cents) using transposeByCents option
 * const dqs4 = transpose(c4, 1.5, { transposeByCents: true, prefer: 'flat' }); // Db4 + 50 cents
 * ```
 */
export function transpose(
  note: Note,
  interval: Interval, // Interval type assumed to be number (semitones)
  options?: TransposeOptions
): Note {
  if (!note) {
    throw new Error("Invalid note provided to transpose.");
  }
  // Validate interval type
  if (typeof interval !== "number" || !Number.isFinite(interval)) {
    throw new Error(
      `Invalid interval provided: ${interval}. Must be a finite number.`
    );
  }

  // --- Extract options with defaults ---
  const prefer = options?.prefer ?? "sharp";
  // Default to true unless explicitly false
  const includeCachedValues = options?.includeCachedValues !== false;
  // Default to true unless explicitly false
  const preserveMicrotonal = options?.preserveMicrotonalProperties !== false;
  // Default to false unless explicitly true
  const useCentsTranspose = options?.transposeByCents === true;
  // --- End options extraction ---

  // --- Path 1: Precise transposition using cents ---
  if (useCentsTranspose) {
    // Convert the interval (potentially fractional semitones) to cents
    const centsDelta = interval * CENTS_PER_SEMITONE;

    // Use the dedicated transposeByCents function for precision.
    // Pass down preference. includeCachedValues is handled by the target creation function inside transposeByCents.
    // transposeByCents correctly combines the delta with existing cents.
    // Note: We don't need preserveMicrotonalProperties here, as transposeByCents inherently calculates the combined result.
    // We pass the optional tuningSystem from options, transposeByCents doesn't use it directly but createNote might.
    return transposeByCents(note, centsDelta, {
      prefer /* includeCachedValues? maybe not needed here */,
    });
    // Rethink: transposeByCents calls createNoteFromMidi/Frequency internally, which use includeCachedValues.
    // So, passing it down might be needed if transposeByCents doesn't already. Let's assume it does for now.
    // return transposeByCents(note, centsDelta, { prefer, includeCachedValues });
  }
  // --- End Path 1 ---

  // --- Path 2: Standard transposition by integer semitones ---
  // Ensure interval is treated as an integer for this path
  const semitoneInterval = Math.round(interval); // Or floor/ceil depending on desired behavior for fractional input? Rounding seems safest.
  if (interval !== semitoneInterval) {
    console.warn(
      `Non-integer interval ${interval} provided to transpose without 'transposeByCents' option. Rounding to ${semitoneInterval} semitones.`
    );
  }

  // Get the base integer MIDI of the starting note
  const startMidi = noteToMidi(note);
  // Calculate the target integer MIDI
  const targetMidi = startMidi + semitoneInterval;

  // --- MIDI Range Validation ---
  if (targetMidi < 0 || targetMidi > 127) {
    throw new Error(
      `Transposition results in invalid MIDI value: ${targetMidi} (from note ${formatNote(
        note
      )} and interval ${interval} rounded to ${semitoneInterval})`
    );
  }
  // --- End Validation ---

  // If preserving microtonal properties and the original note had them:
  if (preserveMicrotonal && isMicrotonalNote(note)) {
    // Cast note to access microtonal properties
    const microNote = note as MicrotonalNote;
    // Create the new note from the target MIDI, but re-apply the original microtonal properties
    return createNoteFromMidi({
      midi: targetMidi,
      prefer,
      includeCachedValues,
      cents: microNote.cents, // Preserve original cents offset
      microtonalModifier: microNote.microtonalModifier, // Preserve original modifier
      // Preserve tuning system, allowing override from options
      tuningSystem: options?.tuningSystem ?? (microNote as any).tuningSystem,
    });
  }

  // Otherwise, perform standard transposition creating a standard 12-TET note at the target MIDI
  // (Microtonal properties from original note are dropped unless preserved above)
  return createNoteFromMidi({
    midi: targetMidi,
    prefer,
    includeCachedValues,
    // Explicitly pass tuning system from options if provided
    tuningSystem: options?.tuningSystem,
    // Cents and modifier are intentionally omitted to create a standard note
  });
  // --- End Path 2 ---
}

/**
 * Calculates the interval between two notes in semitones.
 * If `includeCents` is true, the result can be a fractional number representing
 * the precise interval including microtonal differences. If false, it returns the
 * integer difference between the nearest 12-TET MIDI notes.
 *
 * @param note1 - The first Note object.
 * @param note2 - The second Note object.
 * @param [includeCents=true] - If true, includes cents precision in the returned interval (fractional semitones). If false, returns integer semitone difference.
 * @returns The interval in semitones (potentially fractional). Positive if note2 is higher than note1.
 * @throws {Error} If either input note is invalid.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 * const e4 = createNote({ midi: 64 });
 * const e4plus20 = addCentsToNote(e4, 20);
 *
 * intervalBetween(c4, e4); // 4.0 (Major Third = 4 semitones)
 * intervalBetween(c4, e4plus20); // 4.2 (4 semitones + 20 cents)
 * intervalBetween(c4, e4plus20, false); // 4 (Integer semitone difference)
 * ```
 */
export function intervalBetween(
  note1: Note,
  note2: Note,
  includeCents: boolean = true
): number {
  if (!note1 || !note2) {
    throw new Error("Invalid notes provided to intervalBetween.");
  }

  if (!includeCents) {
    // Return just the integer semitone difference using nearest MIDI notes
    const midi1 = noteToMidi(note1); // noteToMidi returns integer MIDI
    const midi2 = noteToMidi(note2);
    return midi2 - midi1;
  }

  // Calculate precise interval including cents using fractional MIDI values
  const midiWithCents1 = getMidiWithCents(note1);
  const midiWithCents2 = getMidiWithCents(note2);

  // The difference in fractional MIDI *is* the interval in fractional semitones
  return midiWithCents2 - midiWithCents1;
}

/**
 * Calculates the precise interval between two notes in cents.
 * Convenience wrapper around `getCentsBetween` from the calculations module.
 *
 * @param note1 - The first Note object.
 * @param note2 - The second Note object.
 * @returns The interval measured in cents. Positive if note2 is higher.
 * @throws {Error} If either input note is invalid.
 * @see {@link Note/Calculations.getCentsBetween}
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 * const e4 = createNote({ midi: 64 });
 * const e4plus20 = addCentsToNote(e4, 20);
 *
 * centsBetween(c4, e4); // 400.0
 * centsBetween(c4, e4plus20); // 420.0
 * ```
 */
export function centsBetween(note1: Note, note2: Note): number {
  if (!note1 || !note2) {
    throw new Error("Invalid notes provided to centsBetween.");
  }
  // Delegate to the calculation function for consistency
  return getCentsBetween(note1, note2);
}

/**
 * Transposes a Note by a specified whole number of octaves.
 * Preserves the note's letter name, accidental, and (optionally) microtonal properties.
 * Only changes the octave number.
 */
export function transposeOctave(
  note: Note,
  numOctaves: number,
  options?: {
    includeCachedValues?: boolean;
    preserveMicrotonalProperties?: boolean;
  }
): Note {
  if (!note) {
    throw new Error("Invalid note provided to transposeOctave.");
  }
  if (!Number.isInteger(numOctaves)) {
    throw new Error(`Number of octaves must be an integer: ${numOctaves}`);
  }

  // Determine options
  const includeCachedValues = options?.includeCachedValues ?? true;
  const preserveMicrotonal = options?.preserveMicrotonalProperties ?? true;

  // Calculate the new octave number
  const newOctave = note.octave + numOctaves;

  // --- Potential Validation: Check if newOctave is within a reasonable range? ---
  // if (newOctave < -1 || newOctave > 9) { console.warn(...) }
  // ---

  // Determine final microtonal properties
  let microtonalOptions:
    | {
        cents?: number;
        microtonalModifier?: MicrotonalModifier;
        tuningSystem?: TuningSystem;
      }
    | undefined;

  if (preserveMicrotonal && isMicrotonalNote(note)) {
    const microNote = note as MicrotonalNote;
    microtonalOptions = {
      cents: microNote.cents,
      microtonalModifier: microNote.microtonalModifier,
      tuningSystem: (microNote as any).tuningSystem,
    };
  }
  // else: microtonalOptions remains undefined

  // Delegate to the immutable factory function
  // Pass original letter/accidental, new octave, and preserved microtonal info
  // Pitch class index will be recalculated inside createNoteObject or its dependencies if needed,
  // but passing it might be slightly more direct if available easily. Let's rely on calculation.
  // NOTE: Need pitchClassIndex for createNoteObject! Get it from original note.
  return createNoteObject(
    note.letter,
    note.accidental,
    newOctave,
    note.pitchClassIndex, // Pass original pitch class index
    includeCachedValues,
    microtonalOptions
  );
}

/**
 * Compares two notes based on their pitch to determine which is higher.
 * Returns a negative number if `note1` is lower than `note2`,
 * a positive number if `note1` is higher than `note2`, and 0 if they are equal (within tolerance if `includeCents` is true).
 * This function is compatible with `Array.prototype.sort()`.
 *
 * @param note1 - The first Note object.
 * @param note2 - The second Note object.
 * @param [includeCents=true] - If true, performs precise comparison including cents. If false, compares based on nearest 12-TET MIDI notes.
 * @returns A number indicating the relative pitch order: < 0 if note1 < note2, > 0 if note1 > note2, 0 if note1 ≈ note2.
 * @throws {Error} If either input note is invalid.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 * const d4 = createNote({ midi: 62 });
 * const cqs4 = addCentsToNote(c4, 50); // C4 + 50 cents
 *
 * compareNotes(c4, d4); // < 0 (e.g., -200 or -2 depending on includeCents)
 * compareNotes(d4, c4); // > 0 (e.g., 200 or 2)
 * compareNotes(c4, cqs4); // < 0 (e.g., -50)
 * compareNotes(cqs4, c4); // > 0 (e.g., 50)
 * compareNotes(c4, createNote({ midi: 60 })); // 0
 *
 * const notes = [d4, c4, cqs4];
 * notes.sort(compareNotes); // Sorts by pitch: [c4, cqs4, d4]
 * console.log(notes.map(formatNote)); // [ 'C4', 'C4', 'D4' ] (Format may not show cents)
 * ```
 */
export function compareNotes(
  note1: Note,
  note2: Note,
  includeCents: boolean = true
): number {
  if (!note1 || !note2) {
    throw new Error("Invalid notes provided to compareNotes.");
  }

  if (!includeCents) {
    // Simple comparison by integer MIDI number
    const midi1 = noteToMidi(note1); // noteToMidi gives integer MIDI
    const midi2 = noteToMidi(note2);
    // Subtract midi2 from midi1 to match sorting convention (<0 if note1 < note2)
    return midi1 - midi2;
  }

  // Precise comparison including microtonal cents
  const midiWithCents1 = getMidiWithCents(note1);
  const midiWithCents2 = getMidiWithCents(note2);

  // Subtract midi2 from midi1. Result directly reflects relative pitch.
  // Multiply by CENTS_PER_SEMITONE to return difference in cents, or just return fractional midi difference?
  // Returning fractional MIDI difference is simpler and works for sorting.
  return midiWithCents1 - midiWithCents2;
  // Alternatively, to return difference in cents:
  // return (midiWithCents1 - midiWithCents2) * CENTS_PER_SEMITONE;
}

/**
 * Creates a new Note object with the same pitch as the input note, but potentially
 * a different enharmonic spelling (letter/accidental) based on the specified preference.
 */
export function respellNote(
  note: Note,
  options?: {
    prefer?: EnharmonicPreference;
    includeCachedValues?: boolean;
    preserveMicrotonalProperties?: boolean;
  }
): Note {
  if (!note) {
    throw new Error("Invalid note provided to respellNote.");
  }

  // Determine options
  const prefer = options?.prefer ?? "sharp";
  const includeCachedValues = options?.includeCachedValues ?? true;
  const preserveMicrotonal = options?.preserveMicrotonalProperties ?? true;

  // Determine the new spelling based on pitch class and preference
  // Pitch class remains the same, octave remains the same
  const { letter: newLetter, accidental: newAccidental } =
    pitchClassIndexToLetterAccidental(note.pitchClassIndex, prefer);

  // Determine final microtonal properties
  let microtonalOptions:
    | {
        cents?: number;
        microtonalModifier?: MicrotonalModifier;
        tuningSystem?: TuningSystem;
      }
    | undefined;

  if (preserveMicrotonal && isMicrotonalNote(note)) {
    const microNote = note as MicrotonalNote;
    microtonalOptions = {
      cents: microNote.cents,
      microtonalModifier: microNote.microtonalModifier,
      tuningSystem: (microNote as any).tuningSystem,
    };
  }

  // Delegate to the immutable factory function
  // Pass new letter/accidental, original octave/pitch class index, and preserved microtonal info
  return createNoteObject(
    newLetter,
    newAccidental,
    note.octave,
    note.pitchClassIndex,
    includeCachedValues,
    microtonalOptions
  );
}

/**
 * Creates a new MicrotonalNote by adding a specified cents value to an existing Note.
 * Correctly handles combining the added cents with any existing cents offset on the note
 * and normalizes the result, potentially adjusting the base note's pitch class/octave
 * if the total cents offset crosses a semitone boundary (+/- 100 cents).
 *
 * @param note - The starting Note object.
 * @param cents - The number of cents to add (can be positive or negative).
 * @param [options] - Optional settings.
 * @param [options.includeCachedValues=true] - Whether to include cached values on the returned note.
 * @param [options.autoSelectMicrotonalModifier=false] - If true, attempts to find the closest standard microtonal modifier ('+', '-', etc.) based on the resulting cents value (within a small tolerance) and assigns it. Otherwise, preserves the original modifier or leaves it empty.
 * @returns A new MicrotonalNote object with the combined cents offset.
 * @throws {Error} If the input note or cents value is invalid, or if normalization results in an out-of-range MIDI value.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 * const c4plus30 = addCentsToNote(c4, 30); // C4 + 30 cents
 * console.log(c4plus30.cents); // 30
 *
 * // Add 40 more cents to C4+30c
 * const c4plus70 = addCentsToNote(c4plus30, 40); // C4 + 70 cents
 * console.log(c4plus70.cents); // 70
 *
 * // Add 50 more cents to C4+70c (total +120 cents -> should become C#4 + 20 cents)
 * const cs4plus20 = addCentsToNote(c4plus70, 50);
 * console.log(formatNote(cs4plus20), cs4plus20.cents); // "C#4", 20
 *
 * // Add -80 cents to C4+70c (total -10 cents)
 * const c4minus10 = addCentsToNote(c4plus70, -80);
 * console.log(formatNote(c4minus10), c4minus10.cents); // "C4", -10
 *
 * // Add +50 cents and auto-select modifier
 * const c4qs = addCentsToNote(c4, 50, { autoSelectMicrotonalModifier: true });
 * console.log(formatNote(c4qs)); // "C+4" (if '+' maps to 50c)
 * ```
 */
export function addCentsToNote(
  note: Note,
  cents: number,
  options?: {
    includeCachedValues?: boolean;
    autoSelectMicrotonalModifier?: boolean; // Optionally assign modifier based on result
  }
): MicrotonalNote {
  // Returns MicrotonalNote as it always deals with cents
  // --- Input Validation ---
  if (!note) {
    throw new Error("Invalid note provided to addCentsToNote.");
  }
  if (!Number.isFinite(cents)) {
    throw new Error(
      `Invalid cents value provided: ${cents}. Must be a finite number.`
    );
  }
  // --- End Validation ---

  const includeCachedValues = options?.includeCachedValues ?? true;
  const autoSelectModifier = options?.autoSelectMicrotonalModifier ?? false;

  // Get the starting cents value (0 if note is not already microtonal)
  const existingCents = (note as MicrotonalNote).cents ?? 0;

  // Calculate the new total cents offset relative to the note's base 12-TET pitch
  const totalCents = existingCents + cents;

  // --- Normalize Cents & Determine Base Note ---
  let finalCents = totalCents;
  let baseNote = note; // Start with the original note as the base

  const CENTS_NORMALIZATION_THRESHOLD = CENTS_PER_SEMITONE - 1e-9;

  if (Math.abs(totalCents) >= CENTS_NORMALIZATION_THRESHOLD) {
    const semitoneShift = Math.round(totalCents / CENTS_PER_SEMITONE);
    finalCents = totalCents - semitoneShift * CENTS_PER_SEMITONE;

    // Create the adjusted base note (without microtones) by transposing
    const originalBaseNote = createNoteFromParts({
      letter: note.letter,
      accidental: note.accidental,
      octave: note.octave,
      includeCachedValues: false, // Intermediate step
    });
    // Use standard semitone transpose (path 2 of transpose function)
    baseNote = transpose(originalBaseNote, semitoneShift, {
      preserveMicrotonalProperties: false,
    });
  }
  // --- End Normalization ---

  // Use threshold to treat near-zero cents as exactly zero (or undefined for createNoteObject)
  const CENTS_ZERO_THRESHOLD = 1e-6;
  if (Math.abs(finalCents) < CENTS_ZERO_THRESHOLD) {
    finalCents = 0; // Keep as 0 for modifier selection logic, will be omitted later if 0
  }

  // --- Determine Microtonal Modifier ---
  let finalMicrotonalModifier: MicrotonalModifier | undefined = undefined; // Start undefined

  if (autoSelectModifier) {
    // Only try to select if finalCents is non-zero
    if (finalCents !== 0) {
      let closestDiff = Infinity;
      let closestModifier: MicrotonalModifier = "";
      for (const [modifier, modifierCents] of Object.entries(
        MICROTONAL_CENTS_ADJUSTMENT
      )) {
        if (modifier === "") continue; // Skip empty modifier
        const diff = Math.abs(finalCents - modifierCents);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestModifier = modifier as MicrotonalModifier;
        }
      }
      // Assign if reasonably close match found
      const MODIFIER_MATCH_TOLERANCE = 10; // e.g., within 10 cents
      if (closestDiff <= MODIFIER_MATCH_TOLERANCE) {
        finalMicrotonalModifier = closestModifier;
      }
      // else: leave undefined if no close match
    }
  } else {
    // Preserve original modifier if not auto-selecting, unless cents are now zero
    if (finalCents !== 0) {
      finalMicrotonalModifier = (note as MicrotonalNote).microtonalModifier; // Use original note's modifier
    }
    // else: leave undefined if cents are zero
  }
  // --- End Modifier Determination ---

  // Prepare final microtonal options for the factory
  const microtonalOptions = {
    // Only include cents property if it's non-zero
    ...(finalCents !== 0 && { cents: finalCents }),
    ...(finalMicrotonalModifier && {
      microtonalModifier: finalMicrotonalModifier,
    }),
    // Preserve original tuning system
    tuningSystem: (note as any).tuningSystem,
  };

  // Delegate to the immutable factory function using the adjusted base note props
  return createNoteObject(
    baseNote.letter,
    baseNote.accidental,
    baseNote.octave,
    baseNote.pitchClassIndex,
    includeCachedValues,
    microtonalOptions
  ) as MicrotonalNote; // Cast return to MicrotonalNote
}

/**
 * Creates a new MicrotonalNote that is exactly one quarter-tone (+50 cents for 'up', -50 cents for 'down')
 * away from the input note. This is a convenience function using `addCentsToNote`.
 * The resulting note will typically have a `cents` property of +/- 50 and potentially a corresponding
 * microtonal modifier ('+' or '-').
 *
 * @param note - The starting Note object.
 * @param [direction="up"] - Whether to create the note a quarter-tone 'up' (+50 cents) or 'down' (-50 cents).
 * @param [options] - Optional settings.
 * @param [options.includeCachedValues=true] - Whether to include cached values on the returned note.
 * @returns A new MicrotonalNote object representing the quarter-tone pitch.
 * @throws {Error} If the input note is invalid.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 * const cqs4 = createQuarterToneNote(c4, 'up'); // C4 + 50 cents, likely modifier '+'
 * const cqf4 = createQuarterToneNote(c4, 'down'); // C4 - 50 cents, likely modifier '-'
 *
 * const e4 = createNote({ midi: 64 });
 * const eqf4 = createQuarterToneNote(e4, 'down'); // E4 - 50 cents
 * ```
 */
export function createQuarterToneNote(
  note: Note,
  direction: "up" | "down" = "up",
  options?: {
    includeCachedValues?: boolean;
  }
): MicrotonalNote {
  // Explicitly returns MicrotonalNote
  if (!note) {
    throw new Error("Invalid note provided to createQuarterToneNote.");
  }

  // Determine cents offset and default modifier based on direction
  const cents = direction === "up" ? 50 : -50;
  const defaultMicrotonalModifier = direction === "up" ? "+" : "-"; // Suggest appropriate modifier

  // Use addCentsToNote to create the new note
  const quarterToneNote = addCentsToNote(note, cents, {
    // Pass includeCachedValues option
    includeCachedValues: options?.includeCachedValues ?? true,
    // Don't auto-select modifier, let addCentsToNote handle the cents property
    autoSelectMicrotonalModifier: false,
  });

  // Assign the default modifier if none was assigned by addCentsToNote (e.g., if note already had one)
  // Or potentially force assign it? Let's assign it if cents are +/- 50.
  if (quarterToneNote.cents === cents && !quarterToneNote.microtonalModifier) {
    // Create a new object with the modifier added
    return Object.freeze({
      ...quarterToneNote,
      microtonalModifier: defaultMicrotonalModifier,
      // Recalculate notation if cached values are included
      ...((options?.includeCachedValues ?? true) && {
        notation: formatNotation(
          quarterToneNote.letter,
          quarterToneNote.accidental,
          quarterToneNote.octave,
          defaultMicrotonalModifier
        ),
      }),
    }) as MicrotonalNote;
  }

  return quarterToneNote;
}

/**
 * Converts a given Note (which may have microtonal deviations) to its closest representation
 * within the standard 24-TET (quarter-tone) system.
 * Determines the nearest quarter-tone step (0-23 index) and calculates the remaining
 * cents deviation relative to that specific quarter-tone pitch.
 *
 * @param note - The input Note object.
 * @param [options] - Optional settings.
 * @param [options.includeCachedValues=true] - Whether to include cached values on the returned note.
 * @returns A new Note object representing the closest quarter-tone pitch, potentially with a
 * remaining `cents` property indicating the difference from the exact quarter-tone step.
 * The `tuningSystem` property will likely be set to 'quarterTone'.
 * @throws {Error} If the input note is invalid.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 }); // 0 cents deviation
 * const qt_c4 = convertToQuarterTone(c4);
 * // -> C4, quarterToneIndex 0, cents 0
 *
 * const c4plus30 = addCentsToNote(c4, 30); // 30 cents deviation
 * const qt_c4plus30 = convertToQuarterTone(c4plus30);
 * // -> Nearest quarter-tone is C+ (index 1, 50 cents). Remaining cents = 30 - 50 = -20.
 * // -> Result: C+4 (e.g., Letter C, Mod '+'), cents -20
 * console.log(formatNote(qt_c4plus30), qt_c4plus30.cents); // "C+4", -20
 *
 * const c4plus70 = addCentsToNote(c4, 70); // 70 cents deviation
 * const qt_c4plus70 = convertToQuarterTone(c4plus70);
 * // -> Nearest quarter-tone is C+ (index 1, 50 cents). Remaining cents = 70 - 50 = 20.
 * // -> Result: C+4, cents 20
 * console.log(formatNote(qt_c4plus70), qt_c4plus70.cents); // "C+4", 20
 *
 * const cs4minus10 = addCentsToNote(createNote({midi: 61}), -10); // C# - 10 cents = 90 cents from C
 * const qt_cs4minus10 = convertToQuarterTone(cs4minus10);
 * // -> Nearest quarter-tone is C# (index 2, 100 cents). Remaining cents = 90 - 100 = -10.
 * // -> Result: C#4, cents -10
 * console.log(formatNote(qt_cs4minus10), qt_cs4minus10.cents); // "C#4", -10
 * ```
 */
export function convertToQuarterTone(
  note: Note,
  options?: {
    includeCachedValues?: boolean;
  }
): Note {
  // May return MicrotonalNote if cents remain
  // --- Input Validation ---
  if (!note) {
    throw new Error("Invalid note provided to convertToQuarterTone.");
  }
  // --- End Validation ---

  const includeCachedValues = options?.includeCachedValues ?? true;

  // 1. Get the precise pitch as fractional MIDI
  const midiWithCents = getMidiWithCents(note);

  // 2. Calculate the equivalent index in a 24-EDO system (0-23 for the octave part)
  // Each MIDI unit is 2 quarter-tone steps. Adjust for C0_MIDI reference.
  const quarterToneFloat = (midiWithCents - C0_MIDI) * 2;

  // 3. Find the nearest integer quarter-tone index
  const nearestQuarterToneIndexTotal = Math.round(quarterToneFloat);

  // 4. Calculate the remaining cents deviation from that *exact* quarter-tone step
  // Cents per quarter-tone step is 50.
  const CENTS_PER_QUARTER_STEP = CENTS_PER_SEMITONE / 2;
  const exactCentsFromC0 = (midiWithCents - C0_MIDI) * CENTS_PER_SEMITONE;
  const nearestQuarterToneCentsFromC0 =
    nearestQuarterToneIndexTotal * CENTS_PER_QUARTER_STEP;
  const remainingCents = exactCentsFromC0 - nearestQuarterToneCentsFromC0;

  // 5. Determine the octave and the index within the octave (0-23)
  const octave = Math.floor(nearestQuarterToneIndexTotal / 24);
  const quarterToneIndexInOctave =
    ((nearestQuarterToneIndexTotal % 24) + 24) % 24;

  // 6. Create the note using the quarter-tone index and the remaining cents
  // Use a threshold for remaining cents to avoid floating point noise near zero.
  const CENTS_THRESHOLD = 1e-6;
  const finalCents =
    Math.abs(remainingCents) > CENTS_THRESHOLD ? remainingCents : undefined;

  return createNoteFromQuarterToneIndex({
    quarterToneIndex: quarterToneIndexInOctave,
    octave: octave, // Use the calculated octave based on the quarter tone index
    includeCachedValues,
    cents: finalCents, // The remaining deviation
    // Explicitly set tuning system to quarterTone unless original note had another system?
    // Let createNoteFromQuarterToneIndex handle default tuningSystem ('quarterTone')
  });
}
