/**
 * @module Scale/Types
 * @description
 * This module defines the core TypeScript types and interfaces used for representing
 * musical scales and related concepts within the MusicTheoryJS library.
 * It includes types for scale names, patterns, modes, and the main `Scale` interface itself,
 * along with options for scale creation functions.
 */

// Import necessary types from the Note module
import { EnharmonicPreference, Note, TuningSystem } from "../note/types";

/**
 * Represents the names of recognized scale patterns stored in `SCALE_PATTERNS`.
 * This union type includes common scales, modes, pentatonic, blues, symmetrical,
 * and various other scale types from different traditions.
 * @typedef {'major' | 'minor' | 'harmonicMinor' | ... | 'yo'} ScaleName
 */
export type ScaleName =
  // Common scales
  | "major"
  | "minor" // Natural Minor
  | "harmonicMinor"
  | "melodicMinor" // Often Ascending form
  // Modal scales (Modes of the Major scale)
  | "ionian" // Same as major
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian" // Same as natural minor
  | "locrian"
  // Pentatonic scales
  | "majorPentatonic"
  | "minorPentatonic"
  // Blues and jazzy scales
  | "blues" // Hexatonic blues scale
  | "diminished" // Whole-Half pattern assumed unless specified otherwise
  | "wholeTone"
  | "altered" // Altered scale / Super Locrian
  // Other scales
  | "chromatic" // All 12 semitones
  | "octatonic" // Often synonymous with diminished WH or HW
  | "bebopDominant"
  | "hungarianMinor" // Gypsy Minor
  | "doubleHarmonic" // Byzantine / Major Phrygian
  | "enigmatic"
  | "neapolitan" // Often Neapolitan Major implied
  | "persian"
  | "hirajoshi" // Japanese scale variant
  | "inSen" // Japanese scale
  | "yo"; // Japanese scale (matches minor pentatonic pattern)
// Note: This list should align with the keys in SCALE_PATTERNS constant.

/**
 * Represents a mode identifier, typically for the 7 modes of the Major scale.
 * Can be specified either by name (e.g., "dorian") or by its 1-based numerical index
 * (1 = Ionian, 2 = Dorian, 3 = Phrygian, 4 = Lydian, 5 = Mixolydian, 6 = Aeolian, 7 = Locrian).
 * @typedef {'ionian' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian' | number} ModeName
 */
export type ModeName =
  | "ionian"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian"
  | "locrian"
  | number; // Can also specify by index (1-based, 1 = ionian, etc.)

/**
 * Represents the interval structure of a scale as an immutable array of numbers.
 * Each number indicates the interval (in semitones) from the root note (which is always 0).
 * The array is typically sorted in ascending order.
 * @typedef {ReadonlyArray<number>} ScalePattern
 * @example Major Scale Pattern: `[0, 2, 4, 5, 7, 9, 11]`
 * @example Minor Pentatonic Pattern: `[0, 3, 5, 7, 10]`
 */
export type ScalePattern = ReadonlyArray<number>;

/**
 * Represents a musical scale instance, defined by a root note, a sequence of notes
 * belonging to the scale, the interval pattern, an optional name, and an optional tuning system.
 * Instances should be treated as immutable.
 *
 * @interface Scale
 * @property {Note} root - The root Note object of the scale. Readonly.
 * @property {ReadonlyArray<Note>} notes - An immutable array of Note objects belonging to the scale, typically sorted by pitch and spanning one or more octaves as defined during creation. Readonly.
 * @property {ScalePattern} pattern - An immutable array representing the scale's interval structure as semitones from the root (e.g., [0, 2, 4, 5, 7, 9, 11]). Readonly.
 * @property {ScaleName} [name] - Optional. The recognized name of the scale pattern (e.g., "major", "dorian") if identified or provided. Readonly.
 * @property {TuningSystem} [tuningSystem] - Optional. The tuning system associated with this scale instance (e.g., "equalTemperament", "justIntonation"). Readonly.
 */
export interface Scale {
  /** The root note of the scale */
  readonly root: Note;

  /** The notes in the scale, usually sorted and including the root */
  readonly notes: ReadonlyArray<Note>;

  /** The scale pattern as semitone intervals from the root (e.g., [0, 2, 4...]) */
  readonly pattern: ScalePattern;

  /** The name of the scale if it's a recognized type (e.g., "major", "minorPentatonic") */
  readonly name?: ScaleName;

  /** The tuning system used for the scale (defaults towards 'equalTemperament' if not specified) */
  readonly tuningSystem?: TuningSystem;
}

/**
 * Defines configuration options available when creating Scale objects using
 * various creation functions (e.g., `createScale`, `createScaleByName`).
 *
 * @interface ScaleOptions
 * @property {EnharmonicPreference} [prefer='sharp'] - Specifies the preferred spelling ('sharp' or 'flat') for notes when enharmonic ambiguity arises during scale creation. Defaults to 'sharp'.
 * @property {boolean} [includeOctave=false] - If true, explicitly includes the octave note (root note transposed up 12 semitones * number of octaves) at the end of the `notes` array. Defaults to false.
 * @property {boolean} [sort=true] - If true (default), the `notes` array in the resulting Scale object will be sorted by pitch. If false, the order might depend on the creation method.
 * @property {number} [octaves=1] - The number of octaves the generated `notes` array should span. Defaults to 1.
 * @property {boolean} [includeCachedValues=true] - If true (default), the Note objects within the `notes` array may include pre-calculated `midi`, `notation`, and `frequency` properties for convenience. If false, these properties might be omitted.
 * @property {TuningSystem} [tuningSystem] - Optional. Specifies the tuning system to associate with the created scale object. Defaults towards 'equalTemperament' or might be inferred by specific creation functions (like 'justIntonation').
 */
export interface ScaleOptions {
  /** Preferred method for naming enharmonic notes ('sharp' or 'flat'). Default: 'sharp'. */
  prefer?: EnharmonicPreference;

  /** Whether to include the octave note duplicating the root at the end. Default: false. */
  includeOctave?: boolean;

  /** Whether to sort the generated scale notes by pitch. Default: true. */
  sort?: boolean;

  /** Number of octaves the scale should span in the notes array. Default: 1. */
  octaves?: number;

  /** Whether notes within the scale should include cached computed values (midi, notation, frequency). Default: true. */
  includeCachedValues?: boolean;

  /** Optional. The tuning system associated with this scale. */
  tuningSystem?: TuningSystem;
}
