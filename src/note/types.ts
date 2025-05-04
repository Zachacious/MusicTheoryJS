/**
 * @module Note/Types
 * @description
 * This module defines the core TypeScript types, interfaces, and type guards
 * used for representing musical notes and related concepts throughout the library.
 * It establishes the fundamental data structures for notes, including standard
 * 12-TET pitches and extensions for microtonal information.
 */

/**
 * Represents the index of a pitch class within a standard 12-tone octave,
 * typically mapping C=0, C#/Db=1, ..., B=11.
 * @typedef {0|1|2|3|4|5|6|7|8|9|10|11} PitchClassIndex
 */
export type PitchClassIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/**
 * Represents the standard diatonic letter names for musical notes (A through G).
 * @typedef {'A'|'B'|'C'|'D'|'E'|'F'|'G'} NoteLetter
 */
export type NoteLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G";

/**
 * Represents standard musical accidentals modifying a note's pitch.
 * An empty string (`''`) denotes a natural note.
 * 'x' is typically used as a synonym for '##' (double sharp).
 * @typedef {''|'#'|'b'|'##'|'x'|'bb'} Accidental
 */
export type Accidental = "" | "#" | "b" | "##" | "x" | "bb";

/**
 * Represents common microtonal symbols used to modify a note's pitch
 * beyond standard accidentals, often indicating quarter-tones or smaller deviations.
 * The exact cents value associated with these modifiers is defined in constants.
 * An empty string (`''`) indicates no microtonal modification.
 *
 * '+' typically means quarter-sharp (+50 cents).
 * '-' typically means quarter-flat (-50 cents).
 * '↑'/'↓' typically mean smaller upward/downward adjustments (e.g., +/- 25 cents).
 *
 * @typedef {''|'+'|'-'|'++'|'--'|'↑'|'↓'} MicrotonalModifier
 */
export type MicrotonalModifier =
  | ""
  | "+" // quarter sharp (e.g., +50 cents)
  | "-" // quarter flat (e.g., -50 cents)
  | "++" // three-quarter sharp (e.g., +150 cents)
  | "--" // three-quarter flat (e.g., -150 cents)
  | "↑" // arrow up - slight raise (e.g., +25 cents)
  | "↓"; // arrow down - slight lower (e.g., -25 cents)

/**
 * Specifies the preferred spelling convention ('sharp' or 'flat') when a pitch
 * can be represented by multiple enharmonically equivalent note names (e.g., C# vs. Db).
 * @typedef {'sharp'|'flat'} EnharmonicPreference
 */
export type EnharmonicPreference = "sharp" | "flat";

/**
 * Represents different tuning systems that define how pitches are derived.
 * This affects frequency calculations and potentially note spellings or cents deviations.
 *
 * - `equalTemperament`: Standard 12-tone equal temperament (default).
 * - `pythagorean`: Based on stacking pure perfect fifths.
 * - `justIntonation`: Based on simple integer frequency ratios.
 * - `quarterTone`: 24-tone equal temperament.
 * - `custom`: Placeholder for user-defined or other systems.
 *
 * @typedef {'equalTemperament'|'pythagorean'|'justIntonation'|'quarterTone'|'custom'} TuningSystem
 */
export type TuningSystem =
  | "equalTemperament" // Standard 12-tone equal temperament
  | "pythagorean"
  | "justIntonation"
  | "quarterTone" // 24-tone equal temperament
  | "custom"; // User-defined tuning

/**
 * Represents a specific musical note, potentially including microtonal information
 * and cached derived values like MIDI number, notation string, and frequency.
 * Core properties (`letter`, `accidental`, `octave`, `pitchClassIndex`) define the note's identity.
 * Instances created by library functions should be treated as immutable.
 *
 * @interface Note
 * @property {NoteLetter} letter - The diatonic letter name (A-G). Readonly.
 * @property {Accidental} accidental - The accidental ('', '#', 'b', '##', 'bb', 'x'). Readonly.
 * @property {number} octave - The scientific octave number (e.g., 4 for Middle C). Readonly.
 * @property {PitchClassIndex} pitchClassIndex - The index of the pitch class (0-11, C=0) based on letter, accidental. Readonly.
 * @property {number} [midi] - Optional cached MIDI number (integer 0-127, Middle C = 60). Can be derived via `noteToMidi`. Readonly.
 * @property {string} [notation] - Optional cached string notation (e.g., 'C#4', 'F+3'). Can be derived via `formatNote`. Readonly.
 * @property {number} [frequency] - Optional cached frequency in Hz (based on A4=440Hz standard and any microtonal adjustments). Can be derived via `noteToFrequency`. Readonly.
 * @property {number} [cents] - Optional cents deviation from the standard 12-TET pitch defined by `pitchClassIndex` and `octave`. 0 or undefined for standard notes. Defines microtonal pitch precisely. Readonly.
 * @property {MicrotonalModifier} [microtonalModifier] - Optional symbol representing microtonal alteration (e.g., '+', '-') for notation. May correlate with `cents`. Readonly.
 */
export interface Note {
  /** The diatonic letter name (A-G) */
  readonly letter: NoteLetter;
  /** The accidental ('', '#', 'b', '##', 'bb', 'x') */
  readonly accidental: Accidental;
  /** The scientific octave number (e.g., 4 for Middle C) */
  readonly octave: number;
  /** The index of the pitch class (0-11, C=0) */
  readonly pitchClassIndex: PitchClassIndex;
  /** The MIDI number of the note's base 12-TET pitch (Middle C = 60) - may be cached. */
  readonly midi?: number;
  /** The formatted string notation of the note (e.g., 'C#4') - may be cached. */
  readonly notation?: string;
  /** The calculated frequency in Hz (A4 = 440Hz standard) - may be cached. */
  readonly frequency?: number;
  /** Cents deviation from the standard 12-TET pitch defined by the note's MIDI value. Undefined or 0 for standard notes. */
  readonly cents?: number;
  /** Microtonal modifier symbol (e.g., '+', '-') used for notation - may be cached or assigned. */
  readonly microtonalModifier?: MicrotonalModifier;
  // Potential future property:
  // readonly tuningSystem?: TuningSystem;
}

/**
 * Represents a Note explicitly intended to have microtonal properties,
 * primarily indicated by a defined `cents` value deviating from zero.
 * This interface helps in contexts where microtonal handling is specific.
 * It extends the base `Note` interface.
 *
 * @interface MicrotonalNote
 * @extends {Note}
 * @property {number} cents - Cents deviation from equal temperament. While technically optional on `Note`, it's the defining characteristic checked by `isMicrotonalNote`. Readonly.
 * @property {MicrotonalModifier} [microtonalModifier] - Optional microtonal modifier symbol. Readonly.
 * @property {TuningSystem} [tuningSystem] - Optional tuning system associated with the note. Readonly.
 */
export interface MicrotonalNote extends Note {
  /** Cents deviation from the base 12-TET pitch (required for microtonal interpretation by `isMicrotonalNote` if non-zero). */
  readonly cents: number; // While extending Note where it's optional, functionally expected here.
  /** Microtonal modifier symbol (e.g., '+', '-'). Often correlates with `cents` but might be present even if `cents` is 0. */
  readonly microtonalModifier?: MicrotonalModifier; // Still optional, might just have cents offset.
  /** The tuning system this note might belong to (e.g., 'justIntonation', 'quarterTone'). */
  readonly tuningSystem?: TuningSystem; // Optional tuning system context.
}

/**
 * Type guard function to safely determine if a given Note object represents a microtonal pitch.
 * It currently checks if the `cents` property is defined and not equal to zero.
 *
 * @param note - The Note object to check.
 * @returns `true` if the note has a defined, non-zero `cents` property, `false` otherwise. Narrows the type to `MicrotonalNote` if true.
 * @typeguard {note is MicrotonalNote}
 * @example
 * ```ts
 * const note1 = createNote({ midi: 60 }); // Standard C4
 * const note2 = addCentsToNote(note1, 25); // C4 + 25 cents
 *
 * if (isMicrotonalNote(note1)) {
 * // This block will not execute
 * }
 * if (isMicrotonalNote(note2)) {
 * // This block will execute
 * console.log(note2.cents); // 25 (type is narrowed to MicrotonalNote)
 * }
 * ```
 */
export function isMicrotonalNote(
  note: Note | null | undefined
): note is MicrotonalNote {
  // Check if note exists and has a 'cents' property that is a number and not zero.
  // Use a small epsilon for zero check due to potential floating point inaccuracies.
  return (
    note != null &&
    typeof note.cents === "number" &&
    Math.abs(note.cents) > 1e-9
  );
}
