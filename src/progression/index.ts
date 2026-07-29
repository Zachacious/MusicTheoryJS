/**
 * @module progression
 * Progressions: parsing (numerals, symbols, "N.C."), harmonic analysis, and
 * scored next-chord suggestion.
 */

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
