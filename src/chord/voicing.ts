/**
 * @module Chord/Voicing
 * @description
 * This module provides functions related to chord voicing and inversions.
 * It includes utilities for sorting chord notes by pitch, determining the inversion
 * of a chord based on its bass note, generating different standard voicings
 * (close, open, drop voicings, spread), applying voicing constraints, and generating
 * all possible standard inversions of a chord.
 */

// Import necessary constants and types from within the chord module
import {
  CHORD_FORMULAS,
  COMMON_VOICINGS,
  SCALE_DEGREE_SEMITONES,
} from "./constants";
import {
  Chord,
  ChordCategory,
  ChordFormula,
  ChordQuality,
} from "./types";
// Import necessary Note types and functions
import {
  Note,
  compareNotes,
  createNoteFromParts,
  formatNote,
  intervalBetween,
  notesAreEqual,
  transpose,
} from "../note";
// Added ChordCategory used by generateSpreadVoicing
// Import compareNotes for sorting if needed (though basic sort is implemented inline)
// import { compareNotes } from "../note/operations"; // Not strictly needed by original code

/**
 * Sorts an array of Note objects by pitch in ascending order.
 * Sorts primarily by octave number, then by pitch class index within the same octave.
 * Does not account for microtonal cents deviations in sorting.
 *
 * @param notes - The array of Note objects to sort.
 * @returns A *new* array containing the same Note objects sorted by pitch. The original array is not modified.
 * @example
 * ```ts
 * const unsortedNotes = [createNote('G4'), createNote('C4'), createNote('E4'), createNote('C3')];
 * const sortedNotes = sortChordNotes(unsortedNotes);
 * console.log(sortedNotes.map(formatNote)); // ['C3', 'C4', 'E4', 'G4']
 * ```
 */
export function sortChordNotes(notes: Note[]): Note[] {
  // Create a shallow copy before sorting to avoid modifying the original array
  return [...notes].sort((a, b) => {
    // --- Input Validation inside sort (basic check) ---
    if (
      !a ||
      !b ||
      typeof a.octave !== "number" ||
      typeof b.octave !== "number" ||
      typeof a.pitchClassIndex !== "number" ||
      typeof b.pitchClassIndex !== "number"
    ) {
      // Handle potentially invalid notes in the array gracefully? Or let error occur?
      // Returning 0 keeps their relative order if invalid.
      console.warn("Encountered invalid note object during sorting.");
      return 0;
    }
    // --- End Validation ---

    // Compare octaves first
    if (a.octave !== b.octave) {
      return a.octave - b.octave; // Sort by octave number
    }

    // If octaves are the same, compare by pitch class index
    return a.pitchClassIndex - b.pitchClassIndex; // Sort by pitch class within octave
  });
}

/**
 * Determines the inversion number (0-based) of a chord given its theoretical root,
 * quality (to find the formula), and the actual bass note.
 *
 * @param root - The theoretical root Note of the chord.
 * @param quality - The ChordQuality name (used to look up the formula).
 * @param bassNote - The Note object representing the lowest sounding note (bass).
 * @returns The inversion number (0 for root position, 1 for 1st inversion, 2 for 2nd, 3 for 3rd),
 * or 0 if the bass note matches the root, the quality is unknown, or the bass note doesn't correspond
 * to a standard chord tone in the formula.
 * @remarks Compares the pitch class of the `bassNote` against the expected pitch classes of the chord tones (3rd, 5th, 7th, etc.) derived from the `root` and `quality` formula.
 * @example
 * ```ts
 * const c4 = createNote('C4');
 * const e4 = createNote('E4');
 * const g4 = createNote('G4');
 * const bb4 = createNote('Bb4');
 *
 * getChordInversion(c4, 'major', c4); // 0 (Root position)
 * getChordInversion(c4, 'major', e4); // 1 (1st inversion - E is 3rd of Cmaj)
 * getChordInversion(c4, 'major', g4); // 2 (2nd inversion - G is 5th of Cmaj)
 * getChordInversion(c4, '7', bb4); // 3 (3rd inversion - Bb is 7th of C7)
 * getChordInversion(c4, 'minor', e4); // 0 (E is not the m3 of C, returns 0 as bass doesn't match formula positions other than root implicitly) -> Check logic. Should return index if PC matches.
 * // Let's re-test logic: E4 (PC=4). Formula for 'minor' is {1:0, 3:-1, 5:0}. Root C4 (PC=0).
 * // Expected PCs (relative): 0, 3 (Eb), 7 (G). Bass PC 4 (E) doesn't match 0, 3, or 7. Returns 0. Correct.
 * ```
 */
export function getChordInversion(
  root: Note,
  quality: ChordQuality,
  bassNote: Note
): number {
  // Returns 0, 1, 2, 3...
  // --- Input Validation ---
  if (!root || !quality || !bassNote) {
    console.warn("Invalid input provided to getChordInversion.");
    return 0; // Default to root position on invalid input
  }
  // --- End Validation ---

  // If the bass note's pitch class is the same as the root's, it's root position (inversion 0)
  // Use notesAreEqual for pitch class comparison (ignoring octave)
  if (notesAreEqual(root, bassNote)) {
    // notesAreEqual checks pitch class and octave - use direct PC compare instead.
    // if (root.pitchClassIndex === bassNote.pitchClassIndex) { // Correct check
    return 0;
  }
  // Revert to original code's notesAreEqual check for adherence.
  if (notesAreEqual(root, bassNote)) {
    return 0;
  }

  // Get the formula for this chord quality to find expected chord tones
  const formula = CHORD_FORMULAS[quality];
  if (!formula) {
    console.warn(
      `Unknown chord quality "${quality}" in getChordInversion. Cannot determine inversion.`
    );
    return 0; // Default to root position if quality/formula is unknown
  }

  // Generate the expected chord tone pitch classes relative to the root.
  // We need to know the order (Root, 3rd, 5th, 7th...) to determine the inversion number.
  // Get the degrees from the formula and sort them numerically.
  const degrees = Object.keys(formula)
    .map((d) => parseInt(d, 10))
    .sort((a, b) => a - b);

  // Find the 0-based index (inversion number) corresponding to the bass note's pitch class.
  // Iterate through the *sorted degrees* in the formula (e.g., 1, 3, 5, 7)
  for (let i = 0; i < degrees.length; i++) {
    const degree = degrees[i];

    // Skip the root degree (1) itself, inversion is relative to other tones being in bass
    if (degree === 1) continue;

    // Get the base semitones for this scale degree
    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) {
      console.warn(
        `Unknown degree ${degree} found in formula for ${quality} during inversion check.`
      );
      continue; // Skip if degree definition is missing
    }

    // Apply alteration from the formula
    const alteration = formula[degree];
    if (typeof alteration !== "number") continue; // Skip if alteration invalid
    semitones += alteration;

    // Calculate the expected pitch class for this chord tone
    const expectedPC = (root.pitchClassIndex + semitones + 12) % 12;

    // Check if the bass note's pitch class matches this expected chord tone's pitch class
    if (bassNote.pitchClassIndex === expectedPC) {
      // The inversion number is the index 'i' IF the degrees array started with Root (1).
      // Since we sorted degrees=[1, 3, 5...], index 0 is Root, index 1 is 3rd, index 2 is 5th...
      // Therefore, the index 'i' directly corresponds to the inversion number.
      return i; // Found the inversion (0=Root, 1=3rd in bass, 2=5th in bass, etc.)
    }
  }

  // If the bass note's pitch class doesn't match any calculated chord tone (other than root)
  // it's considered root position relative to the formula, or it's a non-chord tone bass.
  // Return 0 as per original code's behavior.
  return 0;
}

/**
 * Generates a differently voiced Chord object based on the specified voicing type and options.
 * Starts with the chord's formula and root, generates notes, and then applies voicing logic.
 *
 * @param chord - The input Chord object (used for root, quality, formula, category).
 * @param options - Options object specifying the desired voicing.
 * @param options.voicingType - The type of voicing to generate ('close', 'open', 'drop2', 'drop3', 'spread', 'custom').
 * @param [options.octaveRange] - For 'open'/'custom': desired octave range [min, max].
 * @param [options.topNote] - For 'open'/'custom': constraint for the highest note.
 * @param [options.bottomNote] - For 'open'/'custom': constraint for the lowest note.
 * @param [options.maxSpread] - For 'open'/'custom': maximum interval allowed between adjacent voices.
 * @returns A new Chord object with the notes rearranged according to the specified voicing. The `bass` and `inversion` properties are updated based on the new lowest note.
 * @throws {Error} If the input chord or formula is invalid, or if voicing generation fails.
 * @remarks This function acts as a dispatcher to internal voicing generation helpers. The effectiveness and musicality of 'open', 'spread', and 'custom' voicings depend on the specific algorithms in the helper functions. 'Classical' and 'Nashville' formats are placeholders in the original related formatting function.
 */
export function voiceChord(
  chord: Chord,
  options: {
    /** The target voicing type */
    voicingType: "close" | "open" | "drop2" | "drop3" | "spread" | "custom";
    /** Optional: Minimum and maximum octave constraint [minOctave, maxOctave] */
    octaveRange?: [number, number];
    /** Optional: The highest desired note (constrains upper limit) */
    topNote?: Note;
    /** Optional: The lowest desired note (constrains lower limit) */
    bottomNote?: Note;
    /** Optional: Maximum allowed interval (in semitones) between adjacent notes */
    maxSpread?: number;
    /** @deprecated Original code had this, seems unused in voicing logic */
    customVoiceLeading?: boolean; // Seems unused in helper functions
  }
): Chord {
  // --- Input Validation ---
  if (!chord || !chord.root || !chord.formula || !chord.category) {
    throw new Error("Invalid chord object provided to voiceChord.");
  }
  if (!options || !options.voicingType) {
    throw new Error(
      "Voicing options (including voicingType) must be provided."
    );
  }
  // --- End Validation ---

  // Destructure necessary properties from the input chord
  const { root, formula, quality, category } = chord;
  const { voicingType } = options;

  // --- Generate new notes based on voicing type ---
  let newNotes: Note[];

  switch (voicingType) {
    case "close":
      // Generate notes in close position (typically within or near one octave)
      newNotes = generateCloseVoicing(root, formula);
      break;

    case "open":
      // Generate notes spread across octaves, applying constraints
      newNotes = generateOpenVoicing(root, formula, options);
      break;

    case "drop2":
      // Generate Drop-2 voicing (2nd note from top dropped an octave)
      newNotes = generateDropVoicing(root, formula, 2); // dropPosition = 2
      break;

    case "drop3":
      // Generate Drop-3 voicing (3rd note from top dropped an octave)
      newNotes = generateDropVoicing(root, formula, 3); // dropPosition = 3
      break;

    case "spread":
      // Generate spread voicing based on common patterns for the chord category
      newNotes = generateSpreadVoicing(root, formula, category);
      break;

    case "custom":
      // Generate voicing based on various custom constraints
      newNotes = generateCustomVoicing(root, formula, options);
      break;

    default:
      // Fallback to close voicing if type is unknown
      console.warn(
        `Unknown voicing type "${voicingType}". Defaulting to close voicing.`
      );
      newNotes = generateCloseVoicing(root, formula);
  }
  // --- End note generation ---

  // Ensure notes were generated
  if (!newNotes || newNotes.length === 0) {
    throw new Error(
      `Failed to generate notes for voicing type "${voicingType}".`
    );
  }

  // Determine the new bass note (the lowest note in the generated voicing)
  // Assumes the voicing functions return sorted arrays, or sort here.
  // Let's explicitly sort to be safe.
  const sortedNewNotes = sortChordNotes(newNotes);
  const newBass = sortedNewNotes[0];

  // Calculate the new inversion based on the new bass note
  const newInversion = getChordInversion(root, quality, newBass);

  // Create and return a new immutable Chord object with the updated notes, bass, and inversion
  return Object.freeze({
    // Freeze result (present in original getAllInversions)
    ...chord, // Copy original root, quality, formula, category, symbol, tuningSystem
    notes: Object.freeze(sortedNewNotes), // Use the newly generated and frozen notes array
    bass: newBass, // Update the bass note
    inversion: newInversion, // Update the inversion number
  });
}

/**
 * @internal
 * Generates notes for a chord in close position voicing.
 * Notes are generated based on the formula and placed as compactly as possible,
 * typically within a single octave above the root, then sorted by pitch.
 *
 * @param root - The root Note of the chord.
 * @param formula - The ChordFormula defining the intervals.
 * @returns A new array of Note objects sorted by pitch (close voicing).
 */
function generateCloseVoicing(root: Note, formula: ChordFormula): Note[] {
  const notes: Note[] = [];
  // Ensure root note's cache status (midi) is considered for includeCachedValues default
  const includeCache = !!root.midi; // Base cache flag on root's status

  // Add each note specified in the formula by transposing the root
  // Use Object.entries as in original code
  for (const [degreeStr, alteration] of Object.entries(formula)) {
    const degree = parseInt(degreeStr, 10);

    // Get the base interval in semitones for this degree
    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) {
      console.warn(`Unknown degree ${degree} in formula for close voicing.`);
      continue; // Skip unknown degrees
    }

    // Apply the alteration specified in the formula
    semitones += alteration;

    // Transpose the root note by the calculated semitones
    // The transpose function handles octave wrapping naturally based on interval size.
    // For close voicing, we don't explicitly constrain octaves here,
    // but rely on transpose placing notes usually within an octave or so for typical formulas.
    // The final sort ensures pitch order.
    const note = transpose(root, semitones, {
      // Use root's preference? Default sharp? Let's default sharp.
      prefer: "sharp", // Assuming default preference
      includeCachedValues: includeCache, // Propagate cache status
    });

    notes.push(note);
  }

  // Ensure the root note itself is included if formula doesn't list degree 1 explicitly
  if (!notes.some((n) => notesAreEqual(n, root))) {
    // Check pitch equality
    // Find root note object based on pitch class and octave? Or just add the input root? Add input root.
    notes.push(root);
  }

  // Sort the generated notes by pitch to achieve close voicing
  return sortChordNotes(notes);
}

/**
 * @internal
 * Generates an open position voicing for a chord.
 * Spreads the notes (derived from a close voicing) across multiple octaves,
 * often by placing alternating notes in higher octaves.
 * Applies optional constraints for octave range and top note.
 *
 * @param root - The root Note of the chord.
 * @param formula - The ChordFormula defining the intervals.
 * @param options - Options object containing potential constraints.
 * @param options.octaveRange - Optional [min, max] octave constraint.
 * @param options.topNote - Optional highest Note constraint.
 * @param options.maxSpread - Optional max spread constraint (currently unused in this specific helper).
 * @returns A new array of Note objects sorted by pitch, representing an open voicing.
 */
function generateOpenVoicing(
  root: Note,
  formula: ChordFormula,
  options: {
    octaveRange?: [number, number];
    topNote?: Note;
    maxSpread?: number; // Unused in this specific function as written
  }
): Note[] {
  const notes: Note[] = [];
  // Determine octave range constraints
  const minOctave = options.octaveRange?.[0] ?? root.octave; // Default min to root octave
  const maxOctave = options.octaveRange?.[1] ?? root.octave + 2; // Default max to root octave + 2

  // Start with the notes generated in close voicing
  const closeVoicing = generateCloseVoicing(root, formula);
  if (closeVoicing.length === 0) return []; // Return empty if close voicing failed

  // Distribute notes across octaves using a simple alternating strategy
  let currentOctave = minOctave;
  for (let i = 0; i < closeVoicing.length; i++) {
    const note = closeVoicing[i];
    // Check if note is valid before proceeding
    if (!note) continue;

    // For open voicing heuristic: increment octave every 2 notes (or adjust logic)
    // Original code incremented every 2 notes after the first.
    if (i > 0 && i % 2 === 0 && currentOctave < maxOctave) {
      // Check if incrementing keeps it within maxOctave constraint
      // This logic might push notes too high too quickly.
      // Let's adjust: aim to place notes in `currentOctave` if possible, increment if needed.
      // Find base note octave based on close voicing root?
      // Simpler approach: Place notes sequentially, pushing octave up if pitch class decreases.
      // Reverting to original logic:
      currentOctave++; // Increment octave every two notes (after the first pair)
    }

    // Ensure octave doesn't exceed max constraint even with the simple increment
    const targetOctave = Math.min(currentOctave, maxOctave);

    // Create a new note at the target octave, preserving spelling
    // Check if note already exists with the correct properties to avoid redundant creation? No, create new.
    try {
      const openNote = createNoteFromParts({
        letter: note.letter,
        accidental: note.accidental,
        octave: targetOctave, // Use calculated target octave
        includeCachedValues: !!note.midi, // Propagate cache status
      });
      notes.push(openNote);
    } catch (e) {
      console.error(
        `Error creating open voiced note for ${formatNote(
          note
        )} at octave ${targetOctave}:`,
        e
      );
    }
  }

  // Re-sort after potential octave changes to ensure correct order
  const sortedOpenNotes = sortChordNotes(notes);
  if (sortedOpenNotes.length === 0) return []; // Check after potential errors

  // Apply top note constraint if provided (shift entire voicing down if needed)
  if (options.topNote) {
    let topNote = sortedOpenNotes[sortedOpenNotes.length - 1];
    // While the current top note is higher than the constraint...
    while (
      topNote &&
      options.topNote && // Check existence
      (topNote.octave > options.topNote.octave ||
        (topNote.octave === options.topNote.octave &&
          topNote.pitchClassIndex > options.topNote.pitchClassIndex))
    ) {
      // ...shift every note in the voicing down by one octave.
      for (let i = 0; i < sortedOpenNotes.length; i++) {
        const current = sortedOpenNotes[i];
        try {
          sortedOpenNotes[i] = createNoteFromParts({
            letter: current.letter,
            accidental: current.accidental,
            octave: current.octave - 1,
            includeCachedValues: !!current.midi,
          });
        } catch (e) {
          /* Handle error if octave becomes invalid */
        }
      }
      // Update the top note for the next iteration check
      topNote = sortedOpenNotes[sortedOpenNotes.length - 1];
    }
  }

  // Return the final sorted open voicing notes
  return sortedOpenNotes; // Already sorted
}

/**
 * @internal
 * Generates a "drop" voicing (e.g., Drop 2, Drop 3) for a chord.
 * Starts with a close voicing and drops the Nth note from the top down one octave.
 *
 * @param root - The root Note of the chord.
 * @param formula - The ChordFormula defining the intervals.
 * @param dropPosition - Which note from the top to drop (2 for Drop 2, 3 for Drop 3).
 * @returns A new array of Note objects sorted by pitch, representing the drop voicing. Returns close voicing if chord is too small for the drop.
 */
function generateDropVoicing(
  root: Note,
  formula: ChordFormula,
  dropPosition: number // e.g., 2 for Drop 2, 3 for Drop 3
): Note[] {
  // Start with the notes generated in close position voicing
  const closeVoicing = generateCloseVoicing(root, formula);

  // Cannot perform drop if the chord doesn't have enough notes
  // Need at least 'dropPosition' notes.
  if (closeVoicing.length < dropPosition) {
    console.warn(
      `Cannot generate Drop ${dropPosition} voicing for a chord with only ${closeVoicing.length} notes. Returning close voicing.`
    );
    return closeVoicing; // Return original close voicing
  }

  // Find the index of the note to drop (counting from the top, 1-based dropPosition)
  // E.g., for Drop 2 in a 4-note chord (indices 0,1,2,3), top is index 3. 2nd from top is index 2.
  const indexToDrop = closeVoicing.length - dropPosition;
  // Validate index (should be caught by length check above, but be safe)
  if (indexToDrop < 0) {
    return closeVoicing; // Should not happen
  }

  // Get the actual note object to be dropped
  const noteToDrop = closeVoicing[indexToDrop];
  if (!noteToDrop) return closeVoicing; // Safety check

  // Create the new note dropped down by one octave
  try {
    const droppedNote = createNoteFromParts({
      letter: noteToDrop.letter,
      accidental: noteToDrop.accidental,
      octave: noteToDrop.octave - 1, // Drop octave
      includeCachedValues: !!noteToDrop.midi, // Propagate cache status
    });

    // Create the new voicing array by replacing the original note with the dropped one
    const dropVoicing = [...closeVoicing]; // Copy original notes
    dropVoicing[indexToDrop] = droppedNote; // Replace with dropped version

    // Re-sort the notes by pitch after dropping one note down an octave
    return sortChordNotes(dropVoicing);
  } catch (e) {
    console.error(`Error creating dropped note for Drop ${dropPosition}:`, e);
    return closeVoicing; // Return original on error
  }
}

/**
 * @internal
 * Generates a spread voicing based on common patterns defined in `COMMON_VOICINGS`.
 * Selects a pattern based on the chord's category, reorders notes from a close voicing
 * according to the pattern indices, and adjusts octaves to create spread.
 *
 * @param root - The root Note of the chord.
 * @param formula - The ChordFormula defining the intervals.
 * @param category - The ChordCategory of the chord (used to look up voicing patterns).
 * @returns A new array of Note objects representing the spread voicing. May not be sorted.
 */
function generateSpreadVoicing(
  root: Note,
  formula: ChordFormula,
  category: ChordCategory // Use category to find voicing pattern
): Note[] {
  // Look up predefined voicing patterns for this chord category
  // Fallback to triad patterns if category not found or has no patterns
  // The type assertion `as Record<string, number[][]>` was present in original code
  const voicingPatterns =
    (COMMON_VOICINGS as Record<string, number[][]>)[category] || // Look up category
    COMMON_VOICINGS.triad; // Default to triad patterns

  // Choose a voicing pattern (use first one found by default)
  const pattern = voicingPatterns[0];
  if (!pattern || pattern.length === 0) {
    console.warn(
      `No suitable spread voicing pattern found for category "${category}". Using close voicing.`
    );
    return generateCloseVoicing(root, formula); // Fallback
  }

  // Generate the notes in close position first to get all chord tones
  const closeNotes = generateCloseVoicing(root, formula);

  // Apply the voicing pattern by selecting notes from close voicing based on pattern indices
  // Each number in the pattern represents the 0-based index of the chord tone (R=0, 3rd=1, 5th=2...)
  const reorderedNotes: Note[] = [];
  for (const index of pattern) {
    // Ensure the index is valid for the generated close notes
    if (index >= 0 && index < closeNotes.length) {
      reorderedNotes.push(closeNotes[index]);
    } else {
      console.warn(
        `Spread voicing pattern index ${index} out of bounds for chord with ${closeNotes.length} notes.`
      );
    }
  }
  if (reorderedNotes.length === 0) return closeNotes; // Fallback if pattern failed

  // Adjust octaves heuristically to create the spread
  // Iterate through the reordered notes, starting from the second note
  for (let i = 1; i < reorderedNotes.length; i++) {
    // If this note's pitch class is lower than or equal to the previous one, move it up an octave
    // to ensure ascending pitch order within the spread voicing heuristic.
    if (
      reorderedNotes[i].pitchClassIndex <= reorderedNotes[i - 1].pitchClassIndex
    ) {
      try {
        reorderedNotes[i] = createNoteFromParts({
          letter: reorderedNotes[i].letter,
          accidental: reorderedNotes[i].accidental,
          octave: reorderedNotes[i].octave + 1, // Move up one octave
          includeCachedValues: !!reorderedNotes[i].midi, // Propagate cache status
        });
      } catch (e) {
        /* Handle error */
      }
    }
    // This simple octave adjustment might need refinement for better musical voicings.
  }

  // Return the reordered notes. Note: This might not be perfectly sorted by pitch depending on pattern/adjustments.
  return reorderedNotes; // Original code didn't explicitly sort here after reordering
}

/**
 * @internal
 * Attempts to generate a custom chord voicing based on specified constraints like
 * octave range, top/bottom note limits, and maximum spread between adjacent voices.
 * Starts from a base voicing (close or open) and iteratively adjusts octaves to meet constraints.
 *
 * @param root - The root Note of the chord.
 * @param formula - The ChordFormula defining the intervals.
 * @param options - Options object containing voicing constraints.
 * @param options.octaveRange - Optional [min, max] octave constraint.
 * @param options.topNote - Optional highest Note constraint.
 * @param options.bottomNote - Optional lowest Note constraint.
 * @param options.maxSpread - Optional max allowed interval (semitones) between adjacent notes.
 * @returns A new array of Note objects representing the custom voicing, sorted by pitch.
 * @remarks The algorithm for applying constraints (especially maxSpread) is iterative and heuristic;
 * it may not always find an optimal or possible voicing that meets all constraints simultaneously.
 */
function generateCustomVoicing(
  root: Note,
  formula: ChordFormula,
  options: {
    // Extract relevant options
    octaveRange?: [number, number];
    topNote?: Note;
    bottomNote?: Note;
    maxSpread?: number;
  }
): Note[] {
  // Start with a base voicing - choose close or open based on maxSpread hint?
  // Original code used maxSpread > 6 to choose open, otherwise close.
  let baseVoicing =
    options.maxSpread && options.maxSpread > 6 // Heuristic: if large spread allowed, start open
      ? generateOpenVoicing(root, formula, options) // Start open if wide spread expected
      : generateCloseVoicing(root, formula); // Start close otherwise

  if (baseVoicing.length === 0) return []; // Handle empty base case

  // --- Apply bottom note constraint (shift entire voicing UP if needed) ---
  if (options.bottomNote) {
    // Continue shifting up as long as the lowest note is below the constraint
    // Use compareNotes for robust pitch comparison? No, stick to original logic.
    while (
      baseVoicing[0] &&
      options.bottomNote && // Ensure notes exist
      (baseVoicing[0].octave < options.bottomNote.octave ||
        (baseVoicing[0].octave === options.bottomNote.octave &&
          baseVoicing[0].pitchClassIndex < options.bottomNote.pitchClassIndex))
    ) {
      // Shift every note up by one octave
      baseVoicing = baseVoicing.map((note) => {
        if (!note) return note; // Skip potentially null notes if array had gaps
        try {
          return createNoteFromParts({
            letter: note.letter,
            accidental: note.accidental,
            octave: note.octave + 1,
            includeCachedValues: !!note.midi,
          });
        } catch (e) {
          return note;
        } // Keep original if error
      });
    }
  }

  // --- Apply top note constraint (shift entire voicing DOWN if needed) ---
  if (options.topNote) {
    // Continue shifting down as long as the highest note exceeds the constraint
    while (
      baseVoicing.length > 0 &&
      options.topNote && // Ensure notes exist
      (baseVoicing[baseVoicing.length - 1].octave > options.topNote.octave ||
        (baseVoicing[baseVoicing.length - 1].octave ===
          options.topNote.octave &&
          baseVoicing[baseVoicing.length - 1].pitchClassIndex >
            options.topNote.pitchClassIndex))
    ) {
      // Shift every note down by one octave
      baseVoicing = baseVoicing.map((note) => {
        if (!note) return note;
        try {
          return createNoteFromParts({
            letter: note.letter,
            accidental: note.accidental,
            octave: note.octave - 1,
            includeCachedValues: !!note.midi,
          });
        } catch (e) {
          return note;
        }
      });
    }
  }

  // --- Apply maximum spread constraint iteratively ---
  // Tries to reduce gaps between adjacent notes that exceed maxSpread by lowering the upper note.
  if (options.maxSpread !== undefined && options.maxSpread > 0) {
    let currentVoicing = [...baseVoicing]; // Work with a mutable copy

    // Iterate potentially multiple times to resolve large spreads caused by adjustments
    let improved = true; // Flag to check if any adjustments were made in a pass
    let iter = 0;
    const MAX_ITER = currentVoicing.length * 2; // Limit iterations

    while (improved && iter < MAX_ITER) {
      improved = false; // Assume no improvement in this pass
      iter++;

      // Check intervals between adjacent pairs of notes
      for (let i = 0; i < currentVoicing.length - 1; i++) {
        const note1 = currentVoicing[i];
        const note2 = currentVoicing[i + 1];
        // Safety check for notes
        if (!note1 || !note2) continue;

        // Calculate semitone distance precisely using intervalBetween? Or MIDI difference?
        // Original seems to calculate based on octave/PC difference.
        // Let's use intervalBetween for clarity, assuming semitones needed.
        const semitones = intervalBetween(note1, note2, true); // Use precise interval

        // If the interval exceeds the maximum allowed spread
        if (semitones > options.maxSpread) {
          // Try to move the higher note (note2) down an octave if it doesn't violate order
          // Check if moving note2 down keeps it higher than or equal to note1
          if (
            note2.octave > note1.octave ||
            (note2.octave === note1.octave &&
              note2.pitchClassIndex > note1.pitchClassIndex)
          ) {
            // Only attempt if note2 is strictly higher than note1
            try {
              const lowerNote = createNoteFromParts({
                letter: note2.letter,
                accidental: note2.accidental,
                octave: note2.octave - 1, // Drop octave
                includeCachedValues: !!note2.midi,
              });

              // Check if dropping makes it lower than note1 (or same pitch)
              if (compareNotes(lowerNote, note1, true) >= 0) {
                // lowerNote >= note1? Use compareNotes
                // Replace note2 with the lower version
                const newVoicing = [...currentVoicing];
                newVoicing[i + 1] = lowerNote;

                // Re-sort and update the working voicing
                currentVoicing = sortChordNotes(newVoicing);
                improved = true; // An improvement was made, may need another pass
                break; // Restart checks from the beginning after modification
              }
            } catch (e) {
              /* Ignore error if note creation fails */
            }
          } // end if note2 > note1
        } // end if spread exceeded
      } // end for loop through pairs
    } // end while(improved)
    if (iter === MAX_ITER)
      console.warn(
        "Max iterations reached trying to apply maxSpread constraint."
      );

    baseVoicing = currentVoicing; // Update baseVoicing with the adjusted version
  }

  // Return the final voicing after applying constraints
  return baseVoicing; // Return the potentially modified array
}

/**
 * Generates an array containing all standard inversions of a given chord.
 * Includes root position (0) and subsequent inversions (1st, 2nd, 3rd...)
 * up to the number of notes in the chord allows.
 * Each element in the array is a new Chord object representing that inversion.
 *
 * @param chord - The input Chord object (typically in root position or close voicing).
 * @returns An array of Chord objects, where each element represents a different inversion
 * (index 0 = root position, index 1 = 1st inversion, etc.). Returns only the original chord if it has fewer than 3 notes? (Check logic)
 * @throws {Error} If the input chord is invalid.
 * @remarks The function rearranges the notes by moving lower notes up an octave for each inversion
 * and updates the `bass` and `inversion` properties accordingly. The returned Chord objects are frozen.
 */
export function getAllInversions(chord: Chord): Chord[] {
  // --- Input Validation ---
  if (!chord || !chord.root || !chord.notes || chord.notes.length === 0) {
    throw new Error("Invalid chord provided to getAllInversions.");
  }
  // Ensure notes are sorted initially for consistent inversion generation
  const sortedRootPosNotes = sortChordNotes([...chord.notes]);
  if (sortedRootPosNotes.length === 0) return []; // Return empty if no valid notes after sorting
  // --- End Validation ---

  const inversions: Chord[] = [];

  // Start with the original chord (or a sorted version representing root position)
  // Recreate the 0th inversion based on sorted notes to ensure consistency?
  // Let's use the input chord as the 0th inversion as per original logic.
  inversions.push(chord);

  // Generate each subsequent inversion (1st, 2nd, etc.)
  // Number of possible inversions = number of notes - 1
  // Loop from 1 up to notes.length - 1 for 1st, 2nd.. inversions
  const numNotes = chord.notes.length; // Use original notes length for inversion count
  for (let i = 1; i < numNotes; i++) {
    // i represents the inversion number (1, 2, 3...)

    // --- Calculate notes for inversion `i` ---
    // Take the notes from the *original sorted root position chord* for consistency
    // Move the first `i` notes up an octave
    const invertedNotesArray: Note[] = [];
    // Add notes from index `i` to the end (these stay in original octave initially)
    for (let j = i; j < sortedRootPosNotes.length; j++) {
      invertedNotesArray.push(sortedRootPosNotes[j]);
    }
    // Add notes from index 0 to `i-1`, transposed up one octave
    for (let j = 0; j < i; j++) {
      const noteToMove = sortedRootPosNotes[j];
      try {
        invertedNotesArray.push(
          createNoteFromParts({
            letter: noteToMove.letter,
            accidental: noteToMove.accidental,
            octave: noteToMove.octave + 1,
            includeCachedValues: !!noteToMove.midi, // Propagate cache status
          })
        );
      } catch (e) {
        /* Handle error if octave becomes invalid */
      }
    }
    // Sort the resulting notes for the inverted chord voicing
    const finalInvertedNotes = sortChordNotes(invertedNotesArray);

    // Create a new immutable Chord object for this inversion
    // Freeze object and notes array (present in original code)
    const invertedChord = Object.freeze({
      ...chord, // Copy original root, quality, formula, etc.
      inversion: i, // Set the correct inversion number
      // Bass note is the first note of the sorted inverted array
      bass: finalInvertedNotes[0],
      // Use the newly arranged and frozen notes array
      notes: Object.freeze(finalInvertedNotes),
      // Symbol might need update if library generates inversion symbols? Keep original symbol for now.
      // symbol: generateChordSymbol(...) // Optionally regenerate symbol with inversion?
    });

    inversions.push(invertedChord); // Add the new Chord object to the list
  }

  // Return the array containing the original chord and all its generated inversions
  return inversions; // Original code didn't freeze this outer array
}
