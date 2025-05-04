/**
 * @module Note
 * @description
 * This module serves as the main entry point for the `note` functionality within
 * the music theory library. It provides a comprehensive toolkit for representing,
 * creating, manipulating, and analyzing musical notes in TypeScript.
 *
 * The module supports standard 12-tone equal temperament (12-TET) notes as well as
 * various microtonal concepts, including explicit cents deviations, symbolic modifiers
 * (like quarter-tones), Just Intonation ratios, Equal Divisions of the Octave (EDO) systems,
 * and custom tuning definitions.
 *
 * Core features re-exported here include:
 * - **Types:** Definitions for `Note`, `MicrotonalNote`, `Accidental`, `NoteLetter`, etc.
 * - **Creation Functions:** Flexible ways to create notes from parts (`createNoteFromParts`),
 * MIDI (`createNoteFromMidi`), frequency (`createNoteFromFrequency`), index (`createNoteFromIndex`),
 * ratios (`createNoteByRatio`, `createJustIntonationNote`), quarter-tone indices, or via the
 * universal `createNote` function.
 * - **Operations:** Functions for comparing notes (`notesAreEqual`, `compareNotes`),
 * transposing by intervals or cents (`transpose`, `transposeByCents`, `transposeOctave`),
 * calculating intervals (`intervalBetween`, `centsBetween`), respelling enharmonically (`respellNote`),
 * and microtonal adjustments (`addCentsToNote`, `createQuarterToneNote`, `convertToQuarterTone`).
 * - **Calculations:** Utilities to convert between notes and MIDI/frequency (`noteToMidi`, `noteToFrequency`),
 * format notation (`formatNote`), handle cents (`getMidiWithCents`, `getCentsBetween`, `centsToRatio`),
 * and analyze frequency deviation (`calculateCentsDeviation`).
 * - **Microtonal Systems:** Tools to work with specific systems like Just Intonation (`createJustIntonationNote`),
 * EDOs (`createEDOSystem`), Custom Tunings (`createCustomTuning`), and generate microtonal scales (`createMicrotonalScale`).
 * - **Constants:** Essential musical constants like `A4_FREQUENCY`, `SEMITONES_PER_OCTAVE`, etc.
 *
 * This module is designed with tree-shakability in mind. Importing only the specific functions
 * you need is recommended for smaller bundle sizes:
 * `import { createNote, transpose } from 'your-library/note';`
 *
 * @example
 * ```ts
 * // Basic Usage: Create and transpose a standard note
 * import { createNote, transpose, formatNote } from 'your-library/note'; // Adjust import path
 * import { MAJOR_THIRD } from 'your-library/interval'; // Adjust import path
 *
 * const c4 = createNote({ letter: 'C', octave: 4 });
 * const e4 = transpose(c4, MAJOR_THIRD);
 * console.log(formatNote(e4)); // Output: "E4"
 * ```
 *
 * @example
 * ```ts
 * // Microtonal Usage: Create a Just Intonation note
 * import { createNote, createJustIntonationNote, formatNote } from 'your-library/note'; // Adjust import path
 *
 * const refA4 = createNote({ midi: 69 }); // A4 reference
 * const justE5 = createJustIntonationNote(refA4, "5/3"); // Just Major Sixth ratio from A4 -> E5 (approx)
 * console.log(formatNote(justE5), justE5.cents?.toFixed(1)); // Example output: "E5 -15.6c" (relative to ET)
 * ```
 * @see {@link Note} - The core interface for notes.
 * @see {@link createNote} - The universal note creation function.
 * @see {@link transpose} - Function for transposing notes by semitones.
 * @see {@link transposeByCents} - Function for transposing notes by precise cents values.
 * @see {@link noteToFrequency} - Function to calculate note frequency.
 * @see {@link createMicrotonalScale} - Function to generate scales in various tuning systems.
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
  // Re-exporting createNoteByRatio from creation (assuming it's preferred/canonical)
  // If the one in frequency.ts is needed, it should be exported explicitly there and imported/re-exported here if desired.
  createNoteByRatio,
  // Export Option types alongside their functions
  type CreateNoteOptions,
  type CreateNoteFromPartsOptions,
  type CreateNoteFromMidiOptions,
  type CreateNoteFromIndexOptions,
  type CreateNoteFromQuarterToneIndexOptions,
  type CreateNoteFromFrequencyOptions,
} from "./creation";

// Re-export core calculation functions
export {
  noteToMidi, // Base integer MIDI
  formatNote, // Standard formatting
  getMidiWithCents, // Precise pitch as fractional MIDI
  getCentsBetween, // Precise interval in cents
  calculateCentsDeviation, // Frequency deviation from ET
  centsToRatio, // Convert cents interval to frequency ratio
} from "./calculations";

// Re-export core frequency functions
export {
  noteToFrequency, // Get frequency from note
  frequencyToNote, // Get note from frequency
  retune, // Adjust note for different A4 reference
  getFrequencyRatio, // Ratio between two notes' frequencies
  // createNoteByRatio is also in frequency.ts - ensure only one is exported or rename
} from "./frequency";

// Re-export operation functions
export {
  notesAreEqual, // Pitch equality check (with tolerance)
  notesAreStrictlyEqual, // Strict equality check (spelling, pitch, microtones)
  transpose, // Transpose by semitones (with options)
  intervalBetween, // Interval in semitones (optional cents precision)
  centsBetween, // Interval precisely in cents
  transposeOctave, // Transpose by octaves
  compareNotes, // Compare pitch for sorting
  respellNote, // Change enharmonic spelling
  addCentsToNote, // Add cents offset, returns MicrotonalNote
  createQuarterToneNote, // Convenience for +/- 50 cents
  transposeByCents, // Transpose precisely by cents
  convertToQuarterTone, // Convert note to nearest 24-TET representation
  // Export Option types alongside their functions
  type TransposeOptions,
} from "./operations";

// Re-export microtonal utilities
export {
  createJustIntonationNote, // Create note by JI ratio
  createEDOSystem, // Factory for EDO system tools
  createCustomTuning, // Factory for custom tuning tools
  createMicrotonalScale, // Generate microtonal scales
  // Export Option types alongside their functions
  type MicrotonalScaleOptions,
} from "./microtonal";

// Optionally re-export selected common constants for convenience
export {
  SEMITONES_PER_OCTAVE,
  CENTS_PER_SEMITONE,
  CENTS_PER_OCTAVE,
  MIDDLE_C_MIDI,
  MIDDLE_C_OCTAVE,
  A4_FREQUENCY,
  A4_MIDI,
  JUST_INTONATION_RATIOS, // Exposing the example JI ratios map
} from "./constants"; // Note: Be selective about exporting constants to avoid polluting namespace unnecessarily
