/**
 * @module Chord
 * @description
 * This module provides a comprehensive suite of tools for working with musical chords and chord progressions
 * within the MusicTheoryJS library. It allows for the creation, analysis, manipulation, and interpretation
 * of chords in various contexts, including standard tonal harmony and basic microtonal concepts.
 *
 * Capabilities include:
 * - **Chord Creation:** Construct chords using various methods, such as specifying root and quality (`createChord`),
 * parsing standard chord symbols (`createChordFromSymbol`), building from arrays of notes (`createChordFromNotes`),
 * defining by intervals (`createChordFromIntervals`), or generating specific types like Just Intonation chords (`createJustChord`)
 * and custom microtonal chords (`createMicrotonalChord`).
 * - **Chord Analysis:** Analyze chord structure to determine root, quality, inversion, bass note, tensions,
 * missing/extra tones (`analyzeChord`). Assess harmonic function within a scale (`analyzeChordFunction`),
 * compare chords (`findCommonTones`, `analyzeChordConnection`), and perform basic microtonal analysis (`analyzeMicrotonalChord`).
 * - **Chord Voicing & Manipulation:** Sort chord notes (`sortChordNotes`), determine inversion (`getChordInversion`),
 * and generate all standard inversions (`getAllInversions`). (Advanced voicing generation might be limited).
 * - **Chord Progressions:** Create progressions from Roman numerals (`createProgressionFromRomanNumerals`),
 * common patterns (`createCommonProgression`), or diatonic functions (`createDiatonicProgression`).
 * Analyze progressions (`isProgressionDiatonic`, `analyzeHarmonicRhythm`) and explore possibilities (`suggestNextChords`, `transformProgression`).
 * - **Symbol Parsing:** Parse standard chord notation strings into structured data (`parseChordSymbol`, used by `createChordFromSymbol`).
 * - **Types & Constants:** Defines core types like `Chord`, `ChordQuality`, `ChordFormula`, and exports relevant constants.
 *
 * The module relies heavily on the `Note` module for its building blocks and interacts with the `Scale` module
 * for contextual analysis (like harmonic function). Like other modules, it's designed with tree-shakability in mind.
 *
 * @example
 * ```ts
 * // Basic Chord Creation and Information
 * import { createChordFromSymbol, formatNote } from 'musictheoryjs/chord'; // Adjust import path
 *
 * const gm7 = createChordFromSymbol("Gm7");
 * console.log(`Root: ${formatNote(gm7.root)}`);        // Example: Root: G4 (depends on default octave)
 * console.log(`Quality: ${gm7.quality}`);          // Example: Quality: min7
 * console.log(`Notes: ${gm7.notes.map(formatNote)}`); // Example: Notes: G4,Bb4,D5,F5 (close voicing)
 * console.log(`Category: ${gm7.category}`);        // Example: Category: seventh
 * ```
 *
 * @example
 * ```ts
 * // Chord Progression Example
 * import { createNote } from 'musictheoryjs/note'; // Adjust path
 * import { createScaleByName } from 'musictheoryjs/scale'; // Adjust path
 * import { createProgressionFromRomanNumerals, Chord } from 'musictheoryjs/chord'; // Adjust path
 *
 * const cMajorScale = createScaleByName('C4', 'major');
 * const progression: Chord[] = createProgressionFromRomanNumerals(cMajorScale, ["I", "IV", "V", "I"]);
 * console.log(progression.map(c => c.symbol)); // Example: ['C', 'F', 'G', 'C']
 * ```
 *
 * @see {@link Chord} - The core interface representing a chord.
 * @see {@link createChord} - The primary function for creating chords from root and quality.
 * @see {@link createChordFromSymbol} - Function to create chords by parsing strings.
 * @see {@link analyzeChord} - Function to analyze the structure of a chord.
 * @see {@link createProgression} - Function to create chord progressions.
 */

// Export types defined within the chord module
export * from "./types";

// Export creation functions from chord/creation.ts
export {
  createChord,
  createChordFromSymbol,
  createChordFromNotes,
  createChordFromIntervals,
  parseChordSymbol, // Exposing the parser might be useful
  identifyChord, // Exposing the identifier
  // Microtonal / Just Intonation Chord Creation
  createMicrotonalChord,
  createJustChord,
} from "./creation";

// Export voicing functions from chord/voicing.ts
export {
  voiceChord, // High-level voicing function (if implemented)
  sortChordNotes, // Utility to sort notes by pitch
  getChordInversion, // Determine inversion number
  getAllInversions, // Generate all inversions
} from "./voicing";

// Export analysis functions from chord/analysis.ts
export {
  analyzeChord,
  chordFitsScale,
  findCommonTones,
  analyzeChordFunction,
  analyzeChordConnection,
  analyzeMicrotonalChord, // Exporting microtonal analysis
  // Re-export analysis result types
  type ChordAnalysisResult,
} from "./analysis";

// Export progression functions from chord/progression.ts
export {
  createProgression, // Generic progression creation (if exists)
  createCommonProgression, // Create from named common progressions
  createProgressionFromRomanNumerals, // Create from Roman numerals in a scale context
  createDiatonicProgression, // Create sequence of diatonic chords
  suggestNextChords, // Heuristic suggestion function
  isProgressionDiatonic, // Check if progression fits a scale
  transformProgression, // Apply transformations (e.g., modal interchange)
  analyzeHarmonicRhythm, // Analyze rhythm of chord changes
} from "./progression";

// Export selected constants from chord/constants.ts? Optional.
// Often internal constants like formulas/maps are not exported directly.
// export { CHORD_FORMULAS, CHORD_CATEGORIES } from './constants'; // Example if needed
