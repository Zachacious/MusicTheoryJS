/**
 * @module Note/Calculations
 * @description
 * This module provides a collection of functions for performing calculations and conversions
 * related to musical notes, including MIDI value determination, frequency calculation,
 * formatting, enharmonic spelling, microtonal adjustments, and interval calculations in cents.
 *
 * These functions generally operate on Note properties or primitive values like pitch class index
 * and octave. They are designed to be pure functions where possible to support reliability and
 * tree-shakability.
 */

import {
  A4_FREQUENCY,
  A4_MIDI,
  C0_MIDI,
  CENTS_PER_SEMITONE,
  FLAT_NAMES,
  MICROTONAL_CENTS_ADJUSTMENT,
  QUARTER_TONE_NAMES,
  SEMITONES_PER_OCTAVE,
  SHARP_NAMES,
  TUNING_SYSTEMS,
} from "./constants";
import {
  Accidental,
  EnharmonicPreference,
  MicrotonalModifier,
  Note,
  NoteLetter,
  PitchClassIndex,
  TuningSystem,
  isMicrotonalNote,
} from "./types";
// Note: These imports might cause circular dependencies if ./operations imports from ./calculations.
// Consider refactoring if that's the case. For now, assuming imports are valid.
import { addCentsToNote, transpose } from "./operations";

import { createNoteFromMidi } from "./creation";

/**
 * Calculates the standard MIDI note number for a given pitch class index and octave.
 * Assumes the standard mapping where C0 corresponds to MIDI note 12.
 *
 * @pure
 * @param pitchClassIndex - The index of the pitch class (0-11, where C=0).
 * @param octave - The scientific octave number (e.g., 4 for Middle C).
 * @returns The calculated integer MIDI note number (e.g., C4 -> 60, A4 -> 69).
 * @example
 * ```ts
 * const middleC_Midi = calculateMidi(0, 4); // 60
 * const concertA_Midi = calculateMidi(9, 4); // 69
 * ```
 */
export function calculateMidi(
  pitchClassIndex: PitchClassIndex,
  octave: number
): number {
  // Formula: C0 starts at MIDI 12. Each octave adds 12 semitones.
  return pitchClassIndex + octave * SEMITONES_PER_OCTAVE + C0_MIDI;
}

/**
 * Formats note components into a standard string notation.
 * Includes optional microtonal modifier.
 *
 * @pure
 * @param letter - The diatonic note letter (A-G).
 * @param accidental - The accidental ('', '#', 'b', '##', 'x', 'bb').
 * @param octave - The scientific octave number.
 * @param [microtonalModifier=""] - Optional microtonal modifier (e.g., "+", "-").
 * @returns The formatted note string (e.g., "C#4", "D+4").
 * @example
 * ```ts
 * const notation1 = formatNotation('C', '#', 4); // "C#4"
 * const notation2 = formatNotation('D', '', 4, '+'); // "D+4"
 * const notation3 = formatNotation('F', 'b', 5); // "Fb5"
 * ```
 */
export function formatNotation(
  letter: NoteLetter,
  accidental: Accidental,
  octave: number,
  microtonalModifier: MicrotonalModifier = ""
): string {
  return `${letter}${accidental}${microtonalModifier}${octave}`;
}

/**
 * Converts a pitch class index (0-11) to its corresponding note letter
 * and accidental spelling based on the specified enharmonic preference.
 *
 * @pure
 * @param index - The pitch class index (0 = C, 1 = C#/Db, ..., 11 = B).
 * @param [prefer="sharp"] - The preferred spelling ('sharp' or 'flat') for ambiguous cases.
 * @returns An object containing the determined `letter` and `accidental`.
 * @example
 * ```ts
 * const spelling1 = pitchClassIndexToLetterAccidental(1, 'sharp'); // { letter: 'C', accidental: '#' }
 * const spelling2 = pitchClassIndexToLetterAccidental(1, 'flat');  // { letter: 'D', accidental: 'b' }
 * const spelling3 = pitchClassIndexToLetterAccidental(0);        // { letter: 'C', accidental: '' }
 * ```
 */
export function pitchClassIndexToLetterAccidental(
  index: PitchClassIndex,
  prefer: EnharmonicPreference = "sharp"
): { letter: NoteLetter; accidental: Accidental } {
  const targetNames = prefer === "flat" ? FLAT_NAMES : SHARP_NAMES;
  // Index is guaranteed 0-11 by type, so name lookup is safe.
  const name = targetNames[index];

  const letter = name.charAt(0) as NoteLetter;
  const acc = name.substring(1);
  // Ensure the extracted accidental is valid, default to natural if not (e.g., for C, E, F, B)
  const accidental = (acc as Accidental) || "";

  return { letter, accidental };
}

/**
 * Converts a quarter-tone index (0-23) representing 24-TET steps to its
 * approximate letter, accidental, and microtonal modifier representation.
 * Uses predefined names (like "C", "C+", "C#", "D+", etc.).
 *
 * @pure
 * @param quarterToneIndex - The index within the 24-tone equal temperament system (0-23).
 * Values outside this range will be wrapped using modulo 24.
 * @returns An object containing the determined `letter`, `accidental`, and `microtonalModifier`.
 * @example
 * ```ts
 * const qt1 = quarterToneIndexToLetterAccidental(0); // { letter: 'C', accidental: '', microtonalModifier: '' }
 * const qt2 = quarterToneIndexToLetterAccidental(1); // { letter: 'C', accidental: '', microtonalModifier: '+' } (Quarter sharp)
 * const qt3 = quarterToneIndexToLetterAccidental(2); // { letter: 'C', accidental: '#', microtonalModifier: '' }
 * const qt4 = quarterToneIndexToLetterAccidental(3); // { letter: 'D', accidental: '', microtonalModifier: '+' } ? Check QUARTER_TONE_NAMES definition
 * // Assuming QUARTER_TONE_NAMES maps 3 to "Db+", result would be:
 * // { letter: 'D', accidental: 'b', microtonalModifier: '+' }
 * ```
 * @remarks The exact mapping depends on the `QUARTER_TONE_NAMES` constant definition.
 * This function parses that definition to extract the components.
 */
export function quarterToneIndexToLetterAccidental(quarterToneIndex: number): {
  letter: NoteLetter;
  accidental: Accidental;
  microtonalModifier: MicrotonalModifier;
} {
  // Ensure index is in range 0-23
  const wrappedIndex = ((quarterToneIndex % 24) + 24) % 24;

  const name = QUARTER_TONE_NAMES[wrappedIndex];
  const letter = name.charAt(0) as NoteLetter;

  // Extract accidental and microtonal modifier
  const restOfName = name.substring(1);

  // Parse the remaining string to determine accidental and microtonal modifier
  let accidental: Accidental = "";
  let microtonalModifier: MicrotonalModifier = "";

  // Check for explicit microtonal modifiers defined in QUARTER_TONE_NAMES
  // Assuming '+' represents quarter-sharp for this example logic
  if (restOfName.endsWith("+")) {
    microtonalModifier = "+";
    // The part before '+' is the accidental (could be empty, #, b, etc.)
    accidental = restOfName.substring(0, restOfName.length - 1) as Accidental;
  }
  // Add similar checks for other modifiers like '-', 'd', etc. if defined in constants
  else {
    // No recognized modifier suffix, assume the rest is the accidental
    accidental = restOfName as Accidental;
  }

  // Ensure extracted accidental is valid, default to '' otherwise.
  if (!["", "#", "b", "##", "x", "bb"].includes(accidental)) {
    accidental = "";
  }

  return { letter, accidental, microtonalModifier };
}

/**
 * Gets the standard integer MIDI note number for a given Note object.
 * If the Note represents a microtonal pitch (via `cents` or `microtonalModifier`),
 * this function returns the MIDI number of the *nearest* standard 12-TET pitch.
 * For precise pitch representation including microtones, use `getMidiWithCents`.
 * Uses cached value if available on the Note object.
 *
 * @param note - The Note object.
 * @returns The integer MIDI note number (0-127).
 * @see {@link getMidiWithCents} for precise pitch representation.
 * @example
 * ```ts
 * const c4 = createNoteFromParts({ letter: 'C', octave: 4 });
 * const midi_c4 = noteToMidi(c4); // 60
 *
 * const cQuarterSharp = addCentsToNote(c4, 50);
 * const midi_cqs = noteToMidi(cQuarterSharp); // Still 60 (rounds down)
 *
 * const cSharp = createNoteFromParts({ letter: 'C', accidental:'#', octave: 4 });
 * const midi_cs = noteToMidi(cSharp); // 61
 *
 * const dQuarterFlat = addCentsToNote(cSharp, -50); // C# - 50 cents = C quarter sharp
 * const midi_dqf = noteToMidi(dQuarterFlat); // Still 61 (rounds up relative to C#, or down relative to Db)
 * // Correction: dQuarterFlat is C# - 50 cents = ~C quarter sharp. midi rounds to nearest.
 * // C is 60. C# is 61. C quarter sharp (60.5) rounds to 61.
 * // Let's try C + 70 cents. Rounds to 61.
 * const c70 = addCentsToNote(c4, 70);
 * const midi_c70 = noteToMidi(c70); // 61 (rounds up)
 * ```
 */
export function noteToMidi(note: Note): number {
  // Return cached value if available
  // Note: Caching might be premature optimization and removed if causing issues.
  if (note.midi !== undefined) {
    return note.midi;
  }

  const baseMidi = calculateMidi(note.pitchClassIndex, note.octave);

  // Check for explicit cents property first
  if (isMicrotonalNote(note)) {
    const centsAdjustment = note.cents;
    // Round to nearest MIDI based on cents offset
    return baseMidi + Math.round(centsAdjustment / CENTS_PER_SEMITONE);
  }

  // Check for microtonal modifier if no cents property
  if (note.microtonalModifier) {
    const centsAdjustment =
      MICROTONAL_CENTS_ADJUSTMENT[note.microtonalModifier] || 0;
    return baseMidi + Math.round(centsAdjustment / CENTS_PER_SEMITONE);
  }

  // If it's not explicitly microtonal via cents/modifier, return the base MIDI.
  // Implicit tuning system adjustments are NOT reflected in the integer MIDI number.
  return baseMidi;
}

/**
 * Formats a Note object into a standard string notation (e.g., "C#4", "Eb5", "F+3").
 * Uses the stored letter, accidental, octave, and microtonal modifier.
 * Uses cached value if available on the Note object.
 *
 * @param note - The Note object to format.
 * @returns The formatted note string, or an empty string if the input is invalid.
 * @example
 * ```ts
 * const cSharp4 = createNoteFromParts({ letter: 'C', accidental: '#', octave: 4 });
 * const notation1 = formatNote(cSharp4); // "C#4"
 *
 * const fQuarterSharp3 = createNoteFromParts({ letter: 'F', octave: 3 }); // Needs microtonal info added
 * // Assuming fQuarterSharp3 is correctly created Note with modifier:
 * // const notation2 = formatNote(fQuarterSharp3); // "F+3" (if modifier is '+')
 * ```
 */
export function formatNote(note: Note): string {
  // Return cached value if available
  // Note: Caching might be premature optimization.
  if (note.notation !== undefined) {
    return note.notation;
  }

  // Input validation
  if (!note || typeof note !== "object") {
    console.warn("Invalid input passed to formatNote:", note);
    return "";
  }
  if (
    typeof note.letter !== "string" ||
    typeof note.accidental !== "string" ||
    typeof note.octave !== "number"
  ) {
    console.warn("Invalid Note object passed to formatNote:", note);
    return "";
  }

  // Use the general formatter
  return formatNotation(
    note.letter,
    note.accidental,
    note.octave,
    note.microtonalModifier || "" // Use stored modifier if present
  );
}

/**
 * Calculates the frequency in Hertz (Hz) for a given Note object.
 * Assumes standard A4 = 440 Hz tuning by default, but uses the A4_FREQUENCY constant.
 * Accurately accounts for microtonal adjustments (cents or modifiers) and potentially
 * different tuning systems if defined on the note.
 * Uses cached value if available on the Note object.
 *
 * @param note - The Note object.
 * @returns The calculated frequency in Hz.
 * @see {@link getMidiWithCents} which provides the precise pitch basis for calculation.
 * @example
 * ```ts
 * const a4 = createNoteFromParts({ letter: 'A', octave: 4 });
 * const freqA4 = noteToFrequency(a4); // Approximately 440.0
 *
 * const c4 = createNoteFromParts({ letter: 'C', octave: 4 });
 * const freqC4 = noteToFrequency(c4); // Approximately 261.63
 *
 * const cQuarterSharp = addCentsToNote(c4, 50);
 * const freqCqs = noteToFrequency(cQuarterSharp); // Approximately 269.3 (halfway between C4 and C#4)
 * ```
 */
export function noteToFrequency(note: Note): number {
  // Return cached value if available
  // Note: Caching might be premature optimization.
  if (note.frequency !== undefined) {
    return note.frequency;
  }

  // Get the potentially fractional MIDI number representing the exact pitch
  const midiWithCents = getMidiWithCents(note);

  // Calculate frequency using the standard formula relative to A4
  // f = A4_freq * 2^((midi_float - A4_midi) / 12)
  const frequency =
    A4_FREQUENCY *
    Math.pow(2, (midiWithCents - A4_MIDI) / SEMITONES_PER_OCTAVE);

  return frequency;
}

/**
 * Calculates a potentially fractional MIDI number representing the precise pitch of a Note,
 * including adjustments for cents offsets, microtonal modifiers, or alternative tuning systems.
 * Standard 12-TET notes will have integer or near-integer values (due to floating point math).
 *
 * @param note - The Note object.
 * @returns The MIDI number as a float, incorporating any pitch deviations from standard 12-TET.
 * Returns the standard integer MIDI if no adjustments apply.
 * @example
 * ```ts
 * const c4 = createNoteFromParts({ letter: 'C', octave: 4 });
 * const midiFloatC4 = getMidiWithCents(c4); // 60.0
 *
 * const cQuarterSharp = addCentsToNote(c4, 50);
 * const midiFloatCqs = getMidiWithCents(cQuarterSharp); // 60.5
 *
 * const cMinus20 = addCentsToNote(c4, -20);
 * const midiFloatCm20 = getMidiWithCents(cMinus20); // 59.8
 *
 * // Assuming a quarter tone modifier '+' maps to +50 cents:
 * // const dPlus4 = createNoteFromParts({ letter: 'D', octave: 4, microtonalModifier: '+' });
 * // const midiFloatDp4 = getMidiWithCents(dPlus4); // 62.5 (D4=62)
 * ```
 */
export function getMidiWithCents(note: Note): number {
  // Start with the base integer MIDI for the note's pitch class and octave
  const baseMidi = calculateMidi(note.pitchClassIndex, note.octave);

  // 1. Prioritize explicit 'cents' property if present (MicrotonalNote type)
  if (isMicrotonalNote(note)) {
    // MicrotonalNote interface guarantees 'cents' property exists
    return baseMidi + note.cents / CENTS_PER_SEMITONE;
  }

  // 2. Apply microtonal modifier if present and no explicit cents
  if (note.microtonalModifier) {
    const centsAdjustment =
      MICROTONAL_CENTS_ADJUSTMENT[note.microtonalModifier] || 0;
    return baseMidi + centsAdjustment / CENTS_PER_SEMITONE;
  }

  // 3. Apply tuning system adjustment if specified (and not standard 12-TET)
  // Requires note object to potentially have a 'tuningSystem' property.
  // This part assumes a flexible Note structure or type checking.
  const tuningSystem = (note as any).tuningSystem as TuningSystem | undefined;
  if (tuningSystem && tuningSystem !== "equalTemperament") {
    const tuning = TUNING_SYSTEMS[tuningSystem];
    // Check if the tuning system provides a cents adjustment function
    if (tuning?.centsAdjustment) {
      const centsAdjustment = tuning.centsAdjustment(note.pitchClassIndex);
      return baseMidi + centsAdjustment / CENTS_PER_SEMITONE;
    }
  }

  // If none of the above apply, it's a standard 12-TET note
  return baseMidi;
}

/**
 * Calculates the precise interval between two notes in cents.
 * This function uses `getMidiWithCents` to determine the exact pitch of each note,
 * including any microtonal adjustments, before calculating the difference.
 *
 * @param note1 - The first Note object.
 * @param note2 - The second Note object.
 * @returns The interval between note1 and note2 in cents. A positive value means note2 is higher.
 * @see {@link intervalInCents} for an alternative calculation method (less recommended).
 * @example
 * ```ts
 * const c4 = createNoteFromParts({ letter: 'C', octave: 4 }); // MIDI 60.0
 * const e4 = createNoteFromParts({ letter: 'E', octave: 4 }); // MIDI 64.0
 * const cents1 = getCentsBetween(c4, e4); // 400.0 (Major Third)
 *
 * const cQuarterSharp = addCentsToNote(c4, 50); // MIDI 60.5
 * const cents2 = getCentsBetween(c4, cQuarterSharp); // 50.0
 * const cents3 = getCentsBetween(cQuarterSharp, e4); // 350.0
 * ```
 */
export function getCentsBetween(note1: Note, note2: Note): number {
  // Get precise fractional MIDI for both notes
  const midi1 = getMidiWithCents(note1);
  const midi2 = getMidiWithCents(note2);

  // Difference in fractional MIDI * 100 cents/semitone
  return (midi2 - midi1) * CENTS_PER_SEMITONE;
}

/**
 * Calculates the deviation in cents of a given frequency from the nearest
 * standard 12-tone equal temperament (12-TET) pitch.
 * Useful for analyzing intonation or comparing with tuners.
 *
 * @pure
 * @param frequency - The frequency in Hz to analyze.
 * @param [referenceFrequency=A4_FREQUENCY] - The reference frequency (usually A4).
 * @param [referenceMidi=A4_MIDI] - The MIDI number corresponding to the reference frequency.
 * @returns The deviation in cents from the nearest 12-TET pitch.
 * Positive values are sharp, negative values are flat.
 * Values range roughly from -50 to +50.
 * @example
 * ```ts
 * const freqSlightlySharpA4 = 442;
 * const deviation1 = calculateCentsDeviation(freqSlightlySharpA4); // Approx +7.8 cents
 *
 * const freqSlightlyFlatC4 = 261;
 * const deviation2 = calculateCentsDeviation(freqSlightlyFlatC4); // Approx -3.9 cents
 * ```
 */
export function calculateCentsDeviation(
  frequency: number,
  referenceFrequency: number = A4_FREQUENCY,
  referenceMidi: number = A4_MIDI
): number {
  // Calculate the exact fractional MIDI number corresponding to the frequency
  const exactMidi =
    SEMITONES_PER_OCTAVE * Math.log2(frequency / referenceFrequency) +
    referenceMidi;

  // Find the nearest integer MIDI number
  const nearestMidi = Math.round(exactMidi);

  // The difference in fractional MIDI represents the deviation in semitones.
  // Convert this difference to cents.
  return (exactMidi - nearestMidi) * CENTS_PER_SEMITONE;
}

/**
 * Converts an interval measured in cents into a frequency ratio.
 * For example, 1200 cents (an octave) yields a ratio of 2.0.
 * 700 cents (approx perfect fifth) yields a ratio of ~1.5.
 *
 * @pure
 * @param cents - The interval size in cents.
 * @returns The corresponding frequency ratio multiplier.
 * @example
 * ```ts
 * const octaveRatio = centsToRatio(1200); // 2.0
 * const p5Ratio = centsToRatio(701.955); // Approximately 1.5 (3/2)
 * const m3Ratio = centsToRatio(300);     // Approximately 1.189 (2^(3/12))
 * ```
 */
export function centsToRatio(cents: number): number {
  // Formula: ratio = 2^(cents / 1200)
  return Math.pow(2, cents / (CENTS_PER_SEMITONE * SEMITONES_PER_OCTAVE)); // 1200 cents per octave
}

/**
 * Calculates the precise interval between two notes in cents, considering microtonal adjustments.
 * This function calculates the standard 12-TET interval first and then applies
 * the cents/modifier offsets from each note.
 *
 * @deprecated Consider using {@link getCentsBetween} which is generally more direct and less prone
 * to potential intermediate rounding issues by using fractional MIDI values directly.
 * @param note1 - The starting Note object.
 * @param note2 - The ending Note object.
 * @returns The interval in cents. Positive means note2 is higher.
 * @remarks This method calculates the base semitone difference first, converts to cents,
 * and then manually adds/subtracts the microtonal offsets stored on the notes.
 * While often producing the same result as `getCentsBetween`, the latter is preferred
 * as it relies on the unified `getMidiWithCents` calculation.
 */
export function intervalInCents(note1: Note, note2: Note): number {
  // Calculate the basic interval in semitones based on pitch class and octave
  const octaveDifference = note2.octave - note1.octave;
  // Ensure pitch class difference wraps correctly (e.g., B to C is +1)
  const pitchClassDifference = note2.pitchClassIndex - note1.pitchClassIndex;
  const semitonesBase =
    pitchClassDifference + octaveDifference * SEMITONES_PER_OCTAVE;

  // Convert base semitone difference to cents
  let cents = semitonesBase * CENTS_PER_SEMITONE;

  // Add/Subtract microtonal adjustments from each note

  // Adjustment for note2
  if (isMicrotonalNote(note2)) {
    cents += note2.cents;
  } else if (note2.microtonalModifier) {
    cents += MICROTONAL_CENTS_ADJUSTMENT[note2.microtonalModifier] || 0;
  } else {
    // Check for tuning system adjustment on note2 if applicable
    const ts2 = (note2 as any).tuningSystem as TuningSystem | undefined;
    if (
      ts2 &&
      ts2 !== "equalTemperament" &&
      TUNING_SYSTEMS[ts2]?.centsAdjustment
    ) {
      cents += TUNING_SYSTEMS[ts2].centsAdjustment(note2.pitchClassIndex);
    }
  }

  // Adjustment for note1 (subtracting)
  if (isMicrotonalNote(note1)) {
    cents -= note1.cents;
  } else if (note1.microtonalModifier) {
    cents -= MICROTONAL_CENTS_ADJUSTMENT[note1.microtonalModifier] || 0;
  } else {
    // Check for tuning system adjustment on note1 if applicable
    const ts1 = (note1 as any).tuningSystem as TuningSystem | undefined;
    if (
      ts1 &&
      ts1 !== "equalTemperament" &&
      TUNING_SYSTEMS[ts1]?.centsAdjustment
    ) {
      cents -= TUNING_SYSTEMS[ts1].centsAdjustment(note1.pitchClassIndex);
    }
  }

  return cents;
}

/**
 * Transposes a Note by a precise interval specified in cents.
 * This function handles both the whole semitone steps and the fine-tuning
 * adjustments within a semitone. It correctly combines the transposition cents
 * with any existing microtonal offset on the original note.
 *
 * @param note - The starting Note object.
 * @param cents - The interval to transpose by, in cents. Positive values transpose up, negative down.
 * @param [options] - Optional parameters.
 * @param [options.prefer='sharp'] - Preferred enharmonic spelling if transposition crosses semitone boundaries.
 * @returns A new Note object representing the precisely transposed pitch. The new note may have a `cents` property.
 * @example
 * ```ts
 * const c4 = createNoteFromParts({ letter: 'C', octave: 4 });
 *
 * // Transpose up by a major third (400 cents)
 * const e4 = transposeByCents(c4, 400); // Result is E4 (potentially with cents=0)
 * console.log(formatNote(e4), e4.cents); // E4 0
 *
 * // Transpose up by 50 cents
 * const cqs = transposeByCents(c4, 50); // Result C4 with cents = 50
 * console.log(formatNote(cqs), cqs.cents); // C4 50
 *
 * // Transpose C quarter sharp up by 20 cents
 * const c70 = transposeByCents(cqs, 20); // Result C4 with cents = 70
 * console.log(formatNote(c70), c70.cents); // C4 70
 *
 * // Transpose C quarter sharp up by 80 cents (total 130 -> crosses C#)
 * const cs30 = transposeByCents(cqs, 80); // Result C#4 with cents = 30 (130 cents total -> 1 semitone + 30 cents)
 * console.log(formatNote(cs30), cs30.cents); // C#4 30
 * ```
 */
export function transposeByCents(
  note: Note,
  cents: number,
  options?: { prefer?: EnharmonicPreference }
): Note {
  // 1. Get the exact starting pitch as fractional MIDI
  const startMidiWithCents = getMidiWithCents(note);

  // 2. Calculate the target fractional MIDI
  const targetMidiWithCents = startMidiWithCents + cents / CENTS_PER_SEMITONE;

  // 3. Find the nearest base integer MIDI note
  const nearestMidi = Math.round(targetMidiWithCents);

  // Check MIDI range validity
  if (nearestMidi < 0 || nearestMidi > 127) {
    throw new Error(
      `transposeByCents results in invalid MIDI value: ${nearestMidi} (from ${formatNote(
        note
      )} + ${cents} cents)`
    );
  }

  // 4. Calculate the remaining cents offset from that nearest integer MIDI note
  const remainingCents =
    (targetMidiWithCents - nearestMidi) * CENTS_PER_SEMITONE;

  // 5. Create the base note for the nearest MIDI pitch using the preferred spelling
  const baseTransposedNote = createNoteFromMidi({
    midi: nearestMidi,
    prefer: options?.prefer, // Pass preference along
  });

  // 6. If there's a significant remaining cents offset, add it as a 'cents' property
  // Use a small threshold to avoid floating point noise representing 0 cents.
  const CENTS_THRESHOLD = 1e-6;
  if (Math.abs(remainingCents) > CENTS_THRESHOLD) {
    // Use addCentsToNote which correctly creates a MicrotonalNote or updates existing cents
    return addCentsToNote(baseTransposedNote, remainingCents);
  } else {
    // If remaining cents are negligible, return the standard note
    return baseTransposedNote;
  }
}
