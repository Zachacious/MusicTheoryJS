/**
 * Functions for chord analysis
 */

import { CHORD_FORMULAS, SCALE_DEGREE_SEMITONES } from "./constants";
import { Chord, ChordFormula, ChordQuality } from "./types";
import { Note, intervalBetween, notesAreEqual } from "../note";
import { Scale, getScaleDegree } from "../scale";

import { identifyChord } from "./creation";

/**
 * Result of chord analysis
 */
export interface ChordAnalysisResult {
  /** The identified root */
  root: Note;
  /** The identified quality */
  quality: ChordQuality;
  /** Whether the chord fits a standard formula */
  isStandardChord: boolean;
  /** The bass note (lowest note) */
  bass: Note;
  /** The inversion */
  inversion: number;
  /** Chord tensions (9ths, 11ths, 13ths) */
  tensions: string[];
  /** Missing notes from the chord formula */
  missingNotes: string[];
  /** Extra notes not in the chord formula */
  extraNotes: string[];
}

/**
 * Analyze a chord's structure
 */
export function analyzeChord(notes: Note[]): ChordAnalysisResult | null {
  // Need at least 2 notes
  if (notes.length < 2) {
    return null;
  }

  // Identify the basic chord
  const identified = identifyChord(notes);
  if (!identified) {
    return null;
  }

  const { root, quality } = identified;

  // Get the chord formula
  const formula = CHORD_FORMULAS[quality];

  // Determine which notes are actually present
  const actualPitchClasses = notes.map((note) => note.pitchClassIndex);

  // Expected pitch classes from formula
  const expectedPitchClasses: number[] = [];
  const scaleDegrees = Object.keys(formula).map((d) => parseInt(d, 10));

  for (const [degreeStr, alteration] of Object.entries(formula)) {
    const degree = parseInt(degreeStr, 10);

    // Get the base semitones for this scale degree
    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) {
      continue;
    }

    // Apply alteration
    semitones += alteration;

    // Calculate the expected pitch class
    const expectedPC = (root.pitchClassIndex + semitones) % 12;
    expectedPitchClasses.push(expectedPC);
  }

  // Determine tensions (extensions beyond standard triad or 7th)
  const tensions: string[] = [];

  // Check for extended tensions
  const standardDegrees = quality.includes("7") ? [1, 3, 5, 7] : [1, 3, 5];

  for (const degree of scaleDegrees) {
    if (!standardDegrees.includes(degree)) {
      // This is an extension
      const alteration = formula[degree];
      const degreeName =
        alteration < 0
          ? `b${degree}`
          : alteration > 0
          ? `#${degree}`
          : `${degree}`;
      tensions.push(degreeName);
    }
  }

  // Find missing notes (in formula but not in actual notes)
  const missingNotes: string[] = [];

  for (let i = 0; i < expectedPitchClasses.length; i++) {
    const expectedPC = expectedPitchClasses[i];
    if (!actualPitchClasses.some((pc) => pc === expectedPC)) {
      const degree = scaleDegrees[i];
      const alteration = formula[degree];
      const degreeName =
        alteration < 0
          ? `b${degree}`
          : alteration > 0
          ? `#${degree}`
          : `${degree}`;
      missingNotes.push(degreeName);
    }
  }

  // Find extra notes (in actual notes but not in formula)
  const extraNotes: string[] = [];

  for (const actualPC of actualPitchClasses) {
    if (!expectedPitchClasses.includes(actualPC)) {
      // This is an extra note - try to identify it as a scale degree
      let bestDegree = "?";
      let smallestDiff = 12;

      for (const [degreeStr, semitones] of Object.entries(
        SCALE_DEGREE_SEMITONES
      )) {
        const degree = parseInt(degreeStr, 10);

        // Calculate the expected pitch class for this degree
        const degreePC = (root.pitchClassIndex + semitones) % 12;
        const diff = Math.min(
          (actualPC - degreePC + 12) % 12,
          (degreePC - actualPC + 12) % 12
        );

        if (diff < smallestDiff) {
          smallestDiff = diff;

          if (diff === 0) {
            bestDegree = `${degree}`;
          } else if (diff === 1) {
            bestDegree = degreePC < actualPC ? `#${degree}` : `b${degree}`;
          }
        }
      }

      extraNotes.push(bestDegree);
    }
  }

  // Sort the notes to find bass
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.octave !== b.octave) {
      return a.octave - b.octave;
    }
    return a.pitchClassIndex - b.pitchClassIndex;
  });

  const bass = sortedNotes[0];

  // Determine inversion
  let inversion = 0;
  if (!notesAreEqual(bass, root)) {
    // Find where the bass note is in the chord
    const bassPC = bass.pitchClassIndex;
    for (let i = 0; i < expectedPitchClasses.length; i++) {
      if (expectedPitchClasses[i] === bassPC) {
        inversion = i;
        break;
      }
    }
  }

  return {
    root,
    quality,
    isStandardChord: missingNotes.length === 0 && extraNotes.length === 0,
    bass,
    inversion,
    tensions,
    missingNotes,
    extraNotes,
  };
}

/**
 * Test if a chord fits within a scale
 */
export function chordFitsScale(
  chord: Chord,
  scale: Scale
): {
  fits: boolean;
  chordDegree: number | null;
  nonScaleNotes: Note[];
} {
  // Check if the root is in the scale
  const rootDegree = getScaleDegree(scale, chord.root);

  // Check each note in the chord
  const nonScaleNotes: Note[] = [];

  for (const note of chord.notes) {
    // If the note isn't in the scale, add it to nonScaleNotes
    if (
      !scale.notes.some(
        (scaleNote) => scaleNote.pitchClassIndex === note.pitchClassIndex
      )
    ) {
      nonScaleNotes.push(note);
    }
  }

  return {
    fits: nonScaleNotes.length === 0,
    chordDegree: rootDegree,
    nonScaleNotes,
  };
}

/**
 * Find common tones between two chords
 */
export function findCommonTones(
  chord1: Chord,
  chord2: Chord
): {
  commonNotes: Note[];
  commonCount: number;
  voiceLeadingDistance: number;
} {
  const pc1 = chord1.notes.map((note) => note.pitchClassIndex);
  const pc2 = chord2.notes.map((note) => note.pitchClassIndex);

  // Find common pitch classes
  const commonPC = pc1.filter((pc) => pc2.includes(pc));

  // Find actual common notes
  const commonNotes: Note[] = [];

  for (const pc of commonPC) {
    // Find the first note with this pitch class in each chord
    const note1 = chord1.notes.find((n) => n.pitchClassIndex === pc);
    const note2 = chord2.notes.find((n) => n.pitchClassIndex === pc);

    if (note1) {
      commonNotes.push(note1);
    }
  }

  // Calculate voice leading distance
  // (The sum of semitone movements needed to move from chord1 to chord2)
  let totalDistance = 0;

  // For each note in chord1, find the closest note in chord2
  for (const note1 of chord1.notes) {
    let minDistance = Infinity;

    for (const note2 of chord2.notes) {
      const distance = Math.abs(intervalBetween(note1, note2));
      minDistance = Math.min(minDistance, distance);
    }

    // Add this voice's movement to the total
    if (minDistance !== Infinity) {
      totalDistance += minDistance;
    }
  }

  return {
    commonNotes,
    commonCount: commonPC.length,
    voiceLeadingDistance: totalDistance,
  };
}

/**
 * Analyze a chord's harmonic function
 */
export function analyzeChordFunction(
  chord: Chord,
  scale: Scale
): {
  function: "tonic" | "predominant" | "dominant" | "other";
  scaleDegree: number | null;
  tension: "stable" | "mild" | "strong";
} {
  // Check if the chord fits in the scale
  const { chordDegree, fits } = chordFitsScale(chord, scale);

  if (!chordDegree) {
    return { function: "other", scaleDegree: null, tension: "strong" };
  }

  // Determine harmonic function based on scale degree
  let harmonicFunction: "tonic" | "predominant" | "dominant" | "other";

  switch (chordDegree) {
    case 1:
    case 3:
    case 6:
      harmonicFunction = "tonic";
      break;

    case 2:
    case 4:
      harmonicFunction = "predominant";
      break;

    case 5:
    case 7:
      harmonicFunction = "dominant";
      break;

    default:
      harmonicFunction = "other";
  }

  // Determine tension level
  let tension: "stable" | "mild" | "strong";

  if (chord.quality === "major" || chord.quality === "minor") {
    tension = "stable";
  } else if (
    chord.quality.includes("dim") ||
    chord.quality.includes("aug") ||
    chord.quality.includes("7")
  ) {
    tension = "strong";
  } else {
    tension = "mild";
  }

  // Adjust for non-scale tones
  if (!fits) {
    // Increase tension for non-diatonic chords
    tension = "strong";
  }

  return {
    function: harmonicFunction,
    scaleDegree: chordDegree,
    tension,
  };
}

/**
 * Analyze how well two chords connect to each other
 */
export function analyzeChordConnection(
  chord1: Chord,
  chord2: Chord
): {
  smoothness: "very smooth" | "smooth" | "moderate" | "abrupt";
  commonTones: number;
  voiceLeadingQuality: "excellent" | "good" | "fair" | "poor";
  parallelFifths: boolean;
  directFifths: boolean;
} {
  // Find common tones
  const { commonCount, voiceLeadingDistance } = findCommonTones(chord1, chord2);

  // Determine smoothness based on voice leading distance
  let smoothness: "very smooth" | "smooth" | "moderate" | "abrupt";

  if (voiceLeadingDistance <= 2) {
    smoothness = "very smooth";
  } else if (voiceLeadingDistance <= 5) {
    smoothness = "smooth";
  } else if (voiceLeadingDistance <= 10) {
    smoothness = "moderate";
  } else {
    smoothness = "abrupt";
  }

  // Check for parallel fifths
  let parallelFifths = false;

  // Check each pair of notes in chord1 for perfect fifths
  for (let i = 0; i < chord1.notes.length; i++) {
    for (let j = i + 1; j < chord1.notes.length; j++) {
      const interval1 =
        Math.abs(intervalBetween(chord1.notes[i], chord1.notes[j])) % 12;

      // If this is a perfect fifth (7 semitones)
      if (interval1 === 7) {
        // Check if the same two notes form a perfect fifth in chord2
        const note1PC = chord1.notes[i].pitchClassIndex;
        const note2PC = chord1.notes[j].pitchClassIndex;

        // Find corresponding notes in chord2 (if any)
        const correspondingNote1 = chord2.notes.find(
          (n) => n.pitchClassIndex === note1PC
        );
        const correspondingNote2 = chord2.notes.find(
          (n) => n.pitchClassIndex === note2PC
        );

        if (correspondingNote1 && correspondingNote2) {
          const interval2 =
            Math.abs(intervalBetween(correspondingNote1, correspondingNote2)) %
            12;
          if (interval2 === 7) {
            parallelFifths = true;
            break;
          }
        }
      }
    }
    if (parallelFifths) break;
  }

  // Check for direct fifths (outside voices moving in the same direction to a fifth)
  let directFifths = false;

  if (chord1.notes.length > 0 && chord2.notes.length > 0) {
    // Get outer voices
    const soprano1 = chord1.notes[chord1.notes.length - 1];
    const bass1 = chord1.notes[0];
    const soprano2 = chord2.notes[chord2.notes.length - 1];
    const bass2 = chord2.notes[0];

    // Check if they move in the same direction
    // Fix: Define explicit numeric types instead of letting TypeScript infer too strictly
    const sopranoMove = intervalBetween(soprano1, soprano2);
    const bassMove = intervalBetween(bass1, bass2);

    // Define directions as numbers that could be -1, 0, or 1
    const sopranoDirection = sopranoMove > 0 ? 1 : sopranoMove < 0 ? -1 : 0;
    const bassDirection = bassMove > 0 ? 1 : bassMove < 0 ? -1 : 0;

    // Now both directions are explicitly typed as numbers that could be 0
    if (
      sopranoDirection !== 0 &&
      bassDirection !== 0 &&
      sopranoDirection === bassDirection
    ) {
      // Check if they form a perfect fifth in the second chord
      const interval = Math.abs(intervalBetween(soprano2, bass2)) % 12;
      if (interval === 7) {
        directFifths = true;
      }
    }
  }

  // Evaluate voice leading quality
  let voiceLeadingQuality: "excellent" | "good" | "fair" | "poor";

  if (parallelFifths || directFifths) {
    voiceLeadingQuality = "poor";
  } else if (commonCount >= 2 && voiceLeadingDistance <= 4) {
    voiceLeadingQuality = "excellent";
  } else if (commonCount >= 1 && voiceLeadingDistance <= 7) {
    voiceLeadingQuality = "good";
  } else if (voiceLeadingDistance <= 12) {
    voiceLeadingQuality = "fair";
  } else {
    voiceLeadingQuality = "poor";
  }

  return {
    smoothness,
    commonTones: commonCount,
    voiceLeadingQuality,
    parallelFifths,
    directFifths,
  };
}
