/**
 * Functions for Roman numeral chord analysis
 */

import {
  Chord,
  ChordInversion,
  ChordOptions,
  ChordQuality,
  RomanAnalysis,
  RomanNumeral,
} from "./types";
import { Note, createNoteFromParts, notesAreEqual, transpose } from "../note";
import { ROMAN_NUMERALS, SCALE_DEGREES_TO_ROMAN } from "./constants";
import { Scale, getDegree, getScaleDegree } from "../scale";

import { createChord } from "./creation";

/**
 * Result of parsing a roman numeral string
 */
export interface ParsedRomanNumeral {
  numeral: RomanNumeral; // The roman numeral (I, ii, etc)
  degree: number; // The scale degree (1-7)
  quality: ChordQuality; // The chord quality
  isMajor: boolean; // Whether the chord is major or minor
  inversion: number; // Inversion from figured bass (0, 1, 2, 3)
  addedTones: number[]; // Any added tones (9, 11, 13, etc)
  alterations: string[]; // Any alterations (b5, #9, etc)
}

/**
 * Parse a roman numeral chord symbol (e.g., "V7", "ii°", "I6")
 */
export function parseRomanNumeral(symbol: string): ParsedRomanNumeral {
  // Extract the base roman numeral
  const numeralMatch = symbol.match(/^([IViv]+)/);
  if (!numeralMatch) {
    throw new Error(`Invalid roman numeral: ${symbol}`);
  }

  const numeralPart = numeralMatch[1];
  const isMajor = /^[IV]+$/.test(numeralPart); // Uppercase = major

  // Get the scale degree
  const degree = ROMAN_NUMERALS[numeralPart];
  if (!degree) {
    throw new Error(`Unknown roman numeral: ${numeralPart}`);
  }

  // Parse the quality and extension
  let quality: ChordQuality;
  let inversion = 0;
  const addedTones: number[] = [];
  const alterations: string[] = [];

  // Remove the roman numeral and parse the rest
  let remaining = symbol.substring(numeralPart.length);

  // Check for diminished and augmented symbols
  if (remaining.startsWith("°") || remaining.startsWith("o")) {
    quality = "diminished";
    remaining = remaining.substring(1);
  } else if (remaining.startsWith("+")) {
    quality = "augmented";
    remaining = remaining.substring(1);
  } else {
    // Default quality based on major/minor
    quality = isMajor ? "major" : "minor";
  }

  // Check for chord extensions
  if (remaining.includes("7")) {
    // Handle seventh chords
    if (quality === "major") {
      quality = isMajor ? "maj7" : "min7";
    } else if (quality === "diminished") {
      quality = "dim7";
    } else if (quality === "augmented") {
      quality = "aug7";
    }

    // Remove the 7
    remaining = remaining.replace("7", "");
  }

  // Check for inversions (figured bass)
  if (remaining.includes("6/4")) {
    inversion = 2; // Second inversion
    remaining = remaining.replace("6/4", "");
  } else if (remaining.includes("6")) {
    inversion = 1; // First inversion
    remaining = remaining.replace("6", "");
  } else if (remaining.includes("4/3") || remaining.includes("4/2")) {
    inversion = 3; // Third inversion (seventh chords only)
    remaining = remaining.replace(/4\/[23]/, "");
  }

  // Check for added tones and alterations
  const addedMatch = remaining.match(/add(\d+)/);
  if (addedMatch) {
    addedTones.push(parseInt(addedMatch[1], 10));
    remaining = remaining.replace(addedMatch[0], "");
  }

  const alterationMatch = remaining.match(/[b#](\d+)/g);
  if (alterationMatch) {
    alterations.push(...alterationMatch);
    // Don't need to remove these as we're done parsing
  }

  return {
    numeral: numeralPart as RomanNumeral,
    degree,
    quality,
    isMajor,
    inversion,
    addedTones,
    alterations,
  };
}

/**
 * Create a chord from a roman numeral in a given scale
 */
export function createChordFromRomanNumeral(
  romanInfo: ParsedRomanNumeral | string,
  scale: Scale,
  options: Partial<ChordOptions> = {}
): Chord {
  // Parse the roman numeral if a string is provided
  const parsedRoman =
    typeof romanInfo === "string" ? parseRomanNumeral(romanInfo) : romanInfo;

  // Get the root note for this scale degree
  const root = getDegree(scale, parsedRoman.degree);
  if (!root) {
    throw new Error(`Invalid scale degree: ${parsedRoman.degree}`);
  }

  // Create the chord with proper inversion type
  const chord = createChord(root, parsedRoman.quality, {
    ...options,
    inversion: parsedRoman.inversion as ChordInversion, // Fix: Cast to ChordInversion
  });

  return chord;
}

/**
 * Analyze a chord in a given scale context to determine its roman numeral function
 */
export function analyzeChordAsRomanNumeral(
  chord: Chord,
  scale: Scale
): RomanAnalysis | null {
  // Get the scale degree of the chord root
  const degree = getScaleDegree(scale, chord.root);

  if (degree === null) {
    // Root not in scale - try enharmonic spelling
    for (const note of scale.notes) {
      if (note.pitchClassIndex === chord.root.pitchClassIndex) {
        const enharmonicDegree = getScaleDegree(scale, note);
        if (enharmonicDegree !== null) {
          return analyzeChordWithDegree(chord, scale, enharmonicDegree);
        }
      }
    }

    return null;
  }

  return analyzeChordWithDegree(chord, scale, degree);
}

/**
 * Internal helper function for roman numeral analysis
 */
function analyzeChordWithDegree(
  chord: Chord,
  scale: Scale,
  degree: number
): RomanAnalysis {
  // Determine major/minor based on chord quality
  const isMajor =
    chord.quality.includes("major") ||
    chord.quality === "augmented" ||
    chord.quality === "7" ||
    chord.quality.includes("maj");

  // Get the roman numeral for this degree
  const numeral = SCALE_DEGREES_TO_ROMAN[degree][isMajor ? "true" : "false"];

  // Format the quality suffix
  let qualitySuffix = "";

  if (chord.quality === "diminished" || chord.quality.includes("dim")) {
    qualitySuffix = "°";
  } else if (chord.quality === "augmented") {
    qualitySuffix = "+";
  } else if (chord.quality.includes("7")) {
    qualitySuffix = "7";

    // Add distinction for non-dominant 7ths
    if (chord.quality === "maj7" && !isMajor) {
      qualitySuffix = "maj7";
    }
  }

  // Format inversion as figured bass
  let inversionStr = "";

  if (chord.inversion === 1) {
    inversionStr = "6";
  } else if (chord.inversion === 2) {
    inversionStr = "6/4";
  } else if (chord.inversion === 3) {
    inversionStr = "4/2";
  }

  // Combine all components
  const fullNumeral = numeral + qualitySuffix + inversionStr;

  return {
    numeral: fullNumeral,
    degree,
    isMajor,
    quality: qualitySuffix,
    inversion: inversionStr,
    scale,
  };
}

/**
 * Generate all diatonic chords in a scale with their roman numerals
 */
export function getAllDiatonicChords(
  scale: Scale,
  options: Partial<
    ChordOptions & {
      chordType?: "triad" | "seventh";
    }
  > = {}
): { chord: Chord; roman: RomanAnalysis }[] {
  const chordType = options.chordType || "triad";
  const results: { chord: Chord; roman: RomanAnalysis }[] = [];

  // Generate a chord for each scale degree
  for (let degree = 1; degree <= scale.notes.length; degree++) {
    try {
      // Get the chord for this scale degree
      const chord = createDiatonicChord(scale, degree, {
        ...options,
        chordType,
      }) as Chord;

      // Analyze as roman numeral
      const roman = analyzeChordAsRomanNumeral(chord, scale);

      if (roman) {
        results.push({ chord, roman });
      }
    } catch (error) {
      // Skip if we can't create this chord or analyze it
      continue;
    }
  }

  return results;
}

/**
 * Create a diatonic chord at a specific scale degree
 */
export function createDiatonicChord(
  scale: Scale,
  degree: number,
  options: Partial<
    ChordOptions & {
      chordType?: "triad" | "seventh";
    }
  > = {}
): Chord {
  const chordType = options.chordType || "triad";

  // Get the root note for this scale degree
  const root = getDegree(scale, degree);
  if (!root) {
    throw new Error(`Invalid scale degree: ${degree}`);
  }

  // Get scale notes to determine chord quality
  const scaleNotes = scale.notes;
  const notesInScale = scaleNotes.length;

  // 1-based indices of chord tones relative to the degree
  const third = (degree + 1) % notesInScale || notesInScale;
  const fifth = (degree + 3) % notesInScale || notesInScale;
  const seventh = (degree + 5) % notesInScale || notesInScale;

  // Get the chord tones
  const thirdNote = getDegree(scale, third);
  const fifthNote = getDegree(scale, fifth);
  const seventhNote =
    chordType === "seventh" ? getDegree(scale, seventh) : null;

  if (!thirdNote || !fifthNote) {
    throw new Error(
      `Could not determine chord quality for scale degree ${degree}`
    );
  }

  // Calculate intervals to determine chord quality
  const thirdInterval =
    (thirdNote.pitchClassIndex - root.pitchClassIndex + 12) % 12;
  const fifthInterval =
    (fifthNote.pitchClassIndex - root.pitchClassIndex + 12) % 12;

  // Determine triad quality
  let quality: ChordQuality;

  if (thirdInterval === 4 && fifthInterval === 7) {
    quality = "major";
  } else if (thirdInterval === 3 && fifthInterval === 7) {
    quality = "minor";
  } else if (thirdInterval === 3 && fifthInterval === 6) {
    quality = "diminished";
  } else if (thirdInterval === 4 && fifthInterval === 8) {
    quality = "augmented";
  } else {
    throw new Error(`Unusual chord quality at scale degree ${degree}`);
  }

  // If seventh chord, adjust quality
  if (chordType === "seventh" && seventhNote) {
    const seventhInterval =
      (seventhNote.pitchClassIndex - root.pitchClassIndex + 12) % 12;

    if (quality === "major" && seventhInterval === 11) {
      quality = "maj7";
    } else if (quality === "major" && seventhInterval === 10) {
      quality = "7"; // dominant 7th
    } else if (quality === "minor" && seventhInterval === 10) {
      quality = "min7";
    } else if (quality === "diminished" && seventhInterval === 9) {
      quality = "half-dim7";
    } else if (quality === "diminished" && seventhInterval === 8) {
      quality = "dim7";
    }
  }

  // Create the chord
  return createChord(root, quality, options);
}
