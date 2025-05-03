/**
 * Functions for working with modal scales
 */

import { MODE_INDICES, MODE_NAMES } from "./constants";
import { ModeName, Scale, ScaleName, ScaleOptions } from "./types";
import { createScale, createScaleByName } from "./creation";

import { Note } from "../note";
import { getMode } from "./operations";

/**
 * Create a modal scale from a root note and mode name
 */
export function createModalScale(
  root: Note,
  mode: ModeName,
  options?: Partial<ScaleOptions>
): Scale {
  // Handle numeric mode (1-7)
  if (typeof mode === "number") {
    return createModeFromMajor(root, mode, options);
  }

  // Handle mode name (ionian, dorian, etc.)
  const modeIndex = MODE_INDICES[mode];
  if (!modeIndex) {
    throw new Error(`Unknown mode name: ${mode}`);
  }

  return createModeFromMajor(root, modeIndex, options);
}

/**
 * Create a mode of the major scale, based on a degree
 */
export function createModeFromMajor(
  root: Note,
  degree: number, // 1-7 where 1 = ionian, 2 = dorian, etc.
  options?: Partial<ScaleOptions>
): Scale {
  if (degree < 1 || degree > 7) {
    throw new Error("Mode degree must be between 1 and 7");
  }

  // If it's the 1st mode (ionian), just create a major scale
  if (degree === 1) {
    return createScaleByName(root, "major", options);
  }

  // For other modes:
  // 1. Find the major scale root that will give us this mode
  // 2. Create a major scale with that root
  // 3. Extract the mode starting from our target root

  // Calculate pattern for major scale
  const majorScalePattern = [0, 2, 4, 5, 7, 9, 11];

  // Find the interval from our root to the major scale root
  // For example, for dorian (2nd mode), we need to go down 2 semitones
  const intervalToMajorRoot = 12 - majorScalePattern[degree - 1];

  // Create a major scale that contains our note at the correct degree
  const majorRoot = createScaleByName(root, "major", {
    ...options,
    includeOctave: true,
  }).notes[intervalToMajorRoot % 12];

  const majorScale = createScaleByName(majorRoot, "major", {
    ...options,
    includeOctave: true,
  });

  // Find the index of our root note in the major scale
  const rootIndex = majorScale.notes.findIndex(
    (note) => note.pitchClassIndex === root.pitchClassIndex
  );

  // Create a mode by slicing the major scale starting from our root
  const modeNotes = [
    ...majorScale.notes.slice(rootIndex),
    ...majorScale.notes.slice(0, rootIndex),
  ];

  // Calculate the pattern based on the intervals between notes
  const pattern: number[] = [];
  for (let i = 0; i < modeNotes.length - 1; i++) {
    const interval =
      (modeNotes[i + 1].pitchClassIndex - modeNotes[0].pitchClassIndex + 12) %
      12;
    pattern.push(interval);
  }

  // Get the mode name
  const modeName = MODE_NAMES[degree - 1] as ModeName;

  // Create the scale with the correct pattern
  return Object.freeze({
    ...createScale(root, pattern, {
      ...options,
    }),
    // Add the mode name explicitly, properly typed
    name: modeName as ScaleName,
  });
}

/**
 * Gets all 7 modes of the major scale with the given root
 */
export function getAllMajorModes(
  root: Note,
  options?: Partial<ScaleOptions>
): Scale[] {
  const modes: Scale[] = [];

  // Create a major scale first
  const majorScale = createScaleByName(root, "major", {
    ...options,
    includeOctave: true,
  });

  // Generate all 7 modes
  for (let degree = 1; degree <= 7; degree++) {
    const modeRoot = majorScale.notes[degree - 1];
    const mode = getMode(majorScale, degree, options);
    modes.push(mode);
  }

  return modes;
}
