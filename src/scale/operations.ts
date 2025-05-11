/**
 * @module Scale/Operations
 * @description
 * This module provides functions for performing various operations on Scale objects
 * or relating Note objects to scales. Operations include transposing entire scales,
 * extracting specific scale degrees, checking note membership, finding related notes,
 * merging or segmenting scales, generating modes, filtering degrees, and inverting scales.
 */

// Import Note types and operations needed
import { Note, createNoteFromParts, transpose } from "../note";
// Import Scale types used in functions
import { Scale, ScaleOptions, ScalePattern } from "./types"; // Added ModeName used in getMode
// Import Scale creation functions used by operations
import { createScale, createScaleFromNotes } from "./creation";

/**
 * Transposes an entire scale up or down by a specified number of semitones.
 * It achieves this by transposing the root note and then recreating the scale
 * using the original interval pattern relative to the new root.
 * Microtonal properties of the original root are handled by the underlying `transpose` function.
 *
 * @param scale - The original Scale object to transpose.
 * @param semitones - The number of semitones to transpose by (positive for up, negative for down).
 * @param [options] - Optional settings for the new scale creation, inheriting some from the original scale if not specified (e.g., tuningSystem). See {@link ScaleOptions}.
 * @returns A new Scale object representing the transposed scale.
 * @throws {Error} If the input scale or semitones value is invalid, or if transposition fails.
 * @example
 * ```ts
 * const cMajor = createScaleByName('C4', 'major');
 * // Transpose C Major up by 2 semitones (whole step)
 * const dMajor = transposeScale(cMajor, 2);
 * console.log(dMajor.root.notation); // "D4"
 * console.log(dMajor.notes.map(formatNote)); // ['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5']
 *
 * // Transpose C Major down by 1 semitone
 * const bMajor = transposeScale(cMajor, -1);
 * console.log(bMajor.root.notation); // "B3"
 * ```
 */
export function transposeScale(
  scale: Scale,
  semitones: number,
  options?: Partial<ScaleOptions> // Allow overriding options for the new scale
): Scale {
  // --- Input Validation ---
  if (!scale) {
    throw new Error("Invalid scale provided to transposeScale.");
  }
  if (typeof semitones !== "number" || !Number.isFinite(semitones)) {
    throw new Error(
      `Invalid semitones value: ${semitones}. Must be a finite number.`
    );
  }
  // --- End Validation ---

  // Transpose the root note using the note transpose function
  const newRoot = transpose(scale.root, semitones, {
    // Pass down preference and cache options if provided
    prefer: options?.prefer,
    includeCachedValues: options?.includeCachedValues,
    // Preserve microtonal details of the root by default during transposition
    preserveMicrotonalProperties: true, // Assuming default transpose preserves
  });

  // Create a new scale with the same pattern but anchored on the new root.
  // Inherit tuning system from original scale unless overridden in options.
  // Merge passed options with defaults potentially inherited from the original scale.
  return createScale(newRoot, scale.pattern, {
    // Start with original scale's potential options as base? No, use defaults + overrides.
    // Pass down options provided to this function.
    ...options,
    // Explicitly inherit tuning system if not overridden
    tuningSystem: options?.tuningSystem ?? scale.tuningSystem,
  });
}

/**
 * Retrieves a specific Note object representing a scale degree.
 * Uses 1-based indexing where 1 is the root, 2 is the second degree, etc.
 * Handles degrees beyond the scale's length by wrapping around octaves.
 *
 * @param scale - The Scale object to query.
 * @param degree - The 1-based index of the desired scale degree.
 * @returns The Note object for the specified degree, adjusted for the correct octave,
 * or `undefined` if the scale is invalid or the degree calculation fails.
 * @example
 * ```ts
 * const cMajor = createScaleByName('C4', 'major');
 * const root = getDegree(cMajor, 1); // C4
 * const dominant = getDegree(cMajor, 5); // G4
 * const ninth = getDegree(cMajor, 9); // D5 (2nd degree, one octave up)
 * const negSecond = getDegree(cMajor, -2); // Ab3? No, wraps index: -2 -> index -3 -> octave -1, degree 7-3=4 -> F3? Let's test.
 * // Degree -2 -> index -3. octaveOffset = floor(-3/7) = -1. wrappedIndex = (-3 % 7 + 7) % 7 = 4.
 * // note = notes[4] = G4. Adjust octave: G4 + (-1) = G3.
 * // Let's trace Degree 0: index -1. octaveOffset = -1. wrappedIndex = 6. note = B4. Octave adjust = B3.
 * // Let's trace Degree -6: index -7. octaveOffset = -1. wrappedIndex = 0. note = C4. Octave adjust = C3.
 * const degree0 = getDegree(cMajor, 0); // B3 (7th degree, one octave down)
 * console.log(formatNote(degree0!)); // "B3"
 * ```
 */
export function getDegree(scale: Scale, degree: number): Note | undefined {
  // --- Input Validation ---
  if (!scale || !scale.notes || scale.notes.length === 0) {
    console.warn("Cannot get degree from invalid or empty scale.");
    return undefined;
  }
  if (!Number.isInteger(degree)) {
    console.warn(`Invalid degree: ${degree}. Must be an integer.`);
    return undefined; // Handle non-integer degree input
  }
  // --- End Validation ---

  // Adjust 1-based degree to 0-based index for array access
  const index = degree - 1;
  const scaleLength = scale.notes.length;

  // Calculate how many octaves away the target degree is
  const octaveOffset = Math.floor(index / scaleLength);
  // Calculate the equivalent index within the base scale (0 to scaleLength-1)
  const wrappedIndex = ((index % scaleLength) + scaleLength) % scaleLength;

  // Get the base note from the scale at the wrapped index
  const baseNote = scale.notes[wrappedIndex];

  // If the base note doesn't exist (shouldn't happen with valid scale/index)
  if (!baseNote) {
    return undefined;
  }

  // If no octave offset is needed, return the note directly from the scale array
  if (octaveOffset === 0) {
    return baseNote;
  }

  // If an octave offset is needed, transpose the base note by the required number of semitones.
  // The transpose function should handle preserving microtonal properties correctly by default.
  try {
    // Transpose by full octaves (12 semitones per octave)
    return transpose(baseNote, octaveOffset * 12, {
      // Options for transpose:
      // prefer spelling? Use baseNote's spelling implicitly via transpose.
      // includeCachedValues? Let transpose handle based on its defaults/options passed down? Assume true default.
      preserveMicrotonalProperties: true, // Ensure microtones are carried over
    });
  } catch (e) {
    console.error(`Error adjusting octave for degree ${degree}:`, e);
    return undefined; // Return undefined if octave transposition fails
  }
}

/**
 * Checks if a given note's pitch class belongs to the scale.
 * Ignores octave and microtonal deviations (cents), comparing only the
 * base pitch class (0-11).
 *
 * @param scale - The Scale object.
 * @param note - The Note object to check.
 * @returns `true` if the note's pitch class is found in the scale, `false` otherwise.
 * @example
 * ```ts
 * const cMajor = createScaleByName('C4', 'major');
 * const e4 = createNote({ letter: 'E', octave: 4 });
 * const fSharp4 = createNote({ letter: 'F', accidental: '#', octave: 4 });
 * const c5 = createNote({ letter: 'C', octave: 5 });
 * const cqs4 = addCentsToNote(createNote({ midi: 60 }), 50); // C4 + 50 cents
 *
 * isNoteInScale(cMajor, e4); // true
 * isNoteInScale(cMajor, fSharp4); // false
 * isNoteInScale(cMajor, c5); // true (octave ignored)
 * isNoteInScale(cMajor, cqs4); // true (cents ignored)
 * ```
 */
export function isNoteInScale(scale: Scale, note: Note): boolean {
  // --- Input Validation ---
  if (!scale || !scale.notes || !note) {
    return false; // Cannot check if inputs are invalid
  }
  // --- End Validation ---

  // Get the pitch class index of the note to check
  const targetPitchClass = note.pitchClassIndex;

  // Check if any note in the scale has the same pitch class index
  return scale.notes.some(
    (scaleNote) => scaleNote.pitchClassIndex === targetPitchClass
  );
}

/**
 * Finds the note within a scale that is closest in pitch (by absolute semitone distance,
 * ignoring octave initially) to a given target note.
 * If the target note's pitch class is already in the scale, returns the corresponding scale note
 * (potentially adjusted to the target note's octave).
 * If the target note is between scale notes, returns the scale note with the smallest
 * absolute semitone difference (modulo 12). Handles wrap-around (e.g., distance between B and C is 1).
 *
 * @param scale - The Scale object to search within.
 * @param note - The target Note object.
 * @returns The Note object from the scale (potentially adjusted to the target's octave) that is closest in pitch to the target note.
 * @throws {Error} If scale or note is invalid.
 * @example
 * ```ts
 * const cMajor = createScaleByName('C4', 'major');
 * const c4 = createNote({ midi: 60 });
 * const cSharp4 = createNote({ midi: 61 });
 * const dFlat4 = createNote({ midi: 61, prefer:'flat' });
 * const b3 = createNote({ midi: 59 });
 *
 * findClosestScaleNote(cMajor, c4); // C4 (exact match)
 * findClosestScaleNote(cMajor, cSharp4); // C4 or D4 (depends on rounding, likely D4 if diff=1 vs diff=1) -> Let's trace.
 * // C#(1) vs C(0) = diff 1. C#(1) vs D(2) = diff 1. Original code might return first match C4. Needs refinement for ties.
 * // Let's refine logic for ties: prefer upward?
 * findClosestScaleNote(cMajor, dFlat4); // Db(1) -> closest are C(0) and D(2). Tie, should maybe return D4.
 * findClosestScaleNote(cMajor, b3); // B(11) -> closest is C(0) or B(11) if octave adjusted. Returns B4 (adjusted from B in scale).
 * ```
 * @remarks The current tie-breaking mechanism (in case a note is exactly between two scale notes) is based on the iteration order and might return the lower of the two tied notes. Octave of the returned note is adjusted to match the input note's octave. Microtonal cents are ignored in the distance calculation.
 */
export function findClosestScaleNote(scale: Scale, note: Note): Note {
  // --- Input Validation ---
  if (!scale || !scale.notes || scale.notes.length === 0) {
    throw new Error("Invalid or empty scale provided.");
  }
  if (!note) {
    throw new Error("Invalid target note provided.");
  }
  // --- End Validation ---

  // Extract target pitch class for comparison
  const targetPitchClass = note.pitchClassIndex;

  // Find the note in the scale with the minimum pitch class distance
  let closestNoteInScale = scale.notes[0]; // Initialize with the first note
  // Calculate initial minimum distance (modulo 12 arithmetic)
  let minDistance = Math.min(
    Math.abs(targetPitchClass - closestNoteInScale.pitchClassIndex),
    12 - Math.abs(targetPitchClass - closestNoteInScale.pitchClassIndex)
  );

  for (const scaleNote of scale.notes) {
    // Calculate shortest distance (up or down) in semitones modulo 12
    const diff = Math.abs(targetPitchClass - scaleNote.pitchClassIndex);
    const distance = Math.min(diff, 12 - diff); // Shortest distance wrapping around octave

    if (distance < minDistance) {
      minDistance = distance;
      closestNoteInScale = scaleNote;
    }
    // Optional: Tie-breaking rule. E.g., if distance is equal, prefer the higher note?
    // else if (distance === minDistance) {
    //    // Prefer higher note? Check pitch class index.
    //    if (scaleNote.pitchClassIndex > closestNoteInScale.pitchClassIndex) { // Be careful with B->C wrap
    //        // Need careful wrap-around logic for tie-breaking
    //    }
    // }
  }

  // Adjust the octave of the found closest scale note to match the target note's octave
  // Use createNoteFromParts to ensure correct spelling and properties are maintained.
  // This returns the scale note spelling but in the target note's octave.
  try {
    return createNoteFromParts({
      letter: closestNoteInScale.letter,
      accidental: closestNoteInScale.accidental,
      octave: note.octave, // Use target note's octave
      // Does not preserve microtonal info from closestNoteInScale implicitly
      // Should we add microtonal info if present?
      // cents: (closestNoteInScale as any).cents, // Example
      // microtonalModifier: (closestNoteInScale as any).microtonalModifier, // Example
    });
  } catch (e) {
    console.error("Error adjusting octave for closest scale note:", e);
    // Fallback: return the scale note in its original octave? Or throw?
    return closestNoteInScale; // Fallback to note in its original octave
  }
}

/**
 * Merges two scales by combining their unique pitch classes and creating a new scale.
 * The root note of the new scale can be specified or defaults to the root of the first scale.
 * The resulting scale's pattern is derived from the combined unique pitch classes relative to the chosen root.
 *
 * @param scale1 - The first Scale object.
 * @param scale2 - The second Scale object.
 * @param [options] - Optional settings.
 * @param [options.useRoot=1] - Specifies which scale's root to use for the merged scale (1 or 2). Defaults to 1.
 * @param [options.sort=true] - Sort the resulting notes by pitch.
 * @param [options.prefer='sharp'] - Enharmonic preference for note creation.
 * @param [options.includeCachedValues=true] - Whether notes should include cached values.
 * @returns A new Scale object containing the union of notes from both input scales, rooted appropriately.
 * @remarks This function uses `createScaleFromNotes` internally after combining the note lists. Microtonal information from the original scales is not directly merged; the resulting scale is based on combined pitch classes.
 * @example
 * ```ts
 * const cMajor = createScaleByName('C4', 'major');
 * const cMinor = createScaleByName('C4', 'minor');
 *
 * // Merge C Major and C Minor, keeping C4 as root
 * const mergedScale = mergeScales(cMajor, cMinor);
 * console.log(mergedScale.notes.map(formatNote));
 * // Output includes notes from both C Major and C Minor:
 * // ['C4', 'D4', 'Eb4', 'E4', 'F4', 'G4', 'A4', 'Ab4', 'B4', 'Bb4'] (order depends on sort)
 * // Note: Ab4 comes from C minor, A4 from C Major etc. Spelling depends on `prefer` option.
 * console.log(mergedScale.pattern); // Derived pattern from unique pitch classes relative to C
 * ```
 */
export function mergeScales(
  scale1: Scale,
  scale2: Scale,
  options?: Partial<ScaleOptions & { useRoot?: 1 | 2 }> // Allow useRoot option
): Scale {
  // --- Input Validation ---
  if (!scale1 || !scale1.notes || !scale2 || !scale2.notes) {
    throw new Error("Invalid Scale object(s) provided to mergeScales.");
  }
  // --- End Validation ---

  // Determine which root note to use for the resulting scale
  const root = options?.useRoot === 2 ? scale2.root : scale1.root;

  // Combine the note arrays from both scales
  const allNotes = [...scale1.notes, ...scale2.notes];

  // Create a new scale from the combined set of notes.
  // createScaleFromNotes handles finding unique pitch classes relative to the specified root
  // and generating the new scale object. Pass other options down.
  return createScaleFromNotes(allNotes, root, options);
}

/**
 * Extracts a segment of a scale, defined by a starting and ending scale degree (1-based).
 * Returns a new Scale object containing only the notes within that degree range.
 *
 * @param scale - The source Scale object.
 * @param startDegree - The 1-based starting degree of the segment (inclusive).
 * @param endDegree - The 1-based ending degree of the segment (inclusive).
 * @param [options] - Optional settings for the resulting scale segment (passed to `createScaleFromNotes`). See {@link ScaleOptions}.
 * @returns A new Scale object representing the extracted segment. The root of the new scale is the note corresponding to `startDegree`.
 * @throws {Error} If startDegree > endDegree, if degrees result in fewer than 2 notes, or if scale/degrees are invalid.
 * @example
 * ```ts
 * const cMajor = createScaleByName('C4', 'major');
 *
 * // Extract degrees 3 to 5 (E, F, G)
 * const segmentEFG = getScaleSegment(cMajor, 3, 5);
 * console.log(segmentEFG.notes.map(formatNote)); // ['E4', 'F4', 'G4']
 * console.log(formatNote(segmentEFG.root)); // 'E4'
 * console.log(segmentEFG.pattern); // [0, 1, 3] (Intervals relative to E)
 *
 * // Extract degrees 6 to 8 (A, B, C of next octave)
 * const segmentABC5 = getScaleSegment(cMajor, 6, 8);
 * console.log(segmentABC5.notes.map(formatNote)); // ['A4', 'B4', 'C5']
 * console.log(formatNote(segmentABC5.root)); // 'A4'
 * ```
 */
export function getScaleSegment(
  scale: Scale,
  startDegree: number,
  endDegree: number,
  options?: Partial<ScaleOptions>
): Scale {
  // --- Input Validation ---
  if (!scale || !scale.notes) {
    throw new Error("Invalid scale provided to getScaleSegment.");
  }
  if (!Number.isInteger(startDegree) || !Number.isInteger(endDegree)) {
    throw new Error("Start and end degrees must be integers.");
  }
  if (startDegree > endDegree) {
    throw new Error(
      "Start degree must be less than or equal to end degree for scale segment."
    );
  }
  // --- End Validation ---

  // Collect notes within the degree range
  const notes: Note[] = [];
  for (let degree = startDegree; degree <= endDegree; degree++) {
    const note = getDegree(scale, degree); // Use getDegree to handle octave wrapping
    if (note) {
      // Check if getDegree returned a valid note
      notes.push(note);
    } else {
      // This might happen if the original scale was very short and degrees were large
      console.warn(
        `Could not retrieve note for degree ${degree} in getScaleSegment.`
      );
    }
  }

  // Ensure the segment contains enough notes to form a scale
  if (notes.length < 2) {
    // Original code threw error, let's keep that behavior
    throw new Error(
      `Not enough notes (${notes.length}) found between degrees ${startDegree} and ${endDegree} to create a scale segment.`
    );
  }

  // Create a new scale from the extracted segment notes.
  // The root of the segment scale is the note corresponding to the startDegree.
  // Pass down any relevant options.
  return createScaleFromNotes(notes, notes[0], options);
}

/**
 * Gets the 1-based scale degree index of a note within a scale.
 * Compares based on pitch class, ignoring octave and microtonal cents.
 *
 * @param scale - The Scale object to search within.
 * @param note - The Note object to find the degree of.
 * @returns The 1-based scale degree index (1 to scale length) if the note's pitch class is found, otherwise `null`.
 * @example
 * ```ts
 * const cMajor = createScaleByName('C4', 'major');
 * const g5 = createNote({ letter: 'G', octave: 5 });
 * const fSharp4 = createNote({ letter: 'F', accidental: '#', octave: 4 });
 *
 * getScaleDegree(cMajor, g5); // 5 (G is the 5th degree, octave ignored)
 * getScaleDegree(cMajor, fSharp4); // null (F# is not in C Major)
 * getScaleDegree(cMajor, createNote({ midi: 60 })); // 1 (C is the 1st degree)
 * ```
 */
export function getScaleDegree(scale: Scale, note: Note): number | null {
  // --- Input Validation ---
  if (!scale || !scale.notes || !note) {
    return null; // Return null for invalid input
  }
  // --- End Validation ---

  // Get the target pitch class index
  const targetPitchClass = note.pitchClassIndex;

  // Find the 0-based index of the first note in the scale with a matching pitch class
  const degreeIndex = scale.notes.findIndex(
    (scaleNote) => scaleNote.pitchClassIndex === targetPitchClass
  );

  // If found (index >= 0), return the 1-based degree, otherwise return null
  return degreeIndex >= 0 ? degreeIndex + 1 : null;
}

/**
 * Creates a new scale containing only the notes corresponding to a specified list of degrees from the original scale.
 *
 * @param scale - The source Scale object.
 * @param degrees - An array of 1-based scale degree numbers to include in the new scale.
 * @param [options] - Optional settings for the resulting scale (passed to `createScaleFromNotes`). See {@link ScaleOptions}.
 * @returns A new Scale object containing only the notes of the specified degrees. The root of the new scale is the note corresponding to the first degree listed in the `degrees` array.
 * @throws {Error} If the input scale or degrees array is invalid, or if filtering results in fewer than 2 notes.
 * @example
 * ```ts
 * const cMajor = createScaleByName('C4', 'major');
 *
 * // Create a scale with only the Major Triad degrees (1, 3, 5)
 * const cMajorTriadScale = filterScaleDegrees(cMajor, [1, 3, 5]);
 * console.log(cMajorTriadScale.notes.map(formatNote)); // ['C4', 'E4', 'G4']
 * console.log(formatNote(cMajorTriadScale.root)); // 'C4'
 *
 * // Create a pentatonic scale by filtering degrees (1, 2, 3, 5, 6)
 * const cMajorPent = filterScaleDegrees(cMajor, [1, 2, 3, 5, 6]);
 * console.log(cMajorPent.notes.map(formatNote)); // ['C4', 'D4', 'E4', 'G4', 'A4']
 * console.log(cMajorPent.name) // 'majorPentatonic' (if createScaleFromNotes identifies it)
 * ```
 */
export function filterScaleDegrees(
  scale: Scale,
  degrees: number[], // Array of 1-based degrees to keep
  options?: Partial<ScaleOptions>
): Scale {
  // --- Input Validation ---
  if (!scale || !scale.notes) {
    throw new Error("Invalid scale provided to filterScaleDegrees.");
  }
  if (!Array.isArray(degrees) || degrees.length === 0) {
    throw new Error("Invalid or empty degrees array provided.");
  }
  if (degrees.some((d) => !Number.isInteger(d))) {
    throw new Error("Degrees array must contain only integers.");
  }
  // --- End Validation ---

  // Retrieve the Note object for each specified degree, handling potential undefined results
  const notes = degrees
    .map((degree) => getDegree(scale, degree)) // Get note for each degree
    // Filter out any undefined results (e.g., if degree was invalid for the scale)
    .filter((note): note is Note => note !== undefined);

  // Ensure we have enough notes left to form a scale
  if (notes.length < 2) {
    // Original code threw error
    throw new Error(
      `Not enough valid notes (${
        notes.length
      }) remain after filtering degrees [${degrees.join(
        ", "
      )}]. At least 2 are required.`
    );
  }

  // Create a new scale from the filtered notes.
  // The root of the new scale will be the note corresponding to the *first* degree in the input `degrees` array.
  // Pass down other options.
  return createScaleFromNotes(notes, notes[0], options);
}

/**
 * Generates a mode of the input scale starting on the note of the specified degree.
 * For example, getting the 2nd mode (degree=2) of a C Major scale results in a D Dorian scale.
 * The resulting scale contains the same pitch classes as the original but rotated,
 * with a new root and a derived interval pattern.
 *
 * @param scale - The source Scale object (e.g., C Major).
 * @param degree - The 1-based degree of the source scale to use as the root of the new modal scale (e.g., 2 for Dorian mode).
 * @param [options] - Optional settings for the new modal scale creation (passed to `createScale`). See {@link ScaleOptions}.
 * @returns A new Scale object representing the generated mode.
 * @throws {Error} If the input scale or degree is invalid.
 * @remarks The internal logic involves calculating the new interval pattern by rotating the original pattern relative to the chosen degree. This might differ subtly from `createModeFromMajor`'s approach but aims for the same theoretical result.
 * @example
 * ```ts
 * const cMajor = createScaleByName('C4', 'major');
 *
 * // Get the 2nd mode (Dorian)
 * const dDorian = getMode(cMajor, 2);
 * console.log(formatNote(dDorian.root)); // "D4"
 * console.log(dDorian.name); // "dorian" (if identified by createScale)
 * console.log(dDorian.pattern); // [0, 2, 3, 5, 7, 9, 10]
 *
 * // Get the 5th mode (Mixolydian)
 * const gMixolydian = getMode(cMajor, 5);
 * console.log(formatNote(gMixolydian.root)); // "G4"
 * console.log(gMixolydian.name); // "mixolydian"
 * ```
 */
export function getMode(
  scale: Scale,
  degree: number, // 1-based degree index
  options?: Partial<ScaleOptions>
): Scale {
  // --- Input Validation ---
  if (!scale || !scale.notes || scale.notes.length === 0 || !scale.pattern) {
    throw new Error("Invalid scale provided to getMode.");
  }
  if (!Number.isInteger(degree) || degree <= 0) {
    // Degree must be positive integer
    throw new Error(
      `Invalid scale degree: ${degree}. Must be a positive integer.`
    );
  }
  // --- End Validation ---

  // Get the note corresponding to the desired degree, which will be the new root.
  // Use getDegree to handle octave wrapping correctly if degree > scale length.
  const newRoot = getDegree(scale, degree);

  // Validate that the degree exists within the scale's structure
  if (!newRoot) {
    // Throw error if degree is invalid (e.g., degree 8 for a 7-note scale if not handled by getDegree properly)
    // getDegree handles octave wrapping, so this check might be redundant if getDegree never returns undefined for valid scale/integer degree.
    throw new Error(`Invalid scale degree: ${degree} for the given scale.`);
  }

  // --- Calculate the new pattern for the mode ---
  // The pattern represents intervals relative to the *new* root.
  const originalPattern = scale.pattern; // Intervals relative to original root
  const scaleLength = originalPattern.length; // Number of notes in the base pattern

  // Find the interval of the new root relative to the original root
  // Use the pattern array directly for the interval value. Adjust degree to 0-based index.
  const degreeIndex = degree - 1; // 0-based index
  // Handle degree index potentially being outside the pattern length (for modes of modes etc.)
  // Calculate the interval using octave wrapping based on the pattern.
  const degreeIntervalValue =
    degreeIndex < scaleLength
      ? originalPattern[degreeIndex % scaleLength] +
        12 * Math.floor(degreeIndex / scaleLength)
      : undefined; // Cannot determine interval if degree index too large and pattern doesn't imply octave repeats

  if (degreeIntervalValue === undefined) {
    throw new Error(`Cannot determine interval for degree ${degree}.`);
  }

  // Calculate the new pattern by shifting the original pattern
  // Each new interval = (original_interval - degree_interval) mod 12
  const newPattern: number[] = [];
  for (let i = 0; i < scaleLength; i++) {
    // Calculate the interval relative to the new root, ensuring positive modulo result
    const intervalFromNewRoot =
      (originalPattern[i] - degreeIntervalValue + 1200) % 12; // Use large multiple of 12 to ensure positive before modulo
    newPattern.push(intervalFromNewRoot);
  }

  // Sort the new pattern numerically [0, i2, i3...]
  newPattern.sort((a, b) => a - b);
  // Remove duplicates? A mode should have same number of unique intervals. Set ensures uniqueness.
  const uniqueNewPattern = Object.freeze(
    // Freeze pattern (present in original)
    Array.from(new Set(newPattern))
  ) as ScalePattern;
  // --- End Pattern Calculation ---

  // Create a new scale using the new root and the calculated modal pattern
  // Pass down original options, potentially overriding tuning system etc. if needed
  return createScale(newRoot, uniqueNewPattern, {
    ...options,
    // Inherit tuning system from original scale unless overridden
    tuningSystem: options?.tuningSystem ?? scale.tuningSystem,
  });
}

/**
 * Creates an inverted version of a scale by mirroring its intervals
 * around a specified center note (or the scale's root by default).
 * The resulting scale will have an opposite contour.
 *
 * @param scale - The Scale object to invert.
 * @param [centerNote] - Optional. The Note object to use as the axis of inversion. If omitted, the scale's root note is used.
 * @param [options] - Optional settings for the new inverted scale creation (passed to `createScaleFromNotes`). See {@link ScaleOptions}.
 * @returns A new Scale object representing the inverted scale.
 * @throws {Error} If the input scale is invalid.
 * @remarks The inversion calculates the interval *down* from the center note for each original interval *up* from the center note (or root). Microtonal properties are handled by the `transpose` function during calculation. The resulting scale might not match a standard named scale.
 * @example
 * ```ts
 * const cMajor = createScaleByName('C4', 'major'); // C D E F G A B
 * // Invert around C4
 * const cPhrygianInv = invertScale(cMajor);
 * console.log(cPhrygianInv.notes.map(formatNote)); // ['C4', 'Bb3', 'Ab3', 'G3', 'F3', 'Eb3', 'Db3'] (Equivalent to C Phrygian descending)
 *
 * // Invert C Major around G4
 * const g4 = createNote({midi: 67});
 * const invertedAroundG = invertScale(cMajor, g4);
 * console.log(invertedAroundG.notes.map(formatNote)); // ['G4', 'F4', 'Eb4', 'D4', 'C4', 'Bb3', 'Ab3']
 * ```
 */
export function invertScale(
  scale: Scale,
  centerNote?: Note,
  options?: Partial<ScaleOptions>
): Scale {
  // --- Input Validation ---
  if (!scale || !scale.notes || scale.notes.length === 0) {
    throw new Error("Invalid or empty scale provided to invertScale.");
  }
  // --- End Validation ---

  // Default to using the scale's root as the center point if not provided
  const center = centerNote || scale.root;
  if (!center) {
    throw new Error(
      "Invalid center note provided or could not determine root."
    );
  }

  // Calculate the inverted notes
  const invertedNotes = scale.notes.map((note) => {
    // Calculate the interval (semitones) from the original note to the center note.
    // Use intervalBetween for potentially fractional semitone calculation if microtones involved? No, stick to pitch class logic from original code.
    // Original logic: distance = (centerPC - notePC + 12) % 12. This is interval UP from note to center.
    const distanceUpToCenter =
      (center.pitchClassIndex - note.pitchClassIndex + 12) % 12;

    // The inverted note is the same interval distance *down* from the center,
    // which is equivalent to transposing the center *up* by that same distance.
    // Example: Scale=C,D,E. Center=C. Note=E. Interval E(4) up to C(12/0) is 8 semitones. Transpose C up 8 semitones -> Ab.
    // Example: Scale=C,D,E. Center=C. Note=D. Interval D(2) up to C(12/0) is 10 semitones. Transpose C up 10 semitones -> Bb.
    // Result: C, Bb, Ab (descending Phrygian fragment). Original code logic seems correct here.
    return transpose(center, distanceUpToCenter, {
      prefer: options?.prefer, // Use provided preference
      includeCachedValues: options?.includeCachedValues, // Use provided cache flag
      // Preserve microtones? Transpose default does.
    });
  });

  // Create a new scale from the inverted notes.
  // The root of the inverted scale is typically the center note used for inversion.
  // Pass down options.
  return createScaleFromNotes(invertedNotes, center, options);
}
