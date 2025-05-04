/**
 * Main entry point for the chord module
 */

// Export types
export * from "./types";

// Export creation functions
export {
  createChord,
  createChordFromSymbol,
  createChordFromNotes,
  createChordFromIntervals,
  parseChordSymbol,
  identifyChord,
} from "./creation";

// Export voicing functions
export {
  voiceChord,
  sortChordNotes,
  getChordInversion,
  getAllInversions,
} from "./voicing";

// Export analysis functions
export {
  analyzeChord,
  chordFitsScale,
  findCommonTones,
  analyzeChordFunction,
  analyzeChordConnection,
  type ChordAnalysisResult,
} from "./analysis";

// Export progression functions
export {
  createProgression,
  createCommonProgression,
  createProgressionFromRomanNumerals,
  createDiatonicProgression,
  suggestNextChords,
  isProgressionDiatonic,
  transformProgression,
  analyzeHarmonicRhythm,
} from "./progression";
