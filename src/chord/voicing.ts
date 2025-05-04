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
  ChordInversion,
  ChordOptions,
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
  transpose
} from "../note";

/**
 * Sorts an array of Note objects by pitch in ascending order,
 * considering microtonal cents deviations.
 *
 * @param notes - The array of Note objects to sort.
 * @returns A *new* array containing the same Note objects sorted precisely by pitch. The original array is not modified.
 */
export function sortChordNotes(notes: Note[]): Note[] {
  // Create a shallow copy before sorting to avoid modifying the original array
  // Use compareNotes with includeCents=true for precise sorting
  return [...notes].sort((a, b) => compareNotes(a, b, true));
}

/**
 * Determines the inversion number (0-based) of a chord given its theoretical root,
 * quality (to find the formula), and the actual bass note.
 * Compares pitch classes, ignoring octaves.
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
  // CORRECTED: Compare only pitch class index
  if (root.pitchClassIndex === bassNote.pitchClassIndex) {
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
  const degrees = Object.keys(formula)
    .map((d) => parseInt(d, 10))
    .sort((a, b) => a - b);

  // Find the 0-based index (inversion number) corresponding to the bass note's pitch class.
  for (let i = 0; i < degrees.length; i++) {
    const degree = degrees[i];
    if (degree === 1) continue; // Skip root degree itself

    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) {
      console.warn(
        `Unknown degree ${degree} found in formula for ${quality} during inversion check.`
      );
      continue;
    }

    const alteration = formula[degree];
    if (typeof alteration !== "number") continue;
    semitones += alteration;

    const expectedPC = (root.pitchClassIndex + semitones + 12) % 12;

    if (bassNote.pitchClassIndex === expectedPC) {
      return i; // Found the inversion (index in sorted degrees array)
    }
  }

  // Bass note PC didn't match any other formula tone PC
  return 0;
}

/**
 * Generates a differently voiced Chord object based on the specified voicing type and options.
 */
export function voiceChord(
  chord: Chord,
  options: {
    voicingType: "close" | "open" | "drop2" | "drop3" | "spread" | "custom";
    octaveRange?: [number, number];
    topNote?: Note;
    bottomNote?: Note;
    maxSpread?: number;
    // customVoiceLeading?: boolean; // Deprecated/unused
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

  const { root, formula, quality, category } = chord;
  const { voicingType } = options;

  // --- Generate new notes based on voicing type ---
  let newNotes: Note[];

  switch (voicingType) {
    case "close":
      newNotes = generateCloseVoicing(root, formula);
      break;
    case "open":
      newNotes = generateOpenVoicing(root, formula, options);
      break;
    case "drop2":
      newNotes = generateDropVoicing(root, formula, 2);
      break;
    case "drop3":
      newNotes = generateDropVoicing(root, formula, 3);
      break;
    case "spread":
      newNotes = generateSpreadVoicing(root, formula, category);
      break;
    case "custom":
      newNotes = generateCustomVoicing(root, formula, options);
      break;
    default:
      console.warn(
        `Unknown voicing type "${voicingType}". Defaulting to close voicing.`
      );
      newNotes = generateCloseVoicing(root, formula);
  }
  // --- End note generation ---

  if (!newNotes || newNotes.length === 0) {
    throw new Error(
      `Failed to generate notes for voicing type "${voicingType}".`
    );
  }

  // Ensure final notes are sorted precisely
  const sortedNewNotes = sortChordNotes(newNotes);
  const newBass = sortedNewNotes[0];
  const newInversion = getChordInversion(root, quality, newBass);

  // Create and return a new Chord object (NOT frozen)
  return {
    ...chord, // Copy original root, quality, formula, etc.
    notes: Object.freeze(sortedNewNotes), // Freeze internal notes array
    bass: newBass,
    inversion: newInversion,
  };
}

/**
 * @internal
 * Generates notes for a chord in close position voicing, sorted precisely.
 */
function generateCloseVoicing(root: Note, formula: ChordFormula): Note[] {
  const notes: Note[] = [];
  const includeCache = !!root.midi; // Use root's cache status as default

  // Add root note first, ensuring correct octave (base for transposition)
  const rootAtTargetOctave = createNoteFromParts({
    letter: root.letter,
    accidental: root.accidental,
    octave: root.octave, // Use root's original octave as base
    includeCachedValues: includeCache,
  });
  notes.push(rootAtTargetOctave);

  for (const [degreeStr, alteration] of Object.entries(formula)) {
    const degree = parseInt(degreeStr, 10);
    if (degree === 1) continue; // Skip root, already added

    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) {
      console.warn(`Unknown degree ${degree} in formula for close voicing.`);
      continue;
    }
    semitones += alteration;

    const note = transpose(rootAtTargetOctave, semitones, {
      prefer: "sharp", // Or use root's preference?
      includeCachedValues: includeCache,
      preserveMicrotonalProperties: false, // Assume formula implies 12-TET intervals from root
    });
    notes.push(note);
  }

  // Sort precisely by pitch
  return sortChordNotes(notes);
}

/**
 * @internal
 * Generates an open position voicing, preserving microtones during octave shifts.
 */
function generateOpenVoicing(
  root: Note,
  formula: ChordFormula,
  options: {
    octaveRange?: [number, number];
    topNote?: Note;
    bottomNote?: Note; // Added bottomNote constraint processing
    maxSpread?: number;
  }
): Note[] {
  // Start with the notes generated in close voicing
  const closeVoicing = generateCloseVoicing(root, formula);
  if (closeVoicing.length === 0) return [];

  // Distribute notes using a simple alternating octave heuristic
  let openNotes: Note[] = [];
  let currentTargetOctave = root.octave; // Start near root octave

  for (let i = 0; i < closeVoicing.length; i++) {
    const note = closeVoicing[i];
    if (!note) continue;

    // Simple heuristic: alternate notes go up an octave
    const targetOctave = currentTargetOctave + Math.floor(i / 2); // Example heuristic

    // Create note at target octave, preserving properties
    if (note.octave !== targetOctave) {
      try {
        // Use transpose to shift octave, preserving microtones
        const octaveShift = targetOctave - note.octave;
        openNotes.push(
          transpose(note, octaveShift * 12, {
            preserveMicrotonalProperties: true,
          })
        );
      } catch (e) {
        console.error(
          `Error creating open voiced note for ${formatNote(
            note
          )} at octave ${targetOctave}:`,
          e
        );
        openNotes.push(note); // Keep original on error
      }
    } else {
      openNotes.push(note); // Already in correct octave
    }
  }
  // Re-sort after initial octave placement
  openNotes = sortChordNotes(openNotes);
  if (openNotes.length === 0) return [];

  // --- Apply Constraints Iteratively ---
  let changed = true; // Flag to re-iterate if constraints cause shifts
  let iter = 0;
  const MAX_ITER = openNotes.length * 2; // Limit iterations

  while (changed && iter < MAX_ITER) {
    changed = false;
    iter++;

    // Apply bottom note constraint (shift UP)
    if (options.bottomNote && openNotes[0]) {
      while (compareNotes(openNotes[0], options.bottomNote, true) < 0) {
        // Shift every note up by one octave using transpose
        try {
          openNotes = openNotes.map((note) =>
            transpose(note, 12, { preserveMicrotonalProperties: true })
          );
          changed = true; // Mark that a change occurred
        } catch (e) {
          console.error("Error applying bottom note constraint (up shift):", e);
          break; // Stop shifting if error occurs
        }
      }
    }

    // Apply top note constraint (shift DOWN)
    if (
      options.topNote &&
      openNotes.length > 0 &&
      openNotes[openNotes.length - 1]
    ) {
      while (
        compareNotes(openNotes[openNotes.length - 1], options.topNote, true) > 0
      ) {
        // Shift every note down by one octave using transpose
        try {
          openNotes = openNotes.map((note) =>
            transpose(note, -12, { preserveMicrotonalProperties: true })
          );
          changed = true; // Mark that a change occurred
        } catch (e) {
          console.error("Error applying top note constraint (down shift):", e);
          break; // Stop shifting if error occurs
        }
      }
    }
    // Re-sort after potential shifts before next iteration or return
    openNotes = sortChordNotes(openNotes);
  }
  if (iter === MAX_ITER)
    console.warn(
      "Max iterations reached applying constraints in generateOpenVoicing."
    );

  // Note: maxSpread constraint not implemented here, only top/bottom/range via shifts.
  // Range is implicitly handled by top/bottom shifts.

  return openNotes;
}

/**
 * @internal
 * Generates a "drop" voicing, preserving microtones.
 */
function generateDropVoicing(
  root: Note,
  formula: ChordFormula,
  dropPosition: number // e.g., 2 for Drop 2, 3 for Drop 3
): Note[] {
  const closeVoicing = generateCloseVoicing(root, formula);
  if (closeVoicing.length < dropPosition) {
    console.warn(
      `Cannot generate Drop ${dropPosition} voicing for chord with ${closeVoicing.length} notes.`
    );
    return closeVoicing;
  }

  const indexToDrop = closeVoicing.length - dropPosition;
  if (indexToDrop < 0) return closeVoicing;

  const noteToDrop = closeVoicing[indexToDrop];
  if (!noteToDrop) return closeVoicing;

  try {
    // CORRECTED: Use transpose to drop octave and preserve microtones
    const droppedNote = transpose(noteToDrop, -12, {
      preserveMicrotonalProperties: true,
      // Caching handled by transpose/creation internally
    });

    const dropVoicing = [...closeVoicing];
    dropVoicing[indexToDrop] = droppedNote;

    // Re-sort precisely
    return sortChordNotes(dropVoicing);
  } catch (e) {
    console.error(`Error creating dropped note for Drop ${dropPosition}:`, e);
    return closeVoicing; // Return original on error
  }
}

/**
 * @internal
 * Generates a spread voicing based on common patterns, preserving microtones, and sorting result.
 */
function generateSpreadVoicing(
  root: Note,
  formula: ChordFormula,
  category: ChordCategory
): Note[] {
  const voicingPatterns = COMMON_VOICINGS[category] || COMMON_VOICINGS.triad;
  const pattern = voicingPatterns[0]; // Use first available pattern

  if (!pattern || pattern.length === 0) {
    console.warn(
      `No spread voicing pattern found for category "${category}". Using close voicing.`
    );
    return generateCloseVoicing(root, formula);
  }

  const closeNotes = generateCloseVoicing(root, formula);
  const reorderedNotes: Note[] = [];

  for (const index of pattern) {
    if (index >= 0 && index < closeNotes.length) {
      reorderedNotes.push(closeNotes[index]);
    } else {
      console.warn(
        `Spread voicing pattern index ${index} out of bounds for chord with ${closeNotes.length} notes.`
      );
    }
  }

  if (reorderedNotes.length === 0) return closeNotes; // Fallback

  // Adjust octaves heuristically to create the spread, preserving microtones
  for (let i = 1; i < reorderedNotes.length; i++) {
    // If this note is lower than or same pitch class as previous, move up
    if (compareNotes(reorderedNotes[i], reorderedNotes[i - 1], false) <= 0) {
      // Compare ignoring cents for octave logic
      try {
        // CORRECTED: Use transpose for octave shift
        reorderedNotes[i] = transpose(reorderedNotes[i], 12, {
          preserveMicrotonalProperties: true,
        });
      } catch (e) {
        console.error(
          `Error adjusting octave in spread voicing: ${(e as Error).message}`
        );
        // Keep original note if transpose fails
      }
    }
  }

  // CORRECTED: Sort the final result precisely
  return sortChordNotes(reorderedNotes);
}

/**
 * @internal
 * Generates a custom voicing applying constraints, preserving microtones.
 */
function generateCustomVoicing(
  root: Note,
  formula: ChordFormula,
  options: {
    octaveRange?: [number, number];
    topNote?: Note;
    bottomNote?: Note;
    maxSpread?: number;
  }
): Note[] {
  // Start with a base voicing
  let currentVoicing =
    options.maxSpread && options.maxSpread > 6
      ? generateOpenVoicing(root, formula, options)
      : generateCloseVoicing(root, formula);

  if (currentVoicing.length === 0) return [];

  // --- Apply Constraints Iteratively (Preserving Microtones) ---
  let changed = true;
  let iter = 0;
  const MAX_ITER = currentVoicing.length * 3; // Increased limit slightly

  while (changed && iter < MAX_ITER) {
    changed = false;
    iter++;

    // Apply bottom note constraint (shift UP)
    if (options.bottomNote && currentVoicing[0]) {
      while (compareNotes(currentVoicing[0], options.bottomNote, true) < 0) {
        try {
          // CORRECTED: Use transpose
          currentVoicing = currentVoicing.map((note) =>
            transpose(note, 12, { preserveMicrotonalProperties: true })
          );
          changed = true;
        } catch (e) {
          console.error("Error applying bottom note constraint (up shift):", e);
          break;
        }
      }
    }

    // Apply top note constraint (shift DOWN)
    if (
      options.topNote &&
      currentVoicing.length > 0 &&
      currentVoicing[currentVoicing.length - 1]
    ) {
      while (
        compareNotes(
          currentVoicing[currentVoicing.length - 1],
          options.topNote,
          true
        ) > 0
      ) {
        try {
          // CORRECTED: Use transpose
          currentVoicing = currentVoicing.map((note) =>
            transpose(note, -12, { preserveMicrotonalProperties: true })
          );
          changed = true;
        } catch (e) {
          console.error("Error applying top note constraint (down shift):", e);
          break;
        }
      }
    }

    // Apply maximum spread constraint
    if (options.maxSpread !== undefined && options.maxSpread > 0) {
      // Sort before checking spread
      currentVoicing = sortChordNotes(currentVoicing);
      for (let i = 0; i < currentVoicing.length - 1; i++) {
        const note1 = currentVoicing[i];
        const note2 = currentVoicing[i + 1];
        if (!note1 || !note2) continue;

        // Use precise interval including cents
        const semitones = intervalBetween(note1, note2, true);

        if (semitones > options.maxSpread) {
          // Try moving note2 down if it doesn't cross note1
          if (compareNotes(note2, note1, true) > 0) {
            // Ensure note2 is strictly higher
            try {
              // CORRECTED: Use transpose
              const lowerNote = transpose(note2, -12, {
                preserveMicrotonalProperties: true,
              });
              // Check if dropping keeps it >= note1
              if (compareNotes(lowerNote, note1, true) >= 0) {
                const newVoicing = [...currentVoicing];
                newVoicing[i + 1] = lowerNote;
                currentVoicing = sortChordNotes(newVoicing); // Re-sort after change
                changed = true; // Mark improvement
                break; // Restart spread checks after modification
              }
            } catch (e) {
              /* Ignore error if note creation fails */
            }
          }
        }
      } // End for loop (spread check)
    } // End if maxSpread
  } // End while loop

  if (iter === MAX_ITER)
    console.warn("Max iterations reached applying custom constraints.");

  // Return final sorted voicing
  return sortChordNotes(currentVoicing);
}

/**
 * Generates an array containing all standard inversions of a given chord, preserving microtones.
 */
export function getAllInversions(chord: Chord): Chord[] {
  // --- Input Validation ---
  if (!chord || !chord.root || !chord.notes || chord.notes.length === 0) {
    throw new Error("Invalid chord provided to getAllInversions.");
  }
  // Start with precisely sorted root position notes from the input chord
  const sortedRootPosNotes = sortChordNotes([...chord.notes]);
  if (sortedRootPosNotes.length === 0) return [];
  // --- End Validation ---

  const inversions: Chord[] = [];

  // Create the root position chord object consistently based on sorted notes
  const rootPositionChord = {
    // Not frozen here
    ...chord,
    notes: Object.freeze(sortedRootPosNotes), // Freeze internal notes
    bass: sortedRootPosNotes[0],
    inversion: 0,
    // Optionally regenerate symbol if needed, or keep original
    // symbol: generateChordSymbol({ ...chord, notes: sortedRootPosNotes, bass: sortedRootPosNotes[0], inversion: 0 })
  };
  inversions.push(rootPositionChord);

  // Generate subsequent inversions
  let currentNotes = sortedRootPosNotes; // Base for generating next inversion
  for (let i = 1; i < sortedRootPosNotes.length; i++) {
    // Loop for 1st, 2nd, etc.
    // Move the lowest note up an octave to get the next inversion notes
    const noteToMove = currentNotes[0]; // Get the current bass note
    let nextNotes: Note[];
    try {
      // CORRECTED: Use transpose for octave shift
      const movedNote = transpose(noteToMove, 12, {
        preserveMicrotonalProperties: true,
      });
      // Create new array: slice(1) + movedNote, then sort
      nextNotes = sortChordNotes([...currentNotes.slice(1), movedNote]);
    } catch (e) {
      console.error(
        `Error generating inversion ${i}: Cannot transpose bass note up.`,
        e
      );
      // Stop generating further inversions if one fails
      break;
    }

    // Create a new Chord object for this inversion
    const invertedChord = {
      // Not frozen here
      ...chord, // Copy original root, quality, formula, etc.
      inversion: i, // Set the correct inversion number
      bass: nextNotes[0], // New bass note is the lowest of the new set
      notes: Object.freeze(nextNotes), // Use the newly arranged and frozen notes
      // Optionally regenerate symbol
    };
    inversions.push(invertedChord);
    currentNotes = nextNotes; // Use these notes as base for the *next* inversion
  }

  // Return the array of Chord objects (outer array not frozen)
  return inversions;
}
