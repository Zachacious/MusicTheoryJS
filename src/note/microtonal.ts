/**
 * @module Note/Microtonal
 * @description
 * This module provides specialized functions and utilities designed for working with
 * microtonal music concepts. It includes tools for creating notes based on Just Intonation ratios,
 * generating functions for specific Equal Divisions of the Octave (EDO) systems, defining custom
 * tuning systems based on cents offsets, and building microtonal scales.
 *
 * These functions often leverage the core note creation and calculation functions, adding layers
 * specific to non-12-TET contexts.
 */

import { CENTS_PER_OCTAVE, JUST_INTONATION_RATIOS } from "./constants";
import {
  EnharmonicPreference,
  MicrotonalNote,
  Note,
} from "./types";
// Import necessary creation functions
import { createNoteFromFrequency, createNoteFromParts } from "./creation";

// Import necessary frequency function
import { noteToFrequency } from "./frequency"; // Note: addCentsToNote() seems unused
// Import necessary operations - transposeByCents is key here
import { transposeByCents } from "./operations"; // Note: transpose() seems unused

/**
 * Creates a microtonal Note based on a Just Intonation ratio relative to a reference note.
 * Parses ratios provided as strings (e.g., "3/2", "5/4") or uses numeric ratios directly.
 * Looks up common ratios in `JUST_INTONATION_RATIOS`.
 * The resulting note is marked with the 'justIntonation' tuning system and will likely have a `cents` property
 * indicating its deviation from the nearest 12-TET pitch.
 *
 * @param referenceNote - The Note object to use as the base (representing the 1/1 ratio).
 * @param ratio - The Just Intonation ratio to apply, either as a number (e.g., 1.5) or a string (e.g., "3/2", "5/4"). Must result in a positive value.
 * @param [options] - Optional parameters for note creation.
 * @param [options.prefer='sharp'] - Preferred spelling for the resulting note when determining letter/accidental from frequency.
 * @param [options.includeCachedValues=true] - Whether to include cached values (midi, notation, frequency) on the returned note object.
 * @returns A MicrotonalNote object representing the pitch derived from the ratio.
 * @throws {Error} If the reference note is invalid.
 * @throws {Error} If the ratio format is invalid, cannot be parsed, or results in a non-positive value.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 }); // Reference note
 *
 * // Create a Just Major Third above C4 using string ratio "5/4"
 * const e4_just = createJustIntonationNote(c4, "5/4");
 * // -> E4 with cents ≈ -13.69 compared to equal temperament
 * console.log(formatNote(e4_just), e4_just.cents?.toFixed(2)); // "E4", "-13.69"
 *
 * // Create a Just Perfect Fifth using numeric ratio 1.5
 * const g4_just = createJustIntonationNote(c4, 1.5);
 * // -> G4 with cents ≈ +1.96 compared to equal temperament
 * console.log(formatNote(g4_just), g4_just.cents?.toFixed(2)); // "G4", "1.96"
 * ```
 */
export function createJustIntonationNote(
  referenceNote: Note,
  ratio: string | number,
  options?: {
    prefer?: EnharmonicPreference;
    includeCachedValues?: boolean;
  }
): MicrotonalNote {
  // Type hint assuming the result will have cents
  const prefer = options?.prefer ?? "sharp";
  // Default to true unless explicitly false
  const includeCachedValues = options?.includeCachedValues ?? true;

  // --- Input Validation ---
  if (!referenceNote) {
    throw new Error("Invalid reference note provided.");
  }
  // --- End Validation ---

  // Get reference frequency using the dedicated function
  const referenceFreq = noteToFrequency(referenceNote);

  // --- Process Ratio ---
  let numericRatio: number;

  if (typeof ratio === "number") {
    // Validate numeric ratio
    if (ratio <= 0)
      throw new Error(`Invalid ratio: ${ratio}. Must be positive.`);
    numericRatio = ratio;
  } else {
    // ratio is string
    // Check common predefined ratios first
    const trimmedRatio = ratio.trim(); // Trim whitespace
    if (JUST_INTONATION_RATIOS[trimmedRatio]) {
      numericRatio = JUST_INTONATION_RATIOS[trimmedRatio];
    } else {
      // Try to parse the string as a fraction "numerator/denominator"
      const parts = trimmedRatio.split("/");
      if (parts.length === 2) {
        const numerator = parseFloat(parts[0]);
        const denominator = parseFloat(parts[1]);
        // Validate parsed fraction parts
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          numericRatio = numerator / denominator;
          // Validate result of division
          if (numericRatio <= 0 || !Number.isFinite(numericRatio)) {
            throw new Error(
              `Invalid parsed ratio: ${ratio} -> ${numericRatio}. Must result in a positive finite number.`
            );
          }
        } else {
          throw new Error(
            `Invalid ratio format: Could not parse fraction "${ratio}"`
          );
        }
      } else {
        // Try to parse as a simple decimal number string
        numericRatio = parseFloat(trimmedRatio);
        if (isNaN(numericRatio)) {
          throw new Error(
            `Invalid ratio format: Could not parse "${ratio}" as fraction or number.`
          );
        }
        // Validate parsed number
        if (numericRatio <= 0 || !Number.isFinite(numericRatio)) {
          throw new Error(
            `Invalid ratio: ${ratio} -> ${numericRatio}. Must be a positive finite number.`
          );
        }
      }
    }
  }
  // --- End Ratio Processing ---

  // Calculate the new frequency based on the valid ratio
  const newFrequency = referenceFreq * numericRatio;

  // Create a note from the calculated frequency.
  // This function calculates the nearest 12-TET note and the cents deviation.
  // We explicitly mark it as 'justIntonation' system.
  const finalNote = createNoteFromFrequency({
    frequency: newFrequency,
    prefer,
    includeCachedValues, // Pass cache flag down
    tuningSystem: "justIntonation", // Tag the note appropriately
  });

  // Cast to MicrotonalNote, as creation via frequency calculates 'cents'
  return finalNote as MicrotonalNote;
}

/**
 * Creates a factory object containing functions tailored for a specific
 * n-EDO (Equal Divisions of the Octave) system.
 * Examples: 12-EDO is standard Equal Temperament, 24-EDO is quarter-tone ET.
 * Provides tools to work with intervals and transposition within that EDO framework.
 *
 * @param divisions - The number of equal divisions per octave (e.g., 12, 19, 24, 31). Must be a positive integer.
 * @returns An object with helper functions for the specified EDO system:
 * - `getIntervalCents`: Calculates the exact cents value for a given number of EDO steps.
 * - `transposeBySteps`: Transposes a note by a specific number of EDO steps using precise cents calculation.
 * - `getNoteByCents` {@deprecated Use `transposeBySteps` for EDO-specific transposition or `transposeByCents` directly.} A legacy function wrapping `transposeByCents`.
 * @throws {Error} If the number of divisions is not a positive integer.
 * @example
 * ```ts
 * const edo24 = createEDOSystem(24); // Quarter-tone system factory
 * const c4 = createNote({ midi: 60 });
 *
 * // Calculate size of one step in 24-EDO
 * const centsPerStep24 = edo24.getIntervalCents(1); // 50
 *
 * // Transpose C4 up by 3 steps (150 cents) in 24-EDO
 * const note1 = edo24.transposeBySteps(c4, 3);
 * // -> Pitch is C4 + 150 cents. Resulting note depends on preference.
 * //    If sharp pref: C#4 + 50 cents. If flat pref: Db4 + 50 cents.
 *
 * // Transpose C4 up by 7 steps (350 cents) in 24-EDO
 * const note2 = edo24.transposeBySteps(c4, 7);
 * // -> Pitch is C4 + 350 cents. Resulting note depends on preference.
 * //    If sharp pref: D#4 + 50 cents. If flat pref: Eb4 + 50 cents.
 * ```
 */
export function createEDOSystem(divisions: number): {
  /**
   * Calculates the exact cents value corresponding to a given number of steps in this EDO system.
   * @param steps - The number of EDO steps (can be integer or fractional, positive or negative).
   * @returns The total interval size in cents.
   */
  getIntervalCents: (steps: number) => number;
  /**
   * Transposes a given Note by a specified number of steps within this EDO system.
   * Calculates the precise transposition in cents and applies it.
   * @param note - The Note to transpose.
   * @param steps - The number of EDO steps to transpose by.
   * @param [options] - Optional parameters for note creation.
   * @param [options.prefer='sharp'] - Preferred spelling for the resulting note.
   * @returns A new Note object representing the transposed pitch.
   */
  transposeBySteps: (
    note: Note,
    steps: number,
    options?: { prefer?: EnharmonicPreference }
  ) => Note;
  /**
   * Creates a note by transposing a reference note by a specific cents value.
   * @deprecated Use `transposeBySteps` for EDO step transposition or the global `transposeByCents` for general cents transposition. This function remains for potential compatibility but adds little value within the EDO context object.
   * @param cents - The number of cents to transpose by.
   * @param referenceNote - The starting Note.
   * @param [options] - Optional parameters.
   * @param [options.prefer='sharp'] - Preferred spelling.
   * @returns A new Note object.
   */
  getNoteByCents: (
    cents: number,
    referenceNote: Note,
    options?: { prefer?: EnharmonicPreference }
  ) => Note;
} {
  // --- Input Validation ---
  if (!Number.isInteger(divisions) || divisions <= 0) {
    throw new Error(
      `Invalid EDO divisions: ${divisions}. Must be a positive integer.`
    );
  }
  // --- End Validation ---

  // Calculate the size of one step in cents for this EDO system
  const centsPerStep = CENTS_PER_OCTAVE / divisions;

  // Function to calculate cents for a given number of steps
  const getIntervalCents = (steps: number): number => {
    if (!Number.isFinite(steps)) return 0; // Handle non-numeric steps gracefully
    return steps * centsPerStep;
  };

  // Function to transpose a note by steps in the EDO system
  const transposeBySteps = (
    note: Note,
    steps: number,
    options?: { prefer?: EnharmonicPreference }
  ): Note => {
    if (!note)
      throw new Error("Invalid reference note provided to transposeBySteps.");
    if (!Number.isFinite(steps)) steps = 0; // Handle non-numeric steps gracefully

    // Calculate the total transposition in cents
    const totalCents = steps * centsPerStep;
    // Use the precise cents transposition function from operations
    return transposeByCents(note, totalCents, options);
  };

  // Function to get a note by cents offset from a reference (deprecated wrapper)
  /** @deprecated Use transposeByCents directly for arbitrary cents transposition. */
  const getNoteByCents = (
    cents: number,
    referenceNote: Note,
    options?: { prefer?: EnharmonicPreference }
  ): Note => {
    // Add a warning if this deprecated function is used
    console.warn(
      "`getNoteByCents` within EDO system object is deprecated. Use `transposeBySteps` or the global `transposeByCents`."
    );
    if (!referenceNote)
      throw new Error("Invalid reference note provided to getNoteByCents.");
    if (!Number.isFinite(cents)) cents = 0;
    // Just wraps the global transposeByCents
    return transposeByCents(referenceNote, cents, options);
  };

  // Return the factory object containing the specialized functions
  return Object.freeze({
    // Freeze to prevent modification
    getIntervalCents,
    transposeBySteps,
    getNoteByCents, // Include deprecated function
  });
}

/**
 * Creates a factory object containing functions tailored for a custom tuning system
 * defined by an array of cents offsets for each scale degree within an octave,
 * relative to a reference note (typically the tonic or A4=0 cents).
 *
 * @param centsOffsets - An array of numbers representing the cents value for each scale degree
 * relative to the tonic (which is implicitly 0 cents). The array defines one octave.
 * Values outside 0 <= cents < 1200 will be normalized. Duplicates will be removed, and 0 will be added if missing.
 * The offsets will be sorted internally.
 * Example: `[0, 200, 386, 500, 700, 884, 1018]` for a specific 7-note tuning.
 * @param [referenceNote=A4] - The reference Note object corresponding to 0 cents (the first element in the sorted `centsOffsets` array after normalization).
 * Defaults to A4 (MIDI 69) if not provided.
 * @returns An object with helper functions for the custom tuning system:
 * - `getNoteByDegree`: Gets the Note for a specific scale degree index (0-based), handling octave wrapping and optional octave offsets relative to the reference note's octave.
 * - `getCentsForDegree`: Gets the normalized cents offset (0 <= cents < 1200) for a specific scale degree index (0-based).
 * - `getTuningMap`: Returns an immutable map showing the normalized cents offset for each internal degree index (e.g., `{ degree_0: 0, degree_1: 150, ... }`).
 * @throws {Error} If `centsOffsets` is empty, contains non-finite numbers, or the referenceNote is invalid.
 * @example
 * ```ts
 * // Define Wendy Carlos' Alpha tuning (approximate cents)
 * const alphaOffsets = [0, 150.0, 300.0, 450.0, 600.0, 750.0, 900.0, 1050.0]; // 8 unique degrees per octave
 * const c4Ref = createNote({ midi: 60 }); // Use C4 as the reference (0 cents)
 * const alphaTuning = createCustomTuning(alphaOffsets, c4Ref);
 *
 * // Get the 3rd degree (index 2) relative to C4 octave
 * const noteAlpha3 = alphaTuning.getNoteByDegree(2); // Should be pitch C4 + 300 cents
 * console.log(formatNote(noteAlpha3)); // Likely "D#" or "Eb", depends on preference used in transposeByCents
 *
 * // Get the 9th degree (index 1 of next octave) relative to C4 octave
 * const noteAlpha9 = alphaTuning.getNoteByDegree(9); // 9 % 8 = index 1; 9 / 8 floor = 1 octave offset
 * // Should be pitch C4 + 1 octave + 150 cents
 * console.log(formatNote(noteAlpha9)); // Like noteAlpha3 but one octave higher
 *
 * // Get the note for degree 2, but explicitly 1 octave higher than reference C4
 * const noteAlpha3OctPlus1 = alphaTuning.getNoteByDegree(2, 1);
 * console.log(formatNote(noteAlpha3OctPlus1)); // Like noteAlpha3 but one octave higher
 *
 * console.log(alphaTuning.getCentsForDegree(1)); // 150.0
 * console.log(alphaTuning.getTuningMap()); // { degree_0: 0, degree_1: 150.0, ..., degree_7: 1050.0 }
 * ```
 */
export function createCustomTuning(
  centsOffsets: number[],
  referenceNote: Note = createNoteFromParts({ letter: "A", octave: 4 }) // Default A4 ref
): {
  /**
   * Gets the Note corresponding to a specific scale degree index in this custom tuning.
   * Handles wrapping for degrees outside the base octave range and applies octave offsets.
   * @param scaleDegree - The 0-based index of the scale degree. Can be any integer.
   * @param [octaveOffset=0] - Additional octaves to add relative to the `referenceNote`'s octave.
   * @returns The calculated Note object.
   */
  getNoteByDegree: (scaleDegree: number, octaveOffset?: number) => Note;
  /**
   * Gets the normalized cents offset (0 <= cents < 1200) for a given scale degree index.
   * @param scaleDegree - The 0-based index of the scale degree.
   * @returns The cents offset for that degree within the base octave definition.
   */
  getCentsForDegree: (scaleDegree: number) => number;
  /**
   * Returns an immutable map showing the normalized cents offset for each internal degree index
   * used by the tuning system (e.g., `{ degree_0: 0, degree_1: 150, ... }`).
   * @returns A readonly record mapping internal degree keys to cents offsets.
   */
  getTuningMap: () => Readonly<Record<string, number>>; // Make return readonly
} {
  // --- Input Validation ---
  if (!Array.isArray(centsOffsets) || centsOffsets.length === 0) {
    throw new Error("centsOffsets array must be provided and non-empty.");
  }
  if (!referenceNote) {
    throw new Error("A valid referenceNote must be provided.");
  }
  if (centsOffsets.some((c) => !Number.isFinite(c))) {
    throw new Error("centsOffsets array must contain only finite numbers.");
  }
  // --- End Validation ---

  // Normalize offsets to be within the 0 <= cents < CENTS_PER_OCTAVE range
  // Use a Set to handle duplicates automatically, and ensure 0 is included.
  const processedOffsets = new Set(
    centsOffsets.map(
      (cents) =>
        // Ensure result is positive before final modulo
        ((cents % CENTS_PER_OCTAVE) + CENTS_PER_OCTAVE) % CENTS_PER_OCTAVE
    )
  );
  processedOffsets.add(0); // Ensure tonic (0 cents) is included

  // Sort the unique offsets numerically and freeze the array for internal use
  const normalizedSortedOffsets = Object.freeze(
    Array.from(processedOffsets).sort((a, b) => a - b)
  );
  const scaleSize = normalizedSortedOffsets.length; // Number of unique degrees per octave

  // Function to get the Note for a specific scale degree (0-indexed)
  const getNoteByDegree = (
    scaleDegree: number, // Can be any integer (positive, negative, large)
    octaveOffset: number = 0 // Additional octave shift
  ): Note => {
    // Validate inputs
    if (!Number.isFinite(scaleDegree)) scaleDegree = 0;
    if (!Number.isFinite(octaveOffset)) octaveOffset = 0;

    // Calculate the effective octave shift from the reference note's octave,
    // considering both the degree wrapping and the explicit offset.
    const octavesFromDegreeWrap = Math.floor(scaleDegree / scaleSize);
    const totalOctaveShift = octavesFromDegreeWrap + octaveOffset;

    // Find the index within the normalized offsets array (0 to scaleSize-1)
    // Handles negative scaleDegree correctly.
    const degreeIndex = ((scaleDegree % scaleSize) + scaleSize) % scaleSize;

    // Get the specific cents offset for this degree relative to the tonic (0 cents)
    const centsOffset = normalizedSortedOffsets[degreeIndex];

    // Calculate the total cents transposition relative to the reference note (which represents 0 cents)
    // Adds the base offset for the degree + full octave offsets in cents
    const totalCents = centsOffset + totalOctaveShift * CENTS_PER_OCTAVE;

    // Transpose the reference note by the total calculated cents value
    // Use a default preference, e.g., 'sharp', can be made configurable if needed
    return transposeByCents(referenceNote, totalCents, { prefer: "sharp" });
  };

  // Function to get the cents offset for a specific degree index (normalized 0-1199.99...)
  const getCentsForDegree = (scaleDegree: number): number => {
    if (!Number.isFinite(scaleDegree)) scaleDegree = 0;
    // Find the index within the normalized offsets array (0 to scaleSize-1)
    const degreeIndex = ((scaleDegree % scaleSize) + scaleSize) % scaleSize;
    return normalizedSortedOffsets[degreeIndex];
  };

  // Function to return the internal tuning map (degree index to cents offset)
  const getTuningMap = (): Readonly<Record<string, number>> => {
    const result: Record<string, number> = {};
    normalizedSortedOffsets.forEach((cents, index) => {
      // Use a descriptive key, like the degree index
      result[`degree_${index}`] = cents;
    });
    return Object.freeze(result); // Return immutable map
  };

  // Return the factory object with the specialized functions
  return Object.freeze({
    // Freeze the returned object
    getNoteByDegree,
    getCentsForDegree,
    getTuningMap,
  });
}

/** Options for creating a microtonal scale using various tuning systems. */
export interface MicrotonalScaleOptions {
  /** The Note object to use as the starting point or tonic (0 cents/ratio 1/1). Defaults to C4 if omitted. */
  referenceNote?: Note;
  /** The type of microtonal tuning system to use for generating the scale. */
  tuningSystem: "EDO" | "justIntonation" | "custom";
  /** Required for `tuningSystem: "EDO"`. The number of equal divisions per octave (e.g., 24 for quarter-tones). Defaults to 24 if omitted when `tuningSystem` is "EDO". */
  divisions?: number;
  /** Required for `tuningSystem: "justIntonation"` or `"custom"`.
   * - For **Just Intonation**: An array of ratios relative to the tonic (e.g., `"3/2"`, `1.25`, `"5/4"`). Should ideally include the tonic ("1/1" or 1).
   * - For **Custom**: An array of cents offsets relative to the tonic (e.g., `0`, `150`, `300`). Should ideally include the tonic (0). Ratios can also be provided and will be converted to cents.
   */
  intervals?: Array<string | number>;
  /** If true (default), includes cached `midi`, `notation`, `frequency` properties on the created Note objects. */
  includeCachedValues?: boolean;
  /** Preferred spelling ('sharp' or 'flat') for notes created within the scale. Defaults to 'sharp'. */
  prefer?: EnharmonicPreference;
}

/**
 * Creates an array of Note objects representing a microtonal scale based on the specified tuning system and intervals/divisions.
 *
 * @param options - Configuration object specifying the tuning system, intervals/divisions, reference note, etc. See {@link MicrotonalScaleOptions}.
 * @returns An array of Note objects representing the generated scale. The notes may have `cents` properties depending on the system and creation options. The array is immutable (frozen).
 * @throws {Error} If required options for the specified tuning system are missing or invalid (e.g., invalid divisions, unparsable intervals).
 * @example
 * ```ts
 * // Create a 24-EDO (quarter-tone) scale starting on C4
 * const quarterToneScale = createMicrotonalScale({ tuningSystem: "EDO", divisions: 24 });
 * // -> Returns 25 notes (C4 to C5) including the octave, spaced by 50 cents
 * console.log(quarterToneScale.map(formatNote)); // ["C4", "C+4", "C#4", ..., "B+4", "C5"] (approx)
 *
 * // Create a C major Just Intonation scale (using string ratios)
 * const cMajorJustRatios = ["1/1", "9/8", "5/4", "4/3", "3/2", "5/3", "15/8", "2/1"];
 * const cMajorJustScale = createMicrotonalScale({
 * tuningSystem: "justIntonation",
 * intervals: cMajorJustRatios,
 * referenceNote: createNote({letter: 'C', octave: 4})
 * });
 * // -> Returns 8 notes based on the JI ratios from C4. Notes will have 'cents' property.
 * console.log(cMajorJustScale.map(n => `${formatNote(n)} (${n.cents?.toFixed(1)}c)`));
 *
 * // Create a custom scale using cents offsets relative to A4
 * const customCents = [0, 180, 350, 490, 680, 890, 1050, 1200]; // Example 7-note scale + octave
 * const customScale = createMicrotonalScale({
 * tuningSystem: "custom",
 * intervals: customCents,
 * referenceNote: createNote({letter: 'A', octave: 4})
 * });
 * // -> Returns 8 notes based on the cents offsets from A4.
 * console.log(customScale.map(formatNote));
 * ```
 */
export function createMicrotonalScale(
  options: MicrotonalScaleOptions
): ReadonlyArray<Note> {
  // Return ReadonlyArray
  // Set defaults
  const referenceNote =
    options.referenceNote || createNoteFromParts({ letter: "C", octave: 4 }); // Default to C4
  // Default to true unless explicitly false
  const includeCachedValues = options.includeCachedValues !== false;
  const prefer = options.prefer ?? "sharp";

  // --- Input Validation ---
  if (!options || !options.tuningSystem) {
    throw new Error(
      "Missing required option: tuningSystem ('EDO', 'justIntonation', or 'custom')."
    );
  }
  // --- End Validation ---

  let notes: Note[]; // Declare notes array

  switch (options.tuningSystem) {
    case "EDO": {
      // Default to 24-EDO (quarter tones) if divisions not specified
      const divisions = options.divisions ?? 24;
      if (!Number.isInteger(divisions) || divisions <= 0) {
        throw new Error(
          `Invalid divisions for EDO system: ${divisions}. Must be positive integer.`
        );
      }
      const edo = createEDOSystem(divisions);

      // Create a scale covering one octave (divisions steps + tonic = divisions + 1 notes)
      // Use transposeBySteps ensures correct cents calculation for each step.
      notes = Array.from({ length: divisions + 1 }, (_, i) => {
        const note = edo.transposeBySteps(referenceNote, i, { prefer });
        // Note: Caching behavior depends on transposeByCents -> createNoteFromMidi.
        // If includeCachedValues is false, ideally the created note shouldn't have them.
        // For now, assume createNote functions handle this correctly based on their internal logic.
        return note;
      });
      break; // Add break statement
    }

    case "justIntonation": {
      if (!Array.isArray(options.intervals) || options.intervals.length === 0) {
        throw new Error(
          "`intervals` array (ratios) must be provided for 'justIntonation' scale."
        );
      }

      // Ensure the first interval represents the root (1/1 or equivalent) if not already present
      const firstRatio = options.intervals[0];
      let useIntervals = options.intervals;
      // Check if the first element represents the unison (1.0)
      let isFirstUnison = false;
      if (typeof firstRatio === "number" && firstRatio === 1) {
        isFirstUnison = true;
      } else if (typeof firstRatio === "string") {
        const trimmedFirst = firstRatio.trim();
        if (trimmedFirst === "1" || trimmedFirst === "1/1") {
          isFirstUnison = true;
        } else {
          // Attempt parse and check if it equals 1
          try {
            // Simplified check - rely on createJustIntonationNote's parsing later if needed
            const parts = trimmedFirst.split("/");
            if (
              parts.length === 2 &&
              parseFloat(parts[0]) / parseFloat(parts[1]) === 1
            )
              isFirstUnison = true;
            else if (parseFloat(trimmedFirst) === 1) isFirstUnison = true;
          } catch {} // Ignore parsing errors here
        }
      }

      if (!isFirstUnison) {
        useIntervals = ["1/1", ...options.intervals]; // Prepend unison if not present
      }

      // Create notes for each ratio using the specialized JI function
      notes = useIntervals.map((ratio) =>
        createJustIntonationNote(referenceNote, ratio, {
          prefer,
          includeCachedValues, // Pass cache flag
        })
      );
      break; // Add break statement
    }

    case "custom": {
      if (!Array.isArray(options.intervals) || options.intervals.length === 0) {
        throw new Error(
          "`intervals` array (cents values or ratios) must be provided for 'custom' scale."
        );
      }

      // Convert all provided interval definitions (ratios or cents) to cents values
      const centsValues: number[] = [];
      for (const interval of options.intervals) {
        if (typeof interval === "number") {
          if (!Number.isFinite(interval))
            throw new Error(`Invalid cents value in intervals: ${interval}`);
          centsValues.push(interval); // Assume number is already cents
        } else if (typeof interval === "string") {
          let parsedCents: number | null = null;
          const trimmedInterval = interval.trim();
          // Try parsing as known JI ratio first
          if (JUST_INTONATION_RATIOS[trimmedInterval]) {
            parsedCents =
              CENTS_PER_OCTAVE *
              Math.log2(JUST_INTONATION_RATIOS[trimmedInterval]);
          } else {
            // Try parsing as fraction "n/d"
            const parts = trimmedInterval.split("/");
            if (parts.length === 2) {
              const num = parseFloat(parts[0]);
              const den = parseFloat(parts[1]);
              if (!isNaN(num) && !isNaN(den) && den !== 0 && num > 0) {
                const ratio = num / den;
                if (ratio <= 0 || !Number.isFinite(ratio))
                  throw new Error(
                    `Invalid parsed ratio from fraction "${interval}". Must be positive finite.`
                  );
                parsedCents = CENTS_PER_OCTAVE * Math.log2(ratio);
              }
            } else {
              // Try parsing as simple number string
              const parsedNum = parseFloat(trimmedInterval);
              if (!isNaN(parsedNum)) {
                parsedCents = parsedNum; // Assume it's cents if just a number string
              }
            }
          }
          // Validate final parsed cents value
          if (parsedCents === null || !Number.isFinite(parsedCents)) {
            throw new Error(
              `Invalid interval format: Could not parse "${interval}" as number, ratio, or fraction.`
            );
          }
          centsValues.push(parsedCents);
        } else {
          throw new Error(
            `Invalid type in intervals array: ${typeof interval}`
          );
        }
      }

      // Ensure 0 cents (tonic) is included if not already present at the start
      if (centsValues.length === 0 || centsValues[0] !== 0) {
        centsValues.unshift(0);
      }
      // Sort just in case user provided out of order
      centsValues.sort((a, b) => a - b);

      // Create notes by transposing the reference note by each cents value
      notes = centsValues.map((centValue) => {
        const note = transposeByCents(referenceNote, centValue, { prefer });
        // Handle includeCachedValues? transposeByCents -> createNoteFromMidi handles it internally.
        return note;
      });
      break; // Add break statement
    }

    default:
      // Ensure exhaustive check with a type assertion for better type safety
      const exhaustiveCheck: never = options.tuningSystem;
      throw new Error(`Unsupported tuning system: ${exhaustiveCheck}`);
  }

  // Return immutable array
  return Object.freeze(notes);
}
