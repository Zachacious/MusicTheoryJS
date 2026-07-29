/**
 * @module Scale
 * @description
 * This module provides a comprehensive suite for working with musical scales in MusicTheoryJS.
 * It allows users to create scales using various methods (predefined names, interval patterns,
 * step sequences, note arrays, specific tuning systems like Just Intonation or EDOs),
 * perform operations on scales (transposition, mode generation, degree extraction),
 * analyze scale properties (structure, intervals, brightness, tension, function),
 * and detect potential scales or keys from sets of notes.
 *
 * The module integrates closely with the `Note` module, using Note objects as the building blocks
 * for scales. Both standard 12-TET scales and microtonal scales (created via specific functions
 * or custom patterns) can be represented and analyzed.
 *
 * Designed with tree-shakability in mind, users are encouraged to import only the specific
 * functions and types needed for their application.
 *
 * @example
 * ```ts
 * // Basic Scale Creation and Operation
 * import { createScaleByName, getDegree, formatNote } from 'musictheoryjs'; // Adjust path if needed
 * import { createNote } from 'musictheoryjs'; // Adjust path if needed
 *
 * const c4 = createNote({ letter: 'C', octave: 4 });
 * const gMajor = createScaleByName('G4', 'major'); // Create G Major scale
 *
 * const dominant = getDegree(gMajor, 5); // Get the 5th degree (Dominant)
 * if (dominant) {
 * console.log(`The dominant of G Major is: ${formatNote(dominant)}`); // Output: D5
 * }
 * ```
 *
 * @example
 * ```ts
 * // Scale Analysis
 * import { createScaleFromSteps, analyzeScaleStructure, formatNote } from 'musictheoryjs';
 * import { createNote } from 'musictheoryjs';
 *
 * const c4 = createNote({ letter: 'C', octave: 4 });
 * const dorianScale = createScaleFromSteps(c4, "W H W W W H W"); // Create C Dorian
 * const structure = analyzeScaleStructure(dorianScale);
 *
 * console.log(`${formatNote(c4)} Dorian is Diatonic:`, structure.isDiatonic); // true
 * console.log(`${formatNote(c4)} Dorian has Leading Tone:`, structure.hasLeadingTone); // false
 * ```
 *
 * @see {@link Scale} - The core interface representing a scale.
 * @see {@link createScale} - The primary function for creating scales from patterns or names.
 * @see {@link getDegree} - Function to retrieve a specific note (degree) from a scale.
 * @see {@link analyzeScaleStructure} - Function to analyze structural properties of a scale.
 * @see {@link detectScales} - Function to identify potential scales from a set of notes.
 */

// Export types defined within the scale module
export * from "./types";

// Export creation functions from scale/creation.ts
export {
  createScale,
  createScaleByName,
  createScaleFromNotes,
  createChromaticScale,
  createCustomScale,
  createScaleFromString,
  createScaleFromSteps,
  // Specific creation functions for tuned scales
  createTunedScale, // Requires applyTuningSystem from '../tuning'
  createJustIntonationScale,
  createEDOScale,
} from "./creation";

// Export operation functions from scale/operations.ts
export {
  transposeScale,
  getDegree,
  isNoteInScale,
  findClosestScaleNote,
  mergeScales,
  getScaleSegment,
  getScaleDegree, // Note: getDegree is generally preferred (1-based), getScaleDegree might be 0-based? Check original docs.
  filterScaleDegrees,
  getMode,
  invertScale,
} from "./operations";

// Export detection functions from scale/detection.ts
export { detectScales, detectKey, type ScaleMatch } from "./detection";

// Export mode-related functions from scale/modes.ts
export {
  createModalScale,
  createModeFromMajor, // Potentially redundant/specific version of getMode? Check docs.
  getAllMajorModes,
} from "./modes";

// Export analysis functions from scale/analysis.ts
export {
  getScaleFunction,
  analyzeScaleIntervals,
  analyzeScaleBrightness,
  analyzeScaleStructure,
  compareScales,
  findRelatedScales, // Requires a createScale callback option
  analyzePossibleCadences,
  analyzeScaleTension,
  // Re-export analysis result types
  type ScaleFunctionRole,
  type ScaleIntervalAnalysis,
  type ScaleBrightness,
  type ScaleStructureAnalysis,
  type ScaleRelationship,
  type RelatedScales,
  type CadenceType,
  type ScaleTensionProfile,
} from "./analysis";

// Export selected constants from scale/constants.ts
// Exports the main pattern map and common mode names.
export { SCALE_PATTERNS, MODE_NAMES } from "./constants"; // Be selective if constants file grows large
