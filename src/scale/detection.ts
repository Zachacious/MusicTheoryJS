/**
 * @module Scale/Detection
 * @description
 * This module provides functions designed to analyze a collection of musical notes
 * and attempt to identify matching scales or keys. It includes detection for standard
 * 12-tone equal temperament scales based on predefined patterns, key detection (major/minor),
 * and experimental detection for common microtonal systems like EDOs and Just Intonation.
 *
 * Detection often involves trying different roots, comparing pitch class sets or interval patterns,
 * and calculating confidence scores based on how well the input notes match known structures.
 * Note that detection, especially for microtonal or incomplete sets of notes, can be heuristic.
 */

// Import Note type and utility from the note module
import { CENTS_PER_OCTAVE, Note, noteToFrequency } from "../note";
// Import Scale types from the current module
import { ScaleName, ScalePattern } from "./types";
// Import calculation function needed for microtonal detection
import {
  formatNote,
  getCentsBetween,
  intervalInCents,
} from "../note/calculations";

// Import predefined scale patterns for comparison
import { SCALE_PATTERNS } from "./constants";
// Note: Assumes correct relative path


/**
 * Represents a potential scale match found during detection.
 * @interface ScaleMatch
 * @property {ScaleName} name - The name of the matched scale pattern (e.g., "major", "dorian").
 * @property {ScalePattern} pattern - The interval pattern (semitones from root) of the matched scale.
 * @property {Note} root - The Note object identified as the most likely root for this match.
 * @property {number} confidence - A score from 0 to 1 indicating how well the input notes fit the scale pattern with the identified root. Higher values indicate a better match.
 * @property {number} missingNotes - The number of notes present in the scale pattern but missing from the input set (relative to the root).
 * @property {number} extraNotes - The number of unique pitch classes in the input set that do not belong to the matched scale pattern (relative to the root).
 */
export interface ScaleMatch {
  name: ScaleName;
  pattern: ScalePattern;
  root: Note;
  confidence: number; // 0-1, representing how well the notes match the scale
  missingNotes: number; // How many scale notes are not in the input
  extraNotes: number; // How many input notes are not in the scale
}

/**
 * Detects possible standard 12-TET scales that contain a given set of notes.
 * It iterates through each input note as a potential root and compares the set of
 * input pitch classes against known scale patterns, calculating a confidence score for each match.
 *
 * @param notes - An array of Note objects to analyze. Must contain at least 2 notes.
 * @param [options={}] - Optional configuration for detection.
 * @param [options.minConfidence=0.6] - The minimum confidence score (0-1) required for a scale match to be included in the results.
 * @param [options.maxResults=5] - The maximum number of top-matching scales to return.
 * @returns An array of ScaleMatch objects, sorted by confidence score in descending order, representing the best scale matches found. Returns an empty array if no matches meet the criteria.
 * @throws {Error} If the input `notes` array contains fewer than 2 notes.
 * @example
 * ```ts
 * const myNotes = ['C4', 'E4', 'G4', 'A4', 'B4'].map(s => createNote(s));
 * const detected = detectScales(myNotes);
 * // detected might include:
 * // [
 * //   { name: 'major', root: C4, confidence: 0.8, missingNotes: 2, extraNotes: 0 },
 * //   { name: 'majorPentatonic', root: C4, confidence: 0.75, missingNotes: 0, extraNotes: 1 }, // B4 is extra
 * //   { name: 'lydian', root: G3, confidence: 0.65, ... }, // Example if G was tried as root
 * //   ...
 * // ]
 * console.log(detected[0]?.name, detected[0]?.root.notation); // Might output: 'major', 'C4'
 * ```
 */
export function detectScales(
  notes: Note[],
  options: {
    minConfidence?: number; // Minimum confidence score (0-1) to include in results
    maxResults?: number; // Maximum number of results to return
  } = {}
): ScaleMatch[] {
  // --- Input Validation ---
  if (!Array.isArray(notes) || notes.length < 2) {
    throw new Error("At least 2 notes are required to detect scales.");
  }
  // Filter out any potential null/undefined entries
  const validNotes = notes.filter((n) => n != null);
  if (validNotes.length < 2) {
    throw new Error("Input contained fewer than 2 valid notes.");
  }
  // --- End Validation ---

  // Set options with defaults
  const minConfidence = options.minConfidence ?? 0.6; // Default to 60% confidence
  const maxResults = options.maxResults ?? 5; // Default to top 5 matches

  // Extract unique pitch classes from the valid notes
  const uniquePitchClasses = new Set<number>();
  for (const note of validNotes) {
    uniquePitchClasses.add(note.pitchClassIndex);
  }
  // Convert Set to array for easier mapping
  const pitchClassArray = Array.from(uniquePitchClasses);

  // Store all potential matches
  const allMatches: ScaleMatch[] = [];

  // --- Try each unique valid input note as a potential root ---
  // Using validNotes ensures root is a proper Note object
  for (const root of validNotes) {
    const rootPitchClass = root.pitchClassIndex;

    // Normalize the input pitch classes relative to the current potential root
    // Result is an array of intervals (0-11) from the potential root
    const normalizedPitchClasses = pitchClassArray.map(
      (pc) => (pc - rootPitchClass + 12) % 12 // Ensure positive result
    );

    // --- Compare against known scale patterns ---
    for (const [name, pattern] of Object.entries(SCALE_PATTERNS)) {
      // Calculate how well the normalized input notes match this scale pattern
      const matchScore = calculateMatchScore(normalizedPitchClasses, pattern);

      // Only include matches that meet the confidence threshold
      if (matchScore.confidence >= minConfidence) {
        allMatches.push({
          name: name as ScaleName, // Cast name string to ScaleName type
          pattern, // The pattern array from SCALE_PATTERNS
          root, // The Note object used as the root for this match
          ...matchScore, // Spread confidence, missingNotes, extraNotes
        });
      }
    }
  }

  // If no matches found above threshold, return empty array
  if (allMatches.length === 0) {
    return [];
  }

  // Sort all found matches by confidence score (highest first)
  allMatches.sort((a, b) => b.confidence - a.confidence);

  // Return the top N matches as specified by maxResults
  return allMatches.slice(0, maxResults);
}

/**
 * @internal
 * Calculates a match score indicating how well a set of input pitch classes
 * fits a given scale pattern. Both inputs are assumed to be relative to the same root (0).
 *
 * @param pitchClasses - An array of unique pitch class indices (0-11) relative to a potential root.
 * @param scalePattern - The target scale pattern (intervals from root, e.g., [0, 2, 4, 5, 7, 9, 11]).
 * @returns An object containing the calculated `confidence` (0-1), `missingNotes` count, and `extraNotes` count.
 * @remarks The confidence score uses a heuristic formula that rewards matching notes and penalizes
 * missing scale notes and extra input notes that don't belong to the scale.
 */
function calculateMatchScore(
  pitchClasses: number[], // Input pitch classes relative to a root (0-11)
  scalePattern: ScalePattern // Target scale pattern (intervals from root, 0-11)
): { confidence: number; missingNotes: number; extraNotes: number } {
  // Count notes from the input `pitchClasses` that are present in the `scalePattern`
  let matchingNotes = 0;
  // Keep track of input pitch classes that were *not* found in the scale pattern
  const unmatchedPitchClasses = new Set(pitchClasses);

  // Iterate through each interval (pitch class relative to root) in the scale pattern
  for (const scalePitchClass of scalePattern) {
    // Check if this scale degree exists in the input pitch classes
    if (unmatchedPitchClasses.has(scalePitchClass)) {
      matchingNotes++; // Increment match count
      unmatchedPitchClasses.delete(scalePitchClass); // Remove it from the unmatched set
    }
  }

  // Count missing notes: scale tones not found in the input
  const missingNotes = scalePattern.length - matchingNotes;

  // Count extra notes: input notes not found in the scale pattern
  // These are the remaining notes in the `unmatchedPitchClasses` set
  const extraNotes = unmatchedPitchClasses.size;

  // --- Calculate confidence score (heuristic formula from original code) ---
  // Formula gives higher weight to matching notes compared to penalties.
  // Normalization base considers input size + missing scale notes.
  const totalRelevantNotes = pitchClasses.length + missingNotes; // Total notes considered (input + missing scale notes)

  // Raw score: double weight for matches, subtract penalties
  const rawConfidence =
    totalRelevantNotes > 0
      ? (matchingNotes * 2 - missingNotes - extraNotes) / totalRelevantNotes
      : 0; // Avoid division by zero

  // Normalize confidence score to be strictly within the 0 to 1 range
  const normalizedConfidence = Math.max(0, Math.min(1, rawConfidence));

  return {
    confidence: normalizedConfidence,
    missingNotes,
    extraNotes,
  };
}

/**
 * Attempts to detect the most likely key (root Note and mode - major or minor)
 * for a given set of notes.
 * It runs `detectScales` with broader options and then filters for the highest
 * confidence major or minor scale match.
 *
 * @param notes - An array of Note objects to analyze.
 * @returns An object containing the detected `root` Note, `mode` ('major' or 'minor'),
 * and the `confidence` score (0-1), or `null` if no suitable major or minor key is detected
 * above a basic threshold.
 * @example
 * ```ts
 * const melodyNotes = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'].map(s => createNote(s));
 * const key = detectKey(melodyNotes);
 * if (key) {
 * console.log(`Detected Key: ${formatNote(key.root)} ${key.mode} (Confidence: ${key.confidence.toFixed(2)})`);
 * // Example Output: Detected Key: C4 major (Confidence: 0.85)
 * } else {
 * console.log("Could not detect a likely major/minor key.");
 * }
 * ```
 */
export function detectKey(
  notes: Note[]
): { root: Note; mode: "major" | "minor"; confidence: number } | null {
  // --- Input Validation ---
  if (!Array.isArray(notes) || notes.length < 2) {
    // Need at least a couple notes
    console.warn("Insufficient notes provided to detectKey.");
    return null;
  }
  // --- End Validation ---

  // Detect all possible scales using a lower confidence threshold and more results
  // to increase chance of finding the underlying major/minor key.
  const matches = detectScales(notes, {
    minConfidence: 0.4, // Lower threshold to be more inclusive
    maxResults: 10, // Check more potential matches
  });

  // Filter the results to include only 'major' or 'minor' scale matches
  const keyMatches = matches.filter(
    (match) => match.name === "major" || match.name === "minor"
  );

  // If no major or minor scales were found among the top matches
  if (keyMatches.length === 0) {
    return null; // Could not determine a likely key
  }

  // The matches are already sorted by confidence descending by detectScales.
  // The first element is the best major/minor key match found.
  const bestMatch = keyMatches[0];

  return {
    root: bestMatch.root, // The root note of the best match
    mode: bestMatch.name === "major" ? "major" : "minor", // The mode ('major' or 'minor')
    confidence: bestMatch.confidence, // The confidence score of this match
  };
}

/**
 * Represents a detected microtonal scale match.
 * @interface DetectedMicrotonalScale
 * @property {string} name - The identified name of the scale (e.g., "Just Intonation Major", "24-EDO").
 * @property {string} system - The identified tuning system type (e.g., "Just Intonation", "24-EDO").
 * @property {number} rootIndex - The index within the input `notes` array corresponding to the identified root note for this match.
 * @property {number} confidence - A score (0-1) indicating the likelihood of the match.
 */
interface DetectedMicrotonalScale {
  name: string;
  system: string;
  rootIndex: number;
  confidence: number;
}

/**
 * Attempts to detect known microtonal scale patterns (common EDOs, Just Intonation Major/Minor)
 * within a given sequence of notes.
 * Analyzes adjacent intervals in cents for EDO patterns and frequency ratios for Just Intonation.
 *
 * @param notes - An array of Note objects, assumed to be in scale order. Microtonal information (`cents` or accurate `frequency`) is essential for detection.
 * @returns An array of objects representing possible microtonal scale matches, sorted by confidence (descending). Each object includes the detected scale `name`, tuning `system`, the index of the likely `rootIndex` in the input array, and a `confidence` score. Returns empty array if no matches found.
 * @throws {Error} If input notes are invalid or fewer than 2 notes provided.
 * @remarks This detection is heuristic and works best with complete, correctly ordered scales.
 * It checks against a limited set of common EDOs and basic JI Major/Minor patterns. The confidence score is based on tolerance matching of intervals or ratios.
 */
export function detectMicrotonalScale(
  notes: Note[]
): DetectedMicrotonalScale[] {
  // --- Input Validation ---
  if (!Array.isArray(notes) || notes.length < 2) {
    throw new Error(
      "At least 2 notes are required for microtonal scale detection."
    );
  }
  // --- End Validation ---

  const results: DetectedMicrotonalScale[] = [];

  // --- Calculate intervals between adjacent notes in cents ---
  const intervalsCents: number[] = [];
  for (let i = 0; i < notes.length - 1; i++) {
    // Use precise cents calculation
    intervalsCents.push(getCentsBetween(notes[i], notes[i + 1]));
  }
  // Note: Doesn't include wrap-around interval from last to first note's octave.
  // This might limit detection of patterns relying on that closure.

  // --- Check for common EDO patterns based on adjacent intervals ---
  const edoResults = detectEDOpattern(intervalsCents);
  results.push(...edoResults);

  // --- Check for Just Intonation patterns based on ratios ---
  const justResults = detectJustIntonation(notes);
  results.push(...justResults);

  // Sort combined results by confidence (highest first)
  return results.sort((a, b) => b.confidence - a.confidence);
}

// --- Internal Helper Functions ---

/**
 * @internal
 * Helper function to detect EDO patterns based on adjacent intervals in cents.
 * Checks against a predefined list of common EDO systems.
 *
 * @param intervals - Array of intervals in cents between adjacent notes.
 * @returns An array of potential EDO scale matches.
 */
function detectEDOpattern(
  intervals: number[] // Intervals in cents between adjacent notes
): DetectedMicrotonalScale[] {
  const results: DetectedMicrotonalScale[] = [];
  if (intervals.length === 0) return results; // Need intervals to check

  // Common EDO systems to check against
  const edoSystemsToCheck = [24, 19, 31, 22, 17, 53]; // Example common EDOs

  for (const edo of edoSystemsToCheck) {
    // Calculate the theoretical step size in cents for this EDO
    const stepSize = CENTS_PER_OCTAVE / edo;
    // Set a tolerance for matching interval sizes (e.g., 20% of a step)
    const tolerance = stepSize * 0.2;

    // Count how many adjacent intervals closely match a multiple of the EDO step size
    let matchingIntervals = 0;
    for (const interval of intervals) {
      // Find the nearest integer number of EDO steps for this interval
      const closestStepCount = Math.round(interval / stepSize);
      // Calculate the cents value for that integer number of steps
      const closestStepCents = closestStepCount * stepSize;

      // Check if the actual interval is within tolerance of the ideal EDO step multiple
      if (Math.abs(interval - closestStepCents) <= tolerance) {
        matchingIntervals++;
      }
    }

    // Calculate confidence based on the proportion of matching intervals
    const confidence = matchingIntervals / intervals.length;

    // If confidence is high enough, consider it a potential EDO match
    const EDO_CONFIDENCE_THRESHOLD = 0.7; // Require 70% of intervals to match
    if (confidence >= EDO_CONFIDENCE_THRESHOLD) {
      // Try to identify common scale structures within this EDO
      const edoScaleName = identifyEDOscale(intervals, edo);

      results.push({
        name: edoScaleName || `Generic ${edo}-EDO pattern`, // Provide generic name if specific pattern unknown
        system: `${edo}-EDO`,
        rootIndex: 0, // Assume first note in sequence is the root (simplification)
        confidence: confidence,
      });
    }
  }

  return results;
}

/**
 * @internal
 * Attempts to identify specific known scale types (like Major/Minor variants)
 * within a detected EDO system based on the pattern of steps.
 *
 * @param intervals - Array of intervals in cents between adjacent notes.
 * @param edo - The number of divisions for the detected EDO system.
 * @returns The name of a recognized scale pattern (e.g., "19-EDO Major") or null if no known pattern matches.
 * @remarks Contains hardcoded step patterns for specific EDOs (19, 24, 31). Limited scope.
 */
function identifyEDOscale(intervals: number[], edo: number): string | null {
  // Step size in cents for this EDO
  const stepSize = CENTS_PER_OCTAVE / edo;

  // Convert the input intervals (in cents) to the nearest integer step counts
  const steps = intervals.map((cents) => Math.round(cents / stepSize));

  // --- Look up common scale step patterns for specific EDOs ---
  // Note: These patterns represent *steps between notes*.
  switch (edo) {
    case 24: // Quarter-tone system (step = 50 cents)
      // Major scale in 24-EDO uses steps [4, 4, 2, 4, 4, 4, 2] (multiplying standard WWHWWWH by 2)
      if (arrayEquals(steps, [4, 4, 2, 4, 4, 4, 2])) {
        return "24-EDO Major (Diatonic Equivalent)";
      }
      // Minor scale in 24-EDO uses steps [4, 2, 4, 4, 2, 4, 4]
      if (arrayEquals(steps, [4, 2, 4, 4, 2, 4, 4])) {
        return "24-EDO Minor (Diatonic Equivalent)";
      }
      // Add other known 24-EDO scales if needed
      break;

    case 19: // 19-EDO (step ≈ 63.16 cents)
      // Common 7-note "major-like" scale pattern often cited: [3, 3, 1, 3, 3, 3, 3] steps
      if (arrayEquals(steps, [3, 3, 1, 3, 3, 3, 3])) {
        return "19-EDO 'Major' (Anti-Diatonic)"; // Example name
      }
      // Common 7-note "minor-like" pattern often cited: [3, 1, 3, 3, 3, 3, 3] steps (Dorian equivalent?)
      if (arrayEquals(steps, [3, 1, 3, 3, 3, 3, 3])) {
        // This was listed as minor in original code, seems like Dorian
        return "19-EDO 'Minor' (Mode)";
      }
      break;

    case 31: // 31-EDO (step ≈ 38.71 cents)
      // Common 7-note "major-like": [5, 5, 3, 5, 5, 5, 3] steps
      if (arrayEquals(steps, [5, 5, 3, 5, 5, 5, 3])) {
        return "31-EDO Major (Diatonic Equivalent)";
      }
      // Common 7-note "minor-like": [5, 3, 5, 5, 3, 5, 5] steps
      if (arrayEquals(steps, [5, 3, 5, 5, 3, 5, 5])) {
        return "31-EDO Minor (Diatonic Equivalent)";
      }
      break;
    // Add cases for other EDOs (17, 22, 53 etc.) if known patterns exist
  }

  // No known specific pattern matched for this EDO
  return null;
}

/**
 * @internal
 * Helper function to check if two arrays of numbers are equal element by element.
 *
 * @param a - First array.
 * @param b - Second array.
 * @returns True if arrays are equal, false otherwise.
 */
function arrayEquals(a: number[], b: number[]): boolean {
  // Check if lengths are different
  if (a.length !== b.length) return false;
  // Check if every element matches at the same position
  return a.every((val, idx) => val === b[idx]);
}

/**
 * @internal
 * Helper function to detect if a sequence of notes closely matches common
 * Just Intonation Major or Minor scale patterns based on frequency ratios.
 *
 * @param notes - Array of Note objects, assumed to be in scale order.
 * @returns An array of potential Just Intonation scale matches.
 */
function detectJustIntonation(
  notes: Note[] // Assumes notes are ordered
): DetectedMicrotonalScale[] {
  const results: DetectedMicrotonalScale[] = [];
  if (notes.length === 0) return results; // Need notes to check

  // Iterate through each note in the input sequence, treating it as a potential root (1/1)
  for (let rootIndex = 0; rootIndex < notes.length; rootIndex++) {
    const rootNote = notes[rootIndex];
    let rootFreq: number;
    try {
      rootFreq = noteToFrequency(rootNote); // Calculate root frequency
      if (rootFreq <= 0 || !Number.isFinite(rootFreq)) continue; // Skip if frequency is invalid
    } catch (e) {
      console.warn(
        `Could not get frequency for potential JI root ${formatNote(rootNote)}`
      );
      continue; // Skip this root if frequency calculation fails
    }

    // Calculate frequency ratios of all notes relative to this potential root
    const ratios = notes
      .map((note) => {
        try {
          const freq = noteToFrequency(note);
          return freq > 0 && Number.isFinite(freq) ? freq / rootFreq : NaN;
        } catch {
          return NaN; // Handle potential errors in noteToFrequency
        }
      })
      .filter((r) => !isNaN(r)); // Filter out invalid ratios

    // Set a tolerance for matching ratios (e.g., +/- 1.5% deviation)
    // Tolerance in ratio space means comparing abs(r1/r2 - 1) < tolerance,
    // or abs(r1 - r2) < tolerance * r2. Let's use absolute difference here.
    const RATIO_TOLERANCE = 0.015; // Allow +/- 1.5% difference from ideal ratio

    // Predefined common JI ratios (can be imported from constants potentially)
    // Using simplified sets here for major/minor check. Includes octave.
    const majorJustRatios = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2];
    const minorJustRatios = [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2]; // Natural minor example

    // --- Check against Major JI pattern ---
    let majorMatches = 0;
    // Check how many notes in the input ratio list closely match a ratio in the major JI set
    for (const ratio of ratios) {
      if (
        majorJustRatios.some(
          (justRatio) =>
            Math.abs(ratio - justRatio) < justRatio * RATIO_TOLERANCE // Relative tolerance
        )
      ) {
        majorMatches++;
      }
    }
    // Calculate confidence score for Major JI match
    // High confidence if most input notes match *and* most JI ratios are present
    const majorConfidence =
      (majorMatches / ratios.length) * (majorMatches / majorJustRatios.length);
    const JI_CONFIDENCE_THRESHOLD = 0.75 * 0.75; // Require good match in both directions (example threshold)

    if (majorConfidence >= JI_CONFIDENCE_THRESHOLD) {
      results.push({
        name: "Just Intonation Major (Detected)",
        system: "Just Intonation",
        rootIndex, // Index of the note used as root
        confidence: majorConfidence,
      });
    }

    // --- Check against Minor JI pattern ---
    let minorMatches = 0;
    for (const ratio of ratios) {
      if (
        minorJustRatios.some(
          (justRatio) =>
            Math.abs(ratio - justRatio) < justRatio * RATIO_TOLERANCE
        )
      ) {
        minorMatches++;
      }
    }
    // Calculate confidence score for Minor JI match
    const minorConfidence =
      (minorMatches / ratios.length) * (minorMatches / minorJustRatios.length);

    if (minorConfidence >= JI_CONFIDENCE_THRESHOLD) {
      results.push({
        name: "Just Intonation Minor (Detected)",
        system: "Just Intonation",
        rootIndex, // Index of the note used as root
        confidence: minorConfidence,
      });
    }
  }

  return results;
}
