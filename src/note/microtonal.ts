/**
 * Specialized utilities for microtonal music.
 * This file provides higher-level functions for working with microtonal systems.
 */

import {
  CENTS_PER_OCTAVE,
  CENTS_PER_SEMITONE,
  JUST_INTONATION_RATIOS,
  SEMITONES_PER_OCTAVE,
} from "./constants";
import {
  EnharmonicPreference,
  MicrotonalModifier,
  MicrotonalNote,
  Note,
  TuningSystem,
} from "./types";
import { addCentsToNote, transpose, transposeByCents } from "./operations";
import { createNoteFromFrequency, createNoteFromParts } from "./creation";

import { noteToFrequency } from "./frequency";

/**
 * Creates a just intonation note based on a ratio from a reference note
 */
export function createJustIntonationNote(
  referenceNote: Note,
  ratio: string | number,
  options?: {
    prefer?: EnharmonicPreference;
    includeCachedValues?: boolean;
  }
): MicrotonalNote {
  const prefer = options?.prefer ?? "sharp";
  const includeCachedValues = options?.includeCachedValues ?? true;

  // Get reference frequency
  const referenceFreq = noteToFrequency(referenceNote);

  // Process ratio
  let numericRatio: number;

  if (typeof ratio === "number") {
    numericRatio = ratio;
  } else {
    // Parse string ratio like "3/2"
    if (JUST_INTONATION_RATIOS[ratio]) {
      numericRatio = JUST_INTONATION_RATIOS[ratio];
    } else {
      // Try to parse the fraction
      const parts = ratio.split("/");
      if (parts.length === 2) {
        const numerator = parseFloat(parts[0]);
        const denominator = parseFloat(parts[1]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          numericRatio = numerator / denominator;
        } else {
          throw new Error(`Invalid ratio format: ${ratio}`);
        }
      } else {
        // Try to parse as a decimal
        numericRatio = parseFloat(ratio);
        if (isNaN(numericRatio)) {
          throw new Error(`Invalid ratio format: ${ratio}`);
        }
      }
    }
  }

  // Calculate the new frequency
  const newFrequency = referenceFreq * numericRatio;

  // Create a note from the frequency
  return createNoteFromFrequency({
    frequency: newFrequency,
    prefer,
    includeCachedValues,
    tuningSystem: "justIntonation",
  }) as MicrotonalNote;
}

/**
 * Creates an n-EDO (Equal Divisions of the Octave) system
 * 12-EDO is standard equal temperament. 24-EDO is quarter tone, etc.
 */
export function createEDOSystem(divisions: number): {
  getNoteByCents: (
    cents: number,
    referenceNote: Note,
    options?: { prefer?: EnharmonicPreference }
  ) => Note;
  getIntervalCents: (steps: number) => number;
  transposeBySteps: (
    note: Note,
    steps: number,
    options?: { prefer?: EnharmonicPreference }
  ) => Note;
} {
  // Validate divisions
  if (!Number.isInteger(divisions) || divisions <= 0) {
    throw new Error(
      `Invalid EDO divisions: ${divisions}. Must be a positive integer.`
    );
  }

  // Calculate cents per step
  const centsPerStep = CENTS_PER_OCTAVE / divisions;

  // Function to get a note by cents offset from a reference
  const getNoteByCents = (
    cents: number,
    referenceNote: Note,
    options?: { prefer?: EnharmonicPreference }
  ): Note => {
    const prefer = options?.prefer ?? "sharp";
    return transposeByCents(referenceNote, cents, { prefer });
  };

  // Function to calculate cents for a given number of steps
  const getIntervalCents = (steps: number): number => {
    return steps * centsPerStep;
  };

  // Function to transpose a note by steps in the EDO system
  const transposeBySteps = (
    note: Note,
    steps: number,
    options?: { prefer?: EnharmonicPreference }
  ): Note => {
    const cents = steps * centsPerStep;
    return transposeByCents(note, cents, options);
  };

  return {
    getNoteByCents,
    getIntervalCents,
    transposeBySteps,
  };
}

/**
 * Creates a custom tuning system with specified offsets for each scale degree
 */
export function createCustomTuning(
  centsOffsets: number[],
  referenceNote: Note = createNoteFromParts({ letter: "A", octave: 4 })
): {
  getNoteByDegree: (scaleDegree: number, octaveOffset?: number) => Note;
  getCentsForDegree: (scaleDegree: number) => number;
  getTuningMap: () => Record<string, number>;
} {
  // Normalize offsets to be within 0-1200 cents
  const normalizedOffsets = centsOffsets.map(
    (cents) =>
      ((cents % CENTS_PER_OCTAVE) + CENTS_PER_OCTAVE) % CENTS_PER_OCTAVE
  );

  // Sort offsets to ensure sequential ordering
  normalizedOffsets.sort((a, b) => a - b);

  // Get reference frequency
  const referenceFreq = noteToFrequency(referenceNote);

  // Function to get a note by scale degree
  const getNoteByDegree = (
    scaleDegree: number,
    octaveOffset: number = 0
  ): Note => {
    // Calculate total scale degrees considering the size of our scale
    const scaleDegrees = normalizedOffsets.length;

    // Calculate octave and position within scale
    const octaves = Math.floor(scaleDegree / scaleDegrees) + octaveOffset;
    const degreeIndex =
      ((scaleDegree % scaleDegrees) + scaleDegrees) % scaleDegrees;

    // Get cents offset for this degree
    const centsOffset = normalizedOffsets[degreeIndex];

    // Calculate total cents (including octaves)
    const totalCents = centsOffset + octaves * CENTS_PER_OCTAVE;

    // Calculate frequency ratio
    const ratio = Math.pow(2, totalCents / CENTS_PER_OCTAVE);

    // Calculate new frequency
    const newFrequency = referenceFreq * ratio;

    // Create note from frequency
    return createNoteFromFrequency({
      frequency: newFrequency,
      tuningSystem: "custom",
    });
  };

  // Function to get cents for a degree
  const getCentsForDegree = (scaleDegree: number): number => {
    const scaleDegrees = normalizedOffsets.length;
    const degreeIndex =
      ((scaleDegree % scaleDegrees) + scaleDegrees) % scaleDegrees;
    return normalizedOffsets[degreeIndex];
  };

  // Function to get a map of all tuning values
  const getTuningMap = (): Record<string, number> => {
    const result: Record<string, number> = {};
    normalizedOffsets.forEach((cents, index) => {
      result[`degree_${index}`] = cents;
    });
    return result;
  };

  return {
    getNoteByDegree,
    getCentsForDegree,
    getTuningMap,
  };
}

/**
 * Options for creating a microtonal scale
 */
export interface MicrotonalScaleOptions {
  /** Reference note to build the scale from */
  referenceNote?: Note;
  /** Tuning system to use */
  tuningSystem: "EDO" | "justIntonation" | "custom";
  /** Divisions for EDO system */
  divisions?: number;
  /** Ratios for just intonation or cents for custom system */
  intervals?: Array<string | number>;
  /** Whether to include cached values in created notes */
  includeCachedValues?: boolean;
  /** Enharmonic spelling preference */
  prefer?: EnharmonicPreference;
}

/**
 * Creates a microtonal scale according to the specified options
 */
export function createMicrotonalScale(options: MicrotonalScaleOptions): Note[] {
  const referenceNote =
    options.referenceNote || createNoteFromParts({ letter: "C", octave: 4 });
  const includeCachedValues = options.includeCachedValues ?? true;
  const prefer = options.prefer ?? "sharp";

  switch (options.tuningSystem) {
    case "EDO": {
      const divisions = options.divisions || 24; // Default to quarter-tone system
      const edo = createEDOSystem(divisions);

      // Create a scale with one full octave
      return Array.from({ length: divisions + 1 }, (_, i) => {
        const cents = edo.getIntervalCents(i);
        return edo.getNoteByCents(cents, referenceNote, { prefer });
      });
    }

    case "justIntonation": {
      if (!options.intervals || options.intervals.length === 0) {
        throw new Error("Intervals must be provided for just intonation scale");
      }

      // Include the unison (1/1) at the beginning if not already included
      const firstRatio = options.intervals[0];
      const intervals =
        firstRatio === 1 || firstRatio === "1/1" || firstRatio === "1"
          ? options.intervals
          : ["1/1", ...options.intervals];

      // Create notes for each ratio
      return intervals.map((ratio) =>
        createJustIntonationNote(referenceNote, ratio, {
          prefer,
          includeCachedValues,
        })
      );
    }

    case "custom": {
      if (!options.intervals || options.intervals.length === 0) {
        throw new Error("Cents values must be provided for custom scale");
      }

      // Convert all interval values to cents
      const cents = options.intervals.map((interval) => {
        if (typeof interval === "number") {
          return interval; // Already in cents
        }

        // Try to parse as a ratio first
        if (JUST_INTONATION_RATIOS[interval]) {
          // Convert ratio to cents: cents = 1200 * log2(ratio)
          return 1200 * Math.log2(JUST_INTONATION_RATIOS[interval]);
        }

        // Try to parse as a fraction
        const parts = interval.split("/");
        if (parts.length === 2) {
          const num = parseFloat(parts[0]);
          const den = parseFloat(parts[1]);
          if (!isNaN(num) && !isNaN(den) && den !== 0) {
            return 1200 * Math.log2(num / den);
          }
        }

        // Default to parsed number
        const parsed = parseFloat(interval);
        if (isNaN(parsed)) {
          throw new Error(`Invalid interval format: ${interval}`);
        }
        return parsed;
      });

      // Ensure 0 is included for the root note
      const centsValues = cents[0] === 0 ? cents : [0, ...cents];

      // Create notes for each cents value
      return centsValues.map((centValue) =>
        transposeByCents(referenceNote, centValue, { prefer })
      );
    }

    default:
      throw new Error(`Unsupported tuning system: ${options.tuningSystem}`);
  }
}
