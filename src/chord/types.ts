/**
 * Core type definitions for musical chords
 */

import { EnharmonicPreference, Note, TuningSystem } from "../note/types";

import { Scale } from "../scale/types";

/**
 * Standard chord quality names
 */
export type ChordQuality =
  // Triads
  | "major"
  | "minor"
  | "augmented"
  | "diminished"
  | "sus2"
  | "sus4"
  // Seventh chords
  | "maj7"
  | "min7"
  | "dom7"
  | "7"
  | "minMaj7"
  | "dim7"
  | "half-dim7"
  | "aug7"
  // Extended chords
  | "maj9"
  | "min9"
  | "9"
  | "maj11"
  | "min11"
  | "11"
  | "maj13"
  | "min13"
  | "13"
  // Altered chords
  | "7b5"
  | "7#5"
  | "7b9"
  | "7#9"
  | "7#11"
  | "7b13"
  // Add chords
  | "add9"
  | "add11"
  | "add13"
  // Sus chords
  | "sus2"
  | "sus4"
  | "7sus4"
  | "9sus4"
  // Specific tensions
  | "6"
  | "min6"
  | "6/9"
  | "min6/9";

/**
 * Chord quality category
 */
export type ChordCategory =
  | "triad" // 3-note chords (major, minor, etc)
  | "seventh" // 4-note chords with a 7th
  | "extended" // Chords with 9th, 11th, 13th
  | "altered" // Chords with altered tensions (#9, b5, etc)
  | "suspended" // Sus chords (sus2, sus4)
  | "added tone" // Add chords (add9, etc)
  | "slash" // Slash chords (C/E, etc)
  | "special"; // Other specialized chord types

/**
 * Chord inversion indication
 */
export type ChordInversion =
  | 0 // Root position
  | 1 // First inversion
  | 2 // Second inversion
  | 3 // Third inversion (seventh chords)
  | "root" // Root position
  | "1st" // First inversion
  | "2nd" // Second inversion
  | "3rd"; // Third inversion

/**
 * Structure indicating intervals for a chord
 * Keys are scale degrees (1, 3, 5, 7, etc)
 * Values are semitone adjustments (0=natural, 1=sharp, -1=flat)
 */
export type ChordFormula = Record<number, number>;

/**
 * Roman numeral for chord analysis
 */
export type RomanNumeral =
  | "I"
  | "II"
  | "III"
  | "IV"
  | "V"
  | "VI"
  | "VII"
  | "i"
  | "ii"
  | "iii"
  | "iv"
  | "v"
  | "vi"
  | "vii";

/**
 * Represents a musical chord
 */
export interface Chord {
  /** The root note of the chord */
  readonly root: Note;

  /** The notes that make up the chord */
  readonly notes: ReadonlyArray<Note>;

  /** The quality of the chord (major, minor, etc.) */
  readonly quality: ChordQuality;

  /** The formula used to construct the chord */
  readonly formula: ChordFormula;

  /** The bass note of the chord (for inversions or slash chords) */
  readonly bass: Note;

  /** The inversion of the chord (0=root, 1=first, etc.) */
  readonly inversion: number;

  /** The category of the chord */
  readonly category: ChordCategory;

  /** Symbolic representation of the chord (e.g., "Cmaj7") */
  readonly symbol?: string;

  /** The tuning system used for the chord */
  readonly tuningSystem?: TuningSystem;
}

/**
 * Options for chord creation
 */
export interface ChordOptions {
  /** Preferred method for naming enharmonic notes */
  prefer?: EnharmonicPreference;

  /** The voicing strategy for the chord */
  voicing?: "close" | "open" | "drop2" | "drop3" | "custom";

  /** The inversion of the chord */
  inversion?: ChordInversion;

  /** The bass note for slash chords */
  bass?: Note;

  /** The octave number for the root (default: 4) */
  rootOctave?: number;

  /** Whether to cache computed values in notes */
  includeCachedValues?: boolean;

  /** Tuning system for the chord */
  tuningSystem?: TuningSystem;
}

/**
 * Chord progression represented by chord symbols or objects
 */
export type ChordProgression = Array<string | Chord>;

/**
 * Roman numeral analysis of a chord in a key
 */
export interface RomanAnalysis {
  /** The roman numeral (e.g., "V7") */
  readonly numeral: string;

  /** The scale degree (1-7) */
  readonly degree: number;

  /** Whether the chord is major (true) or minor (false) */
  readonly isMajor: boolean;

  /** The chord quality beyond major/minor (e.g., "7", "dim", etc.) */
  readonly quality: string;

  /** The inversion as a string (e.g., "6" for first inversion) */
  readonly inversion: string;

  /** The scale this analysis is relative to */
  readonly scale?: Scale;
}
