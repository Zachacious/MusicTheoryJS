/**
 * Advanced music theory analysis functions for scales
 */

import { Note, intervalBetween, notesAreEqual, transpose } from "../note";
import { Scale, ScaleName } from "./types";
import { getDegree, getScaleDegree, isNoteInScale } from "./operations";

import { SCALE_PATTERNS } from "./constants";
import { detectScales } from "./detection";

/**
 * Scale tone characteristics/functions
 */
export type ScaleFunctionRole =
  | "tonic"
  | "supertonic"
  | "mediant"
  | "subdominant"
  | "dominant"
  | "submediant"
  | "leadingTone"
  | "subtonic";

/**
 * Map scale degrees to their functional roles in music theory
 */
export function getScaleFunction(
  scale: Scale,
  degree: number
): ScaleFunctionRole | null {
  // Only works for 7-note scales
  if (scale.notes.length !== 7) {
    return null;
  }

  // Map degrees to functions based on standard music theory terminology
  const functionMap: Record<number, ScaleFunctionRole> = {
    1: "tonic",
    2: "supertonic",
    3: "mediant",
    4: "subdominant",
    5: "dominant",
    6: "submediant",
    7: scale.pattern.includes(11) ? "leadingTone" : "subtonic", // Check if it's a half-step below tonic
  };

  return functionMap[degree] || null;
}

/**
 * Analyze the characteristic intervals of a scale
 */
export interface ScaleIntervalAnalysis {
  perfectFifths: number; // Count of perfect fifth relationships
  tritones: number; // Count of tritone intervals
  chromaticIntervals: number; // Count of half-step intervals
  largeLeaps: number; // Count of intervals larger than a perfect fifth
  symmetry: "none" | "partial" | "full"; // Symmetry assessment
  maxGap: number; // Largest gap between adjacent notes in semitones
  avgStep: number; // Average step size in semitones
}

/**
 * Analyze the interval content of a scale
 */
export function analyzeScaleIntervals(scale: Scale): ScaleIntervalAnalysis {
  const notes = scale.notes;
  let perfectFifths = 0;
  let tritones = 0;
  let chromaticIntervals = 0;
  let largeLeaps = 0;

  // Check intervals between all pairs of notes
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const interval = Math.abs(intervalBetween(notes[i], notes[j]));

      // Count interval types
      if (interval === 1) chromaticIntervals++;
      if (interval === 6) tritones++;
      if (interval === 7) perfectFifths++;
      if (interval > 7 && interval < 12) largeLeaps++;
    }
  }

  // Calculate adjacent intervals
  const adjacentIntervals: number[] = [];
  for (let i = 0; i < notes.length - 1; i++) {
    const interval = Math.abs(intervalBetween(notes[i], notes[i + 1]));
    adjacentIntervals.push(interval);
  }

  // Add interval from last to first note if we have a complete octave
  if (
    notes.length > 1 &&
    notes[notes.length - 1].pitchClassIndex !== notes[0].pitchClassIndex
  ) {
    const lastToFirstInterval = Math.abs(
      intervalBetween(notes[notes.length - 1], transpose(notes[0], 12))
    );
    adjacentIntervals.push(lastToFirstInterval);
  }

  // Find max gap and calculate avg step
  const maxGap = Math.max(...adjacentIntervals);
  const avgStep =
    adjacentIntervals.reduce((sum, val) => sum + val, 0) /
    adjacentIntervals.length;

  // Check for symmetry in the pattern
  let symmetry: "none" | "partial" | "full" = "none";

  // Perfect symmetry would mean the pattern reads the same forward and backward
  const pattern = scale.pattern;
  const maxInterval = pattern[pattern.length - 1];
  const reversed = [...pattern].reverse().map((i) => maxInterval - i);

  if (pattern.join(",") === reversed.join(",")) {
    symmetry = "full";
  } else {
    // Check for partial symmetry (some portion is symmetrical)
    let symmetricalPairs = 0;
    const midpoint = maxInterval / 2;

    for (const interval of pattern) {
      if (pattern.includes(maxInterval - interval) && interval !== midpoint) {
        symmetricalPairs++;
      }
    }

    if (symmetricalPairs >= pattern.length / 2) {
      symmetry = "partial";
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
 * Scale brightness/darkness assessment
 */
export type ScaleBrightness =
  | "very bright" // Many raised notes (e.g., Lydian)
  | "bright" // Some raised notes (e.g., Major)
  | "neutral" // Balanced (e.g., Dorian)
  | "dark" // Some lowered notes (e.g., Minor)
  | "very dark"; // Many lowered notes (e.g., Locrian)

/**
 * Analyze the brightness/darkness characteristic of a scale
 */
export function analyzeScaleBrightness(scale: Scale): ScaleBrightness {
  // Compare to major scale as reference
  const majorPattern = SCALE_PATTERNS.major;

  // Count raised and lowered notes compared to major
  let raisedNotes = 0;
  let loweredNotes = 0;

  // Get the pitch classes
  const pitchClasses = scale.notes.map((n) => n.pitchClassIndex);

  // First, normalize patterns to the same root for comparison
  const normalizedMajor = majorPattern.map(
    (interval) => (interval + scale.root.pitchClassIndex) % 12
  );

  // Count raised/lowered notes
  for (const pitch of pitchClasses) {
    // If it's in the major scale, skip
    if (normalizedMajor.includes(pitch)) continue;

    // Check if it's a raised or lowered version of a major scale note
    const isRaised = normalizedMajor.some(
      (majorPitch) => (pitch - 1 + 12) % 12 === majorPitch
    );

    const isLowered = normalizedMajor.some(
      (majorPitch) => (pitch + 1) % 12 === majorPitch
    );

    if (isRaised) raisedNotes++;
    if (isLowered) loweredNotes++;
  }

  // Calculate brightness score
  const brightnessScore = raisedNotes - loweredNotes;

  // Map score to brightness assessment
  if (brightnessScore >= 2) return "very bright";
  if (brightnessScore === 1) return "bright";
  if (brightnessScore === 0) return "neutral";
  if (brightnessScore === -1) return "dark";
  return "very dark";
}

/**
 * Characteristics of a scale's structure
 */
export interface ScaleStructureAnalysis {
  isPentatonic: boolean; // 5 notes per octave
  isHeptatonic: boolean; // 7 notes per octave
  isOctatonic: boolean; // 8 notes per octave
  isDiatonic: boolean; // Pattern of whole and half steps
  isHemitonic: boolean; // Contains semitones
  isCoherent: boolean; // No gaps larger than major 3rd
  hasLeadingTone: boolean; // Contains note a half-step below tonic
  isSymmetrical: boolean; // Symmetrical interval pattern
}

/**
 * Analyze structural properties of a scale
 */
export function analyzeScaleStructure(scale: Scale): ScaleStructureAnalysis {
  const notes = scale.notes;
  const pattern = scale.pattern;

  // Calculate adjacent intervals for diatonic check
  const intervals: number[] = [];
  for (let i = 0; i < pattern.length - 1; i++) {
    intervals.push(pattern[i + 1] - pattern[i]);
  }

  // Add interval from last note to octave for complete pattern
  if (pattern.length > 0 && pattern[pattern.length - 1] < 12) {
    intervals.push(12 - pattern[pattern.length - 1]);
  }

  // Check if diatonic (contains only whole and half steps in a specific pattern)
  let isDiatonic = intervals.every((i) => i === 1 || i === 2);
  if (isDiatonic) {
    // A diatonic scale has a specific pattern of whole and half steps
    // It should contain exactly 2 half steps, with specific spacing
    const halfStepCount = intervals.filter((i) => i === 1).length;
    isDiatonic = halfStepCount === 2;

    // Additionally, the half steps should be separated by either 2 or 3 whole steps
    if (isDiatonic && intervals.includes(1)) {
      const firstHalfStepIndex = intervals.indexOf(1);
      const secondHalfStepIndex = intervals.indexOf(1, firstHalfStepIndex + 1);

      if (secondHalfStepIndex !== -1) {
        const distance =
          (secondHalfStepIndex - firstHalfStepIndex + intervals.length) %
          intervals.length;
        isDiatonic = distance === 3 || distance === 4;
      }
    }
  }

  // Check if the scale has a leading tone (half step below tonic)
  const hasLeadingTone =
    pattern.includes(11) ||
    (notes.length > 1 &&
      (notes[notes.length - 1].pitchClassIndex + 1) % 12 ===
        notes[0].pitchClassIndex);

  // Check for symmetry
  const maxInterval = pattern.length > 0 ? pattern[pattern.length - 1] : 0;
  const reversed = [...pattern].reverse().map((i) => maxInterval - i);
  const isSymmetrical = pattern.join(",") === reversed.join(",");

  // Check for gaps larger than a major 3rd (4 semitones)
  const isCoherent = intervals.every((interval) => interval <= 4);

  return {
    isPentatonic: notes.length === 5,
    isHeptatonic: notes.length === 7,
    isOctatonic: notes.length === 8,
    isDiatonic,
    isHemitonic: intervals.includes(1), // Has at least one semitone
    isCoherent,
    hasLeadingTone,
    isSymmetrical,
  };
}

/**
 * Compare a scale to another scale and determine relationship
 */
export interface ScaleRelationship {
  isIdentical: boolean; // Same notes, same root
  isMode: boolean; // Scale is a mode of the other
  isSubset: boolean; // Scale is contained within the other
  isSuperset: boolean; // Scale contains the other
  commonNotes: number; // Count of shared notes
  commonNoteRatio: number; // Ratio of shared notes (0-1)
  relativeTonic: Note | null; // Relative tonic if applicable
}

/**
 * Analyze the relationship between two scales
 */
export function compareScales(scale1: Scale, scale2: Scale): ScaleRelationship {
  // Get pitch classes for both scales
  const pitchClasses1 = scale1.notes.map((n) => n.pitchClassIndex);
  const pitchClasses2 = scale2.notes.map((n) => n.pitchClassIndex);

  // Remove duplicates
  const uniquePC1 = [...new Set(pitchClasses1)];
  const uniquePC2 = [...new Set(pitchClasses2)];

  // Count common notes
  const commonPCs = uniquePC1.filter((pc) => uniquePC2.includes(pc));
  const commonNotes = commonPCs.length;

  // Check if scales are identical
  const isIdentical =
    uniquePC1.length === uniquePC2.length &&
    uniquePC1.every((pc) => uniquePC2.includes(pc)) &&
    scale1.root.pitchClassIndex === scale2.root.pitchClassIndex;

  // Check subset/superset relationships
  const isSubset = uniquePC1.every((pc) => uniquePC2.includes(pc));
  const isSuperset = uniquePC2.every((pc) => uniquePC1.includes(pc));

  // Check if one is a mode of the other
  let isMode = false;
  let relativeTonic: Note | null = null;

  if (
    uniquePC1.length === uniquePC2.length &&
    uniquePC1.every((pc) => uniquePC2.includes(pc)) &&
    !isIdentical
  ) {
    isMode = true;

    // Find the relative tonic (the root of scale2 in terms of scale1)
    const scale2RootPC = scale2.root.pitchClassIndex;
    const scale2RootIndex = scale1.notes.findIndex(
      (n) => n.pitchClassIndex === scale2RootPC
    );

    if (scale2RootIndex !== -1) {
      relativeTonic = scale1.notes[scale2RootIndex];
    }
  }

  // Calculate ratio of common notes
  const maxUnique = Math.max(uniquePC1.length, uniquePC2.length);
  const commonNoteRatio = maxUnique > 0 ? commonNotes / maxUnique : 0;

  return {
    isIdentical,
    isMode,
    isSubset,
    isSuperset,
    commonNotes,
    commonNoteRatio,
    relativeTonic,
  };
}

/**
 * Find parallel and relative scales
 */
export interface RelatedScales {
  parallel?: Scale; // Same root, different mode (e.g., C Major → C Minor)
  relative?: Scale; // Different root, same mode (e.g., C Major → A Minor)
  dominant?: Scale; // Scale built on the 5th degree
  subdominant?: Scale; // Scale built on the 4th degree
  mediant?: Scale; // Scale built on the 3rd degree
  submediant?: Scale; // Scale built on the 6th degree
}

/**
 * Find scales that are theoretically related to the given scale
 */
export function findRelatedScales(
  scale: Scale,
  options: { createScale: (root: Note, name: ScaleName) => Scale }
): RelatedScales {
  const result: RelatedScales = {};

  // Only works well with major/minor scales
  if (
    scale.name !== "major" &&
    scale.name !== "minor" &&
    scale.name !== "ionian" &&
    scale.name !== "aeolian"
  ) {
    return result;
  }

  // Handle parallel major/minor
  if (scale.name === "major" || scale.name === "ionian") {
    // Parallel minor
    result.parallel = options.createScale(scale.root, "minor");

    // Relative minor (6th degree)
    const relativeDegree = 6;
    const relativeRoot = getDegree(scale, relativeDegree);
    if (relativeRoot) {
      result.relative = options.createScale(relativeRoot, "minor");
    }
  } else if (scale.name === "minor" || scale.name === "aeolian") {
    // Parallel major
    result.parallel = options.createScale(scale.root, "major");

    // Relative major (3rd degree up)
    const relativeRoot = transpose(scale.root, 3);
    result.relative = options.createScale(relativeRoot, "major");
  }

  // Find dominant, subdominant, mediant and submediant for any scale
  const dominantDegree = 5;
  const dominantRoot = getDegree(scale, dominantDegree);
  if (dominantRoot) {
    result.dominant = options.createScale(
      dominantRoot,
      scale.name as ScaleName
    );
  }

  const subdominantDegree = 4;
  const subdominantRoot = getDegree(scale, subdominantDegree);
  if (subdominantRoot) {
    result.subdominant = options.createScale(
      subdominantRoot,
      scale.name as ScaleName
    );
  }

  const mediantDegree = 3;
  const mediantRoot = getDegree(scale, mediantDegree);
  if (mediantRoot) {
    result.mediant = options.createScale(mediantRoot, scale.name as ScaleName);
  }

  const submediantDegree = 6;
  const submediantRoot = getDegree(scale, submediantDegree);
  if (submediantRoot) {
    result.submediant = options.createScale(
      submediantRoot,
      scale.name as ScaleName
    );
  }

  return result;
}

/**
 * Types of cadences that can be formed in a scale
 */
export type CadenceType =
  | "perfect authentic" // V → I
  | "imperfect authentic" // V → I with inversions
  | "plagal" // IV → I
  | "half" // X → V
  | "deceptive"; // V → vi

/**
 * Analyze possible cadences in a scale
 */
export function analyzePossibleCadences(scale: Scale): CadenceType[] {
  // Only works with 7-note scales
  if (scale.notes.length !== 7) {
    return [];
  }

  const possibleCadences: CadenceType[] = [];

  // Check for necessary scale degrees to form cadences
  const hasTonic = getDegree(scale, 1) !== undefined;
  const hasDominant = getDegree(scale, 5) !== undefined;
  const hasSubdominant = getDegree(scale, 4) !== undefined;
  const hasSubmediant = getDegree(scale, 6) !== undefined;

  // Perfect authentic cadence requires a dominant (V) and tonic (I)
  if (hasDominant && hasTonic) {
    possibleCadences.push("perfect authentic");
    possibleCadences.push("imperfect authentic"); // Always possible if PAC is
  }

  // Plagal cadence requires subdominant (IV) and tonic (I)
  if (hasSubdominant && hasTonic) {
    possibleCadences.push("plagal");
  }

  // Half cadence ends on dominant (V)
  if (hasDominant) {
    possibleCadences.push("half");
  }

  // Deceptive cadence moves from dominant (V) to submediant (vi)
  if (hasDominant && hasSubmediant) {
    possibleCadences.push("deceptive");
  }

  return possibleCadences;
}

/**
 * Tension profile of a scale
 */
export interface ScaleTensionProfile {
  overallTension: number; // 0-10 scale of overall harmonic tension
  chromaticTension: number; // Tension from chromatic notes
  dissonantIntervals: number; // Count of dissonant intervals (2nds, 7ths)
  dominantPull: "weak" | "moderate" | "strong"; // Pull towards the tonic
  tensionCenters: number[]; // Scale degrees with highest tension
}

/**
 * Analyze the tension and release characteristics of a scale
 */
export function analyzeScaleTension(scale: Scale): ScaleTensionProfile {
  const notes = scale.notes;

  // Count chromatic and dissonant intervals
  let chromaticCount = 0;
  let dissonantCount = 0;

  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const interval = Math.abs(intervalBetween(notes[i], notes[j])) % 12;

      // Chromatic intervals (half steps)
      if (interval === 1 || interval === 11) {
        chromaticCount++;
      }

      // Dissonant intervals (2nds, 7ths, tritone)
      if (
        interval === 1 ||
        interval === 2 ||
        interval === 6 ||
        interval === 10 ||
        interval === 11
      ) {
        dissonantCount++;
      }
    }
  }

  // Normalize counts by the maximum possible for the scale size
  const maxPossiblePairs = (notes.length * (notes.length - 1)) / 2;
  const chromaticTension =
    maxPossiblePairs > 0 ? (chromaticCount / maxPossiblePairs) * 10 : 0;

  // Analyze dominant pull (V → I relationship)
  let dominantPull: "weak" | "moderate" | "strong" = "weak";

  // Check for leading tone (major 7th)
  if (scale.pattern.includes(11)) {
    dominantPull = "strong";
  }
  // Check for dominant (5th)
  else if (scale.pattern.includes(7)) {
    dominantPull = "moderate";
  }

  // Find degrees with highest tension
  const tensionScores: number[] = [];
  for (let i = 0; i < notes.length; i++) {
    let score = 0;

    // Tritone from root adds tension
    const fromRoot =
      (notes[i].pitchClassIndex - notes[0].pitchClassIndex + 12) % 12;
    if (fromRoot === 6) score += 3;

    // Semitone relationship adds tension
    const nextIndex = (i + 1) % notes.length;
    const prevIndex = (i - 1 + notes.length) % notes.length;

    const toNext = Math.abs(intervalBetween(notes[i], notes[nextIndex])) % 12;
    const toPrev = Math.abs(intervalBetween(notes[i], notes[prevIndex])) % 12;

    if (toNext === 1 || toNext === 11) score += 2;
    if (toPrev === 1 || toPrev === 11) score += 2;

    tensionScores.push(score);
  }

  // Find degrees with maximum tension
  const maxScore = Math.max(...tensionScores, 0);
  const tensionCenters = tensionScores
    .map((score, index) => (score === maxScore ? index + 1 : -1))
    .filter((degree) => degree !== -1);

  // Calculate overall tension (0-10 scale)
  const overallTension = Math.min(
    10,
    chromaticTension * 0.4 + // 40% weight to chromatic tension
      (dissonantCount / maxPossiblePairs) * 5 + // 50% weight to dissonant intervals
      (dominantPull === "strong" ? 1 : dominantPull === "moderate" ? 0.5 : 0) // 10% weight to dominant pull
  );

  return {
    overallTension,
    chromaticTension,
    dissonantIntervals: dissonantCount,
    dominantPull,
    tensionCenters,
  };
}
