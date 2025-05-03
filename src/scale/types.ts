/**
 * Core type definitions for musical scales
 */

import { EnharmonicPreference, Note, TuningSystem } from "../note/types";

/**
 * Standard scale types with established names in music theory
 */
export type ScaleName =
  // Common scales
  | "major"
  | "minor"
  | "harmonicMinor"
  | "melodicMinor"
  // Modal scales
  | "ionian"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian"
  | "locrian"
  // Pentatonic scales
  | "majorPentatonic"
  | "minorPentatonic"
  // Blues and jazzy scales
  | "blues"
  | "diminished"
  | "wholeTone"
  | "altered"
  // Other scales
  | "chromatic"
  | "octatonic"
  | "bebopDominant"
  | "hungarianMinor"
  | "doubleHarmonic"
  | "enigmatic"
  | "neapolitan"
  | "persian"
  | "hirajoshi"
  | "inSen"
  | "yo";

/**
 * Represents a mode derived from a scale
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
 * Scale pattern represented as semitone intervals from the root
 * e.g. [0, 2, 4, 5, 7, 9, 11] represents a major scale
 */
export type ScalePattern = ReadonlyArray<number>;

/**
 * Represents a musical scale - a collection of notes with a root
 */
export interface Scale {
  /** The root note of the scale */
  readonly root: Note;

  /** The notes in the scale, including the root */
  readonly notes: ReadonlyArray<Note>;

  /** The scale pattern as semitone intervals from the root */
  readonly pattern: ScalePattern;

  /** The name of the scale if it's a recognized type */
  readonly name?: ScaleName;

  /** The tuning system used for the scale (equal temperament by default) */
  readonly tuningSystem?: TuningSystem;
}

/**
 * Options for scale creation
 */
export interface ScaleOptions {
  /** Preferred method for naming enharmonic notes */
  prefer?: EnharmonicPreference;

  /** Whether to include octave notes (default: false) */
  includeOctave?: boolean;

  /** Whether to sort notes by pitch (default: true) */
  sort?: boolean;

  /** Maximum number of octaves to span (default: 1) */
  octaves?: number;

  /** Whether to cache computed values in notes (default: true) */
  includeCachedValues?: boolean;

  /** Tuning system for the scale */
  tuningSystem?: TuningSystem;
}
