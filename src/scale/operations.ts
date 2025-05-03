/**
 * Operations that can be performed on scales
 */

import { Note, createNoteFromParts, notesAreEqual, transpose } from "../note";
import { Scale, ScaleOptions, ScalePattern } from "./types";
import { createScale, createScaleFromNotes } from "./creation";

/**
 * Transpose a scale by a number of semitones
 */
export function transposeScale(
  scale: Scale,
  semitones: number,
  options?: Partial<ScaleOptions>
): Scale {
  // Transpose the root note
  const newRoot = transpose(scale.root, semitones, {
    prefer: options?.prefer,
    includeCachedValues: options?.includeCachedValues,
  });

  // Create a new scale with the same pattern but new root
  return createScale(newRoot, scale.pattern, {
    ...options,
    tuningSystem: options?.tuningSystem ?? scale.tuningSystem,
  });
}

/**
 * Get a specific degree of a scale (1-indexed, where 1 is the root)
 */
export function getDegree(scale: Scale, degree: number): Note | undefined {
  // Handle 1-indexed degree (adjust to 0-indexed for array access)
  const index = degree - 1;

  // Handle degrees outside of scale length
  if (index < 0) {
    return undefined;
  }

  // For degrees beyond the scale length, wrap around and adjust octave
  const octaveOffset = Math.floor(index / scale.notes.length);
  const wrappedIndex = index % scale.notes.length;

  const note = scale.notes[wrappedIndex];

  if (!note) {
    return undefined;
  }

  // If no octave offset needed, return the note directly
  if (octaveOffset === 0) {
    return note;
  }

  // Create a new note with adjusted octave
  return createNoteFromParts({
    letter: note.letter,
    accidental: note.accidental,
    octave: note.octave + octaveOffset,
  });
}

/**
 * Check if a note belongs to a scale
 */
export function isNoteInScale(scale: Scale, note: Note): boolean {
  // Normalize the note to the scale's octave range for comparison
  const normalizedPitchClass = note.pitchClassIndex;

  // Check if the note's pitch class matches any note in the scale
  return scale.notes.some(
    (scaleNote) => scaleNote.pitchClassIndex === normalizedPitchClass
  );
}

/**
 * Find the closest note in a scale to a given note
 */
export function findClosestScaleNote(scale: Scale, note: Note): Note {
  // If the note is already in the scale, return it
  if (isNoteInScale(scale, note)) {
    return (
      scale.notes.find(
        (scaleNote) => scaleNote.pitchClassIndex === note.pitchClassIndex
      ) || scale.notes[0]
    );
  }

  // Otherwise find the closest note by semitone distance
  let closestNote = scale.notes[0];
  let minDistance = 12; // Maximum semitone distance is 11

  for (const scaleNote of scale.notes) {
    // Adjust the octave of the scale note to match the target note
    const adjustedScaleNote = createNoteFromParts({
      letter: scaleNote.letter,
      accidental: scaleNote.accidental,
      octave: note.octave,
    });

    // Calculate semitone distance
    const distance = Math.abs(
      (note.pitchClassIndex - adjustedScaleNote.pitchClassIndex + 12) % 12
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestNote = adjustedScaleNote;
    }
  }

  return closestNote;
}

/**
 * Merge two scales into one
 */
export function mergeScales(
  scale1: Scale,
  scale2: Scale,
  options?: Partial<ScaleOptions & { useRoot?: 1 | 2 }>
): Scale {
  // Determine which root to use
  const root = options?.useRoot === 2 ? scale2.root : scale1.root;

  // Collect all unique notes from both scales
  const allNotes = [...scale1.notes, ...scale2.notes];

  // Create a new scale from all notes
  return createScaleFromNotes(allNotes, root, options);
}

/**
 * Extract a segment of a scale, from one degree to another
 */
export function getScaleSegment(
  scale: Scale,
  startDegree: number,
  endDegree: number,
  options?: Partial<ScaleOptions>
): Scale {
  if (startDegree > endDegree) {
    throw new Error("Start degree must be less than or equal to end degree");
  }

  const notes: Note[] = [];

  for (let degree = startDegree; degree <= endDegree; degree++) {
    const note = getDegree(scale, degree);
    if (note) {
      notes.push(note);
    }
  }

  if (notes.length < 2) {
    throw new Error("Not enough notes to create a scale segment");
  }

  // Create a new scale from the segment notes
  return createScaleFromNotes(notes, notes[0], options);
}

/**
 * Get the scale degree (1-7) of a note within a scale
 * Returns null if the note is not in the scale
 */
export function getScaleDegree(scale: Scale, note: Note): number | null {
  // Check if the note's pitch class exists in the scale
  const pitchClass = note.pitchClassIndex;

  // Find the degree (0-indexed)
  const degreeIndex = scale.notes.findIndex(
    (scaleNote) => scaleNote.pitchClassIndex === pitchClass
  );

  return degreeIndex >= 0 ? degreeIndex + 1 : null;
}

/**
 * Filter a scale to only include certain degrees
 */
export function filterScaleDegrees(
  scale: Scale,
  degrees: number[],
  options?: Partial<ScaleOptions>
): Scale {
  const notes = degrees
    .map((degree) => getDegree(scale, degree))
    .filter((note): note is Note => note !== undefined);

  if (notes.length < 2) {
    throw new Error("Not enough notes to create a scale after filtering");
  }

  // Create new scale from filtered notes
  return createScaleFromNotes(notes, notes[0], options);
}

/**
 * Get a scale's mode by rotating it to start from a different degree
 * For example, getting the 2nd mode of the major scale gives the dorian mode
 */
export function getMode(
  scale: Scale,
  degree: number,
  options?: Partial<ScaleOptions>
): Scale {
  // Get the note on the requested degree
  const newRoot = getDegree(scale, degree);

  if (!newRoot) {
    throw new Error(`Invalid scale degree: ${degree}`);
  }

  // For a true mode, we need to maintain the original scale's notes
  // but shifted to start from the new root, potentially in different octaves

  // Calculate the original pattern
  const originalPattern = scale.pattern;

  // Calculate the new pattern by rotating the original pattern
  let newPattern: number[] = [];

  // Find the semitone value of the requested degree
  const degreeIndex = degree - 1;
  const degreeValue =
    degreeIndex < originalPattern.length
      ? originalPattern[degreeIndex]
      : originalPattern[degreeIndex % originalPattern.length] +
        12 * Math.floor(degreeIndex / originalPattern.length);

  // Rotate the pattern to start from the new root
  for (let i = 0; i < originalPattern.length; i++) {
    const originalIndex = (degreeIndex + i) % originalPattern.length;
    const semitones = (originalPattern[originalIndex] - degreeValue + 12) % 12;
    newPattern.push(semitones);
  }

  // Sort the new pattern
  newPattern.sort((a, b) => a - b);

  // Create a new scale with the new root and rotated pattern
  return createScale(newRoot, newPattern, {
    ...options,
    tuningSystem: options?.tuningSystem ?? scale.tuningSystem,
  });
}

/**
 * Invert a scale (mirror it around a central note)
 */
export function invertScale(
  scale: Scale,
  centerNote?: Note,
  options?: Partial<ScaleOptions>
): Scale {
  // Default to using the scale's root as the center point
  const center = centerNote || scale.root;

  // Calculate the inverted pattern
  const invertedNotes = scale.notes.map((note) => {
    // Calculate the distance from the center note
    const distance = (center.pitchClassIndex - note.pitchClassIndex + 12) % 12;

    // The inverted note is the same distance from the center, but in the opposite direction
    return transpose(center, distance, {
      prefer: options?.prefer,
      includeCachedValues: options?.includeCachedValues,
    });
  });

  // Create a new scale from the inverted notes
  return createScaleFromNotes(invertedNotes, center, options);
}
