/**
 * Main entry point for the note module.
 * Re-exports public API for easier importing.
 */

// Re-export types
export * from "./types";

// Re-export creation functions
export {
  createNote,
  createNoteFromParts,
  createNoteFromMidi,
  createNoteFromIndex,
  createNoteFromQuarterToneIndex,
  createNoteFromFrequency,
  type CreateNoteOptions,
  type CreateNoteFromPartsOptions,
  type CreateNoteFromMidiOptions,
  type CreateNoteFromIndexOptions,
  type CreateNoteFromQuarterToneIndexOptions,
  type CreateNoteFromFrequencyOptions,
} from "./creation";

// Re-export calculation functions
export {
  noteToMidi,
  formatNote,
  getMidiWithCents,
  getCentsBetween,
  calculateCentsDeviation,
  centsToRatio,
} from "./calculations";

// Re-export frequency functions
export { noteToFrequency, frequencyToNote, retune } from "./frequency";

// Re-export operations
export {
  notesAreEqual,
  notesAreStrictlyEqual,
  transpose,
  intervalBetween,
  centsBetween,
  transposeOctave,
  compareNotes,
  respellNote,
  addCentsToNote,
  createQuarterToneNote,
  transposeByCents,
  convertToQuarterTone,
  type TransposeOptions,
} from "./operations";

// Re-export microtonal utilities
export {
  createJustIntonationNote,
  createEDOSystem,
  createCustomTuning,
  createMicrotonalScale,
  type MicrotonalScaleOptions,
} from "./microtonal";

// Optionally expose constants
export {
  SEMITONES_PER_OCTAVE,
  CENTS_PER_SEMITONE,
  CENTS_PER_OCTAVE,
  MIDDLE_C_MIDI,
  MIDDLE_C_OCTAVE,
  A4_FREQUENCY,
  A4_MIDI,
  JUST_INTONATION_RATIOS,
} from "./constants";
