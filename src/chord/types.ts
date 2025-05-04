/**
 * @module Chord/Types
 * @description
 * This module defines the core TypeScript types and interfaces used for representing
 * musical chords, their qualities, formulas, inversions, categories, and related
 * concepts like progressions and Roman numeral analysis within the MusicTheoryJS library.
 */

// Import dependent types from Note and Scale modules
import { EnharmonicPreference, Note, TuningSystem } from "../note/types";

import { Scale } from "../scale/types"; // Used in RomanAnalysis

/**
 * Represents the names of standard chord qualities recognized by the library.
 * Includes triads, sevenths, extended chords, altered chords, suspended chords,
 * added tone chords, and sixth chords.
 * @typedef {'major' | 'minor' | 'augmented' | 'diminished' | 'sus2' | 'sus4' | 'maj7' | 'min7' | 'dom7' | '7' | 'minMaj7' | 'dim7' | 'half-dim7' | 'aug7' | 'maj9' | 'min9' | '9' | 'maj11' | 'min11' | '11' | 'maj13' | 'min13' | '13' | '7b5' | '7#5' | '7b9' | '7#9' | '7#11' | '7b13' | 'add9' | 'add11' | 'add13' | '6' | 'min6' | '6/9' | 'min6/9'} ChordQuality
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
  | "maj7" // Major 7th (e.g., C-E-G-B)
  | "min7" // Minor 7th (e.g., C-Eb-G-Bb)
  | "dom7" // Dominant 7th (e.g., C-E-G-Bb) - often written as "7"
  | "7" // Alias for dominant 7th
  | "minMaj7" // Minor Major 7th (e.g., C-Eb-G-B)
  | "dim7" // Diminished 7th (e.g., C-Eb-Gb-Bbb)
  | "half-dim7" // Half-diminished 7th (Minor 7 flat 5, e.g., C-Eb-Gb-Bb)
  | "aug7" // Augmented 7th (e.g., C-E-G#-Bb)
  // Extended chords (usually implying underlying 7th)
  | "maj9" // Major 9th
  | "min9" // Minor 9th
  | "9" // Dominant 9th
  | "maj11" // Major 11th
  | "min11" // Minor 11th
  | "11" // Dominant 11th
  | "maj13" // Major 13th
  | "min13" // Minor 13th
  | "13" // Dominant 13th
  // Altered chords (typically based on dominant 7th)
  | "7b5" // Dominant 7th flat 5
  | "7#5" // Dominant 7th sharp 5 (Augmented 7th)
  | "7b9" // Dominant 7th flat 9
  | "7#9" // Dominant 7th sharp 9
  | "7#11" // Dominant 7th sharp 11
  | "7b13" // Dominant 7th flat 13
  // Add chords (Triad + added extension)
  | "add9" // Major triad add 9
  | "add11" // Major triad add 11
  | "add13" // Major triad add 13
  // Sus chords with extensions
  // | "sus2" // Defined above
  // | "sus4" // Defined above
  | "7sus4" // Dominant 7th sus 4
  | "9sus4" // Dominant 9th sus 4
  // Sixth chords
  | "6" // Major 6th chord (Major triad + Major 6th)
  | "min6" // Minor 6th chord (Minor triad + Major 6th)
  | "6/9" // 6/9 chord (Major 6th + 9th)
  | "min6/9"; // Minor 6/9 chord

/**
 * Represents broad categories used to classify chord qualities based on their structure or function.
 * @typedef {'triad' | 'seventh' | 'extended' | 'altered' | 'suspended' | 'added tone' | 'slash' | 'special'} ChordCategory
 */
export type ChordCategory =
  | "triad" // 3-note chords (major, minor, diminished, augmented)
  | "seventh" // 4-note chords built with a 7th (maj7, min7, dom7, dim7, etc.)
  | "extended" // Chords containing tensions beyond the 7th (9th, 11th, 13th)
  | "altered" // Dominant chords with altered 5ths or extensions (b5, #5, b9, #9, etc.)
  | "suspended" // Chords where the 3rd is replaced by a 2nd or 4th (sus2, sus4, 7sus4)
  | "added tone" // Triads with an added note, typically 6th or 9th (add9, 6, m6)
  | "slash" // Chord with a specified bass note different from the root (handled by `Chord.bass`) - Category might overlap others.
  | "special"; // Other specialized or less common chord types (e.g., 6/9, min6/9, potentially custom chords)

/**
 * Represents the inversion of a chord, indicating which chord tone (root, third, fifth, seventh)
 * is the lowest sounding note (the bass). Can be specified as a 0-based number or a standard string name.
 * @typedef {0 | 1 | 2 | 3 | 'root' | '1st' | '2nd' | '3rd'} ChordInversion
 * @property {0 | 'root'} - Root position (root is the bass).
 * @property {1 | '1st'} - First inversion (third is the bass).
 * @property {2 | '2nd'} - Second inversion (fifth is the bass).
 * @property {3 | '3rd'} - Third inversion (seventh is the bass, for 7th chords or larger).
 */
export type ChordInversion =
  | 0 // Root position
  | 1 // First inversion
  | 2 // Second inversion
  | 3 // Third inversion (for seventh chords or larger)
  | "root" // Alias for 0
  | "1st" // Alias for 1
  | "2nd" // Alias for 2
  | "3rd"; // Alias for 3

/**
 * Represents the formula defining a chord's structure relative to a major scale.
 * Keys are 1-based scale degree numbers (1, 3, 5, 7, 9, 11, 13).
 * Values are semitone alterations (0 for major/perfect, -1 for minor/diminished flat, +1 for augmented/sharp, -2 for bb7).
 * @typedef {Record<number, number>} ChordFormula
 * @example Minor 7th Formula: `{ 1: 0, 3: -1, 5: 0, 7: -1 }` (Root, Minor 3rd, Perfect 5th, Minor 7th)
 */
export type ChordFormula = Record<number, number>; // degree -> alteration (0=Maj/Perf, -1=Min/DimFlat, +1=Aug/Sharp)

/**
 * Represents the base Roman numeral characters (I through VII), case-sensitive
 * where uppercase typically denotes Major/Augmented and lowercase denotes minor/diminished.
 * @typedef {'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'i' | 'ii' | 'iii' | 'iv' | 'v' | 'vi' | 'vii'} RomanNumeral
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
 * Represents a musical chord instance, defined by its root note, constituent notes,
 * quality, formula, bass note, inversion, category, symbol, and optional tuning system.
 * Instances should be treated as immutable.
 *
 * @interface Chord
 * @property {Note} root - The theoretical root Note of the chord. Readonly.
 * @property {ReadonlyArray<Note>} notes - An immutable array of the actual Note objects that make up this specific voicing/inversion of the chord, typically sorted by pitch. Readonly.
 * @property {ChordQuality} quality - The identified or specified quality of the chord (e.g., "major", "min7", "7b5"). Readonly.
 * @property {ChordFormula} formula - The theoretical formula defining the chord structure relative to the root (degree -> alteration). Readonly.
 * @property {Note} bass - The lowest sounding Note in this specific instance/voicing of the chord. For slash chords, this is the explicitly specified bass note. Readonly.
 * @property {number} inversion - The calculated inversion number (0=root, 1=1st, 2=2nd, 3=3rd) based on the `bass` note relative to the `root` and `formula`. Readonly.
 * @property {ChordCategory} category - The broad classification of the chord (e.g., "triad", "seventh", "extended"). Readonly.
 * @property {string} [symbol] - Optional cached string representation of the chord (e.g., "Cmaj7", "G7/B"). Can be generated via `generateChordSymbol`. Readonly.
 * @property {TuningSystem} [tuningSystem] - Optional. The tuning system associated with this chord instance (e.g., "equalTemperament", "justIntonation"). Readonly.
 */
export interface Chord {
  /** The root note of the chord */
  readonly root: Note;

  /** The notes that make up the chord, typically sorted */
  readonly notes: ReadonlyArray<Note>;

  /** The quality of the chord (major, minor, min7, 7b5, etc.) */
  readonly quality: ChordQuality;

  /** The formula (degree -> alteration) used to construct the chord */
  readonly formula: ChordFormula;

  /** The bass note of the chord (lowest note in voicing, or specified slash chord bass) */
  readonly bass: Note;

  /** The inversion number (0=root, 1=first, 2=second, 3=third) */
  readonly inversion: number;

  /** The general category of the chord (triad, seventh, etc.) */
  readonly category: ChordCategory;

  /** Optional. Symbolic representation of the chord (e.g., "Cmaj7") - may be calculated */
  readonly symbol?: string;

  /** Optional. The tuning system used for the chord (e.g., 'justIntonation') */
  readonly tuningSystem?: TuningSystem;
}

/**
 * Defines configuration options available when creating Chord objects using
 * various creation functions (e.g., `createChord`, `createChordFromSymbol`).
 *
 * @interface ChordOptions
 * @property {EnharmonicPreference} [prefer='sharp'] - Specifies the preferred spelling ('sharp' or 'flat') for notes generated within the chord when enharmonic ambiguity arises. Defaults to 'sharp'.
 * @property {'close' | 'open' | 'drop2' | 'drop3' | 'custom'} [voicing='close'] - Optional. Specifies a voicing strategy. 'close' (default) typically implies notes are arranged as compactly as possible within an octave or so. Other voicings might involve specific octave displacements or note omissions (support depends on implementation).
 * @property {ChordInversion} [inversion=0] - Optional. Specifies the desired inversion for the chord, either by number (0-3) or string ("root", "1st", "2nd", "3rd"). Defaults to 0 (root position). Overridden if `bass` is provided.
 * @property {Note} [bass] - Optional. Explicitly sets the bass note for the chord (creating a slash chord if different from the root). Overrides the `inversion` option if both are provided.
 * @property {number} [rootOctave=4] - Optional. Specifies the octave number for the root note when creating a chord from a symbol string that doesn't include an octave (e.g., "Cmaj7"). Defaults to 4.
 * @property {boolean} [includeCachedValues=true] - If true (default), the Note objects within the created chord may include pre-calculated `midi`, `notation`, and `frequency` properties.
 * @property {TuningSystem} [tuningSystem] - Optional. Specifies the tuning system to associate with the created chord object and potentially influence note generation if applicable (e.g., for `createJustChord`).
 */
export interface ChordOptions {
  /** Preferred method for naming enharmonic notes ('sharp' or 'flat'). Default: 'sharp'. */
  prefer?: EnharmonicPreference;

  /** The voicing strategy for arranging chord notes. Default: 'close'. */
  voicing?: "close" | "open" | "drop2" | "drop3" | "custom"; // Voicing options

  /** The desired inversion (0, 1, 2, 3 or 'root', '1st', '2nd', '3rd'). Default: 0. */
  inversion?: ChordInversion;

  /** Explicit bass note for slash chords. Overrides inversion. */
  bass?: Note;

  /** Default octave for the root note if created from symbol without octave. Default: 4. */
  rootOctave?: number;

  /** Whether notes within the chord should include cached computed values. Default: true. */
  includeCachedValues?: boolean;

  /** Optional. The tuning system associated with this chord. */
  tuningSystem?: TuningSystem;
}

/**
 * Represents a sequence of chords, typically used for chord progressions.
 * The array can contain either full `Chord` objects or string representations
 * (chord symbols) that can be parsed later.
 * @typedef {Array<string | Chord>} ChordProgression
 */
export type ChordProgression = Array<string | Chord>;

/**
 * Represents the result of analyzing a chord's function within a scale using Roman numerals.
 *
 * @interface RomanAnalysis
 * @property {string} numeral - The complete Roman numeral string, including quality and inversion symbols (e.g., "V7", "ii°6", "IVmaj7"). Readonly.
 * @property {number} degree - The 1-based scale degree corresponding to the chord's root (1-7). Readonly.
 * @property {boolean} isMajor - True if the chord's base quality (triad) is Major or Augmented (typically uppercase numeral), false if minor or diminished (typically lowercase numeral). Readonly.
 * @property {string} quality - A string suffix representing the chord's quality beyond simple major/minor (e.g., "7", "maj7", "°", "+", "ø7"). Empty string for major/minor triads. Readonly.
 * @property {string} inversion - A string representing the inversion using figured bass notation (e.g., "6", "6/4", "4/2"). Empty string for root position. Readonly.
 * @property {Scale} [scale] - Optional. The Scale object that provided the context for this analysis. Readonly.
 */
export interface RomanAnalysis {
  /** The full roman numeral symbol (e.g., "V7", "iiø7", "IV6/4") */
  readonly numeral: string;

  /** The scale degree (1-7) of the chord's root */
  readonly degree: number;

  /** Whether the chord's base quality is major/augmented (true) or minor/diminished (false) */
  readonly isMajor: boolean;

  /** The quality suffix string beyond major/minor/case (e.g., "7", "maj7", "°", "+") */
  readonly quality: string; // Quality modifier string

  /** The inversion suffix string based on figured bass (e.g., "6", "6/4", "4/2") */
  readonly inversion: string; // Figured bass string

  /** Optional: The scale context used for the analysis */
  readonly scale?: Scale;
}
