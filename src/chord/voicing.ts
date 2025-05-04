/**
 * Functions for chord voicing and inversions
 */

import {
  CHORD_FORMULAS,
  COMMON_VOICINGS,
  SCALE_DEGREE_SEMITONES,
} from "./constants";
import { Chord, ChordFormula, ChordOptions, ChordQuality } from "./types";
import { Note, createNoteFromParts, notesAreEqual, transpose } from "../note";

/**
 * Sort chord notes by pitch
 */
export function sortChordNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    // Compare octaves first
    if (a.octave !== b.octave) {
      return a.octave - b.octave;
    }

    // Same octave, compare pitch class
    return a.pitchClassIndex - b.pitchClassIndex;
  });
}

/**
 * Get the inversion of a chord based on its bass note
 */
export function getChordInversion(
  root: Note,
  quality: ChordQuality,
  bassNote: Note
): number {
  // If bass is the root, it's root position
  if (notesAreEqual(root, bassNote)) {
    return 0;
  }

  // Get the formula for this chord quality
  const formula = CHORD_FORMULAS[quality];
  if (!formula) {
    return 0; // Default to root position if unknown quality
  }

  // Generate the chord notes to identify where the bass is
  const notes = [];

  // First, add all the notes in this chord
  for (const [degreeStr, alteration] of Object.entries(formula)) {
    const degree = parseInt(degreeStr, 10);

    // Skip the root, we already have it
    if (degree === 1) continue;

    // Get the base semitones for this scale degree
    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) {
      continue;
    }

    // Apply alteration
    semitones += alteration;

    // Create the note
    const note = transpose(root, semitones, {
      includeCachedValues: !!root.midi,
    });

    notes.push(note);
  }

  // Add the root at the front
  notes.unshift(root);

  // Find where the bass note is in this list
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].pitchClassIndex === bassNote.pitchClassIndex) {
      return i; // Found the inversion
    }
  }

  // Not a standard inversion
  return 0;
}

/**
 * Generate different voicings for a chord
 */
export function voiceChord(
  chord: Chord,
  options: {
    voicingType: "close" | "open" | "drop2" | "drop3" | "spread" | "custom";
    octaveRange?: [number, number]; // Min and max octave
    topNote?: Note; // Highest note constraint
    bottomNote?: Note; // Lowest note constraint
    maxSpread?: number; // Maximum interval between adjacent notes
    customVoiceLeading?: boolean; // Use voice leading principles
  }
): Chord {
  const { quality, root, formula, category } = chord;
  const { voicingType } = options;

  // Get the original notes in the chord
  const originalNotes = [...chord.notes];
  let newNotes: Note[];

  switch (voicingType) {
    case "close":
      // Close voicing - notes as close as possible
      newNotes = generateCloseVoicing(root, formula);
      break;

    case "open":
      // Open voicing - notes spread across octaves
      newNotes = generateOpenVoicing(root, formula, options);
      break;

    case "drop2":
      // Drop-2 voicing - second note from top dropped an octave
      newNotes = generateDropVoicing(root, formula, 2);
      break;

    case "drop3":
      // Drop-3 voicing - third note from top dropped an octave
      newNotes = generateDropVoicing(root, formula, 3);
      break;

    case "spread":
      // Spread voicing - custom distribution based on common patterns
      newNotes = generateSpreadVoicing(root, formula, category);
      break;

    case "custom":
      // Custom voicing based on provided constraints
      newNotes = generateCustomVoicing(root, formula, options);
      break;

    default:
      // Default to close voicing
      newNotes = generateCloseVoicing(root, formula);
  }

  // Create a new chord with the new voicing
  return Object.freeze({
    ...chord,
    notes: Object.freeze(newNotes),
    bass: newNotes[0], // Update bass note to match new voicing
  });
}

/**
 * Generate a close position voicing
 */
function generateCloseVoicing(root: Note, formula: ChordFormula): Note[] {
  const notes: Note[] = [];

  // Add each note in the formula
  for (const [degreeStr, alteration] of Object.entries(formula)) {
    const degree = parseInt(degreeStr, 10);

    // Get the base semitones for this scale degree
    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) {
      continue;
    }

    // Apply alteration
    semitones += alteration;

    // For close voicing, all notes should be in the same octave if possible
    // We might need to adjust octaves for notes above an octave
    const octaveAdjust = Math.floor(semitones / 12);
    const adjustedSemitones = semitones % 12;

    // Create the note
    const note = transpose(root, adjustedSemitones + octaveAdjust * 12, {
      includeCachedValues: !!root.midi,
    });

    notes.push(note);
  }

  return sortChordNotes(notes);
}

/**
 * Generate an open position voicing
 */
function generateOpenVoicing(
  root: Note,
  formula: ChordFormula,
  options: {
    octaveRange?: [number, number];
    topNote?: Note;
    maxSpread?: number;
  }
): Note[] {
  const notes: Note[] = [];
  const minOctave = options.octaveRange?.[0] || root.octave;
  const maxOctave = options.octaveRange?.[1] || root.octave + 2;

  // Start with close voicing
  const closeVoicing = generateCloseVoicing(root, formula);

  // Distribute notes across octaves
  let currentOctave = minOctave;
  for (let i = 0; i < closeVoicing.length; i++) {
    // For open voicing, increment octave every 2 notes
    if (i > 0 && i % 2 === 0 && currentOctave < maxOctave) {
      currentOctave++;
    }

    const note = closeVoicing[i];

    // Create a new note at the target octave
    const openNote = createNoteFromParts({
      letter: note.letter,
      accidental: note.accidental,
      octave: currentOctave,
      includeCachedValues: !!note.midi,
    });

    notes.push(openNote);
  }

  // Apply top note constraint if provided
  if (options.topNote) {
    // Adjust octaves down if needed to meet constraint
    while (
      notes[notes.length - 1].octave > options.topNote.octave ||
      (notes[notes.length - 1].octave === options.topNote.octave &&
        notes[notes.length - 1].pitchClassIndex >
          options.topNote.pitchClassIndex)
    ) {
      // Shift everything down an octave
      notes.forEach((note, i) => {
        notes[i] = createNoteFromParts({
          letter: note.letter,
          accidental: note.accidental,
          octave: note.octave - 1,
          includeCachedValues: !!note.midi,
        });
      });
    }
  }

  return sortChordNotes(notes);
}

/**
 * Generate a drop voicing (drop 2, drop 3, etc.)
 */
function generateDropVoicing(
  root: Note,
  formula: ChordFormula,
  dropPosition: number
): Note[] {
  // Start with close voicing
  const closeVoicing = generateCloseVoicing(root, formula);

  // Can't drop if there aren't enough notes
  if (closeVoicing.length < dropPosition) {
    return closeVoicing;
  }

  // Get the note to drop (counting from the top)
  const indexToDrop = closeVoicing.length - dropPosition;
  if (indexToDrop < 0) {
    return closeVoicing;
  }

  // Drop the note down an octave
  const noteToDrop = closeVoicing[indexToDrop];
  const droppedNote = createNoteFromParts({
    letter: noteToDrop.letter,
    accidental: noteToDrop.accidental,
    octave: noteToDrop.octave - 1,
    includeCachedValues: !!noteToDrop.midi,
  });

  // Create the new voicing with the dropped note
  const dropVoicing = [...closeVoicing];
  dropVoicing[indexToDrop] = droppedNote;

  return sortChordNotes(dropVoicing);
}

/**
 * Generate a spread voicing based on common patterns
 */
function generateSpreadVoicing(
  root: Note,
  formula: ChordFormula,
  category: string
): Note[] {
  // Use predefined voicing patterns for different chord types
  // Type assertion to tell TypeScript this is a valid category
  const voicingPatterns =
    (COMMON_VOICINGS as Record<string, number[][]>)[category] ||
    COMMON_VOICINGS.triad;

  // Choose a voicing pattern (use first by default)
  const pattern = voicingPatterns[0];

  // Generate the notes in close position first
  const notes = generateCloseVoicing(root, formula);

  // Apply the voicing pattern
  // Each number in the pattern represents the index of the note in the chord
  // that should be placed at that position
  const reorderedNotes: Note[] = [];

  for (const index of pattern) {
    if (index < notes.length) {
      reorderedNotes.push(notes[index]);
    }
  }

  // Adjust octaves to create the spread
  for (let i = 1; i < reorderedNotes.length; i++) {
    // If this note is lower in pitch than the previous one,
    // move it up an octave
    if (
      reorderedNotes[i].pitchClassIndex < reorderedNotes[i - 1].pitchClassIndex
    ) {
      reorderedNotes[i] = createNoteFromParts({
        letter: reorderedNotes[i].letter,
        accidental: reorderedNotes[i].accidental,
        octave: reorderedNotes[i].octave + 1,
        includeCachedValues: !!reorderedNotes[i].midi,
      });
    }
  }

  return reorderedNotes;
}

/**
 * Generate a custom voicing based on specified constraints
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
  // Start with either close or open voicing
  let baseVoicing =
    options.maxSpread && options.maxSpread > 6
      ? generateOpenVoicing(root, formula, options)
      : generateCloseVoicing(root, formula);

  // Apply bottom note constraint
  if (options.bottomNote) {
    while (
      baseVoicing[0].octave < options.bottomNote.octave ||
      (baseVoicing[0].octave === options.bottomNote.octave &&
        baseVoicing[0].pitchClassIndex < options.bottomNote.pitchClassIndex)
    ) {
      // Shift everything up an octave
      baseVoicing = baseVoicing.map((note) =>
        createNoteFromParts({
          letter: note.letter,
          accidental: note.accidental,
          octave: note.octave + 1,
          includeCachedValues: !!note.midi,
        })
      );
    }
  }

  // Apply top note constraint
  if (options.topNote) {
    while (
      baseVoicing[baseVoicing.length - 1].octave > options.topNote.octave ||
      (baseVoicing[baseVoicing.length - 1].octave === options.topNote.octave &&
        baseVoicing[baseVoicing.length - 1].pitchClassIndex >
          options.topNote.pitchClassIndex)
    ) {
      // Shift everything down an octave
      baseVoicing = baseVoicing.map((note) =>
        createNoteFromParts({
          letter: note.letter,
          accidental: note.accidental,
          octave: note.octave - 1,
          includeCachedValues: !!note.midi,
        })
      );
    }
  }

  // Apply maximum spread constraint
  if (options.maxSpread) {
    let currentVoicing = [...baseVoicing];

    // Iterate until we meet the constraint or can't improve further
    let improved = true;
    while (improved) {
      improved = false;

      // Check adjacent pairs of notes
      for (let i = 0; i < currentVoicing.length - 1; i++) {
        const note1 = currentVoicing[i];
        const note2 = currentVoicing[i + 1];

        // Calculate semitone distance
        const semitones =
          (note2.octave - note1.octave) * 12 +
          (note2.pitchClassIndex - note1.pitchClassIndex);

        if (semitones > options.maxSpread) {
          // Move the higher note down an octave if possible
          if (note2.octave > note1.octave) {
            const lowerNote = createNoteFromParts({
              letter: note2.letter,
              accidental: note2.accidental,
              octave: note2.octave - 1,
              includeCachedValues: !!note2.midi,
            });

            // Create new voicing with the adjusted note
            const newVoicing = [...currentVoicing];
            newVoicing[i + 1] = lowerNote;

            // Sort and update
            currentVoicing = sortChordNotes(newVoicing);
            improved = true;
            break;
          }
        }
      }
    }

    return currentVoicing;
  }

  return baseVoicing;
}

/**
 * Get all possible inversions of a chord
 */
export function getAllInversions(chord: Chord): Chord[] {
  const inversions: Chord[] = [];

  // Add the original chord (root position)
  inversions.push(chord);

  // Generate each inversion
  for (let i = 1; i < chord.notes.length; i++) {
    // Create a chord with this inversion
    const invertedChord = Object.freeze({
      ...chord,
      inversion: i,
      bass: chord.notes[i],
      notes: Object.freeze([
        ...chord.notes.slice(i),
        ...chord.notes.slice(0, i).map((note) => {
          // Move notes that went to the end up an octave
          return createNoteFromParts({
            letter: note.letter,
            accidental: note.accidental,
            octave: note.octave + 1,
            includeCachedValues: !!note.midi,
          });
        }),
      ]),
    });

    inversions.push(invertedChord);
  }

  return inversions;
}
