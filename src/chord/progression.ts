/**
 * Functions for chord progressions
 */

import {
  CHORD_FORMULAS,
  COMMON_PROGRESSIONS,
  ROMAN_NUMERALS,
} from "./constants";
import { Chord, ChordOptions, ChordProgression, ChordQuality } from "./types";
import { Note, createNoteFromParts } from "../note";
import { Scale, createScale, getDegree, getScaleDegree } from "../scale";
import { createChord, createChordFromSymbol } from "./creation";
import { createChordFromRomanNumeral, parseRomanNumeral } from "./roman";

import { analyzeChordConnection } from "./analysis";

/**
 * Create a chord progression from an array of chord symbols
 */
export function createProgression(
  chordSymbols: string[],
  options: Partial<ChordOptions> = {}
): ChordProgression {
  return chordSymbols.map((symbol) => createChordFromSymbol(symbol, options));
}

/**
 * Create a chord progression from a named common progression
 * in a given key
 */
export function createCommonProgression(
  progressionName: string,
  key: Note | string,
  options: Partial<
    ChordOptions & {
      scaleType?: "major" | "minor";
      romanNumerals?: boolean;
    }
  > = {}
): ChordProgression {
  // Get the progression pattern
  const progressionPattern = COMMON_PROGRESSIONS[progressionName];
  if (!progressionPattern) {
    throw new Error(`Unknown progression: ${progressionName}`);
  }

  // Create a scale for the key
  const scaleType = options.scaleType || "major";

  // If key is a string, parse it
  const keyNote =
    typeof key === "string"
      ? createNoteFromParts({
          letter: key.charAt(0).toUpperCase() as any,
          accidental: key.substring(1) as any,
          octave: 4,
        })
      : key;

  // Create the scale
  const scale = createScale(keyNote, scaleType);

  // Create the progression
  return createProgressionFromRomanNumerals(progressionPattern, scale, options);
}

/**
 * Create a chord progression from roman numerals in a given scale
 */
export function createProgressionFromRomanNumerals(
  romanNumerals: string[],
  scale: Scale,
  options: Partial<ChordOptions & { romanNumerals?: boolean }> = {}
): ChordProgression {
  const chords: ChordProgression = [];

  for (const numeral of romanNumerals) {
    // Parse the roman numeral
    const chordInfo = parseRomanNumeral(numeral);

    // Create the chord
    const chord = createChordFromRomanNumeral(chordInfo, scale, options);

    // Either add the chord or the roman numeral
    if (options.romanNumerals) {
      chords.push(numeral);
    } else {
      chords.push(chord);
    }
  }

  return chords;
}

/**
 * Generate a diatonic chord progression for a given scale
 */
export function createDiatonicProgression(
  scale: Scale,
  pattern: number[], // Scale degrees (1-based)
  options: Partial<
    ChordOptions & {
      chordType?: "triad" | "seventh";
      romanNumerals?: boolean;
    }
  > = {}
): ChordProgression {
  // Default to triads
  const chordType = options.chordType || "triad";

  const chords: ChordProgression = [];

  for (const degree of pattern) {
    // Get the root note for this scale degree
    const root = getDegree(scale, degree);
    if (!root) {
      throw new Error(`Invalid scale degree: ${degree}`);
    }

    // Determine chord quality based on scale degree
    let quality: ChordQuality;

    // Get scale notes to determine chord quality
    const scaleNotes = scale.notes;
    const notesInScale = scaleNotes.length;

    // 1-based indices of chord tones relative to the degree
    const third = ((degree + 1) % notesInScale) + 1;
    const fifth = ((degree + 3) % notesInScale) + 1;
    const seventh = ((degree + 5) % notesInScale) + 1;

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
      } else {
        // Fall back to triad if we can't determine the seventh quality
        // This shouldn't happen with standard diatonic scales
      }
    }

    // Create the chord
    const chord = createChord(root, quality, options);

    // Convert to roman numeral if requested
    if (options.romanNumerals) {
      // Get roman numeral for this degree
      const romanNumeral = Object.entries(ROMAN_NUMERALS).find(
        ([_, d]) => d === degree
      )?.[0];

      if (romanNumeral) {
        // Adjust case for major/minor
        const adjustedNumeral =
          quality.includes("minor") ||
          quality.includes("min") ||
          quality === "diminished" ||
          quality.includes("dim")
            ? romanNumeral.toLowerCase()
            : romanNumeral.toUpperCase();

        // Add quality suffix
        let suffix = "";
        if (quality.includes("7")) {
          suffix = "7";
        } else if (quality === "diminished") {
          suffix = "o";
        } else if (quality === "augmented") {
          suffix = "+";
        }

        chords.push(adjustedNumeral + suffix);
      } else {
        chords.push(chord);
      }
    } else {
      chords.push(chord);
    }
  }

  return chords;
}

/**
 * Suggest the next chord(s) in a progression
 */
export function suggestNextChords(
  progression: ChordProgression,
  scale: Scale,
  options: {
    count?: number; // How many suggestions to return
    commonOnly?: boolean; // Only suggest common progressions
    preferSmooth?: boolean; // Prefer smoother voice leading
  } = {}
): Chord[] {
  const count = options.count || 3;
  const lastChord = progression[progression.length - 1];

  // If last item is a string, convert to chord
  const lastChordObj =
    typeof lastChord === "string"
      ? createChordFromSymbol(lastChord)
      : lastChord;

  // Get all possible next chords
  const allPossibleChords: Chord[] = [];

  // Generate diatonic chords
  for (let degree = 1; degree <= scale.notes.length; degree++) {
    try {
      const nextChord = createDiatonicProgression(scale, [degree], {
        chordType: "seventh", // Use sevenths for more options
      })[0] as Chord;

      allPossibleChords.push(nextChord);
    } catch (error) {
      // Skip if we couldn't create this chord
      continue;
    }
  }

  // Score each possible next chord
  const scoredChords = allPossibleChords.map((chord) => {
    let score = 0;

    // Analyze connection quality
    const connection = analyzeChordConnection(lastChordObj, chord);

    // Prefer smoother voice leading if requested
    if (options.preferSmooth) {
      if (connection.voiceLeadingQuality === "excellent") score += 10;
      else if (connection.voiceLeadingQuality === "good") score += 5;
      else if (connection.voiceLeadingQuality === "fair") score += 2;
    }

    // Prefer common chord progressions
    if (options.commonOnly) {
      // Check for common movements
      const lastDegree = getScaleDegree(scale, lastChordObj.root);
      const nextDegree = getScaleDegree(scale, chord.root);

      if (lastDegree && nextDegree) {
        // Dominant to tonic (V → I)
        if (lastDegree === 5 && nextDegree === 1) score += 15;
        // Subdominant to dominant (IV → V)
        else if (lastDegree === 4 && nextDegree === 5) score += 12;
        // Tonic to subdominant (I → IV)
        else if (lastDegree === 1 && nextDegree === 4) score += 10;
        // Supertonic to dominant (ii → V)
        else if (lastDegree === 2 && nextDegree === 5) score += 12;
        // Submediant to supertonic (vi → ii)
        else if (lastDegree === 6 && nextDegree === 2) score += 8;
        // Tonic to supertonic (I → ii)
        else if (lastDegree === 1 && nextDegree === 2) score += 8;
      }
    }

    return { chord, score };
  });

  // Sort by score and take the top options
  scoredChords.sort((a, b) => b.score - a.score);

  return scoredChords.slice(0, count).map((item) => item.chord);
}

/**
 * Check if a chord progression is diatonic to a scale
 */
export function isProgressionDiatonic(
  progression: ChordProgression,
  scale: Scale
): {
  isDiatonic: boolean;
  nonDiatonicChords: (Chord | string)[];
} {
  const nonDiatonicChords: (Chord | string)[] = [];

  for (const chordItem of progression) {
    // Convert string to chord if needed
    const chord =
      typeof chordItem === "string"
        ? createChordFromSymbol(chordItem)
        : chordItem;

    // Check if all notes in the chord are in the scale
    const allNotesInScale = chord.notes.every((note) => {
      return scale.notes.some(
        (scaleNote) => scaleNote.pitchClassIndex === note.pitchClassIndex
      );
    });

    if (!allNotesInScale) {
      nonDiatonicChords.push(chordItem);
    }
  }

  return {
    isDiatonic: nonDiatonicChords.length === 0,
    nonDiatonicChords,
  };
}

/**
 * Transform a chord progression by applying common transformations
 */
export function transformProgression(
  progression: ChordProgression,
  transformation:
    | "substitute"
    | "extend"
    | "secondary-dominant"
    | "modal-interchange",
  options: Partial<ChordOptions & { scale?: Scale }> = {}
): ChordProgression {
  const transformed = [...progression];
  const scale = options.scale;

  switch (transformation) {
    case "substitute":
      // Implement chord substitutions
      for (let i = 0; i < transformed.length; i++) {
        const chord =
          typeof transformed[i] === "string"
            ? createChordFromSymbol(transformed[i] as string)
            : (transformed[i] as Chord);

        // Example substitution: Replace dominant with diminished
        if (chord.quality === "7" || chord.quality === "dom7") {
          // Create a diminished chord a half-step above
          const newRoot = createNoteFromParts({
            letter: chord.root.letter,
            accidental: chord.root.accidental,
            octave: chord.root.octave,
          });
          transformed[i] = createChord(newRoot, "dim7", options);
        }
      }
      break;

    case "extend":
      // Extend triads to seventh chords
      for (let i = 0; i < transformed.length; i++) {
        const chord =
          typeof transformed[i] === "string"
            ? createChordFromSymbol(transformed[i] as string)
            : (transformed[i] as Chord);

        // Extend triads to sevenths
        if (chord.category === "triad") {
          let newQuality: ChordQuality;

          // Map triad to seventh
          if (chord.quality === "major") {
            newQuality = "maj7";
          } else if (chord.quality === "minor") {
            newQuality = "min7";
          } else if (chord.quality === "diminished") {
            newQuality = "dim7";
          } else if (chord.quality === "augmented") {
            newQuality = "aug7";
          } else {
            // Skip if not a standard triad
            continue;
          }

          transformed[i] = createChord(chord.root, newQuality, options);
        }
      }
      break;

    case "secondary-dominant":
      // Add secondary dominants
      if (scale) {
        for (let i = 0; i < transformed.length; i++) {
          const chord =
            typeof transformed[i] === "string"
              ? createChordFromSymbol(transformed[i] as string)
              : (transformed[i] as Chord);

          // Skip the last chord
          if (i === transformed.length - 1) continue;

          // Determine if the next chord could have a secondary dominant
          const nextChord =
            typeof transformed[i + 1] === "string"
              ? createChordFromSymbol(transformed[i + 1] as string)
              : (transformed[i + 1] as Chord);

          // Skip if next chord is the tonic
          const nextDegree = getScaleDegree(scale, nextChord.root);
          if (nextDegree === 1) continue;

          // Create a dominant chord whose root is a fifth above the next chord's root
          // (This will be a secondary dominant: V/nextChord)
          const domRoot = createNoteFromParts({
            letter: nextChord.root.letter,
            accidental: nextChord.root.accidental,
            octave: nextChord.root.octave,
          });

          const secondaryDominant = createChord(domRoot, "dom7", options);

          // Insert the secondary dominant before the next chord
          transformed.splice(i + 1, 0, secondaryDominant);
          // Skip the inserted chord in the next iteration
          i++;
        }
      }
      break;

    case "modal-interchange":
      // Apply modal interchange (borrowing chords from parallel major/minor)
      if (scale) {
        const isScaleMajor = scale.name === "major" || scale.name === "ionian";

        // Create parallel scale
        const parallelScale = createScale(
          scale.root,
          isScaleMajor ? "minor" : "major"
        );

        for (let i = 0; i < transformed.length; i++) {
          const chord =
            typeof transformed[i] === "string"
              ? createChordFromSymbol(transformed[i] as string)
              : (transformed[i] as Chord);

          // Get the scale degree
          const degree = getScaleDegree(scale, chord.root);

          if (degree) {
            // Only transform some chords (based on common modal interchanges)
            if (
              (isScaleMajor && (degree === 4 || degree === 6)) || // IV and vi in major
              (!isScaleMajor && (degree === 1 || degree === 4)) // i and iv in minor
            ) {
              // Get the chord from the parallel scale
              try {
                const borrowed = createDiatonicProgression(
                  parallelScale,
                  [degree],
                  {
                    chordType:
                      chord.category === "seventh" ? "seventh" : "triad",
                  }
                )[0] as Chord;

                transformed[i] = borrowed;
              } catch (error) {
                // Skip if we can't create the borrowed chord
              }
            }
          }
        }
      }
      break;
  }

  return transformed;
}

/**
 * Get the harmonic rhythm of a progression
 * (Pattern of chord changes in relation to meter)
 */
export function analyzeHarmonicRhythm(
  progression: ChordProgression,
  beatsPerMeasure: number = 4
): {
  pattern: string; // e.g., "1,3,1,3" for changes on beats 1 and 3
  density: "high" | "medium" | "low";
  changesToBeatsRatio: number;
} {
  // For this analysis, we'll need to know how many beats each chord lasts
  // Since we don't have that information, we'll assume equal duration for each chord

  const chordsPerMeasure =
    progression.length / Math.ceil(progression.length / beatsPerMeasure);

  const beatsPerChord = beatsPerMeasure / chordsPerMeasure;

  // Generate a pattern string
  let beatPattern = [];
  let currentBeat = 1;

  for (let i = 0; i < progression.length; i++) {
    beatPattern.push(currentBeat);
    currentBeat = ((currentBeat + beatsPerChord - 1) % beatsPerMeasure) + 1;
  }

  // Calculate changes-to-beats ratio
  const totalBeats = progression.length * beatsPerChord;
  const changesToBeatsRatio = progression.length / totalBeats;

  // Categorize the density
  let density: "high" | "medium" | "low";

  if (changesToBeatsRatio > 0.5) {
    density = "high";
  } else if (changesToBeatsRatio > 0.25) {
    density = "medium";
  } else {
    density = "low";
  }

  return {
    pattern: beatPattern.join(","),
    density,
    changesToBeatsRatio,
  };
}
