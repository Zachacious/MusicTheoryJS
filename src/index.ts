/**
 * @module MusicTheoryJS
 * @description
 * # MusicTheoryJS - A Comprehensive Music Theory Library
 *
 * Welcome to MusicTheoryJS, a robust library designed for music theory calculations, analysis,
 * and manipulation in JavaScript and TypeScript environments. This library provides tools for
 * working with fundamental musical concepts including Notes, Intervals, Chords, Scales,
 * Progressions, and Tuning Systems.
 *
 * ## Core Features:
 * - **Notes:** Create, transpose, compare notes. Handle frequencies, MIDI values, and microtonal adjustments (cents).
 * - **Intervals:** Define and work with intervals using semitone values.
 * - **Chords:** Create chords from symbols or notes, analyze structure (root, quality, inversion, tensions), parse/generate symbols, handle voicings, analyze function, and work with progressions.
 * - **Scales:** Create scales by name, pattern, or notes. Generate modes, analyze structure, brightness, tension, and relationships. Includes microtonal scale generation (JI, EDO, Custom).
 * - **Tuning:** Apply different tuning systems (JI, Pythagorean, Meantone, EDOs) and manage custom tunings. Convert between cents and ratios.
 * - **Immutability:** Core objects like Note, Scale, Chord are designed to be immutable. Operations return new instances.
 * - **Type Safety:** Built with TypeScript for strong type checking.
 * - **Tree Shakable:** While this main entry point re-exports many features, individual modules (`/note`, `/scale`, etc.) are designed for tree shaking. Importing directly from submodules (e.g., `import { createNote } from 'musictheoryjs/note'`) is recommended for optimal bundle size.
 *
 * This file serves as the main entry point, re-exporting the primary public APIs from the underlying modules.
 * For detailed documentation on specific functions and types, please refer to the generated API documentation
 * or the documentation within the individual module files (e.g., `note/index.ts`, `scale/index.ts`).
 *
 * @example Basic Usage
 * ```ts
 * import { Note, Interval, Scale, Chord, createNote, createScale, createChord, transpose, MAJOR_THIRD, PERFECT_FIFTH } from 'musictheoryjs'; // Assuming main export works like this
 * // Or using specific imports:
 * // import { Note, createNote, transpose } from 'musictheoryjs/note';
 * // import { Scale, createScale } from 'musictheoryjs/scale';
 * // import { Chord, createChord } from 'musictheoryjs/chord';
 * // import { Interval, MAJOR_THIRD, PERFECT_FIFTH } from 'musictheoryjs/interval';
 *
 * const c4 = createNote({ letter: 'C', octave: 4 });
 * const cMajorScale = createScale(c4, 'major');
 * const g7 = createChord({ root: transpose(c4, PERFECT_FIFTH), quality: '7' });
 *
 * console.log(cMajorScale.notes.map(n => n.notation));
 * console.log(g7.symbol);
 * ```
 */

// Re-export everything from the note module
// Includes Note type, creation functions, operations, calculations, etc.
export * from "./note";

// Re-export everything from the scale module
// Includes Scale type, creation functions, operations, analysis, detection, modes, etc.
export * from "./scale";

// Re-export everything from the chord module
// Includes Chord type, creation functions, operations, analysis, voicing, roman numerals, progressions etc.
export * from "./chord";

// Re-export everything from the interval module
// Includes Interval type and interval constants (e.g., MAJOR_THIRD)
export * from "./interval";

/**
 * The current version of the MusicTheoryJS library.
 * @readonly
 * @type {string}
 */
export const VERSION = "3.0.0"; // Keep version updated

// Re-export selected tuning system utilities from the tuning module
// Allows access to predefined systems and registration function from the main entry point.
export { TUNING_SYSTEMS, registerTuningSystem } from "./tuning/tuning";

/**
 * General information about the MusicTheoryJS library.
 * @readonly
 * @property {string} name - The official name of the library.
 * @property {string} version - The current version string (matches VERSION constant).
 * @property {string} description - A brief description of the library.
 * @property {string} author - The author's name (Update if necessary).
 * @property {string} license - The software license (e.g., "MIT").
 * @property {string} repository - URL of the source code repository.
 */
export const LIBRARY_INFO = {
  name: "MusicTheoryJS",
  version: VERSION,
  description: "A comprehensive music theory library for JavaScript/TypeScript",
  author: "Zachacious", // Updated based on repository URL
  license: "ISC",
  repository: "https://github.com/Zachacious/musictheoryjs",
}; // Original code didn't freeze this, so not freezing here.
