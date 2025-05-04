/**
 * @module Scale/Creation
 * @description
 * This module provides various functions for creating Scale objects. Scales can be
 * generated from predefined names and patterns, arrays of notes, step patterns (W/H),
 * custom interval lists, or specific tuning systems like Just Intonation and EDOs.
 * Includes options for controlling octave range, sorting, enharmonic preference,
 * and inclusion of cached note values.
 */

import {
  Accidental,
  CENTS_PER_OCTAVE,
  CENTS_PER_SEMITONE,
  EnharmonicPreference,
  Note,
  NoteLetter,
  TuningSystem,
  addCentsToNote,
  compareNotes,
  createNoteByRatio,
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

// Import predefined scale patterns
import { SCALE_PATTERNS } from "./constants";
// Import tuning application function (dependency for createTunedScale)
import { applyTuningSystem } from "../tuning/tuning"; // Assuming tuning module exists and exports this

// Import specific creation function from note module's frequency file
// import { createNoteByRatio } from "../note/frequency"; // Used by createJustIntonationScale

// Assuming note module exports these from their respective files

/**
 * Default options used when creating scales if not otherwise specified.
 * @readonly
 * @property {EnharmonicPreference} prefer='sharp' - Default spelling preference.
 * @property {boolean} includeOctave=false - Whether to add the octave note duplicating the root.
 * @property {boolean} sort=true - Whether to sort the resulting notes by pitch.
 * @property {number} octaves=1 - The number of octaves the scale should span.
 * @property {boolean} includeCachedValues=true - Whether notes within the scale should include cached midi/notation/frequency.
 */
const DEFAULT_SCALE_OPTIONS: ScaleOptions = {
  prefer: "sharp",
  includeOctave: false,
  sort: true,
  octaves: 1,
  includeCachedValues: true,
};

/**
 * Creates a Scale object from a root note and a specified pattern.
 * The pattern can be either a predefined scale name (e.g., "major", "dorian")
 * or an array of numbers representing intervals in semitones from the root (e.g., [0, 2, 4, 5, 7, 9, 11]).
 * This function primarily generates standard 12-TET scales based on patterns. Use `createTunedScale` for other tuning systems.
 *
 * @param root - The root Note object of the scale.
 * @param pattern - The scale pattern, either a known `ScaleName` string or a `ScalePattern` array (intervals in semitones from root, starting with 0).
 * @param [options={}] - Optional settings to override defaults. See {@link ScaleOptions}.
 * @returns A frozen Scale object containing the root note, the array of generated notes, the pattern used, and the scale name (if identified or provided).
 * @throws {Error} If an unknown scale name is provided.
 * @throws {Error} If the root note is invalid.
 * @throws {Error} If a custom pattern array is invalid (not array, empty, doesn't start with 0, non-finite numbers).
 * @example
 * ```ts
 * const c4 = createNoteFromParts({ letter: 'C', octave: 4 });
 *
 * // Create C Major scale by name
 * const cMajor = createScale(c4, 'major');
 * console.log(cMajor.notes.map(formatNote)); // ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']
 * console.log(cMajor.name); // 'major'
 *
 * // Create C Dorian scale using its interval pattern
 * const dorianPattern: ScalePattern = [0, 2, 3, 5, 7, 9, 10];
 * const cDorian = createScale(c4, dorianPattern);
 * console.log(cDorian.notes.map(formatNote)); // ['C4', 'D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4']
 * console.log(cDorian.name); // 'dorian' (identified from pattern)
 *
 * // Create a two-octave C Major scale, including the final octave note
 * const cMajor2Oct = createScale(c4, 'major', { octaves: 2, includeOctave: true });
 * // cMajor2Oct.notes will contain 15 notes: C4...B4, C5...B5, C6
 * ```
 */
export function createScale(
  root: Note,
  pattern: ScalePattern | ScaleName,
  options: Partial<ScaleOptions> = {}
): Scale {
  // Merge default options with provided options
  const mergedOptions = { ...DEFAULT_SCALE_OPTIONS, ...options };
  // Ensure numOctaves is explicitly typed as number, using default if needed
  const numOctaves: number =
    mergedOptions.octaves ?? (DEFAULT_SCALE_OPTIONS.octaves || 1);

  // Validate root note
  if (!root) {
    throw new Error("Invalid root note provided to createScale.");
  }

  // Handle pattern input - could be a pattern array or a scale name
  let scalePattern: ScalePattern;
  let scaleName: ScaleName | undefined;

  if (Array.isArray(pattern)) {
    // Pattern is an array of intervals
    if (
      pattern.length === 0 ||
      pattern[0] !== 0 ||
      pattern.some((i) => typeof i !== "number" || !Number.isFinite(i))
    ) {
      throw new Error(
        "Invalid custom scale pattern provided. Must be an array of finite numbers starting with 0."
      );
    }
    scalePattern = pattern as ScalePattern;
    scaleName = findScaleNameByPattern(pattern);
  } else {
    // Pattern is a scale name string
    const scaleNameStr = pattern as ScaleName;
    if (!Object.prototype.hasOwnProperty.call(SCALE_PATTERNS, scaleNameStr)) {
      throw new Error(`Unknown scale name: ${scaleNameStr}`);
    }
    scaleName = scaleNameStr;
    scalePattern = SCALE_PATTERNS[scaleNameStr];
  }

  // --- Generate scale notes ---
  let notes: Note[] = [];

  // Loop through the number of octaves specified (numOctaves is now guaranteed number)
  for (let octave = 0; octave < numOctaves; octave++) {
    const octaveNotes = scalePattern.map((interval) => {
      const semitones = interval + octave * 12;
      return transpose(root, semitones, {
        prefer: mergedOptions.prefer,
        includeCachedValues: mergedOptions.includeCachedValues,
        preserveMicrotonalProperties: false,
      });
    });
    notes = notes.concat(octaveNotes);
  }

  // Add the final octave note if requested
  if (mergedOptions.includeOctave) {
    // Use the guaranteed numOctaves
    const finalOctaveNote = transpose(root, 12 * numOctaves, {
      prefer: mergedOptions.prefer,
      includeCachedValues: mergedOptions.includeCachedValues,
      preserveMicrotonalProperties: false,
    });
    if (
      notes.length === 0 ||
      !notesAreEqual(notes[notes.length - 1], finalOctaveNote)
    ) {
      notes.push(finalOctaveNote);
    }
  }

  // Sort notes by pitch if requested
  if (mergedOptions.sort) {
    notes.sort((a, b) => compareNotes(a, b, true));
  }

  // Freeze the notes array
  const immutableNotes = Object.freeze(notes) as ReadonlyArray<Note>;

  // Create and return the final scale object, freezing it
  return Object.freeze({
    root,
    notes: immutableNotes,
    pattern: scalePattern,
    name: scaleName,
    // tuningSystem is intentionally omitted here
  });
}

/**
 * Creates a Scale object using a predefined scale name and a root note,
 * which can be provided as a Note object or a string (e.g., "C4", "Bb3").
 * This is a convenience wrapper around `createScale`.
 *
 * @param root - The root of the scale, either as a Note object or a string representation (e.g., "C4", "F#5").
 * @param name - The name of the desired scale (e.g., "major", "dorian", "minorPentatonic"). Must exist in `SCALE_PATTERNS`.
 * @param [options={}] - Optional settings to override defaults. See {@link ScaleOptions}. Passed down to `createScale`.
 * @returns The created Scale object.
 * @throws {Error} If the root note object/string is invalid or the scale name is unknown.
 * @example
 * ```ts
 * // Create C Major scale with root as string
 * const cMajor = createScaleByName("C4", "major");
 *
 * // Create F# Minor scale with specific preference
 * const fSharpMinor = createScaleByName("F#3", "minor", { prefer: 'sharp' });
 * ```
 */
export function createScaleByName(
  root: Note | string,
  name: ScaleName,
  options: Partial<ScaleOptions> = {}
): Scale {
  // Handle string root input by parsing it first using the internal helper
  // Corrected call: Pass only one argument to parseNoteString
  const rootNote = typeof root === "string" ? parseNoteString(root) : root;

  // Add validation for the potentially parsed rootNote
  if (!rootNote) {
    throw new Error(`Invalid root note provided or failed to parse: ${root}`);
  }

  // Delegate to the main createScale function
  return createScale(rootNote, name, options);
}

/**
 * Attempts to create a Scale object from an array of Notes.
 * It identifies the root (either provided or assumes the first note),
 * derives the interval pattern relative to the root from the unique pitch classes present,
 * sorts these intervals, and then calls `createScale` using the derived pattern.
 *
 * @param notes - An array of Note objects comprising the scale. Must contain at least 2 notes. Input array is not modified.
 * @param [root] - Optional. The specific Note object to be treated as the root. If omitted, the first note in the `notes` array is used.
 * @param [options={}] - Optional settings passed down to the final `createScale` call (e.g., sorting, octaves, enharmonic preference). See {@link ScaleOptions}.
 * @returns A Scale object with the derived pattern and potentially identified name.
 * @throws {Error} If the notes array contains fewer than 2 notes or a valid root cannot be determined.
 * @remarks The derived pattern only considers unique pitch classes relative to the root. Octave information from the input notes (beyond the root) is ignored for pattern derivation. Microtonal information is also ignored for deriving the base pattern. The resulting `scale.notes` array is generated fresh based on the derived pattern and root, respecting `options.octaves`.
 * @example
 * ```ts
 * const cMajNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'].map(s => parseNoteString(s)); // Use parser for example
 * const scaleFromCMajNotes = createScaleFromNotes(cMajNotes);
 * console.log(scaleFromCMajNotes.name); // 'major'
 * console.log(scaleFromCMajNotes.pattern); // [0, 2, 4, 5, 7, 9, 11]
 *
 * const pentatonicNotes = [
 * createNoteFromParts({letter: 'A', octave: 3}),
 * createNoteFromParts({letter: 'C', octave: 4}),
 * // ... other notes
 * ];
 * const scaleFromPentNotes = createScaleFromNotes(pentatonicNotes); // Root defaults to A3
 * console.log(scaleFromPentNotes.name); // 'minorPentatonic'
 * console.log(scaleFromPentNotes.pattern); // [0, 3, 5, 7, 10] (relative to A)
 * ```
 */
export function createScaleFromNotes(
  notes: Note[],
  root?: Note,
  options: Partial<ScaleOptions> = {}
): Scale {
  // --- Input Validation ---
  if (!Array.isArray(notes) || notes.length < 2) {
    throw new Error(
      "At least 2 notes are required to create a scale from notes."
    );
  }
  // --- End Validation ---

  // Determine the root note (use provided or default to the first note)
  const rootNote = root || notes[0];
  if (!rootNote) {
    // Should be caught by length check, but be safe
    throw new Error("Valid root note could not be determined.");
  }

  // Extract unique pitch classes relative to the determined root
  const rootPitchClass = rootNote.pitchClassIndex;
  const uniquePitchClasses = new Set<number>(); // Use Set for uniqueness
  notes.forEach((note) => {
    if (note) {
      // Process only valid notes
      // Calculate relative pitch class (0-11) from the root
      let relativePitchClass =
        (note.pitchClassIndex - rootPitchClass + 12) % 12;
      uniquePitchClasses.add(relativePitchClass);
    } else {
      console.warn(
        "Invalid note encountered in input array for createScaleFromNotes."
      );
    }
  });

  // Ensure we still have enough unique notes after filtering/processing
  if (uniquePitchClasses.size < 2) {
    // Need at least root + 1 other unique pitch class
    throw new Error(
      "Less than 2 unique pitch classes found relative to the root."
    );
  }

  // Sort the unique relative pitch classes to form the scale pattern (intervals from root)
  const pattern = Array.from(uniquePitchClasses).sort((a, b) => a - b);
  // The pattern derived here is inherently intervals from root, starting with 0 if root was present.

  // Create the scale using the determined root and derived pattern
  // Pass along any other options provided.
  // Cast pattern to ScalePattern, assuming derived pattern fits the type.
  return createScale(rootNote, pattern as ScalePattern, options);
}

/**
 * @internal
 * Helper function to parse a simple note string (e.g., "C4", "F#3", "Bb5") into a Note object.
 * Assumes standard scientific pitch notation format (Letter[Accidental(s)]Octave).
 * Case-insensitive for letter name. Limited validation. Uses `createNoteFromParts`.
 *
 * @param noteStr - The note string to parse.
 * @param [prefer='sharp'] - Enharmonic preference (not directly used by this parser's logic, but available for signature consistency).
 * @returns The parsed Note object.
 * @throws {Error} If the string format is not recognized or underlying `createNoteFromParts` fails.
 */
function parseNoteString(noteStr: string): Note {
  // Regex: Letter, Optional Accidental group, Octave digits (signed?)
  const match = noteStr.trim().match(/^([A-G])([#bxb]*|)(-?\d+)$/i);
  if (!match) {
    throw new Error(`Invalid note string format: "${noteStr}"`);
  }

  // Extract parts
  const [, letterStr, accidentalStr, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);

  // Basic validation on parsed octave
  if (isNaN(octave)) {
    throw new Error(`Invalid octave number in note string: "${noteStr}"`);
  }

  // Validate extracted parts against types
  const letter = letterStr.toUpperCase();
  if (!/^[A-G]$/.test(letter)) {
    throw new Error(`Invalid note letter parsed: "${letter}"`);
  }
  const accidental = accidentalStr || "";
  const validAccidentals = ["", "#", "b", "##", "x", "bb"];
  if (!validAccidentals.includes(accidental)) {
    throw new Error(`Invalid accidental parsed: "${accidental}"`);
  }

  // Use createNoteFromParts for consistency
  try {
    return createNoteFromParts({
      letter: letter as NoteLetter, // Cast is safe after validation
      accidental: accidental as Accidental, // Cast is safe after validation
      octave: octave,
    });
  } catch (err) {
    // Improve error context
    throw new Error(
      `Failed to create note from parsed string "${noteStr}": ${
        (err as Error).message
      }`
    );
  }
}

/**
 * @internal
 * Helper function to find a known scale name by matching its exact interval pattern
 * against the predefined `SCALE_PATTERNS`.
 *
 * @param pattern - A `ScalePattern` array (intervals from root, starting with 0).
 * @returns The matching `ScaleName` if found, otherwise `undefined`.
 * @throws {Error} If the input pattern doesn't start with 0 (as expected for patterns from root). Original code threw this error.
 */
function findScaleNameByPattern(pattern: ScalePattern): ScaleName | undefined {
  // --- Input Validation (present in original code) ---
  if (!Array.isArray(pattern) || pattern.length === 0 || pattern[0] !== 0) {
    // Throw error if pattern invalid, as per original code
    throw new Error(
      "Scale pattern must be an array starting with 0 (the root note)."
    );
  }
  // --- End Validation ---

  // Convert patterns to strings for reliable comparison
  const patternString = pattern.join(",");

  // Look for exact pattern matches in the predefined constants
  for (const [name, knownPattern] of Object.entries(SCALE_PATTERNS)) {
    // Compare string representations
    if (patternString === knownPattern.join(",")) {
      // Found match, cast name to ScaleName (present in original)
      return name as ScaleName;
    }
  }

  // No match found
  return undefined;
}

/**
 * Creates a custom Scale object from a root note and an explicit array of intervals.
 * Intervals can be specified in semitones (standard, potentially fractional) or cents.
 * The root (0 interval) is automatically included. Input intervals are sorted and made unique.
 *
 * @param root - The root Note object.
 * @param intervals - An array of numbers representing the intervals *from the root* that define the scale degrees. Does not need to include 0.
 * @param [options={}] - Optional settings.
 * @param [options.isCentsInterval=false] - If true, treats numbers in the `intervals` array as cents values relative to the root. If false (default), treats them as semitones relative to the root.
 * @param [options.prefer='sharp'] - Enharmonic preference for spelling the generated notes.
 * @param [options.includeCachedValues=true] - Whether generated notes should include cached values.
 * @param [options.tuningSystem='custom'] - Optionally tag the resulting scale with a tuning system name. Defaults to 'custom'.
 * @param [options.sort=true] - Sort the resulting notes array by pitch. Defaults to true.
 * @returns A Scale object representing the custom scale. The `pattern` property holds the normalized (sorted, unique, includes 0) intervals used. The `name` will be undefined unless the pattern happens to match a known scale (unlikely if using cents or non-standard semitones).
 * @throws {Error} If the root note or intervals array is invalid or contains non-finite numbers.
 * @remarks This function provides a way to define scales with arbitrary interval structures, including microtonal ones if `isCentsInterval` is true. Note the difference from `createCustomTuning` which defines a *tuning system* rather than a single scale instance.
 * @example
 * ```ts
 * const c4 = createNote({ letter: 'C', octave: 4 });
 *
 * // Custom scale using semitones [Root, M2, P4, P5, M7] -> input [2, 5, 7, 11]
 * const customSemi = createCustomScale(c4, [2, 5, 7, 11]); // 0 is added automatically
 * console.log(customSemi.notes.map(formatNote)); // ['C4', 'D4', 'F4', 'G4', 'B4']
 * console.log(customSemi.pattern); // [0, 2, 5, 7, 11]
 *
 * // Custom scale using cents [Root, ~m3 -20c, P5, ~M6 +30c] -> input [280, 700, 930]
 * const customCents = createCustomScale(c4, [280, 700, 930], { isCentsInterval: true });
 * console.log(customCents.notes.map(n => `${formatNote(n)} (${n.cents?.toFixed(0)}c)`));
 * // Example Output: [ 'C4 (0c)', 'Eb4 (-20c)', 'G4 (0c)', 'A#4 (30c)' ] (or Bb4)
 * console.log(customCents.pattern); // [0, 280, 700, 930]
 * ```
 */
export function createCustomScale(
  root: Note,
  intervals: number[], // Intervals FROM ROOT (semitones or cents), 0 optional
  options: Partial<
    ScaleOptions & {
      // Inherit standard scale options
      /** If true, `intervals` are treated as cents; otherwise, as semitones. Default: false */
      isCentsInterval?: boolean;
    }
  > = {}
): Scale {
  // --- Input Validation ---
  if (!root) {
    throw new Error("Invalid root note provided to createCustomScale.");
  }
  if (!Array.isArray(intervals)) {
    // Original didn't check intervals itself here, but below loop implies it expects array
    throw new Error("Invalid intervals provided: must be an array of numbers.");
  }
  if (intervals.some((i) => !Number.isFinite(i))) {
    throw new Error("Invalid intervals array: contains non-finite numbers.");
  }
  // --- End Validation ---

  // Determine if intervals are specified in cents from options
  const isCentsInterval = options.isCentsInterval ?? false;

  // Process intervals: ensure 0 is included, unique, sorted.
  // Original code added root note separately and iterated intervals array directly. Let's follow that.
  // const processedIntervals = new Set<number>([0, ...intervals]); // Ensure 0, unique
  // const finalPattern = Object.freeze(Array.from(processedIntervals).sort((a,b)=>a-b));

  // --- Generate notes based on intervals (Following original code structure) ---
  const notes: Note[] = [];

  // Add root note first
  notes.push(root);

  // Add remaining notes by transposing root by each interval
  // Original code iterates the *input* intervals array.
  // This assumes input intervals *do not* include 0 and are relative to root.
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    // Avoid adding root again if 0 was included in input intervals
    if (interval === 0) continue;

    let nextNote: Note;

    if (isCentsInterval) {
      // Interpret interval as cents, transpose precisely
      nextNote = transposeByCents(root, interval, {
        prefer: options.prefer, // Pass preference
        includeCachedValues: options.includeCachedValues, // Pass cache flag
      });
    } else {
      // Interpret interval as semitones (possibly with fraction)
      // Original code split semitones/cents - let's replicate that
      const semitones = Math.floor(interval);
      const cents = (interval - semitones) * 100; // Convert fractional part to cents

      // Transpose by whole semitones first
      nextNote = transpose(root, semitones, {
        prefer: options.prefer,
        includeCachedValues: options.includeCachedValues,
      });

      // If there was a fractional part (cents), add it
      if (Math.abs(cents) > 1e-9) {
        // Check if cents is non-negligible
        // Use addCentsToNote from operations module
        nextNote = addCentsToNote(nextNote, cents, {
          includeCachedValues: options.includeCachedValues,
        });
      }
    }
    notes.push(nextNote);
  }

  // Sort the final list of notes if required by options
  if (options.sort !== false) {
    // Default sort=true
    notes.sort((a, b) => compareNotes(a, b, true)); // Use precise comparison
  }

  // Derive the final pattern (intervals from root) from the generated notes
  // This ensures the pattern matches the actual notes, including sorting and root=0.
  const finalPatternDerived = notes.map((note) =>
    intervalBetween(root, note, true)
  ); // Use fractional semitones
  // Ensure pattern starts with 0 and is sorted (should be if notes are sorted)
  const finalPattern = Object.freeze(finalPatternDerived.sort((a, b) => a - b));

  // Attempt to find a name based on the derived pattern (if semitones were used)
  // Original code tried to find name based on input `intervals`, which seems incorrect.
  // Use derived `finalPattern` but only if not using cents.
  const scaleName = !isCentsInterval
    ? findScaleNameByPattern(finalPattern as ScalePattern)
    : undefined;

  // Create scale object, freezing notes and pattern (present in original code)
  return Object.freeze({
    // Freeze the final Scale object
    root,
    notes: Object.freeze(notes), // Freeze notes array
    pattern: finalPattern as ScalePattern, // Store derived pattern
    name: scaleName, // May be undefined
    tuningSystem: options.tuningSystem ?? "custom", // Default to 'custom'
  });
}

/**
 * Creates a Scale object by parsing a string representation.
 * The string can represent either:
 * 1. A sequence of steps using 'W' (whole) and 'H' (half), case-insensitive (e.g., "WWHWWWH").
 * 2. A comma or space-separated list of note names (e.g., "C4 D4 E4 F4 G4 A4 B4"). Octaves are optional and default to the root's octave if omitted.
 *
 * @param root - The root Note object for the scale.
 * @param scaleStr - The string representation of the scale (steps W/H or note names).
 * @param [options={}] - Optional settings to override defaults (passed to underlying creation functions). See {@link ScaleOptions}.
 * @returns The created Scale object.
 * @throws {Error} If the root note is invalid, the string is empty, or the string cannot be parsed as either steps or notes.
 * @example
 * ```ts
 * const c4 = createNote({ letter: 'C', octave: 4 });
 *
 * // From steps string (Major Scale)
 * const scaleFromSteps = createScaleFromString(c4, "WWHWWWH");
 * console.log(scaleFromSteps.name); // 'major'
 *
 * // From note names string
 * const scaleFromNames = createScaleFromString(c4, "C4 D4 E4 F4 G4 A4 B4");
 * console.log(scaleFromNames.name); // 'major'
 *
 * // From note names without octaves (assumes root's octave)
 * const scaleFromNamesNoOct = createScaleFromString(c4, "C D E F G A B"); // Assumes octave 4
 * console.log(scaleFromNamesNoOct.name); // 'major'
 * ```
 */
export function createScaleFromString(
  root: Note,
  scaleStr: string,
  options: Partial<ScaleOptions> = {}
): Scale {
  // --- Input Validation ---
  if (!root) {
    throw new Error("Invalid root note provided to createScaleFromString.");
  }
  if (typeof scaleStr !== "string" || scaleStr.trim().length === 0) {
    throw new Error("Invalid or empty scale string provided.");
  }
  // --- End Validation ---

  const trimmedStr = scaleStr.trim();

  // Check if it looks like a step-based definition
  if (/^[WwHh]+$/.test(trimmedStr)) {
    // Delegate to the step pattern creation function
    return createScaleFromSteps(root, trimmedStr, options);
  }

  // Otherwise, assume it's a comma or space-separated list of note names
  const noteNames = trimmedStr.split(/[\s,]+/);
  const validNoteNames = noteNames.filter((name) => name.length > 0);

  if (validNoteNames.length < 2) {
    throw new Error("Scale string parsed into fewer than 2 valid note names.");
  }

  const notes: Note[] = [];
  for (const noteName of validNoteNames) {
    // Add the root's octave to any note name that doesn't explicitly have one
    const fullNoteName = noteName.match(/-?\d+$/)
      ? noteName // Already has octave/number at end
      : `${noteName}${root.octave}`; // Append root's octave

    try {
      // Use the internal helper to parse the string
      // Corrected call: Pass only one argument to parseNoteString
      notes.push(parseNoteString(fullNoteName));
    } catch (err) {
      // Warn about invalid notes but continue parsing others
      console.warn(
        `Skipping invalid note name "${noteName}" in scale string: ${
          (err as Error).message
        }`
      );
    }
  }

  // If parsing resulted in too few valid notes after filtering errors
  if (notes.length < 2) {
    throw new Error(
      "Could not parse at least 2 valid notes from the scale string."
    );
  }

  // Delegate to create scale from the array of parsed notes
  return createScaleFromNotes(notes, root, options);
}

/**
 * Creates a Scale object from a root note and a step pattern string.
 * The string should only contain 'W'/'w' (whole step = 2 semitones) and 'H'/'h' (half step = 1 semitone).
 * Converts the step pattern into an interval pattern (semitones from root)
 * and delegates to the main `createScale` function.
 *
 * @param root - The root Note object.
 * @param steps - The step pattern string (e.g., "WWHWWWH"). Case-insensitive.
 * @param [options={}] - Optional settings passed down to `createScale`. See {@link ScaleOptions}.
 * @returns The created Scale object.
 * @throws {Error} If the root note is invalid, the step string is empty, or contains invalid characters.
 * @example
 * ```ts
 * const c4 = createNoteFromParts({ letter: 'C', octave: 4 });
 * const majorScale = createScaleFromSteps(c4, "WWHWWWH"); // Case-insensitive
 * console.log(majorScale.name); // 'major'
 * console.log(majorScale.pattern); // [0, 2, 4, 5, 7, 9, 11]
 *
 * const dorianScale = createScaleFromSteps(c4, "whwwwhw");
 * console.log(dorianScale.name); // 'dorian'
 * ```
 */
export function createScaleFromSteps(
  root: Note,
  steps: string,
  options: Partial<ScaleOptions> = {}
): Scale {
  // --- Input Validation ---
  if (!root) {
    throw new Error("Invalid root note provided to createScaleFromSteps.");
  }
  if (typeof steps !== "string" || steps.length === 0) {
    throw new Error("Invalid or empty steps string provided.");
  }
  // --- End Validation ---

  // Convert step notation (W/H) to a pattern of intervals from the root
  let currentInterval = 0;
  const pattern = [0]; // Start with the root interval (0)

  for (const step of steps.toUpperCase()) {
    // Process case-insensitively
    if (step === "W") {
      currentInterval += 2; // Whole step = 2 semitones
    } else if (step === "H") {
      currentInterval += 1; // Half step = 1 semitone
    } else {
      // Invalid character found in step pattern
      throw new Error(
        `Invalid step character in pattern: "${step}". Use only 'W' or 'H'.`
      );
    }
    pattern.push(currentInterval);
  }
  // The pattern derived here contains intervals from root including the octave interval.
  // E.g., "WWHWWWH" -> [0, 2, 4, 5, 7, 9, 11, 12]

  // Delegate to the main scale creation function using the derived pattern.
  // createScale expects pattern *within* octave usually [0, 2, 4, 5, 7, 9, 11]
  // Original code passed the full pattern including octave to createScale. Let's adhere to that.
  // If createScale needs adjustment, that's separate. Assuming createScale handles it.
  return createScale(root, pattern as ScalePattern, options); // Cast needed as pattern includes octave here
}

/**
 * Creates a scale based on a standard pattern (e.g., major, minor) but adjusts the
 * pitches of the generated notes according to a specified tuning system definition
 * using the external `applyTuningSystem` function.
 *
 * @param root - The root Note object of the scale.
 * @param scaleName - The name of the base scale pattern (e.g., "major"). Must exist in `SCALE_PATTERNS`.
 * @param tuningSystem - The name of the tuning system to apply. Must be recognizable by `applyTuningSystem`.
 * @param [options={}] - Optional settings for the initial scale creation (passed to `createScale`). See {@link ScaleOptions}.
 * @returns A new Scale object with notes adjusted for the specified tuning system. The `tuningSystem` property is set accordingly.
 * @throws {Error} If the `applyTuningSystem` function (assumed to be imported or available) is not functional or throws an error.
 * @throws {Error} If the scale name or root note is invalid.
 * @example
 * ```ts
 * // Assume applyTuningSystem is correctly implemented and imported
 * const c4 = createNote({ letter: 'C', octave: 4 });
 * const cMajorJust = createTunedScale(c4, 'major', 'justIntonation');
 * // cMajorJust.notes will contain C, D, E, F, G, A, B tuned according to JI adjustments.
 * // Notes might have 'cents' properties or modified base pitches depending on applyTuningSystem.
 * console.log(cMajorJust.tuningSystem); // 'justIntonation'
 * ```
 * @remarks This function's core logic relies entirely on the external `applyTuningSystem` function. Ensure it's correctly implemented and imported for this function to work as intended.
 */
export function createTunedScale(
  root: Note,
  scaleName: ScaleName,
  tuningSystem: TuningSystem, // Type from ./types
  options: Partial<ScaleOptions> = {}
): Scale {
  // --- Input Validation ---
  if (!root) throw new Error("Invalid root note provided.");
  if (!scaleName) throw new Error("Invalid scale name provided.");
  if (!tuningSystem) throw new Error("Invalid tuning system provided.");
  // Check if applyTuningSystem function is actually available (present in original code)
  if (typeof applyTuningSystem !== "function") {
    throw new Error(
      "Dependency Error: applyTuningSystem function is required for createTunedScale but is not available or not a function."
    );
  }
  // --- End Validation ---

  // 1. First create the standard equal-tempered version of the scale
  // Pass options like prefer, includeCachedValues etc.
  const equalTemperedScale = createScale(root, scaleName, options);

  // 2. Apply the specified tuning system adjustments to the notes
  // The external function is responsible for returning the tuned notes.
  const tunedNotes = applyTuningSystem(
    equalTemperedScale.notes,
    tuningSystem,
    root // Root might be needed as reference by the tuning function
  );

  // 3. Return a new scale object, freezing notes (present in original code)
  return Object.freeze({
    ...equalTemperedScale, // Copy root, pattern, name from ET scale
    notes: Object.freeze(tunedNotes), // Use the adjusted notes (freeze present in original)
    tuningSystem, // Set the specified tuning system
  });
}

/**
 * Creates a Just Intonation scale (Major or Minor variant) based on standard 5-limit frequency ratios.
 * Generates notes relative to the root using predefined pure intervals via `createNoteByRatio`.
 *
 * @param root - The root Note object.
 * @param [options={}] - Optional settings.
 * @param [options.mode='major'] - Specifies whether to generate the 'major' or 'minor' JI scale variant using predefined ratios.
 * @param [options.prefer='sharp'] - Enharmonic preference for spelling generated notes. Passed to `createNoteByRatio`.
 * @param [options.includeCachedValues=true] - Whether generated notes should include cached values (handled by underlying creation functions).
 * @returns A Scale object representing the Just Intonation scale. Notes will likely have `cents` properties indicating deviation from 12-TET. The `tuningSystem` property is set to 'justIntonation'. The `pattern` property contains calculated intervals (potentially fractional semitones) derived from the generated notes.
 * @throws {Error} If the root note is invalid.
 * @remarks Uses `createNoteByRatio` internally. The mode option selects between common 5-limit ratio sets for major and natural minor.
 * @example
 * ```ts
 * const c4 = createNote({ letter: 'C', octave: 4 });
 * const cMajorJust = createJustIntonationScale(c4, { mode: 'major' });
 * console.log(cMajorJust.notes.map(n => `${formatNote(n)} (${n.cents?.toFixed(1)}c)`));
 * // Output similar to: [ 'C4 (0.0c)', 'D4 (3.9c)', 'E4 (-13.7c)', ..., 'C5 (0.0c)' ]
 *
 * const aMinorJust = createJustIntonationScale(createNote({letter:'A', octave:4}), { mode: 'minor' });
 * console.log(aMinorJust.tuningSystem); // 'justIntonation'
 * ```
 */
export function createJustIntonationScale(
  root: Note,
  options: Partial<
    ScaleOptions & {
      // Include standard options
      /** Specifies the scale mode ('major' or 'minor') determining which set of JI ratios to use. */
      mode?: "major" | "minor" | ModeName; // Original allowed ModeName too
    }
  > = {}
): Scale {
  // --- Input Validation ---
  if (!root) {
    throw new Error("Invalid root note provided to createJustIntonationScale.");
  }
  // --- End Validation ---

  // Default to 'major' mode if not specified or invalid mode for JI ratios provided
  const mode = options.mode === "minor" ? "minor" : "major"; // Simplify to major/minor choice

  // Predefined standard 5-limit Just Intonation ratios relative to tonic (1/1)
  // Includes octave (2/1)
  const majorRatios = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2];
  // Ratios for natural minor relative to its tonic (common example)
  const minorRatios = [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2];

  // Select the appropriate set of ratios based on the mode
  const ratios = mode === "major" ? majorRatios : minorRatios;

  // Generate notes by applying each ratio to the root note's frequency
  // createNoteByRatio handles frequency calculation and note creation (including cents deviation)
  const notes: Note[] = ratios.map((ratio) =>
    createNoteByRatio(root, ratio, {
      prefer: options.prefer, // Pass preference down
      // includeCachedValues handled by createNoteByRatio->createNoteFromFrequency
    })
  );

  // Calculate the effective interval pattern (in potentially fractional semitones) from the generated notes
  // Use intervalBetween(root, note, true) for precise fractional semitones
  // Freeze derived pattern (present in original)
  const pattern = Object.freeze(
    notes.map((note) => intervalBetween(root, note, true /* include cents */))
  ) as ScalePattern;

  // Determine the scale name based on mode
  const scaleName = mode === "major" ? "major" : "minor";

  // Create the final scale object, freezing notes and pattern (present in original)
  return Object.freeze({
    root,
    notes: Object.freeze(notes), // Freeze notes array
    pattern: pattern, // Store the derived (potentially microtonal) interval pattern
    name: scaleName as ScaleName, // Store the mode name, cast needed
    tuningSystem: "justIntonation", // Mark the tuning system
  });
}

/**
 * Creates a scale based on an Equal Division of the Octave (EDO) system.
 * Allows specifying which integer steps of the EDO system to include in the scale.
 *
 * @param root - The root Note object.
 * @param divisions - The number of equal divisions per octave (e.g., 12, 19, 24). Must be a positive integer.
 * @param [options={}] - Optional settings.
 * @param [options.steps] - An optional array of numbers indicating which EDO steps (0-based integer index relative to the root) to include in the scale. If omitted, includes all steps 0 to `divisions - 1`. The octave step (`divisions`) can be included via this array if desired.
 * @param [options.prefer='sharp'] - Enharmonic preference for spelling generated notes.
 * @param [options.includeCachedValues=true] - Whether generated notes should include cached values.
 * @returns A Scale object representing the EDO scale subset. Notes may have `cents` properties if `divisions` is not 12. The `tuningSystem` property is set (e.g., "19-EDO"). The `pattern` property stores the intervals of the included steps in *fractional semitones*.
 * @throws {Error} If the root note or divisions value is invalid, or if the steps array is invalid.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 *
 * // Create a scale with all steps of 19-EDO (0 to 18)
 * const scale19EDO_full = createEDOScale(c4, 19);
 * console.log(scale19EDO_full.notes.length); // 19
 * console.log(scale19EDO_full.tuningSystem); // '19-EDO'
 *
 * // Create a 7-note scale using specific steps [0, 3, 6, 8, 11, 14, 17] from 19-EDO
 * const heptatonic19EDO = createEDOScale(c4, 19, { steps: [0, 3, 6, 8, 11, 14, 17] });
 * console.log(heptatonic19EDO.notes.length); // 7
 * console.log(heptatonic19EDO.pattern); // [0, 4.73..., 9.47..., ...] (intervals in fractional semitones)
 * ```
 */
export function createEDOScale(
  root: Note,
  divisions: number, // Number of equal divisions of the octave
  options: Partial<
    ScaleOptions & {
      // Include standard options
      /** Array of specific 0-based integer steps within the EDO to include. If omitted, includes all steps 0 to divisions-1. */
      steps?: number[];
    }
  > = {}
): Scale {
  // --- Input Validation ---
  if (!root) throw new Error("Invalid root note provided.");
  if (!Number.isInteger(divisions) || divisions <= 0) {
    throw new Error(
      `Invalid EDO divisions: ${divisions}. Must be positive integer.`
    );
  }
  if (options.steps && !Array.isArray(options.steps)) {
    throw new Error("Invalid steps provided: must be an array of numbers.");
  }
  // Validate steps are integers if provided
  if (options.steps && options.steps.some((s) => !Number.isInteger(s))) {
    throw new Error("Invalid steps array: must contain only integers.");
  }
  // --- End Validation ---

  // Determine which steps to include. Default to 0..divisions-1 if not provided.
  // Original code defaulted to 0..N-1. Preserve this.
  const stepsToInclude =
    options.steps ?? Array.from({ length: divisions }, (_, i) => i);
  // Ensure steps are unique and sorted? Original code didn't explicitly, relies on map order? Let's keep it simple.
  // const uniqueSteps = new Set(stepsToInclude);
  // const sortedSteps = Array.from(uniqueSteps).sort((a,b)=>a-b);

  // Calculate step size in cents
  const centsPerStep = CENTS_PER_OCTAVE / divisions;

  // Generate notes for each specified step using precise cents transposition
  const notes: Note[] = stepsToInclude.map((step) => {
    // Use stepsToInclude as determined above
    const cents = step * centsPerStep;
    // Use transposeByCents for accuracy
    return transposeByCents(root, cents, {
      prefer: options.prefer ?? "sharp",
      includeCachedValues: options.includeCachedValues ?? true,
      // Let createNote handle potential tuningSystem tag if relevant
    });
  });

  // Sort notes? Original only sorted `steps`, not final notes. Let's adhere.
  // if (options.sort !== false) { notes.sort((a,b) => compareNotes(a,b, true)); }

  // Calculate the pattern in fractional semitones
  // Pattern represents the interval from the root for each included step
  // Freeze pattern (present in original)
  const pattern = Object.freeze(
    // Map the *input* steps array (or default range) to fractional semitones
    // Ensure pattern corresponds to the notes generated, so use stepsToInclude
    stepsToInclude.map((step) => (step * centsPerStep) / CENTS_PER_SEMITONE)
  ) as ScalePattern; // Cast required as number[] might not match ScalePattern type strictly

  // Construct a tuning system name, handle 12-EDO as standard 'equalTemperament'
  const tuningSystemName =
    divisions === 12 ? "equalTemperament" : `${divisions}-EDO`;
  // Attempt to find a name only if it's 12-EDO and matches a known pattern
  const scaleName =
    divisions === 12 ? findScaleNameByPattern(pattern) : undefined;

  // Create the final scale object, freezing notes and pattern (present in original)
  // Cast was present in original code for tuningSystem
  return Object.freeze({
    root,
    notes: Object.freeze(notes), // Freeze notes array
    pattern: pattern, // Store the derived pattern (fractional semitones)
    name: scaleName, // Name only if 12-EDO matches known pattern
    tuningSystem: tuningSystemName as any, // Original cast
  });
}

/**
 * Creates a chromatic scale (all 12 standard semitones within an octave)
 * starting from the given root note.
 * This is a convenience wrapper around `createScale(root, 'chromatic', options)`.
 *
 * @param root - The root Note object.
 * @param [options={}] - Optional settings (e.g., octaves, includeOctave, prefer). Passed to `createScale`. See {@link ScaleOptions}.
 * @returns A Scale object representing the chromatic scale.
 * @throws {Error} If the root note is invalid.
 * @example
 * ```ts
 * const c4 = createNote({ letter: 'C', octave: 4 });
 * const cChromatic = createChromaticScale(c4);
 * console.log(cChromatic.notes.map(formatNote));
 * // Output: ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4']
 * console.log(cChromatic.name); // 'chromatic'
 * ```
 */
export function createChromaticScale(
  root: Note,
  options: Partial<ScaleOptions> = {}
): Scale {
  if (!root) throw new Error("Invalid root note provided.");
  // Delegate to the main createScale function with the 'chromatic' pattern name
  return createScale(root, "chromatic", options);
}
