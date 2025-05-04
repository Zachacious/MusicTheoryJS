/**
 * Functions for creating scales
 */

import {
  EnharmonicPreference,
  Note,
  TuningSystem,
  addCentsToNote,
  createNote,
  createNoteFromParts,
  intervalBetween,
  notesAreEqual,
  transpose,
  transposeByCents,
} from "../note";
import {
  ModeName,
  Scale,
  ScaleName,
  ScaleOptions,
  ScalePattern,
} from "./types";

import { SCALE_PATTERNS } from "./constants";
import { applyTuningSystem } from "../tuning";
import { createNoteByRatio } from "../note/frequency";

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
export function createCustomScale(
  root: Note,
  intervals: number[],
  options: Partial<
    ScaleOptions & {
      isCentsInterval?: boolean;
    }
  > = {}
): Scale {
  // Determine if intervals are specified in cents
  const isCentsInterval = options.isCentsInterval ?? false;

  // Generate notes based on the intervals
  const notes: Note[] = [];

  // Add root note
  notes.push(root);

  // Add remaining notes
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    let nextNote: Note;

    if (isCentsInterval) {
      // Interpret interval as cents
      nextNote = transposeByCents(root, interval, {
        prefer: options.prefer,
      });
    } else {
      // Interpret interval as semitones (possibly with fraction)
      const semitones = Math.floor(interval);
      const cents = (interval - semitones) * 100;

      nextNote = transpose(root, semitones, {
        prefer: options.prefer,
      });

      if (cents !== 0) {
        nextNote = addCentsToNote(nextNote, cents);
      }
    }

    notes.push(nextNote);
  }

  // Create scale object
  return {
    root,
    notes: Object.freeze(notes),
    pattern: Object.freeze(intervals),
    name: findScaleNameByPattern(intervals),
    tuningSystem: options.tuningSystem,
  };
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

/**
 * Create a scale using a specific tuning system
 */
export function createTunedScale(
  root: Note,
  scaleName: ScaleName,
  tuningSystem: TuningSystem,
  options: Partial<ScaleOptions> = {}
): Scale {
  // First create the standard scale
  const equalTemperedScale = createScale(root, scaleName, options);

  // Then apply the tuning system
  const tunedNotes = applyTuningSystem(
    equalTemperedScale.notes,
    tuningSystem,
    root
  );

  // Return a new scale with the tuned notes
  return {
    ...equalTemperedScale,
    notes: Object.freeze(tunedNotes),
    tuningSystem,
  };
}

/**
 * Create a Just Intonation scale
 */
export function createJustIntonationScale(
  root: Note,
  options: Partial<
    ScaleOptions & {
      mode?: "major" | "minor" | ModeName;
    }
  > = {}
): Scale {
  const mode = options.mode || "major";

  // Just intonation ratios for major scale
  const majorRatios = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2];

  // Just intonation ratios for natural minor
  const minorRatios = [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2];

  // Select the appropriate ratios
  const ratios = mode === "major" ? majorRatios : minorRatios;

  // Generate notes using the ratios
  const notes: Note[] = ratios.map((ratio) =>
    createNoteByRatio(root, ratio, {
      prefer: options.prefer,
    })
  );

  // Calculate the pattern
  const pattern = notes.map((note) => intervalBetween(root, note));

  // Create the scale
  return {
    root,
    notes: Object.freeze(notes),
    pattern: Object.freeze(pattern),
    name: mode === "major" ? "major" : "minor",
    tuningSystem: "justIntonation",
  };
}

/**
 * Create a scale with equal divisions of the octave (EDO)
 */
export function createEDOScale(
  root: Note,
  divisions: number,
  options: Partial<
    ScaleOptions & {
      steps?: number[]; // Which steps of the EDO to include
    }
  > = {}
): Scale {
  // Default to including all steps
  const steps = options.steps || Array.from({ length: divisions }, (_, i) => i);

  // Calculate step size in cents
  const centsPerStep = 1200 / divisions;

  // Generate notes
  const notes: Note[] = [];

  for (const step of steps) {
    const cents = step * centsPerStep;
    const note = transposeByCents(root, cents, {
      prefer: options.prefer,
    });
    notes.push(note);
  }

  // Create the scale
  return {
    root,
    notes: Object.freeze(notes),
    pattern: Object.freeze(steps.map((step) => (step * centsPerStep) / 100)), // Convert to semitones
    tuningSystem: `${divisions}-EDO` as any,
  };
}

export function createChromaticScale(
  root: Note,
  options: Partial<ScaleOptions> = {}
): Scale {
  return createScale(root, "chromatic", options);
}
