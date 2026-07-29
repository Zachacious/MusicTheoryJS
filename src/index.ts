/**
 * @module musictheoryjs
 * MusicTheoryJS v3 — a music theory library built on a spelled-pitch core.
 *
 * Enharmonic spelling is exact everywhere because pitches store their
 * spelling (letter step + alteration), intervals carry quality (letter
 * distance + chromatic distance), and everything else — chords, scales,
 * keys, roman numerals, progressions — derives spellings by arithmetic on
 * those types. Strings are accepted everywhere and never required.
 *
 * @example
 * ```ts
 * import { transpose, noteName, chord, scale, majorKey, romanToChord } from "musictheoryjs";
 *
 * noteName(transpose("Eb4", "P5")); // => "Bb4"
 * chord("Cm7b5").notes; // => ["C", "Eb", "Gb", "Bb"]
 * scale("F# dorian").notes; // => ["F#", "G#", "A", "B", "C#", "D#", "E"]
 * majorKey("Eb").secondaryDominants; // => ["", "C7", "D7", "Eb7", "F7", "G7", ""]
 * romanToChord("V7/V", "C major").symbol; // => "D7"
 * ```
 *
 * Microtonality is first-class: `cents` lives on `Pitch` itself, and tuning
 * systems are keyed on *spelled* pitches, so meantone and Pythagorean tuning
 * genuinely distinguish G# from Ab:
 *
 * ```ts
 * import { addCents, microtonalName, justNote, meantoneTuning, frequency, equalTemperament } from "musictheoryjs";
 *
 * microtonalName(addCents("C4", 250)); // => "D4+50c"
 * justNote("C4", "M3").cents; // => ~-13.69
 * meantoneTuning().offset("G#"); // => ~-17.11
 * meantoneTuning().offset("Ab"); // => ~23.95
 * frequency("A4", equalTemperament({ a4: 432 })); // => 432
 * ```
 */

export * from "./core";
export * from "./pcset";
export {
  CHORD_TYPES,
  SCALE_TYPES,
  type ChordTypeData,
  type ScaleTypeData,
  type ChordDetection,
  type DetectChordsOptions,
  type DetectScalesOptions,
  type ScaleDetection,
  detectChords,
  detectScales,
  getChordType,
  getChordTypeByChroma,
  getScaleType,
  getScaleTypeByChroma,
} from "./dict";
export {
  type Chord,
  type ChordTokenizeFailure,
  type ChordTokens,
  chord,
  chordDisplayAlias,
  chordNotes,
  isChord,
  resolveChordQuality,
  suggestChordQuality,
  tokenizeChordSymbol,
  transposeChord,
  tryChord,
} from "./chord";
export {
  type Scale,
  isScale,
  mode,
  modes,
  scale,
  scaleBrightness,
  scaleChords,
  scaleNotes,
  tryScale,
} from "./scale";
export {
  type Key,
  type KeyHarmony,
  type MajorKey,
  type MinorKey,
  key,
  majorKey,
  minorKey,
  tryKey,
} from "./key";
export {
  type RomanNumeral,
  chordToRoman,
  isRomanNumeral,
  romanNumeral,
  romanToChord,
  tryRomanNumeral,
} from "./roman";
export {
  type ChordSuggestion,
  type ProgressionStep,
  type SuggestNextChordsOptions,
  COMMON_PROGRESSIONS,
  parseProgression,
  progressionChords,
  progressionRomans,
  suggestNextChords,
} from "./progression";
export {
  type CentsOptions,
  CENTS_PER_OCTAVE,
  JUST_RATIOS,
  addCents,
  centsBetween,
  centsToRatio,
  edoScale,
  edoStepCents,
  edoTranspose,
  fromRatio,
  justNote,
  justRatio,
  microtonalName,
  parseRatio,
  ratioToCents,
} from "./micro";
export {
  type Cadence,
  type CadenceType,
  type ChordScaleMatch,
  type ChordScalesOptions,
  type DetectKeysOptions,
  type DetectModulationsOptions,
  type KeyDetection,
  type KeyDetectionInput,
  type ModulationSegment,
  type ParallelMotion,
  type VoiceLeadingOptions,
  type Voicing,
  type WeightedNote,
  analyzeCadences,
  borrowedFrom,
  chordScales,
  chromaticMediants,
  detectCadence,
  detectKeys,
  detectModulations,
  findParallels,
  leadingToneExchange,
  negativeChord,
  negativeNote,
  neoRiemannian,
  nextVoicing,
  parallel,
  relative,
  voiceChord,
  voiceLeadingCost,
  voiceProgression,
} from "./harmony";
export {
  type JustTuningOptions,
  type MeantoneOptions,
  type PitchBendOptions,
  type Tuning,
  type TuningOptions,
  PURE_FIFTH_CENTS,
  SYNTONIC_COMMA_CENTS,
  edoTuning,
  equalTemperament,
  frequency,
  getTuning,
  isTuning,
  justTuning,
  meantoneTuning,
  pitchBend,
  pythagoreanTuning,
  registerTuning,
  resolveTuning,
  tuningNames,
  tuningOffset,
} from "./tuning";

/** The current version of the MusicTheoryJS library. */
export const VERSION = "3.1.0";
