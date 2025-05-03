/**
 * Core type definitions for musical notes
 */

/** Represents the chromatic pitch classes (0 = C, 1 = C#/Db, ..., 11 = B). */
export type PitchClassIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Represents standard note letter names. */
export type NoteLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G";

/** Represents standard accidentals. '' is Natural. */
export type Accidental = "" | "#" | "b" | "##" | "x" | "bb";

/** Represents microtonal accidental modifications. */
export type MicrotonalModifier =
  | ""
  | "+" // quarter sharp (50 cents)
  | "-" // quarter flat (50 cents)
  | "++" // three-quarter sharp (150 cents)
  | "--" // three-quarter flat (150 cents)
  | "↑" // arrow up - slight raise (variable)
  | "↓"; // arrow down - slight lower (variable)

/** Preferred spelling convention for enharmonically equivalent notes. */
export type EnharmonicPreference = "sharp" | "flat";

/** Tuning system to use for frequency calculations. */
export type TuningSystem =
  | "equalTemperament" // Standard 12-tone equal temperament
  | "pythagorean"
  | "justIntonation"
  | "quarterTone" // 24-tone equal temperament
  | "custom"; // User-defined tuning

/**
 * Represents a specific musical note, defined by its letter name, accidental,
 * octave, and resulting pitch class index.
 * Instances are immutable.
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
  /** The MIDI number of the note (Middle C = 60) - may be calculated lazily */
  readonly midi?: number;
  /** The string notation of the note (e.g., 'C#4') - may be calculated lazily */
  readonly notation?: string;
  /** The frequency in Hz (A4 = 440Hz) - may be calculated lazily */
  readonly frequency?: number;
  /** Cents deviation from equal temperament (0 for standard notes) */
  readonly cents?: number;
  /** Microtonal modifier for notes that deviate from standard 12-tone pitches */
  readonly microtonalModifier?: MicrotonalModifier;
}

/**
 * Extended note interface with explicit microtonal properties
 */
export interface MicrotonalNote extends Note {
  /** Cents deviation from equal temperament (required for microtonal notes) */
  readonly cents: number;
  /** Microtonal modifier for displaying and interpreting the note accurately */
  readonly microtonalModifier: MicrotonalModifier;
  /** The tuning system this note belongs to */
  readonly tuningSystem?: TuningSystem;
}

/**
 * Type guard to check if a note is microtonal
 */
export function isMicrotonalNote(note: Note): note is MicrotonalNote {
  return note.cents !== undefined && note.cents !== 0;
}
