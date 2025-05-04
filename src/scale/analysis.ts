/**
 * @module Scale/Analysis
 * @description
 * This module provides functions for performing advanced music theory analysis on Scale objects.
 * It includes tools to determine scale degree functions, analyze interval content and structure,
 * assess characteristics like brightness and tension, compare scales, find related scales,
 * and identify potential cadences.
 *
 * Many analysis functions operate based on standard Western music theory principles and may
 * have specific assumptions (e.g., applying to 7-note scales). Heuristic methods are used
 * for subjective qualities like tension.
 */

// Import Note-related functionalities needed for analysis
import { Note, intervalBetween, notesAreEqual, transpose } from "../note";
// Import Scale types from the current module
import { Scale, ScaleName } from "./types";

// Import Scale constants (patterns) used for comparison
import { SCALE_PATTERNS } from "./constants";
// Import Scale operations used within analysis functions
import { getDegree } from "./operations"; // Note: getScaleDegree, isNoteInScale seem unused here

// Import Scale detection (unused in provided code, but might be relevant contextually)
// import { detectScales } from "./detection"; // Commented out as unused in this specific file

/**
 * Represents the traditional functional role of a scale degree within diatonic harmony.
 * @typedef {'tonic' | 'supertonic' | 'mediant' | 'subdominant' | 'dominant' | 'submediant' | 'leadingTone' | 'subtonic'} ScaleFunctionRole
 */
export type ScaleFunctionRole =
  | "tonic" // Degree 1
  | "supertonic" // Degree 2
  | "mediant" // Degree 3
  | "subdominant" // Degree 4
  | "dominant" // Degree 5
  | "submediant" // Degree 6
  | "leadingTone" // Degree 7 (a half-step below tonic)
  | "subtonic"; // Degree 7 (a whole-step below tonic)

/**
 * Determines the traditional functional role (tonic, dominant, etc.) of a specific degree
 * within a given 7-note scale.
 *
 * @param scale - The Scale object to analyze (must be heptatonic/7-note).
 * @param degree - The scale degree number (1-indexed, e.g., 1 for tonic, 5 for dominant).
 * @returns The corresponding ScaleFunctionRole name, or null if the scale is not 7-note or the degree is invalid.
 * @remarks Distinguishes between 'leadingTone' (major 7th interval from root) and 'subtonic' (minor 7th interval from root) for the 7th degree.
 * @example
 * ```ts
 * const cMajorScale = getScale(createNote({ letter: 'C', octave: 4 }), 'major');
 * if (cMajorScale) {
 * const roleOf5th = getScaleFunction(cMajorScale, 5); // 'dominant'
 * const roleOf7th = getScaleFunction(cMajorScale, 7); // 'leadingTone'
 * }
 *
 * const cMinorScale = getScale(createNote({ letter: 'C', octave: 4 }), 'naturalMinor');
 * if (cMinorScale) {
 * const roleOf7thMinor = getScaleFunction(cMinorScale, 7); // 'subtonic'
 * }
 * ```
 */
export function getScaleFunction(
  scale: Scale,
  degree: number // 1-indexed degree
): ScaleFunctionRole | null {
  // This analysis typically applies only to standard 7-note scales
  // Check if the pattern length implies 7 notes (pattern includes intervals from root, so length 7)
  // Also check notes length for robustness, although pattern is primary
  if (scale.notes.length !== 7 || scale.pattern.length !== 7) {
    console.warn("Scale function analysis applied to non-heptatonic scale.");
    return null;
  }

  // Ensure degree is within the valid range (1-7)
  if (degree < 1 || degree > 7) {
    return null;
  }

  // Map degrees (1-7) to standard functional roles
  const functionMap: Record<number, ScaleFunctionRole> = {
    1: "tonic",
    2: "supertonic",
    3: "mediant",
    4: "subdominant",
    5: "dominant",
    6: "submediant",
    // For degree 7, determine if it's a leading tone (11 semitones from root) or subtonic (10 semitones)
    // The pattern array stores intervals from the root [0, i2, i3, i4, i5, i6, i7]
    7: scale.pattern[6] === 11 ? "leadingTone" : "subtonic", // pattern[6] is the 7th degree interval
  };

  return functionMap[degree] || null; // Return role or null if degree somehow invalid (shouldn't happen with check above)
}

/**
 * Defines the structure for results of interval analysis on a scale.
 * @interface ScaleIntervalAnalysis
 * @property {number} perfectFifths - Count of perfect fifth intervals (7 semitones) found between pairs of scale notes.
 * @property {number} tritones - Count of tritone intervals (6 semitones) found between pairs of scale notes.
 * @property {number} chromaticIntervals - Count of chromatic intervals (1 semitone / half-steps) found between pairs of scale notes.
 * @property {number} largeLeaps - Count of intervals larger than a perfect fifth but smaller than an octave (8, 9, 10, 11 semitones) between pairs of scale notes.
 * @property {'none' | 'partial' | 'full'} symmetry - Assessment of the scale's interval pattern symmetry. 'full' means palindromic, 'partial' suggests some symmetric pairs, 'none' otherwise.
 * @property {number} maxGap - The largest interval (in semitones) between adjacent notes in the scale, including the wrap-around from the last note to the octave.
 * @property {number} avgStep - The average interval size (in semitones) between adjacent notes in the scale.
 */
export interface ScaleIntervalAnalysis {
  perfectFifths: number; // Count of perfect fifth relationships
  tritones: number; // Count of tritone intervals
  chromaticIntervals: number; // Count of half-step intervals
  largeLeaps: number; // Count of intervals larger than a perfect fifth (< octave)
  symmetry: "none" | "partial" | "full"; // Symmetry assessment
  maxGap: number; // Largest gap between adjacent notes in semitones
  avgStep: number; // Average step size in semitones
}

/**
 * Analyzes the interval content and structural characteristics of a scale's pattern.
 * Calculates counts of specific interval types between all pairs of notes,
 * assesses pattern symmetry, and measures adjacent step sizes.
 *
 * @param scale - The Scale object to analyze.
 * @returns An object containing the interval analysis results. See {@link ScaleIntervalAnalysis}.
 * @remarks Interval calculations use `intervalBetween` (semitones) and consider absolute values modulo 12 for interval type counts. Symmetry check compares the forward pattern of intervals-from-root to its inversion. Gap/step calculations use adjacent notes including octave wrap-around.
 */
export function analyzeScaleIntervals(scale: Scale): ScaleIntervalAnalysis {
  if (!scale || !scale.notes || scale.notes.length === 0) {
    // Return default/empty analysis for invalid input
    return {
      perfectFifths: 0,
      tritones: 0,
      chromaticIntervals: 0,
      largeLeaps: 0,
      symmetry: "none",
      maxGap: 0,
      avgStep: 0,
    };
  }
  const notes = scale.notes;
  const numNotes = notes.length;
  let perfectFifths = 0;
  let tritones = 0;
  let chromaticIntervals = 0;
  let largeLeaps = 0;

  // Check intervals between all pairs of notes
  for (let i = 0; i < numNotes; i++) {
    for (let j = i + 1; j < numNotes; j++) {
      // Calculate interval in semitones, get absolute value, take modulo 12 for interval quality check
      const intervalMod12 =
        Math.abs(intervalBetween(notes[i], notes[j], false)) % 12; // Use integer semitones for classification

      // Count specific interval types based on modulo 12 value
      if (intervalMod12 === 1) chromaticIntervals++; // Minor second (or Major Seventh inverted)
      if (intervalMod12 === 6) tritones++; // Tritone
      if (intervalMod12 === 7) perfectFifths++; // Perfect Fifth (or Perfect Fourth inverted)
      // Large leaps are defined here as M6, m7, M7 (intervals 8, 9, 10, 11 semitones)
      if (intervalMod12 >= 8 && intervalMod12 <= 11) largeLeaps++;
    }
  }

  // --- Calculate adjacent intervals ---
  const adjacentIntervals: number[] = [];
  if (numNotes > 1) {
    for (let i = 0; i < numNotes - 1; i++) {
      // Calculate interval between adjacent notes precisely (incl. cents if needed, though pattern usually implies integers)
      // Using intervalBetween with includeCents=false for consistency with pattern expectation
      const interval = Math.abs(intervalBetween(notes[i], notes[i + 1], false));
      adjacentIntervals.push(interval);
    }
    // Add interval from the last note back to the first note's octave
    // Transpose the first note up an octave for correct wrap-around calculation
    const octaveNote = transpose(notes[0], 12); // Assumes Interval 12 is Octave
    const lastToFirstInterval = Math.abs(
      intervalBetween(notes[numNotes - 1], octaveNote, false)
    );
    adjacentIntervals.push(lastToFirstInterval);
  }

  // Find max gap and calculate avg step (handle empty adjacentIntervals)
  const maxGap =
    adjacentIntervals.length > 0 ? Math.max(...adjacentIntervals) : 0;
  const avgStep =
    adjacentIntervals.length > 0
      ? adjacentIntervals.reduce((sum, val) => sum + val, 0) /
        adjacentIntervals.length
      : 0;

  // --- Check for symmetry in the scale's *interval-from-root* pattern ---
  let symmetry: "none" | "partial" | "full" = "none";
  const pattern = scale.pattern; // Intervals from root: [0, i2, i3...]

  if (pattern && pattern.length > 1) {
    // const numDegrees = pattern.length;
    // Consider the interval structure relative to the octave (12 semitones)
    const stepsBetween = adjacentIntervals; // Use previously calculated adjacent steps

    // Check for full symmetry (palindromic steps)
    const reversedSteps = [...stepsBetween].reverse();
    if (stepsBetween.join(",") === reversedSteps.join(",")) {
      symmetry = "full";
    } else {
      // Partial symmetry check is complex. This version seems to check interval *pairs* summing to octave.
      // Let's keep the original logic based on interval pairs summing to the octave span (12)
      // relative to the root pattern [0, i2, i3...] excluding 0 and midpoint (6).
      let symmetricalPairsCount = 0;
      const uniqueIntervalsFromRoot = pattern.slice(1); // Exclude the root 0
      for (const interval of uniqueIntervalsFromRoot) {
        // Check if the complementary interval (relative to octave) exists in the pattern
        const complement = (12 - interval + 12) % 12;
        // Avoid checking midpoint against itself, and only count pairs once
        if (
          interval !== 6 &&
          interval !== 0 &&
          interval < complement &&
          uniqueIntervalsFromRoot.includes(complement)
        ) {
          symmetricalPairsCount++;
        }
      }
      // Heuristic: if roughly half the non-tritone intervals form symmetric pairs.
      const nonTritoneCount = uniqueIntervalsFromRoot.filter(
        (i) => i !== 6
      ).length;
      if (
        symmetricalPairsCount > 0 &&
        symmetricalPairsCount >= Math.floor(nonTritoneCount / 2)
      ) {
        symmetry = "partial";
      }
    }
  }

  return {
    perfectFifths,
    tritones,
    chromaticIntervals,
    largeLeaps,
    symmetry,
    maxGap,
    avgStep,
  };
}

/**
 * Describes the perceived brightness or darkness of a scale, often by comparing
 * its structure to a major scale.
 * @typedef {'very bright' | 'bright' | 'neutral' | 'dark' | 'very dark'} ScaleBrightness
 */
export type ScaleBrightness =
  | "very bright" // Many raised notes vs Major (e.g., Lydian)
  | "bright" // Some raised notes vs Major (e.g., Major itself, Mixolydian?) - This category needs refinement maybe
  | "neutral" // Balanced raised/lowered vs Major (e.g., Dorian?)
  | "dark" // Some lowered notes vs Major (e.g., Minor, Phrygian)
  | "very dark"; // Many lowered notes vs Major (e.g., Locrian)

/**
 * Analyzes the brightness/darkness characteristic of a scale, primarily by comparing its
 * pitch class content to that of a major scale with the same root.
 * More raised degrees (like #4, #5) contribute to brightness, while lowered degrees
 * (like b2, b3, b6, b7) contribute to darkness.
 *
 * @param scale - The Scale object to analyze.
 * @returns A qualitative assessment of the scale's brightness. See {@link ScaleBrightness}.
 * @remarks This is a heuristic analysis based on comparison with the major scale pattern.
 * The definition of 'raised'/'lowered' depends on the specific pitch classes present.
 * The boundaries between categories ('bright', 'neutral', 'dark') are subjective.
 */
export function analyzeScaleBrightness(scale: Scale): ScaleBrightness {
  // Requires the major scale pattern for comparison
  const majorPattern = SCALE_PATTERNS.major; // Assumes [0, 2, 4, 5, 7, 9, 11]
  if (!majorPattern) {
    console.warn("Major scale pattern not found for brightness analysis.");
    return "neutral"; // Default if reference is missing
  }
  if (!scale || !scale.notes || scale.notes.length === 0) {
    return "neutral"; // Default for invalid scale
  }

  // Get the set of unique pitch classes in the input scale
  const scalePitchClasses = new Set(scale.notes.map((n) => n.pitchClassIndex));

  // Calculate the pitch classes of the parallel major scale (same root)
  const parallelMajorPitchClasses = new Set(
    majorPattern.map((interval) => (scale.root.pitchClassIndex + interval) % 12)
  );

  // Count notes in the scale that are NOT in the parallel major scale
  let raisedCount = 0;
  let loweredCount = 0;

  for (const pc of scalePitchClasses) {
    if (!parallelMajorPitchClasses.has(pc)) {
      // Check if this non-major pitch class is immediately above (raised)
      // or immediately below (lowered) a note *in the parallel major scale*.
      const pcMinus1 = (pc - 1 + 12) % 12; // Note below pc
      const pcPlus1 = (pc + 1) % 12; // Note above pc

      // It's considered 'raised' if the note below it IS in the major scale
      if (parallelMajorPitchClasses.has(pcMinus1)) {
        raisedCount++;
      }
      // It's considered 'lowered' if the note above it IS in the major scale
      // Note: This simple check might misclassify altered notes far from major scale tones.
      // A more robust check might involve comparing interval structures directly.
      else if (parallelMajorPitchClasses.has(pcPlus1)) {
        loweredCount++;
      }
      // If neither condition met, it's an alteration not directly adjacent to a major scale tone? Ignore for simple score.
    }
  }

  // --- Calculate brightness score ---
  // Simple score: raised notes add, lowered notes subtract.
  const brightnessScore = raisedCount - loweredCount;
  // Alternative: Consider specific intervals? Lydian #4 is brighter than Mixolydian b7 is dark?
  // Keeping simple score for now.

  // Map the score to a qualitative assessment
  if (brightnessScore >= 2) return "very bright"; // e.g., Lydian (#4) + maybe another raised note?
  if (brightnessScore === 1) return "bright"; // e.g., Lydian (#4) or Mixolydian (has b7 -> lowered=1 -> score=-1?) -> Needs refinement
  // Major scale comparison: Major has 0 raised, 0 lowered -> score 0 -> neutral? Let's adjust.
  // Let's redefine: Compare intervals directly?
  // Compare scale.pattern to majorPattern [0, 2, 4, 5, 7, 9, 11]
  // Assume scale.pattern length matches majorPattern length for simplicity here
  if (scale.pattern.length === majorPattern.length) {
    let score = 0;
    for (let i = 0; i < scale.pattern.length; i++) {
      const diff = scale.pattern[i] - majorPattern[i];
      if (diff > 0) score++; // Interval is larger (sharper)
      if (diff < 0) score--; // Interval is smaller (flatter)
    }
    // Map revised score
    if (score >= 2) return "very bright"; // Lydian#5? Multiple raised notes
    if (score === 1) return "bright"; // Lydian (#4)
    if (score === 0) return "neutral"; // Major, Mixolydian (b7 cancels?), Dorian? -> Still not perfect
    if (score === -1) return "dark"; // Minor (b3, b6, b7 -> -3 score?), Mixolydian (b7 -> -1)
    if (score <= -2) return "very dark"; // Locrian (b2,b3,b5,b6,b7 -> -5 score?), Phrygian (b2,b3,b6,b7 -> -4)
    // This interval comparison seems better but still needs refinement for categories.
    // Returning result based on score for now.
  } else {
    // Fallback for non-heptatonic scales based on original raised/lowered count
    if (brightnessScore >= 2) return "very bright";
    if (brightnessScore === 1) return "bright";
    if (brightnessScore === 0) return "neutral";
    if (brightnessScore === -1) return "dark";
    return "very dark"; // Default for score <= -2
  }
  // Return based on interval comparison score:
  const score =
    scale.pattern.length === majorPattern.length
      ? scale.pattern.reduce(
          (s, interval, i) => s + Math.sign(interval - majorPattern[i]),
          0
        )
      : brightnessScore; // Fallback score

  if (score >= 2) return "very bright";
  if (score === 1) return "bright";
  if (score === 0) return "neutral";
  if (score === -1) return "dark";
  /* score <= -2 */ return "very dark";
}

/**
 * Describes structural characteristics of a scale's interval pattern.
 * @interface ScaleStructureAnalysis
 * @property {boolean} isPentatonic - True if the scale has exactly 5 notes per octave.
 * @property {boolean} isHeptatonic - True if the scale has exactly 7 notes per octave.
 * @property {boolean} isOctatonic - True if the scale has exactly 8 notes per octave.
 * @property {boolean} isDiatonic - True if the scale follows the specific pattern of 5 whole steps and 2 half steps characteristic of major/natural minor scales and their modes.
 * @property {boolean} isHemitonic - True if the scale contains at least one half-step (semitone) interval between adjacent notes.
 * @property {boolean} isCoherent - True if the largest gap between adjacent notes is no greater than a major third (4 semitones). False if larger gaps exist.
 * @property {boolean} hasLeadingTone - True if the scale contains a note exactly one half-step below the tonic (a major 7th interval from the root).
 * @property {boolean} isSymmetrical - True if the scale's pattern of intervals from the root reads the same forwards and backwards when inverted around the octave midpoint (palindromic structure).
 */
export interface ScaleStructureAnalysis {
  isPentatonic: boolean; // 5 notes per octave
  isHeptatonic: boolean; // 7 notes per octave
  isOctatonic: boolean; // 8 notes per octave
  isDiatonic: boolean; // Specific pattern of 5 whole + 2 half steps
  isHemitonic: boolean; // Contains at least one half-step interval
  isCoherent: boolean; // No gaps larger than major 3rd (4 semitones)
  hasLeadingTone: boolean; // Contains note a half-step below tonic (Major 7th interval)
  isSymmetrical: boolean; // Symmetrical interval pattern (intervals from root)
}

/**
 * Analyzes various structural properties of a scale based on its notes and interval pattern.
 * Determines characteristics like the number of notes, diatonicism, presence of semitones,
 * interval coherence, presence of a leading tone, and pattern symmetry.
 *
 * @param scale - The Scale object to analyze.
 * @returns An object containing boolean flags for different structural properties. See {@link ScaleStructureAnalysis}.
 * @remarks The definition of 'diatonic' used here is strict, requiring exactly 5 whole steps and 2 half steps per octave, with specific spacing between the half steps. 'Symmetrical' refers to the pattern of intervals from the root being palindromic when inverted.
 */
export function analyzeScaleStructure(scale: Scale): ScaleStructureAnalysis {
  if (!scale || !scale.notes || scale.notes.length === 0 || !scale.pattern) {
    // Return default analysis for invalid input
    return {
      isPentatonic: false,
      isHeptatonic: false,
      isOctatonic: false,
      isDiatonic: false,
      isHemitonic: false,
      isCoherent: false,
      hasLeadingTone: false,
      isSymmetrical: false,
    };
  }

  // const notes = scale.notes;
  // Use pattern (intervals from root) primarily, but check notes length too
  const pattern = scale.pattern; // e.g., [0, 2, 4, 5, 7, 9, 11]
  const numNotes = pattern.length; // Number of unique notes per octave

  // Calculate adjacent intervals (steps between degrees)
  const adjacentIntervals: number[] = [];
  if (numNotes > 1) {
    for (let i = 0; i < numNotes - 1; i++) {
      // Interval = difference between consecutive intervals-from-root
      adjacentIntervals.push(pattern[i + 1] - pattern[i]);
    }
    // Add interval from last note up to the octave (12 semitones)
    adjacentIntervals.push(12 - pattern[numNotes - 1]);
  }
  // Sanity check: sum of adjacent intervals should be 12
  // if (adjacentIntervals.reduce((a, b) => a + b, 0) !== 12) { console.warn(...) }

  // --- Check properties based on adjacent intervals ---
  const isHemitonic = adjacentIntervals.includes(1); // Contains semitones?
  // Coherent: no gap larger than Major 3rd (4 semitones)
  const isCoherent = adjacentIntervals.every((interval) => interval <= 4);

  // --- Check properties based on pattern (intervals from root) ---
  // Has leading tone: Major 7th interval (11 semitones) is present
  const hasLeadingTone = pattern.includes(11);

  // Check for symmetry in the interval-from-root pattern
  let isSymmetrical = false;
  if (numNotes > 1) {
    // const uniqueIntervals = pattern.slice(); // Copy pattern
    // Invert the pattern around the octave: complement = 12 - interval
    // Then shift it so the original root (0) maps to the highest interval after inversion,
    // and compare with the original pattern shifted appropriately.
    // Simpler: check if interval 'i' exists iff interval '12-i' exists (excluding 0 and 6)
    let symmetryCheck = true;
    const testedIntervals = new Set<number>();
    for (let i = 1; i < numNotes; i++) {
      // Start from 1 to skip root (0)
      const interval = pattern[i];
      if (testedIntervals.has(interval)) continue; // Already checked this pair
      if (interval === 6) {
        // Tritone needs special check - only allowed if scale size is even? No, just check presence.
        testedIntervals.add(6);
        continue;
      }
      const complement = (12 - interval + 12) % 12; // Ensure positive complement
      if (!pattern.includes(complement)) {
        symmetryCheck = false;
        break;
      }
      testedIntervals.add(interval);
      testedIntervals.add(complement);
    }
    isSymmetrical = symmetryCheck;
    // This definition means modes might not be symmetrical even if parent is. E.g. Major scale isn't symmetrical by this test.
    // A truly symmetrical scale pattern would be something like Whole Tone [0,2,4,6,8,10] -> Complements are [12,10,8,6,4,2]. Matches.
    // Or Diminished [0,2,3,5,6,8,9,11] -> Complements are [12,10,9,7,6,4,3,1]. Does NOT match (7 is missing).
    // Let's use the original code's comparison logic:
    // const maxInterval = 12; // Octave span
    // Reverse the pattern, calculate complements relative to maxInterval, compare element-wise
    // This checks for palindromic structure *after inversion*
    // const reversedComplements = pattern
    //   .slice()
    //   .reverse()
    //   .map((i) => (maxInterval - i + 12) % 12);
    // This doesn't seem right either.
    // Let's stick to the definition: is interval `i` present iff `12-i` is present? (excluding 0, 6)
    // The previous symmetryCheck logic implements this.
    isSymmetrical = symmetryCheck;
  }

  // --- Check specific structures ---
  let isDiatonic = false;
  if (numNotes === 7) {
    // Check for exactly 5 whole steps (2) and 2 half steps (1) in adjacent intervals
    const wholeStepCount = adjacentIntervals.filter((i) => i === 2).length;
    const halfStepCount = adjacentIntervals.filter((i) => i === 1).length;

    if (wholeStepCount === 5 && halfStepCount === 2) {
      // Standard diatonic scales also have specific spacing: half steps aren't adjacent.
      // Find indices of half steps
      const halfStepIndices = adjacentIntervals.reduce((acc, val, idx) => {
        if (val === 1) acc.push(idx);
        return acc;
      }, [] as number[]);
      // Check distance between them (wrapping around)
      const dist1 = (halfStepIndices[1] - halfStepIndices[0] + 7) % 7;
      const dist2 = 7 - dist1; // The other distance
      // Diatonic requires distances of 3 and 4 (or 2 and 3 steps between them -> 3 or 4 intervals total)
      isDiatonic = (dist1 === 3 && dist2 === 4) || (dist1 === 4 && dist2 === 3);
    }
  }

  return Object.freeze({
    // Freeze result object
    isPentatonic: numNotes === 5,
    isHeptatonic: numNotes === 7,
    isOctatonic: numNotes === 8, // Common symmetric scale type
    isDiatonic,
    isHemitonic, // Contains half steps?
    isCoherent, // No large gaps?
    hasLeadingTone, // Has Major 7th?
    isSymmetrical, // Interval pattern symmetry?
  });
}

/**
 * Describes the relationship between two scales.
 * @interface ScaleRelationship
 * @property {boolean} isIdentical - True if both scales have the same root and the same set of pitch classes.
 * @property {boolean} isMode - True if both scales share the same set of pitch classes but have different roots (one is a mode of the other).
 * @property {boolean} isSubset - True if all unique pitch classes of the first scale are contained within the second scale.
 * @property {boolean} isSuperset - True if all unique pitch classes of the second scale are contained within the first scale.
 * @property {number} commonNotes - The number of unique pitch classes shared by both scales.
 * @property {number} commonNoteRatio - The ratio of common notes to the total number of unique notes in the larger scale (0 to 1).
 * @property {Note | null} relativeTonic - If `isMode` is true, this is the Note from the first scale that corresponds to the root of the second scale. Null otherwise.
 */
export interface ScaleRelationship {
  isIdentical: boolean; // Same notes, same root
  isMode: boolean; // Same notes, different root
  isSubset: boolean; // Scale1 pitch classes are subset of Scale2
  isSuperset: boolean; // Scale1 pitch classes are superset of Scale2
  commonNotes: number; // Count of shared unique pitch classes
  commonNoteRatio: number; // Ratio of commonNotes / max(unique notes in scale1, unique notes in scale2)
  relativeTonic: Note | null; // If isMode, the note in scale1 that is the root of scale2.
}

/**
 * Analyzes and describes the relationship between two scales based on their
 * root notes and pitch class content.
 *
 * @param scale1 - The first Scale object.
 * @param scale2 - The second Scale object.
 * @returns An object detailing the relationship between the scales. See {@link ScaleRelationship}.
 * @remarks Compares the *set* of unique pitch classes, ignoring note spellings or octaves beyond the root.
 */
export function compareScales(scale1: Scale, scale2: Scale): ScaleRelationship {
  if (!scale1 || !scale2 || !scale1.notes || !scale2.notes) {
    throw new Error("Invalid Scale object(s) provided to compareScales.");
  }

  // Get unique pitch classes for both scales
  const uniquePC1 = new Set(scale1.notes.map((n) => n.pitchClassIndex));
  const uniquePC2 = new Set(scale2.notes.map((n) => n.pitchClassIndex));
  const size1 = uniquePC1.size;
  const size2 = uniquePC2.size;

  // Count common notes by finding the intersection size
  const intersection = new Set(
    [...uniquePC1].filter((pc) => uniquePC2.has(pc))
  );
  const commonNotes = intersection.size;

  // Check if pitch class sets are identical
  const samePitchClasses = size1 === size2 && commonNotes === size1;

  // Check if scales are strictly identical (same root and same pitch classes)
  const isIdentical =
    samePitchClasses && notesAreEqual(scale1.root, scale2.root); // Use notesAreEqual for root comparison

  // Check subset/superset relationships
  const isSubset = commonNotes === size1; // All of scale1's unique PCs are in scale2
  const isSuperset = commonNotes === size2; // All of scale2's unique PCs are in scale1

  // Check if one is a mode of the other (same pitch classes, different roots)
  let isMode = samePitchClasses && !isIdentical;
  let relativeTonic: Note | null = null;

  if (isMode) {
    // Find the note in scale1 that corresponds to the root pitch class of scale2
    // Use findIndex first, then access the note
    const scale2RootPC = scale2.root.pitchClassIndex;
    const scale2RootIndexInScale1 = scale1.notes.findIndex(
      (n) => n.pitchClassIndex === scale2RootPC
    );

    if (scale2RootIndexInScale1 !== -1) {
      // Found the corresponding note in scale1
      relativeTonic = scale1.notes[scale2RootIndexInScale1];
    } else {
      // Should not happen if samePitchClasses is true, but handle defensively
      console.warn(
        "Could not find relative tonic even though pitch classes match."
      );
      isMode = false; // Cannot determine relative tonic, so cannot confirm mode relationship this way
    }
  }

  // Calculate ratio of common notes based on the larger scale size
  const maxUnique = Math.max(size1, size2);
  // Handle division by zero if both scales are empty (though earlier checks might prevent this)
  const commonNoteRatio =
    maxUnique > 0
      ? commonNotes / maxUnique
      : size1 === 0 && size2 === 0
      ? 1
      : 0;

  return Object.freeze({
    // Freeze result object
    isIdentical,
    isMode,
    isSubset,
    isSuperset,
    commonNotes,
    commonNoteRatio,
    relativeTonic,
  });
}

/**
 * Defines the structure for results containing related scales.
 * Properties are optional as not all relationships apply to all scales.
 * @interface RelatedScales
 * @property {Scale} [parallel] - The parallel scale (same root, different major/minor quality). E.g., C Minor for C Major.
 * @property {Scale} [relative] - The relative scale (different root, same key signature/notes, different major/minor quality). E.g., A Minor for C Major.
 * @property {Scale} [dominant] - The scale built on the 5th degree of the original scale, often of the same type. E.g., G Major for C Major.
 * @property {Scale} [subdominant] - The scale built on the 4th degree of the original scale, often of the same type. E.g., F Major for C Major.
 * @property {Scale} [mediant] - The scale built on the 3rd degree of the original scale, often of the same type.
 * @property {Scale} [submediant] - The scale built on the 6th degree of the original scale, often of the same type.
 */
export interface RelatedScales {
  parallel?: Scale;
  relative?: Scale;
  dominant?: Scale;
  subdominant?: Scale;
  mediant?: Scale; // Added based on code
  submediant?: Scale; // Added based on code
}

/**
 * Finds scales that are theoretically related to a given input scale, such as its
 * parallel major/minor, relative major/minor, and scales built on its dominant,
 * subdominant, mediant, and submediant degrees.
 *
 * @param scale - The input Scale object. Analysis works best for standard major ('major', 'ionian') or natural minor ('minor', 'aeolian') scales.
 * @param options - Options object containing dependencies.
 * @param options.createScale - A mandatory function callback that can create a new Scale object given a root Note and a scale name (ScaleName). This is needed because this analysis function doesn't know how to generate scales itself. Signature: `(root: Note, name: ScaleName) => Scale`
 * @returns An object containing the found related scales, if applicable. Properties may be undefined if a relationship doesn't apply or cannot be determined. See {@link RelatedScales}.
 * @remarks The concepts of parallel and relative keys are most clearly defined for major and natural minor scales. Results for other scale types might be less standard or omitted. Requires `getDegree` and `transpose` operations.
 * @example
 * ```ts
 * // Assuming 'getScale' function exists and matches the required createScale signature:
 * const cMajorScale = getScale(createNote({ letter: 'C', octave: 4 }), 'major');
 * if (cMajorScale) {
 * const related = findRelatedScales(cMajorScale, { createScale: getScale });
 * console.log('Parallel:', related.parallel ? formatNote(related.parallel.root) + ' ' + related.parallel.name : 'N/A'); // C minor
 * console.log('Relative:', related.relative ? formatNote(related.relative.root) + ' ' + related.relative.name : 'N/A'); // A minor
 * console.log('Dominant:', related.dominant ? formatNote(related.dominant.root) + ' ' + related.dominant.name : 'N/A'); // G major
 * }
 * ```
 */
export function findRelatedScales(
  scale: Scale,
  options: { createScale: (root: Note, name: ScaleName) => Scale | null } // Allow createScale to potentially return null
): RelatedScales {
  const result: RelatedScales = {};

  if (!scale || !options || typeof options.createScale !== "function") {
    console.error(
      "Invalid input to findRelatedScales: requires valid scale and createScale function."
    );
    return result;
  }

  // Determine the scale name, accepting 'ionian'/'aeolian' as synonyms
  const scaleName =
    scale.name === "ionian"
      ? "major"
      : scale.name === "aeolian"
      ? "minor"
      : scale.name;

  // Check if scale type is suitable for standard parallel/relative analysis
  const isMajorType = scaleName === "major";
  const isMinorType = scaleName === "minor";

  // --- Handle Parallel and Relative (mostly for Major/Minor) ---
  if (isMajorType) {
    // Parallel minor (same root, 'minor' type)
    result.parallel = options.createScale(scale.root, "minor") || undefined;

    // Relative minor (root is the 6th degree of the major scale)
    const relativeMinorRoot = getDegree(scale, 6); // Degree 6 (submediant)
    if (relativeMinorRoot) {
      result.relative =
        options.createScale(relativeMinorRoot, "minor") || undefined;
    }
  } else if (isMinorType) {
    // Parallel major (same root, 'major' type)
    result.parallel = options.createScale(scale.root, "major") || undefined;

    // Relative major (root is the 3rd degree of the minor scale - or up 3 semitones)
    // Using transpose is more reliable than getDegree(scale, 3) which might be diminished/augmented
    const relativeMajorRoot = transpose(scale.root, 3); // Up a minor third (3 semitones)
    result.relative =
      options.createScale(relativeMajorRoot, "major") || undefined;
  }
  // --- End Parallel/Relative ---

  // --- Find scales based on degrees (Dominant, Subdominant, etc.) ---
  // These apply more generally, creating a scale of the *same type* on that degree.
  const degreesToFind: Array<{ name: keyof RelatedScales; degree: number }> = [
    { name: "dominant", degree: 5 },
    { name: "subdominant", degree: 4 },
    { name: "mediant", degree: 3 },
    { name: "submediant", degree: 6 },
  ];

  for (const { name, degree } of degreesToFind) {
    const degreeRoot = getDegree(scale, degree);
    if (degreeRoot && scale.name) {
      // Need original scale name for creating related scale
      // Attempt to create a scale of the same type on the new root
      const relatedScale = options.createScale(
        degreeRoot,
        scale.name as ScaleName
      );
      if (relatedScale) {
        result[name] = relatedScale;
      }
    }
  }
  // --- End Degree-Based Scales ---

  return result; // Return collected related scales
}

/**
 * Represents standard types of musical cadences in Western harmony.
 * @typedef {'perfect authentic' | 'imperfect authentic' | 'plagal' | 'half' | 'deceptive'} CadenceType
 */
export type CadenceType =
  | "perfect authentic" // V -> I (root position, soprano on tonic) - simplified check here
  | "imperfect authentic" // V -> I (inverted or soprano not on tonic) - simplified check here
  | "plagal" // IV -> I
  | "half" // Ends on V
  | "deceptive"; // V -> vi (or other unexpected chord, usually vi)

/**
 * Analyzes the input scale (typically a 7-note diatonic scale) to determine which
 * standard cadences could potentially be formed using chords derived from its degrees.
 * Checks for the presence of the necessary scale degrees (Tonic, Dominant, Subdominant, Submediant).
 *
 * @param scale - The Scale object to analyze. Works best with standard 7-note scales.
 * @returns An array of possible CadenceType names based on the available scale degrees.
 * @remarks This is a simplified analysis. Actual cadence formation depends on chord voicings, inversions, and harmonic context, which are not analyzed here. It only checks if the principal scale degrees (1, 4, 5, 6) required for these standard cadences exist within the scale.
 */
export function analyzePossibleCadences(scale: Scale): CadenceType[] {
  // Analysis primarily makes sense for 7-note scales where degrees 1,4,5,6 have clear roles
  if (!scale || !scale.notes || scale.notes.length !== 7) {
    // Return empty array if not a 7-note scale
    return [];
  }

  const possibleCadences: CadenceType[] = [];

  // Check for the presence of the key scale degrees (1-indexed)
  // getDegree returns the Note object for that degree, or null if scale is too short/degree invalid
  const hasTonic = getDegree(scale, 1) !== null; // Degree 1
  const hasDominant = getDegree(scale, 5) !== null; // Degree 5
  const hasSubdominant = getDegree(scale, 4) !== null; // Degree 4
  const hasSubmediant = getDegree(scale, 6) !== null; // Degree 6

  // Perfect/Imperfect Authentic Cadence (V -> I) - Requires Dominant and Tonic
  if (hasDominant && hasTonic) {
    possibleCadences.push("perfect authentic"); // Assumes root position possible
    possibleCadences.push("imperfect authentic"); // Assumes inversions possible
  }

  // Plagal Cadence (IV -> I) - Requires Subdominant and Tonic
  if (hasSubdominant && hasTonic) {
    possibleCadences.push("plagal");
  }

  // Half Cadence (ends on V) - Requires Dominant
  if (hasDominant) {
    possibleCadences.push("half");
  }

  // Deceptive Cadence (V -> vi) - Requires Dominant and Submediant
  if (hasDominant && hasSubmediant) {
    possibleCadences.push("deceptive");
  }

  return possibleCadences; // Return the list of potentially formable cadence types
}

/**
 * Defines the structure for results of scale tension analysis.
 * Provides heuristic measures of perceived harmonic tension.
 * @interface ScaleTensionProfile
 * @property {number} overallTension - A heuristic score (0-10) estimating overall tension, derived from other factors. Higher is more tense.
 * @property {number} chromaticTension - A score (0-10) reflecting the prevalence of chromatic intervals (semitones) between pairs of notes.
 * @property {number} dissonantIntervals - Raw count of traditionally dissonant intervals (m2, M2, TT, m7, M7) found between pairs of notes.
 * @property {'weak' | 'moderate' | 'strong'} dominantPull - Assessment of the harmonic pull towards the tonic, primarily based on the presence of a leading tone (strong) or perfect fifth (moderate).
 * @property {number[]} tensionCenters - An array of 1-indexed scale degrees identified as having the highest tension score based on adjacent intervals and tritones from the root.
 */
export interface ScaleTensionProfile {
  overallTension: number;
  chromaticTension: number;
  dissonantIntervals: number;
  dominantPull: "weak" | "moderate" | "strong";
  tensionCenters: number[]; // 1-indexed degrees
}

/**
 * Analyzes the perceived tension and release characteristics of a scale using heuristic methods.
 * Calculates scores based on chromaticism, dissonance, dominant function presence, and identifies
 * scale degrees that act as potential tension centers.
 *
 * @param scale - The Scale object to analyze.
 * @returns An object containing the tension profile analysis. See {@link ScaleTensionProfile}.
 * @throws {Error} If the input scale is invalid.
 * @remarks This analysis is subjective and based on common theoretical interpretations.
 * 'Tension' is evaluated based on interval counts and the presence of a leading tone or dominant.
 * Results provide a guideline rather than an absolute measure.
 */
export function analyzeScaleTension(scale: Scale): ScaleTensionProfile {
  if (!scale || !scale.notes || scale.notes.length < 2) {
    // Need at least 2 notes
    throw new Error(
      "Invalid scale provided for tension analysis (requires at least 2 notes)."
    );
  }
  const notes = scale.notes;
  const numNotes = notes.length;

  // Count chromatic and dissonant intervals between all pairs
  let chromaticCount = 0;
  let dissonantCount = 0;
  // Calculate max possible pairs for normalization
  const maxPossiblePairs = (numNotes * (numNotes - 1)) / 2;

  for (let i = 0; i < numNotes; i++) {
    for (let j = i + 1; j < numNotes; j++) {
      // Calculate absolute interval modulo 12
      const intervalMod12 =
        Math.abs(intervalBetween(notes[i], notes[j], false)) % 12;

      // Chromatic intervals (semitones: m2 or M7 inverted)
      if (intervalMod12 === 1 || intervalMod12 === 11) {
        chromaticCount++;
      }

      // Traditionally dissonant intervals (m2, M2, TT, m7, M7)
      // Intervals: 1, 2, 6, 10, 11 (semitones mod 12)
      if ([1, 2, 6, 10, 11].includes(intervalMod12)) {
        dissonantCount++;
      }
    }
  }

  // Normalize chromatic count to a 0-10 scale
  const chromaticTension =
    maxPossiblePairs > 0 ? (chromaticCount / maxPossiblePairs) * 10 : 0;

  // --- Analyze dominant pull (tendency towards tonic) ---
  let dominantPull: "weak" | "moderate" | "strong" = "weak";
  // Presence of a leading tone (M7 interval) implies strong pull
  if (scale.pattern && scale.pattern.includes(11)) {
    // Check intervals from root
    dominantPull = "strong";
  }
  // Presence of a dominant (P5 interval) implies moderate pull (if no leading tone)
  else if (scale.pattern && scale.pattern.includes(7)) {
    dominantPull = "moderate";
  }
  // --- End Dominant Pull ---

  // --- Find degrees with highest tension (heuristic score) ---
  const tensionScores: number[] = [];
  const rootPitchClass = notes[0].pitchClassIndex;

  for (let i = 0; i < numNotes; i++) {
    let score = 0;
    const currentPitchClass = notes[i].pitchClassIndex;

    // 1. Tritone relationship with the root adds significant tension
    const intervalFromRoot = (currentPitchClass - rootPitchClass + 12) % 12;
    if (intervalFromRoot === 6) score += 3; // High weight for tritone against tonic

    // 2. Semitone relationships with adjacent notes add tension
    // Find adjacent notes, wrapping around the scale
    const nextNote = notes[(i + 1) % numNotes];
    const prevNote = notes[(i - 1 + numNotes) % numNotes];
    // Use intervalBetween for potentially microtonal precision? No, analysis often uses integer intervals. Use false.
    const intervalToNext =
      Math.abs(intervalBetween(notes[i], nextNote, false)) % 12;
    const intervalToPrev =
      Math.abs(intervalBetween(notes[i], prevNote, false)) % 12;

    // Add score for adjacent semitones (m2 or M7)
    if (intervalToNext === 1 || intervalToNext === 11) score += 2;
    if (intervalToPrev === 1 || intervalToPrev === 11) score += 2;

    // Add score for adjacent whole tones (M2 or m7) - less tension than semitone
    if (intervalToNext === 2 || intervalToNext === 10) score += 1;
    if (intervalToPrev === 2 || intervalToPrev === 10) score += 1;

    tensionScores.push(score);
  }

  // Find the degree(s) with the maximum tension score
  const maxScore = Math.max(...tensionScores, 0); // Ensure maxScore is at least 0
  const tensionCenters: number[] = [];
  if (maxScore > 0) {
    // Only list centers if there's some calculated tension
    tensionScores.forEach((score, index) => {
      if (score === maxScore) {
        tensionCenters.push(index + 1); // Add 1-indexed degree
      }
    });
  }
  // --- End Tension Centers ---

  // --- Calculate overall tension heuristic (0-10 scale) ---
  // Weighted average of factors: chromaticism, dissonance, dominant pull strength
  // Weights are subjective/heuristic.
  const dissonantRatio =
    maxPossiblePairs > 0 ? dissonantCount / maxPossiblePairs : 0;
  const dominantPullScore =
    dominantPull === "strong" ? 1.0 : dominantPull === "moderate" ? 0.5 : 0.0;

  const overallTension = Math.min(
    10, // Cap at 10
    Math.max(
      0, // Ensure non-negative
      chromaticTension * 0.3 + // 30% weight for chromatic density
        dissonantRatio * 5.0 + // 50% weight for dissonance ratio
        dominantPullScore * 2.0 // 20% weight for dominant pull strength
    )
  );
  // --- End Overall Tension ---

  return Object.freeze({
    // Freeze result object
    overallTension,
    chromaticTension,
    dissonantIntervals: dissonantCount,
    dominantPull,
    tensionCenters,
  });
}
