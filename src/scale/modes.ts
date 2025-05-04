/**
 * @module Scale/Modes
 * @description
 * This module provides functions specifically designed for creating and working with
 * modal scales, focusing primarily on the seven standard modes derived from the
 * Major scale (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian).
 * It allows creating modes by name or number relative to a given root note.
 */

// Import mode constants and types from this module
import { MODE_INDICES, MODE_NAMES, SCALE_PATTERNS } from "./constants";
import {
  ModeName,
  Scale,
  ScaleName,
  ScaleOptions,
  ScalePattern,
} from "./types";
// Import Note type and operations from the note module
import {
  Note,
  formatNote,
  intervalBetween,
  notesAreEqual,
  transpose,
} from "../note";
// Import scale creation functions
import { createScale, createScaleByName } from "./creation";

// Import getMode operation function from this module's operations file
import { getMode } from "./operations";

// ScalePattern seems unused here

// Added notesAreEqual used in createModeFromMajor logic
// Note: Need to ensure no circular dependency between modes.ts and operations.ts if getMode uses createModalScale etc.

/**
 * Creates a modal scale (a mode of the Major scale) given a root note and a mode identifier.
 * The mode can be specified by its name (e.g., "dorian", "lydian") or its number (1-7, where 1=Ionian, 2=Dorian, etc.).
 *
 * @param root - The root Note object for the desired modal scale.
 * @param mode - The mode identifier, either a `ModeName` string (e.g., "lydian") or a number from 1 to 7.
 * @param [options] - Optional settings for scale creation (e.g., octaves, includeCachedValues). Passed down to underlying creation functions. See {@link ScaleOptions}.
 * @returns A Scale object representing the requested mode rooted on the provided note.
 * @throws {Error} If the mode name is unknown or the mode number is out of the 1-7 range.
 * @throws {Error} If the root note is invalid.
 * @see {@link createModeFromMajor} - The function this delegates to for numeric degrees.
 * @example
 * ```ts
 * const c4 = createNote({ letter: 'C', octave: 4 });
 * const d4 = createNote({ letter: 'D', octave: 4 });
 *
 * // Create C Lydian by name
 * const cLydian = createModalScale(c4, 'lydian');
 * console.log(cLydian.notes.map(formatNote)); // ['C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4']
 *
 * // Create D Dorian by number (2nd mode)
 * const dDorian = createModalScale(d4, 2);
 * console.log(dDorian.notes.map(formatNote)); // ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
 * ```
 */
export function createModalScale(
  root: Note,
  mode: ModeName | number, // Accept name or number
  options?: Partial<ScaleOptions>
): Scale {
  // --- Input Validation ---
  if (!root) {
    throw new Error("Invalid root note provided to createModalScale.");
  }
  if (mode === undefined || mode === null) {
    throw new Error("Invalid mode provided (must be name or number 1-7).");
  }
  // --- End Validation ---

  // Handle numeric mode input (1-7) directly
  if (typeof mode === "number") {
    // Validate numeric mode range
    if (mode < 1 || mode > 7 || !Number.isInteger(mode)) {
      throw new Error(
        `Invalid mode degree: ${mode}. Must be an integer between 1 and 7.`
      );
    }
    // Delegate to the function that creates modes by major scale degree
    return createModeFromMajor(root, mode, options);
  }

  // Handle mode name input (ionian, dorian, etc.)
  // Look up the corresponding degree number from constants
  const modeIndex = MODE_INDICES[mode]; // mode is type ModeName here
  if (!modeIndex) {
    // Check if name was found in the map
    throw new Error(`Unknown mode name: ${mode}`);
  }

  // Delegate to the function that creates modes by major scale degree
  return createModeFromMajor(root, modeIndex, options);
}

/**
 * Creates a specific mode of the major scale (specified by degree number 1-7),
 * rooted on the provided `root` note.
 * For example, calling with degree 2 creates the Dorian mode starting on `root`.
 *
 * @param root - The root Note object for the desired modal scale.
 * @param degree - The mode number (1 = Ionian/Major, 2 = Dorian, 3 = Phrygian, 4 = Lydian, 5 = Mixolydian, 6 = Aeolian/Minor, 7 = Locrian).
 * @param [options] - Optional settings for scale creation. See {@link ScaleOptions}.
 * @returns A Scale object representing the requested mode rooted on the provided note.
 * @throws {Error} If the degree is not an integer between 1 and 7.
 * @throws {Error} If the root note is invalid.
 * @remarks This function contains internal logic to derive the mode by finding the parent major scale. An alternative approach might involve directly rotating the major scale pattern. This implementation follows the logic provided in the original code.
 * @example
 * ```ts
 * const c4 = createNote({ letter: 'C', octave: 4 });
 *
 * // Create C Ionian (Major) - Degree 1
 * const cIonian = createModeFromMajor(c4, 1);
 * console.log(cIonian.name); // 'major'
 *
 * // Create C Dorian - Degree 2
 * const cDorian = createModeFromMajor(c4, 2);
 * console.log(cDorian.name); // 'dorian'
 * console.log(cDorian.notes.map(formatNote)); // [ 'C4', 'D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4' ]
 *
 * // Create C Locrian - Degree 7
 * const cLocrian = createModeFromMajor(c4, 7);
 * console.log(cLocrian.name); // 'locrian'
 * console.log(cLocrian.notes.map(formatNote)); // [ 'C4', 'Db4', 'Eb4', 'F4', 'Gb4', 'Ab4', 'Bb4' ]
 * ```
 */
export function createModeFromMajor(
  root: Note,
  degree: number, // 1-7 where 1 = ionian, 2 = dorian, etc.
  options?: Partial<ScaleOptions>
): Scale {
  // --- Input Validation ---
  if (!root) {
    throw new Error("Invalid root note provided.");
  }
  if (!Number.isInteger(degree) || degree < 1 || degree > 7) {
    throw new Error(
      `Mode degree must be an integer between 1 and 7. Received: ${degree}`
    );
  }
  // --- End Validation ---

  // If it's the 1st mode (ionian), it's just a major scale. Delegate.
  if (degree === 1) {
    // Use createScaleByName for consistency
    return createScaleByName(root, "major", options);
  }

  // --- Logic from original code to find parent major scale ---
  // 1. Get the interval pattern of the standard Major scale.
  const majorScalePattern = SCALE_PATTERNS.major; // Assumes [0, 2, 4, 5, 7, 9, 11]

  // 2. Find the interval *from* the target mode's root *up to* the parent major scale's root.
  // This is the inversion of the interval from the parent major root *down to* the mode root.
  // Example: For Dorian (degree 2), the interval from parent root (0) to Dorian root is 2 semitones.
  // We need the interval from Dorian root back *down* to parent root, which is -2 or +10 semitones.
  // The interval *up* from Dorian root to parent root is 12 - 2 = 10 semitones.
  // The interval from the Nth degree's root (interval = majorScalePattern[degree - 1]) up to the parent octave (12)
  // represents the interval needed to transpose the target root *up* to find the parent major root relative to the target root's octave.
  // Original code calculated `12 - majorScalePattern[degree - 1]`. Let's verify.
  // Degree 2 (Dorian), pattern[1]=2. 12 - 2 = 10. Transposing C up 10 semitones gives Bb. C Dorian comes from Bb Major. Correct.
  // Degree 7 (Locrian), pattern[6]=11. 12 - 11 = 1. Transposing C up 1 semitone gives C#/Db. C Locrian comes from Db Major. Correct.
  const intervalFromRootToParentMajorRoot = 12 - majorScalePattern[degree - 1];

  // 3. Find the root note of the parent major scale by transposing the target mode root.
  // Note: This transpose might create an enharmonically "incorrect" root for the parent major
  // (e.g., B# instead of C), but its pitch class will be correct for finding notes.
  const parentMajorRoot = transpose(root, intervalFromRootToParentMajorRoot, {
    prefer: options?.prefer,
  });

  // 4. Create the parent major scale starting on that calculated root. Include octave for slicing.
  const parentMajorScale = createScaleByName(parentMajorRoot, "major", {
    ...options, // Pass original options (prefer, includeCachedValues etc.)
    includeOctave: true, // Ensure the octave note is present for mode extraction
  });

  // 5. Find the index of our target `root` note within the notes of the parent major scale.
  // Compare by pitch equality (enharmonically).
  const rootIndexInParent = parentMajorScale.notes.findIndex(
    (note) => notesAreEqual(note, root) // Use pitch equality check
  );

  // Handle case where root note wasn't found (shouldn't happen with correct logic)
  if (rootIndexInParent === -1) {
    console.error(
      "Root note not found in derived parent major scale. Parent:",
      parentMajorRoot,
      "Target Root:",
      root,
      "Degree:",
      degree
    );
    throw new Error(
      `Internal error: Could not find root note ${formatNote(
        root
      )} in calculated parent major scale.`
    );
  }

  // 6. Create the mode notes by rotating the parent major scale's notes starting from the target root.
  // Slice from the root index to the end, then concatenate the slice from the beginning up to the root index.
  // Exclude the final octave note from the parent scale slice if present (usually length 8 if includeOctave was true)
  const parentNotes = parentMajorScale.notes.slice(0, 7); // Take only the 7 unique degrees
  const modeNotes = [
    ...parentNotes.slice(rootIndexInParent),
    ...parentNotes.slice(0, rootIndexInParent),
  ];
  // Adjust octaves if necessary? The rotation handles pitch classes correctly.
  // createScale below will handle octave generation based on the root and derived pattern.

  // 7. Calculate the interval pattern *for the mode* relative to its own root.
  // This pattern is needed for the final Scale object.
  // The pattern should be [0, intervalTo2nd, intervalTo3rd, ...]
  // const modePattern: ScalePattern = modeNotes.map(
  //   (modeNote) =>
  //     // Calculate interval from the mode's *actual* root note
  //     intervalBetween(root, modeNote, true) // Use precise interval (fractional semitones)
  // );
  // Normalize pattern relative to octave? Ensure it's semitones, not fractional.
  // Let's recalculate from the known mode structure relative to major scale root.
  // Example: Dorian (degree 2). Parent Major pattern: [0, 2, 4, 5, 7, 9, 11]
  // Dorian starts on 2nd degree (interval 2). Intervals relative to Dorian root (2):
  // (4-2)=2, (5-2)=3, (7-2)=5, (9-2)=7, (11-2)=9, (12+0-2)=10
  // Dorian pattern relative to its root: [0, 2, 3, 5, 7, 9, 10]
  // const derivedModePattern: ScalePattern = Object.freeze(
  //   // Freeze pattern
  //   majorScalePattern
  //     .map(
  //       (interval) =>
  //         // Shift interval relative to the mode's start interval, wrap around 12
  //         (interval - majorScalePattern[degree - 1] + 12) % 12
  //     )
  //     .sort((a, b) => a - b) // Sort numerically
  // ) as ScalePattern;

  // Get the correct mode name from the degree index (1-based)
  const modeName = MODE_NAMES[degree - 1] as ModeName; // ModeName includes 'major'/'minor' implicitly? Check types.

  // Create the final Scale object using the target root and the *derived mode pattern*.
  // This seems more robust than using the rotated notes directly.
  // The original code derived pattern from rotated notes - let's stick to that for strict adherence,
  // but add a note about potential precision issues if intervalBetween doesn't return exact semitones.
  const patternFromRotatedNotes: ScalePattern = Object.freeze(
    modeNotes
      .map((note) => {
        const intervalSemi = intervalBetween(root, note, true); // Allow fractional semitones
        // Standard patterns are usually integers, round for lookup? No, store precise pattern.
        return intervalSemi;
      })
      // Ensure pattern starts with 0 and is sorted. First note should be root.
      .sort((a, b) => a - b) // Sort derived intervals
  ) as ScalePattern;

  // Create scale using the derived pattern from rotated notes (as per original logic).
  // This might differ slightly from the theoretical derivedModePattern if microtones involved.
  // Using createScale ensures options like sorting, octaves are handled consistently.
  // We pass the derived pattern here.
  const finalScale = createScale(root, patternFromRotatedNotes, options);

  // Return the created scale, ensuring the correct mode name is set.
  return Object.freeze({
    ...finalScale, // Spread properties from createScale result
    name: modeName as ScaleName, // Override name with the correct mode name
  });
}

/**
 * Generates an array containing all 7 standard modes (Ionian to Locrian)
 * that share the same underlying notes/key signature as the Major scale built on the provided root note.
 * For example, if the root is C4, it returns scales for C Ionian, D Dorian, E Phrygian, F Lydian, G Mixolydian, A Aeolian, and B Locrian.
 *
 * @param root - The root Note object of the initial Ionian (Major) scale from which modes are derived.
 * @param [options] - Optional settings for scale creation (passed to `getMode`). See {@link ScaleOptions}.
 * @returns An array of 7 Scale objects, representing each mode.
 * @throws {Error} If the root note is invalid or scale creation fails.
 * @see {@link getMode} - The function used internally to generate each mode.
 * @example
 * ```ts
 * const c4 = createNote({ letter: 'C', octave: 4 });
 * const cMajorModes = getAllMajorModes(c4);
 *
 * cMajorModes.forEach(scale => {
 * console.log(`Root: ${formatNote(scale.root)}, Name: ${scale.name}`);
 * // Output:
 * // Root: C4, Name: ionian
 * // Root: D4, Name: dorian
 * // Root: E4, Name: phrygian
 * // ...etc up to B Locrian
 * });
 * ```
 */
export function getAllMajorModes(
  root: Note,
  options?: Partial<ScaleOptions>
): Scale[] {
  // Returns array of Scale objects
  // --- Input Validation ---
  if (!root) {
    throw new Error("Invalid root note provided to getAllMajorModes.");
  }
  // --- End Validation ---

  const modes: Scale[] = [];

  // 1. Create the parent Major scale (Ionian mode) first.
  // Include the octave note to ensure all 7 degrees are present for mode roots.
  const majorScale = createScaleByName(root, "major", {
    ...options, // Pass down options
    includeOctave: true, // Ensure octave is present for finding mode roots
  });

  // Check if scale creation succeeded and has enough notes
  if (!majorScale || majorScale.notes.length < 7) {
    throw new Error(
      "Failed to create the initial major scale needed for mode generation."
    );
  }

  // 2. Generate all 7 modes using the getMode operation.
  // Degree is 1-indexed for getMode.
  for (let degree = 1; degree <= 7; degree++) {
    // getMode extracts the specified mode *from* the majorScale notes.
    // The root of the resulting mode will be the `degree`-th note of majorScale.
    const mode = getMode(majorScale, degree, options); // Pass options down
    modes.push(mode);
  }

  // Return the array of generated modal scales
  return modes; // Note: Original code didn't freeze this outer array
}
