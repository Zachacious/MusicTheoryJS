/**
 * Functions for creating scales
 */

import {
  EnharmonicPreference,
  Note,
  TuningSystem,
  createNote,
  createNoteFromParts,
  notesAreEqual,
  transpose,
} from "../note";
import { Scale, ScaleName, ScaleOptions, ScalePattern } from "./types";

import { SCALE_PATTERNS } from "./constants";

/**
 * Default scale options
 */
const DEFAULT_SCALE_OPTIONS: ScaleOptions = {
  prefer: "sharp",
  includeOctave: false,
  sort: true,
  octaves: 1,
  includeCachedValues: true,
};

/**
 * Create a scale from a root note and a pattern of intervals
 */
export function createScale(
  root: Note,
  pattern: ScalePattern | ScaleName,
  options: Partial<ScaleOptions> = {}
): Scale {
  // Merge default options
  const mergedOptions = { ...DEFAULT_SCALE_OPTIONS, ...options };

  // Handle pattern input - could be a pattern array or a scale name
  let scalePattern: ScalePattern;
  let scaleName: ScaleName | undefined;

  if (Array.isArray(pattern)) {
    // Pattern is an array of intervals
    scalePattern = pattern;
    // Try to identify the scale if it's a known pattern
    scaleName = findScaleNameByPattern(pattern);
  } else {
    // Pattern is a scale name string
    const scaleNameStr = pattern as ScaleName; // Explicitly cast
    if (!Object.prototype.hasOwnProperty.call(SCALE_PATTERNS, scaleNameStr)) {
      throw new Error(`Unknown scale name: ${scaleNameStr}`);
    }
    scaleName = scaleNameStr;
    scalePattern = SCALE_PATTERNS[scaleNameStr];
  }

  // Generate notes based on the pattern
  let notes: Note[] = [];

  for (let octave = 0; octave < mergedOptions.octaves!; octave++) {
    const octaveNotes = scalePattern.map((interval) => {
      const semitones = interval + octave * 12;
      return transpose(root, semitones, {
        prefer: mergedOptions.prefer,
        includeCachedValues: mergedOptions.includeCachedValues,
      });
    });

    notes = notes.concat(octaveNotes);
  }

  // Add octave note if requested
  if (mergedOptions.includeOctave && mergedOptions.octaves === 1) {
    const octaveNote = transpose(root, 12, {
      prefer: mergedOptions.prefer,
      includeCachedValues: mergedOptions.includeCachedValues,
    });
    notes.push(octaveNote);
  }

  // Sort notes if requested
  if (mergedOptions.sort) {
    notes.sort((a, b) => {
      if (a.midi !== undefined && b.midi !== undefined) {
        return a.midi - b.midi;
      }
      // Fallback if midi not available
      if (a.octave !== b.octave) return a.octave - b.octave;
      return a.pitchClassIndex - b.pitchClassIndex;
    });
  }

  // Freeze the notes array to maintain immutability
  const immutableNotes = Object.freeze(notes) as ReadonlyArray<Note>;

  // Create and return the scale object
  return Object.freeze({
    root,
    notes: immutableNotes,
    pattern: scalePattern,
    name: scaleName,
    tuningSystem: mergedOptions.tuningSystem,
  });
}

/**
 * Create a scale by name, with the specified root note
 */
export function createScaleByName(
  root: Note | string,
  name: ScaleName,
  options: Partial<ScaleOptions> = {}
): Scale {
  // Handle string root (e.g., "C4")
  const rootNote =
    typeof root === "string" ? parseNoteString(root, options.prefer) : root;

  return createScale(rootNote, name, options);
}

/**
 * Create a scale from a set of notes
 * This will derive the pattern and attempt to identify the scale
 */
export function createScaleFromNotes(
  notes: Note[],
  root?: Note,
  options: Partial<ScaleOptions> = {}
): Scale {
  if (notes.length < 2) {
    throw new Error("At least 2 notes are required to create a scale");
  }

  // Determine the root note if not provided
  const rootNote = root || notes[0];

  // Extract unique pitch classes relative to the root
  const rootPitchClass = rootNote.pitchClassIndex;

  const uniquePitchClasses = new Set<number>();
  notes.forEach((note) => {
    // Calculate relative pitch class (0-11) from the root
    let relativePitchClass = (note.pitchClassIndex - rootPitchClass + 12) % 12;
    uniquePitchClasses.add(relativePitchClass);
  });

  // Sort pitch classes to form a pattern
  const pattern = Array.from(uniquePitchClasses).sort((a, b) => a - b);

  // Create the scale using the derived pattern
  return createScale(rootNote, pattern, options);
}

/**
 * Helper function to parse a note string into a Note object
 * This is a simple parser for common note formats (e.g., "C4", "F#3")
 */
function parseNoteString(
  noteStr: string,
  prefer: EnharmonicPreference = "sharp"
): Note {
  const match = noteStr.match(/^([A-G])(#|b|x|bb)?(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid note string: ${noteStr}`);
  }

  const [, letter, accidental, octave] = match;

  return createNoteFromParts({
    letter: letter.toUpperCase() as any,
    accidental: (accidental || "") as any,
    octave: parseInt(octave, 10),
  });
}

/**
 * Helper function to find a scale name by its pattern
 */
function findScaleNameByPattern(pattern: ScalePattern): ScaleName | undefined {
  // Normalize the pattern (ensure it starts with 0)
  if (pattern[0] !== 0) {
    throw new Error("Scale pattern must start with 0 (the root note)");
  }

  // Look for exact pattern matches
  for (const [name, knownPattern] of Object.entries(SCALE_PATTERNS)) {
    if (
      pattern.length === knownPattern.length &&
      pattern.every((interval, i) => interval === knownPattern[i])
    ) {
      return name as ScaleName;
    }
  }

  return undefined;
}

/**
 * Create a chromatic scale from the given root
 */
export function createChromaticScale(
  root: Note,
  options: Partial<ScaleOptions> = {}
): Scale {
  return createScale(root, "chromatic", options);
}

/**
 * Create a custom scale with specific intervals
 */
export function createCustomScale(
  root: Note,
  intervals: number[],
  options: Partial<ScaleOptions> = {}
): Scale {
  // Ensure the pattern starts with 0 (the root)
  const pattern = intervals[0] === 0 ? intervals : [0, ...intervals];

  // Create the scale
  return createScale(root, pattern, options);
}

/**
 * Creates a scale from a string representation using standard
 * notation or steps (W = whole step, H = half step)
 */
export function createScaleFromString(
  root: Note,
  scaleStr: string,
  options: Partial<ScaleOptions> = {}
): Scale {
  // Check if it's a step-based definition (e.g., "WWHWWWH" for major)
  if (/^[WwHh]+$/.test(scaleStr)) {
    return createScaleFromSteps(root, scaleStr, options);
  }

  // Otherwise assume it's a comma-separated list of notes
  const noteNames = scaleStr.split(/[\s,]+/);
  const rootName = formatNoteSimple(root);

  // Extract just the letter+accidental part, ignore octave
  const rootBase = rootName.replace(/\d+$/, "");

  const notes: Note[] = [];
  for (const noteName of noteNames) {
    // Add the root's octave to any note name without one
    const fullNoteName = noteName.match(/\d+$/)
      ? noteName
      : `${noteName}${root.octave}`;
    try {
      notes.push(parseNoteString(fullNoteName, options.prefer));
    } catch (err) {
      console.warn(`Skipping invalid note in scale: ${noteName}`);
    }
  }

  return createScaleFromNotes(notes, root, options);
}

/**
 * Creates a scale from a step pattern string (W = whole step, H = half step)
 */
export function createScaleFromSteps(
  root: Note,
  steps: string,
  options: Partial<ScaleOptions> = {}
): Scale {
  // Convert step notation to semitone pattern
  let currentInterval = 0;
  const pattern = [0]; // Start with root

  for (const step of steps.toUpperCase()) {
    if (step === "W") {
      currentInterval += 2; // Whole step = 2 semitones
    } else if (step === "H") {
      currentInterval += 1; // Half step = 1 semitone
    } else {
      throw new Error(`Invalid step in pattern: ${step}. Use W or H only.`);
    }
    pattern.push(currentInterval);
  }

  return createScale(root, pattern, options);
}

/**
 * Creates a simple string representation of a note (for internal use)
 */
function formatNoteSimple(note: Note): string {
  return `${note.letter}${note.accidental}${note.octave}`;
}
