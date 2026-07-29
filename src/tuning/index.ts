/**
 * @module Tuning
 * @description
 * This module provides functionalities for working with musical tuning systems beyond
 * standard 12-tone equal temperament (12-TET). It allows users to apply predefined
 * tuning systems (like Just Intonation, Pythagorean, Meantone, EDOs) to notes,
 * register custom tuning systems, and convert between different pitch representations.
 *
 * The core function `applyTuningSystem` takes an array of notes and adjusts their
 * pitches (typically by adding a `cents` property) according to the specified tuning system,
 * relative to a reference note (often A4=440Hz or the tonic).
 *
 * @example Apply Just Intonation to a triad
 * ```ts
 * import { createNote } from 'musictheoryjs'; // Adjust path
 * import { applyTuningSystem } from 'musictheoryjs'; // Adjust path
 *
 * const c4 = createNote({ midi: 60 });
 * const e4 = createNote({ midi: 64 });
 * const g4 = createNote({ midi: 67 });
 * const triad = [c4, e4, g4];
 *
 * // Retune C Major triad to Just Intonation relative to C4
 * const justTriad = applyTuningSystem(triad, 'justIntonation', c4);
 * justTriad.forEach(note => {
 * console.log(`${note.notation} (Cents: ${note.cents?.toFixed(1)})`);
 * });
 * // Example Output:
 * // C4 (Cents: 0.0)
 * // E4 (Cents: -13.7)
 * // G4 (Cents: 2.0)
 * ```
 *
 * @example Register and use a custom tuning
 * ```ts
 * import { createNote, Note } from 'musictheoryjs'; // Adjust path
 * import { registerTuningSystem, applyTuningSystem, TuningSystemFunction } from 'musictheoryjs'; // Adjust path
 *
 * // Define a function for a simple +10 cents shift
 * const sharpShift: TuningSystemFunction = (note: Note, ref: Note): number => 10;
 *
 * registerTuningSystem('sharpShift10', {
 * name: 'Sharp Shift (+10c)',
 * description: 'Shifts all notes 10 cents sharp relative to 12-TET.',
 * adjustmentFunction: sharpShift
 * });
 *
 * const notes = [createNote('C4'), createNote('D4')];
 * const tunedNotes = applyTuningSystem(notes, 'sharpShift10');
 * console.log(tunedNotes.map(n => n.cents)); // Output: [ 10, 10 ]
 * ```
 *
 * @see {@link applyTuningSystem} - Function to apply tuning adjustments to notes.
 * @see {@link registerTuningSystem} - Function to define custom tuning systems.
 * @see {@link TUNING_SYSTEMS} - Record containing predefined tuning system definitions.
 * @see {@link TuningSystemFunction} - Type definition for custom adjustment functions.
 */

// Export the main functions and types from tuning.ts
export {
  applyTuningSystem,
  registerTuningSystem,
  TUNING_SYSTEMS, // Exporting the map allows users to see available systems
  type TuningSystemFunction, // Export the type for custom functions
  // Note: TuningSystemDefinition interface is internal, not exported
} from "./tuning";

// Note: Functions like ratioToCents, centsToRatio, getFrequencyRatio, centsBetweenFrequencies
// are assumed to be canonical in the note/calculations module and are not re-exported here.
// Internal calculation helpers (calculate*Adjustment, convertEDOtoCents) are not exported.
