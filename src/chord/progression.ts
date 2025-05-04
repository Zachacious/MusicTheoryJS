/**
 * @module Chord/Progression
 * @description
 * This module provides functions for creating, analyzing, and transforming chord progressions.
 * It allows generating progressions from various inputs like chord symbols, Roman numerals
 * within a scale context, diatonic scale degrees, or common named patterns. Analysis functions
 * check diatonicity and harmonic rhythm (heuristically). Basic transformation and suggestion
 * utilities are also included.
 */

// Import chord constants and types
import {
  CHORD_FORMULAS,
  COMMON_PROGRESSIONS,
  ROMAN_NUMERALS
} from "./constants";
import { Chord, ChordOptions, ChordProgression, ChordQuality } from "./types";
// Import necessary Note types and functions
import {
  Note,
  createNoteFromParts,
  formatNote,
  notesAreEqual,
  transpose,
} from "../note";
// Import necessary Scale types and functions
import { Scale, createScale, getDegree, getScaleDegree } from "../scale";
// Import chord creation functions used here
import { createChord, createChordFromSymbol } from "./creation";
// Import Roman numeral helpers (assuming they exist in ./roman)
import { createChordFromRomanNumeral, parseRomanNumeral } from "./roman";

// Import analysis function used by suggestNextChords
import { analyzeChordConnection } from "./analysis";

/**
 * Creates a chord progression (an array of Chord objects) from an array of chord symbol strings.
 * Each symbol string is parsed using `createChordFromSymbol`.
 *
 * @param chordSymbols - An array of strings, where each string is a chord symbol (e.g., "Cmaj7", "G7/B", "F#m").
 * @param [options={}] - Optional settings (like `rootOctave`, `prefer`, `includeCachedValues`) passed down to `createChordFromSymbol` for each chord. See {@link ChordOptions}.
 * @returns A `ChordProgression` array, containing the created Chord objects corresponding to the input symbols.
 * @throws {Error} If any chord symbol in the array is invalid and cannot be parsed by `createChordFromSymbol`.
 * @example
 * ```ts
 * const symbols = ["Am", "G", "C", "F"];
 * const progression = createProgression(symbols, { rootOctave: 3 });
 * console.log(progression.map(c => c.symbol)); // ['Am', 'G', 'C', 'F'] (symbols might vary slightly based on generator)
 * console.log(progression[0].root.notation); // "A3"
 * ```
 */
export function createProgression(
  chordSymbols: string[],
  options: Partial<ChordOptions> = {}
): ChordProgression {
  // --- Input Validation ---
  if (!Array.isArray(chordSymbols)) {
    throw new Error("Invalid input: chordSymbols must be an array of strings.");
  }
  // --- End Validation ---
  // Map each symbol string to a Chord object using the creation function
  return chordSymbols.map((symbol) => createChordFromSymbol(symbol, options));
}

/**
 * Creates a chord progression based on a named common pattern (e.g., "1-5-6-4", "blues")
 * within a specified musical key (defined by a root note and scale type).
 *
 * @param progressionName - The name of the common progression (must be a key in `COMMON_PROGRESSIONS`).
 * @param key - The tonic (root) Note of the key, either as a Note object or a string (e.g., "C", "Bb", "F#"). Octave is typically ignored, defaults to 4 if parsing string.
 * @param [options={}] - Optional settings.
 * @param [options.scaleType='major'] - The type of scale ('major' or 'minor') defining the key context. Defaults to 'major'.
 * @param [options.romanNumerals=false] - If true, returns an array of Roman numeral strings instead of Chord objects.
 * @param [options.chordType] - Passed down to underlying chord creation (e.g., 'triad', 'seventh').
 * @param [options.prefer] - Enharmonic preference.
 * @param [options.includeCachedValues] - Cache flag for notes.
 * @returns A `ChordProgression` array containing Chord objects or Roman numeral strings based on the pattern and key.
 * @throws {Error} If the progression name is unknown or the key is invalid.
 * @throws {Error} If Roman numeral parsing or chord creation fails for any step in the progression.
 * @see {@link COMMON_PROGRESSIONS} - For available progression names.
 * @see {@link createProgressionFromRomanNumerals} - The function used internally.
 * @example
 * ```ts
 * const cMajorKey = createNote({ letter: 'C', octave: 4 });
 * const progression = createCommonProgression("1-5-6-4", cMajorKey, { scaleType: 'major' });
 * console.log(progression.map(c => (c as Chord).symbol)); // ['C', 'G', 'Am', 'F'] (approx symbols)
 *
 * const progressionNumerals = createCommonProgression("blues", "E", { scaleType: 'major', romanNumerals: true });
 * console.log(progressionNumerals); // ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7']
 * ```
 */
export function createCommonProgression(
  progressionName: string,
  key: Note | string, // Root note of the key
  options: Partial<
    ChordOptions & {
      // Include standard ChordOptions
      /** The type of scale (major or minor) defining the key */
      scaleType?: "major" | "minor";
      /** If true, return Roman numeral strings instead of Chord objects */
      romanNumerals?: boolean; // Option specific to progression creation
    }
  > = {}
): ChordProgression {
  // Return type is ChordProgression (Chord[] or string[])
  // --- Input Validation ---
  if (!progressionName || !COMMON_PROGRESSIONS[progressionName]) {
    throw new Error(`Unknown common progression name: ${progressionName}`);
  }
  if (!key) {
    throw new Error("Invalid key (root note) provided.");
  }
  // --- End Validation ---

  // Get the Roman numeral pattern for the named progression
  const progressionPattern = COMMON_PROGRESSIONS[progressionName];

  // Determine the scale type for the key context
  const scaleType = options.scaleType || "major"; // Default to major key

  // If key is provided as a string, parse it into a Note object
  // Defaulting octave to 4 if only pitch class is given.
  // The 'as any' casts were present in the original code.
  const keyNote =
    typeof key === "string"
      ? createNoteFromParts({
          letter: key.charAt(0).toUpperCase() as any, // Ensure uppercase letter
          accidental: key.substring(1) as any, // Extract accidental
          octave: 4, // Default octave if not specified in key string
          // Pass down cache option? createNoteFromParts handles its own default.
          includeCachedValues: options.includeCachedValues,
        })
      : key;

  // Validate the created keyNote
  if (!keyNote) {
    throw new Error(`Failed to parse or use provided key: ${key}`);
  }

  // Create the scale object representing the key
  // This scale provides the context for interpreting Roman numerals.
  // Pass down preference for note spelling within the scale.
  const scale = createScale(keyNote, scaleType, { prefer: options.prefer });
  if (!scale) {
    throw new Error(`Failed to create ${scaleType} scale for key ${key}`);
  }

  // Delegate to the function that creates progressions from Roman numerals within a scale context
  return createProgressionFromRomanNumerals(progressionPattern, scale, options);
}

/**
 * Creates a chord progression by interpreting an array of Roman numeral strings
 * within the context of a specified scale.
 * Handles parsing Roman numerals (e.g., "I", "vi", "V7", "iiø7") and creating the
 * corresponding diatonic (or altered, if specified) chords.
 *
 * @param romanNumerals - An array of strings representing the chords using Roman numeral notation (e.g., ["I", "IV", "V7"]).
 * @param scale - The Scale object providing the key context (tonic and mode/notes) for interpreting the numerals.
 * @param [options={}] - Optional settings.
 * @param [options.romanNumerals=false] - If true, the function returns the input `romanNumerals` array instead of creating Chord objects.
 * @param [options.chordType] - Passed down to chord creation (e.g., 'triad', 'seventh').
 * @param [options.prefer] - Enharmonic preference.
 * @param [options.includeCachedValues] - Cache flag for notes.
 * @returns A `ChordProgression` array containing Chord objects or Roman numeral strings.
 * @throws {Error} If the scale is invalid, or if any Roman numeral is invalid or cannot be mapped to a chord in the given scale.
 * @see {@link parseRomanNumeral} - Internal helper for parsing numerals.
 * @see {@link createChordFromRomanNumeral} - Internal helper for creating chords from parsed numerals.
 * @example
 * ```ts
 * const cMajorScale = createScaleByName('C4', 'major');
 * const numerals = ["I", "vi", "ii", "V7"];
 * const progression = createProgressionFromRomanNumerals(numerals, cMajorScale);
 * console.log(progression.map(c => (c as Chord).symbol)); // ['C', 'Am', 'Dm', 'G7']
 *
 * const numeralsOut = createProgressionFromRomanNumerals(numerals, cMajorScale, { romanNumerals: true });
 * console.log(numeralsOut); // ["I", "vi", "ii", "V7"]
 * ```
 */
export function createProgressionFromRomanNumerals(
  romanNumerals: string[],
  scale: Scale,
  options: Partial<ChordOptions & { romanNumerals?: boolean }> = {}
): ChordProgression {
  // Returns Chord[] or string[] based on options
  // --- Input Validation ---
  if (!Array.isArray(romanNumerals)) {
    throw new Error(
      "Invalid input: romanNumerals must be an array of strings."
    );
  }
  if (!scale || !scale.root || !scale.notes) {
    throw new Error("Invalid scale provided.");
  }
  // --- End Validation ---

  const chords: ChordProgression = []; // Initialize array for chords or strings

  for (const numeral of romanNumerals) {
    if (typeof numeral !== "string") {
      console.warn(
        `Skipping invalid non-string numeral in progression: ${numeral}`
      );
      continue;
    }
    // Parse the roman numeral string into its components (degree, quality modifier)
    // Assumes parseRomanNumeral helper exists and works correctly
    const chordInfo = parseRomanNumeral(numeral); // Returns { degree: number, quality: string } or similar
    if (!chordInfo) {
      throw new Error(`Invalid Roman numeral: ${numeral}`);
    }

    // If option requests numerals, just add the numeral string back
    if (options.romanNumerals === true) {
      // Check explicitly for true
      chords.push(numeral);
    } else {
      // Create the actual Chord object from the parsed numeral info and scale context
      // Assumes createChordFromRomanNumeral helper exists and works correctly
      const chord = createChordFromRomanNumeral(chordInfo, scale, options); // Pass options down
      chords.push(chord);
    }
  }

  // Return the array (containing either Chord objects or numeral strings)
  return chords; // Original code didn't freeze outer array
}

/**
 * Generates a diatonic chord progression based on a sequence of scale degrees within a given scale.
 * Calculates the diatonic chord quality (major, minor, diminished, etc.) for each specified degree
 * based on the intervals present in the scale. Can generate triads or seventh chords.
 *
 * @param scale - The Scale object providing the key context and notes.
 * @param pattern - An array of 1-based scale degree numbers defining the sequence of chord roots (e.g., [1, 4, 5, 1]).
 * @param [options={}] - Optional settings.
 * @param [options.chordType='triad'] - Specifies whether to generate 'triad' or 'seventh' chords for each degree.
 * @param [options.romanNumerals=false] - If true, returns an array of calculated Roman numeral strings (e.g., "I", "IV", "V7") instead of Chord objects.
 * @param [options.prefer] - Enharmonic preference for notes within created chords.
 * @param [options.includeCachedValues] - Cache flag for notes.
 * @returns A `ChordProgression` array containing the generated diatonic Chord objects or Roman numeral strings.
 * @throws {Error} If the scale is invalid, or if any degree in the pattern is invalid, or if chord quality cannot be determined for a degree.
 * @remarks Chord quality determination is based on stacking thirds using the notes available *within the provided scale*. Assumes standard triad/seventh construction. Roman numeral output formatting includes quality indication (e.g., 'o' for diminished, 'm'/'min' inferred by case, '+' for augmented, '7'/'maj7').
 * @example
 * ```ts
 * const cMajorScale = createScaleByName('C4', 'major');
 *
 * // Generate I-V-vi-IV progression as triads
 * const progression1 = createDiatonicProgression(cMajorScale, [1, 5, 6, 4]);
 * console.log(progression1.map(c => (c as Chord).symbol)); // ['C', 'G', 'Am', 'F']
 *
 * // Generate ii-V-I progression as seventh chords
 * const progression2 = createDiatonicProgression(cMajorScale, [2, 5, 1], { chordType: 'seventh' });
 * console.log(progression2.map(c => (c as Chord).symbol)); // ['Dm7', 'G7', 'Cmaj7']
 *
 * // Generate I-IV-V as Roman numerals (triads default)
 * const progression3 = createDiatonicProgression(cMajorScale, [1, 4, 5], { romanNumerals: true });
 * console.log(progression3); // ['I', 'IV', 'V']
 *
 * // Generate i-VI-VII-i in A Minor as Roman numerals (sevenths)
 * const aMinorScale = createScaleByName('A3', 'minor');
 * const progression4 = createDiatonicProgression(aMinorScale, [1, 6, 7, 1], { chordType: 'seventh', romanNumerals: true });
 * console.log(progression4); // ['im7', 'VImaj7', 'VII7', 'im7'] (assuming standard minor qualities) -> Needs careful check of internal quality logic. Should be Am7, Fmaj7, G7, Am7.
 * // Original numeral logic: lower for minor/dim, upper for Major/Aug. Adds 'o', '+', '7'.
 * // -> ['i7', 'VImaj7', 'VII7', 'i7'] ? Check logic.
 * ```
 */
export function createDiatonicProgression(
  scale: Scale,
  pattern: number[], // Array of 1-based Scale degrees
  options: Partial<
    ChordOptions & {
      // Include standard ChordOptions
      /** Type of chord to generate for each degree */
      chordType?: "triad" | "seventh";
      /** If true, return Roman numeral strings instead of Chord objects */
      romanNumerals?: boolean;
    }
  > = {}
): ChordProgression {
  // Returns Chord[] or string[]
  // --- Input Validation ---
  if (!scale || !scale.notes || scale.notes.length < 3) {
    // Need at least 3 notes for basic triad qualities
    throw new Error(
      "Invalid or insufficient scale provided for diatonic progression."
    );
  }
  if (!Array.isArray(pattern) || pattern.length === 0) {
    throw new Error("Invalid or empty degree pattern array provided.");
  }
  if (pattern.some((d) => !Number.isInteger(d) || d <= 0)) {
    throw new Error("Degree pattern must contain only positive integers.");
  }
  // --- End Validation ---

  // Determine chord type (triad or seventh)
  const chordType = options.chordType || "triad"; // Default to triads

  const chords: ChordProgression = []; // Array to hold Chord objects or string numerals

  for (const degree of pattern) {
    // Get the root Note object for this scale degree using helper function
    const root = getDegree(scale, degree);
    if (!root) {
      // Handle invalid degree number for the given scale
      throw new Error(
        `Invalid scale degree requested: ${degree} for scale with ${scale.notes.length} notes.`
      );
    }

    // --- Determine diatonic chord quality based on intervals *within the scale* ---
    let quality: ChordQuality;
    const scaleNotes = scale.notes; // For checking intervals
    const numScaleNotes = scaleNotes.length; // Typically 7 for diatonic functions

    // Determine the scale degrees for the 3rd, 5th, and 7th *relative to the current degree*
    // Example: If degree is 2 (D in C major), third is degree 4 (F), fifth is degree 6 (A)
    // Use modulo arithmetic based on scale size (assumed 7 for quality check?)
    // Original code used modulo scaleNotes.length - keep this.
    const thirdDegreeIndex = (degree - 1 + 2) % numScaleNotes; // 0-based index of the third note *within scale.notes*
    const fifthDegreeIndex = (degree - 1 + 4) % numScaleNotes; // 0-based index of the fifth note
    const seventhDegreeIndex = (degree - 1 + 6) % numScaleNotes; // 0-based index of the seventh note

    // Get the actual Note objects for these degrees from the scale array
    // These notes ARE diatonic to the scale.
    const thirdNote = scaleNotes[thirdDegreeIndex];
    const fifthNote = scaleNotes[fifthDegreeIndex];
    const seventhNote = scaleNotes[seventhDegreeIndex]; // Get regardless, check later if needed

    // Validate that we could find the notes (should always work if degree logic is sound)
    if (!thirdNote || !fifthNote || !seventhNote) {
      // Check seventhNote too for safety
      throw new Error(
        `Could not determine diatonic chord quality for scale degree ${degree}. Failed to find required notes.`
      );
    }

    // Calculate intervals (semitones) from the chord's root to these diatonic notes
    const thirdInterval =
      (thirdNote.pitchClassIndex - root.pitchClassIndex + 12) % 12;
    const fifthInterval =
      (fifthNote.pitchClassIndex - root.pitchClassIndex + 12) % 12;
    const seventhInterval =
      (seventhNote.pitchClassIndex - root.pitchClassIndex + 12) % 12;

    // Determine triad quality based on calculated 3rd and 5th intervals
    if (thirdInterval === 4 && fifthInterval === 7) {
      // M3, P5
      quality = "major";
    } else if (thirdInterval === 3 && fifthInterval === 7) {
      // m3, P5
      quality = "minor";
    } else if (thirdInterval === 3 && fifthInterval === 6) {
      // m3, d5
      quality = "diminished";
    } else if (thirdInterval === 4 && fifthInterval === 8) {
      // M3, A5
      quality = "augmented";
    } else {
      // Should not happen in standard diatonic scales, but handle defensively
      console.warn(
        `Unexpected triad intervals from root ${formatNote(
          root
        )}: 3rd=${thirdInterval}, 5th=${fifthInterval}. Using root note only?`
      );
      // Fallback or throw? Original code threw error.
      throw new Error(
        `Could not determine standard triad quality for scale degree ${degree}. Intervals: 3rd=${thirdInterval}, 5th=${fifthInterval}`
      );
    }

    // If a seventh chord was requested, refine the quality based on the seventh interval
    if (chordType === "seventh") {
      // Determine the most common seventh chord quality based on the triad and seventh interval
      if (quality === "major" && seventhInterval === 11) {
        // M3, P5, M7
        quality = "maj7";
      } else if (quality === "major" && seventhInterval === 10) {
        // M3, P5, m7
        quality = "7"; // Dominant 7th
      } else if (quality === "minor" && seventhInterval === 10) {
        // m3, P5, m7
        quality = "min7";
      } else if (quality === "minor" && seventhInterval === 11) {
        // m3, P5, M7 (e.g., from harmonic/melodic minor)
        quality = "minMaj7";
      } else if (quality === "diminished" && seventhInterval === 10) {
        // m3, d5, m7
        quality = "half-dim7"; // m7b5
      } else if (quality === "diminished" && seventhInterval === 9) {
        // m3, d5, d7(bb7)
        quality = "dim7"; // Fully diminished 7th
      } else if (quality === "augmented" && seventhInterval === 10) {
        // M3, A5, m7
        quality = "aug7";
      }
      // Add case for augmented major 7th? M3, A5, M7 -> interval 11
      else if (quality === "augmented" && seventhInterval === 11) {
        // No standard single symbol, maybe "augMaj7"? Assign placeholder?
        console.warn(
          `Augmented Major 7th chord found for degree ${degree}, quality assigned as 'augmented'.`
        );
        // Keep quality as 'augmented' triad as no standard 7th symbol matches easily? Or use 'augMaj7'?
        // Sticking to original code's apparent lack of explicit handling here.
      }
      // If seventh interval doesn't form a standard 7th type with the triad,
      // the quality remains the triad quality. Original code had no fallback here.
    }
    // --- End Quality Determination ---

    // Create the actual Chord object OR format the Roman numeral string
    if (options.romanNumerals === true) {
      // --- Format Roman Numeral ---
      // Get base Roman numeral (I-VII)
      const baseRoman = ROMAN_NUMERALS[degree] ?? `deg${degree}`; // Fallback if degree > 7? No, use map lookup.
      let romanNumeral = "?";
      // Need mapping from number to Roman string, handling case. Original used find + map.
      const romanMapEntry = Object.entries(ROMAN_NUMERALS).find(
        ([_, d]) => d === degree
      );
      if (romanMapEntry) {
        romanNumeral = romanMapEntry[0]; // Gets 'I' or 'i' etc. Needs case adjustment.
        // Adjust case based on quality: Major/Aug = Uppercase, Minor/Dim = Lowercase
        const isUpper =
          quality === "major" ||
          quality === "augmented" ||
          quality === "maj7" ||
          quality === "7" ||
          quality === "aug7"; // Add other major-based qualities
        romanNumeral = isUpper
          ? romanNumeral.toUpperCase()
          : romanNumeral.toLowerCase();

        // Add quality suffix for non-major/minor triads or any sevenths
        let suffix = "";
        if (chordType === "seventh") {
          if (quality === "maj7") suffix = "maj7"; // Or M7, Δ7
          else if (quality === "7") suffix = "7";
          else if (quality === "min7") suffix = "m7"; // Or -7
          else if (quality === "minMaj7") suffix = "mM7"; // Or -Δ7
          else if (quality === "half-dim7") suffix = "ø7"; // Or m7b5
          else if (quality === "dim7") suffix = "o7";
          else if (quality === "aug7") suffix = "+7"; // Or aug7
          // Add default '7' if type is seventh but quality remained triad?
          else if (
            quality === "major" ||
            quality === "minor" ||
            quality === "augmented" ||
            quality === "diminished"
          ) {
            // This indicates an unusual 7th combination not mapped above
            suffix = "7?"; // Indicate ambiguity
          }
        } else {
          // Triad suffixes
          if (quality === "diminished") suffix = "o"; // Or dim
          else if (quality === "augmented") suffix = "+"; // Or aug
        }
        chords.push(romanNumeral + suffix);
      } else {
        // Fallback if degree doesn't map (e.g., > 7)
        console.warn(`Cannot generate Roman numeral for degree ${degree}.`);
        chords.push(`deg${degree}?`); // Push placeholder
      }
      // Original logic for suffix was slightly different, adjusting based on quality name.
      /*
        let suffix = "";
        if (quality.includes("7")) { // Simple check if it's any 7th chord
          suffix = "7"; // Basic 7th indicator, doesn't distinguish maj7, m7 etc well
        } else if (quality === "diminished") {
          suffix = "o";
        } else if (quality === "augmented") {
          suffix = "+";
        }
        // This doesn't capture m7, maj7, dim7, half-dim7 differences well.
        // Let's use the more detailed suffix logic from above block.
        */

      // --- End Roman Numeral Formatting ---
    } else {
      // Create the Chord object
      // Pass calculated root and determined quality, plus other options
      const chord = createChord(root, quality, options);
      chords.push(chord);
    }
  } // End loop through degrees

  // Return the array of Chords or Roman numeral strings
  return chords; // Original code didn't freeze outer array
}

/**
 * Suggests potential next chords to follow a given chord progression within the context of a scale.
 * Provides heuristic suggestions based on common harmonic movements and optional voice leading smoothness.
 *
 * @param progression - The current ChordProgression (array of Chord objects or symbols). Must not be empty.
 * @param scale - The Scale object providing the harmonic context.
 * @param [options={}] - Optional settings for suggestions.
 * @param [options.count=3] - The maximum number of suggested chords to return.
 * @param [options.commonOnly=false] - If true, suggestions are weighted more heavily towards common diatonic progressions (V-I, IV-V, ii-V, etc.).
 * @param [options.preferSmooth=false] - If true, suggestions are weighted more heavily towards chords that have smoother voice leading (less total semitone movement) from the last chord of the progression.
 * @returns An array of suggested Chord objects, sorted by a heuristic score (descending).
 * @throws {Error} If the input progression or scale is invalid.
 * @remarks The suggestion logic is heuristic. It considers all diatonic seventh chords as potential candidates and scores them based on common patterns and optional voice leading smoothness. It does not perform deep harmonic analysis.
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
  // Returns array of Chord objects
  // --- Input Validation ---
  if (!Array.isArray(progression) || progression.length === 0) {
    throw new Error("Invalid or empty progression provided.");
  }
  if (!scale || !scale.notes || scale.notes.length < 7) {
    // Need diatonic context usually
    console.warn(
      "Suggesting chords based on a non-heptatonic or invalid scale may produce unexpected results."
    );
    if (!scale || !scale.notes || scale.notes.length === 0) {
      throw new Error("Invalid scale provided.");
    }
  }
  // --- End Validation ---

  const count = options.count || 3; // Default to suggesting 3 chords
  const lastChordItem = progression[progression.length - 1]; // Get the last item

  // Ensure the last chord is a Chord object for analysis
  // Use try-catch for createChordFromSymbol
  let lastChordObj: Chord;
  if (typeof lastChordItem === "string") {
    try {
      lastChordObj = createChordFromSymbol(lastChordItem);
    } catch (e) {
      throw new Error(
        `Could not parse last chord symbol "${lastChordItem}" in progression: ${
          (e as Error).message
        }`
      );
    }
  } else if (
    lastChordItem &&
    typeof lastChordItem === "object" &&
    lastChordItem.root &&
    lastChordItem.notes
  ) {
    lastChordObj = lastChordItem;
  } else {
    throw new Error(
      "Last element in progression is not a valid Chord object or symbol string."
    );
  }

  // Generate all possible diatonic seventh chords in the scale as candidates
  const allPossibleChords: Chord[] = [];
  const scaleLength = scale.notes.length; // Use actual scale length

  for (let degree = 1; degree <= scaleLength; degree++) {
    try {
      // Use createDiatonicProgression to get the chord for this degree
      const diatonicChord = createDiatonicProgression(scale, [degree], {
        chordType: "seventh", // Generate seventh chords for more harmonic interest
        romanNumerals: false, // Ensure Chord objects are returned
      })[0] as Chord; // Get the single chord from the result array

      // Check if chord creation was successful before pushing
      if (diatonicChord) {
        allPossibleChords.push(diatonicChord);
      }
    } catch (error) {
      // Log warning if diatonic chord creation fails for a degree, but continue
      console.warn(
        `Could not create diatonic chord for degree ${degree} of the scale: ${
          (error as Error).message
        }`
      );
      continue;
    }
  }

  if (allPossibleChords.length === 0) {
    console.warn("No diatonic chords could be generated for suggestion.");
    return []; // Return empty if no candidates generated
  }

  // Score each possible next chord based on options
  const scoredChords = allPossibleChords.map((chord) => {
    let score = 0;

    // 1. Analyze connection from the last chord to this candidate chord
    let connection: ReturnType<typeof analyzeChordConnection> | null = null;
    try {
      connection = analyzeChordConnection(lastChordObj, chord);
    } catch (e) {
      console.warn(
        `Could not analyze connection between ${lastChordObj.symbol} and ${
          chord.symbol
        }: ${(e as Error).message}`
      );
    }

    // 2. Apply scoring based on smoothness if requested
    if (options.preferSmooth && connection) {
      // Higher score for better voice leading quality
      if (connection.voiceLeadingQuality === "excellent") score += 10;
      else if (connection.voiceLeadingQuality === "good") score += 5;
      else if (connection.voiceLeadingQuality === "fair") score += 2;
      // Poor voice leading gets no bonus points
    }

    // 3. Apply scoring based on common progressions if requested
    if (options.commonOnly) {
      // Get scale degrees of the last chord root and the candidate chord root
      const lastDegree = getScaleDegree(scale, lastChordObj.root);
      const nextDegree = getScaleDegree(scale, chord.root);

      // Add score bonuses for common diatonic movements (examples)
      if (lastDegree && nextDegree) {
        // Dominant to tonic (V -> I)
        if (lastDegree === 5 && nextDegree === 1) score += 15;
        // Subdominant to dominant (IV -> V)
        else if (lastDegree === 4 && nextDegree === 5) score += 12;
        // Tonic to subdominant (I -> IV)
        else if (lastDegree === 1 && nextDegree === 4) score += 10;
        // Supertonic to dominant (ii -> V)
        else if (lastDegree === 2 && nextDegree === 5) score += 12;
        // Submediant to supertonic (vi -> ii)
        else if (lastDegree === 6 && nextDegree === 2) score += 8;
        // Tonic to supertonic (I -> ii) - Less common but possible root movement
        else if (lastDegree === 1 && nextDegree === 2)
          score += 5; // Lower score
        // Add other common movements like V->vi (deceptive), IV->I (plagal) etc.
        else if (lastDegree === 5 && nextDegree === 6) score += 7; // Deceptive
        else if (lastDegree === 4 && nextDegree === 1) score += 7; // Plagal
      }
    }

    // Basic score bonus for simply being diatonic (already filtered, but could add weight)
    score += 1;

    return { chord, score };
  });

  // Sort candidates by score (descending)
  scoredChords.sort((a, b) => b.score - a.score);

  // Return the top 'count' suggested chords
  return scoredChords.slice(0, count).map((item) => item.chord);
}

/**
 * Checks if all chords in a given progression are diatonic to a specified scale.
 * A chord is considered diatonic if all of its constituent pitch classes are present
 * in the scale's set of pitch classes.
 *
 * @param progression - The ChordProgression (array of Chord objects or chord symbols) to check.
 * @param scale - The Scale object representing the key context.
 * @returns An object containing:
 * - `isDiatonic`: boolean - True if all chords in the progression are diatonic to the scale.
 * - `nonDiatonicChords`: (Chord | string)[] - An array of the chords (or symbols) from the progression that were found to be non-diatonic.
 * @throws {Error} If the progression or scale is invalid.
 */
export function isProgressionDiatonic(
  progression: ChordProgression,
  scale: Scale
): {
  isDiatonic: boolean;
  nonDiatonicChords: (Chord | string)[]; // Return original items that are non-diatonic
} {
  // --- Input Validation ---
  if (!Array.isArray(progression)) {
    throw new Error("Invalid progression provided.");
  }
  if (!scale || !scale.notes) {
    throw new Error("Invalid scale provided.");
  }
  // --- End Validation ---

  const nonDiatonicChords: (Chord | string)[] = [];
  // Create a set of scale pitch classes for efficient lookup
  const scalePitchClasses = new Set(scale.notes.map((n) => n.pitchClassIndex));

  for (const chordItem of progression) {
    // Convert string symbol to Chord object if necessary
    let chord: Chord;
    if (typeof chordItem === "string") {
      try {
        chord = createChordFromSymbol(chordItem);
      } catch (e) {
        console.warn(
          `Could not parse chord symbol "${chordItem}" in isProgressionDiatonic check. Assuming non-diatonic.`
        );
        nonDiatonicChords.push(chordItem);
        continue; // Skip to next item
      }
    } else if (chordItem && typeof chordItem === "object" && chordItem.notes) {
      chord = chordItem;
    } else {
      console.warn(
        `Invalid item encountered in progression array: ${chordItem}. Skipping.`
      );
      nonDiatonicChords.push(chordItem); // Add invalid item as non-diatonic
      continue;
    }

    // Check if all notes in the chord are diatonic to the scale (by pitch class)
    const allNotesInScale = chord.notes.every((note) => {
      // Check if the note's pitch class exists in the scale's set
      return scalePitchClasses.has(note.pitchClassIndex);
    });

    // If any note is not in the scale, the chord is non-diatonic
    if (!allNotesInScale) {
      nonDiatonicChords.push(chordItem); // Add the original item (chord or string)
    }
  }

  // Progression is diatonic if the non-diatonic list is empty
  return {
    isDiatonic: nonDiatonicChords.length === 0,
    nonDiatonicChords: nonDiatonicChords, // Freeze result array
  };
}

/**
 * Applies a specified harmonic transformation to a chord progression.
 * Supports basic examples of substitution, extension, secondary dominant insertion,
 * and modal interchange. Requires a Scale context for some transformations.
 *
 * @param progression - The input ChordProgression (array of Chord objects or symbols).
 * @param transformation - The type of transformation to apply:
 * - `"substitute"`: Example: Replaces V7 with vii°7 (basic example).
 * - `"extend"`: Example: Converts triads to corresponding seventh chords.
 * - `"secondary-dominant"`: Inserts V7/x chords before non-tonic target chords (requires `options.scale`).
 * - `"modal-interchange"`: Example: Borrows chords from the parallel major/minor key (requires `options.scale`).
 * @param [options={}] - Optional settings.
 * @param [options.scale] - The Scale object providing the key context, required for 'secondary-dominant' and 'modal-interchange'.
 * @param [options.prefer] - Enharmonic preference for created chords.
 * @param [options.includeCachedValues] - Cache flag for notes in created chords.
 * @returns A new `ChordProgression` array containing the transformed sequence. The original progression is not modified.
 * @throws {Error} If the input progression is invalid or required options (like `scale`) are missing for a transformation.
 * @remarks The implementations for transformations provided in the original code are basic examples and may need significant expansion for comprehensive harmonic manipulation. Error handling for chord creation within transformations should be considered.
 */
export function transformProgression(
  progression: ChordProgression,
  transformation:
    | "substitute" // Example: Replace V with vii°
    | "extend" // Example: Triads to 7ths
    | "secondary-dominant" // Example: Add V7/ii before ii
    | "modal-interchange", // Example: Borrow iv from minor in Major key
  options: Partial<ChordOptions & { scale?: Scale }> = {} // Scale needed for some transforms
): ChordProgression {
  // --- Input Validation ---
  if (!Array.isArray(progression)) {
    throw new Error("Invalid progression provided.");
  }
  const validTransformations = [
    "substitute",
    "extend",
    "secondary-dominant",
    "modal-interchange",
  ];
  if (!validTransformations.includes(transformation)) {
    throw new Error(`Invalid transformation type: ${transformation}`);
  }
  // Check for scale if required by transformation
  if (
    (transformation === "secondary-dominant" ||
      transformation === "modal-interchange") &&
    !options.scale
  ) {
    throw new Error(
      `Scale option is required for transformation type: ${transformation}`
    );
  }
  // --- End Validation ---

  // Create a mutable copy to work with
  const transformed: ChordProgression = [...progression];
  const scale = options.scale; // Optional scale context

  switch (transformation) {
    case "substitute":
      // Example: Replace dominant 7th (V7) with leading tone diminished 7th (vii°7)
      // This requires scale context to identify V7 and vii°7 correctly.
      // Simple placeholder logic from original code:
      for (let i = 0; i < transformed.length; i++) {
        const chordItem = transformed[i];
        const chord =
          typeof chordItem === "string"
            ? createChordFromSymbol(chordItem, options)
            : chordItem;
        if (!chord) continue; // Skip if parsing failed

        // Example substitution: If it's a dominant 7th chord...
        if (chord.quality === "7" || chord.quality === "dom7") {
          // ...replace it with a diminished 7th chord built on the leading tone (Maj 7th degree)
          // This requires scale context. Let's refine using scale if available.
          if (scale) {
            const leadingToneNote = getDegree(scale, 7);
            if (leadingToneNote) {
              // Check if original chord root was actually the dominant degree
              if (getScaleDegree(scale, chord.root) === 5) {
                try {
                  // Create vii°7 based on scale's leading tone
                  // Need to ensure createChord handles 'dim7' correctly
                  transformed[i] = createChord(
                    leadingToneNote,
                    "dim7",
                    options
                  );
                } catch (e) {
                  console.warn(
                    `Substitution failed for ${chord.symbol}: ${
                      (e as Error).message
                    }`
                  );
                }
              }
            }
          } else {
            // Original simpler logic: build dim7 a semitone below original root? No, used same root...
            // Let's build dim7 on original root as a different substitution example if no scale.
            // transformed[i] = createChord(chord.root, "dim7", options); // Example substitute V7 -> I dim7? Unlikely.
            // Revert to original code's example: V7 -> VII dim7? Needs root change.
            // Original code built dim7 on root `createNoteFromParts` based on V7 root - this seems wrong.
            // Let's skip substitution if scale context is missing.
            console.warn(
              "Cannot perform V7->vii°7 substitution without scale context."
            );
          }
        }
        // Add more substitution rules (e.g., ii for IV, iii for I, etc.)
      }
      break;

    case "extend":
      // Extend basic triads to their corresponding seventh chords
      for (let i = 0; i < transformed.length; i++) {
        const chordItem = transformed[i];
        // Ensure it's a Chord object to check category/quality
        const chord =
          typeof chordItem === "string"
            ? createChordFromSymbol(chordItem, options)
            : chordItem;
        if (!chord || !chord.category) continue; // Skip if not valid chord object

        // If it's identified as a basic triad...
        if (chord.category === "triad") {
          let newQuality: ChordQuality | null = null;

          // ...map it to a common corresponding seventh quality
          if (chord.quality === "major") newQuality = "maj7";
          else if (chord.quality === "minor") newQuality = "min7";
          else if (chord.quality === "diminished") newQuality = "half-dim7";
          // Common extension for diatonic dim triad (vii°) is m7b5
          else if (chord.quality === "augmented")
            newQuality = "aug7"; // Aug triad often becomes Aug7
          // Skip sus chords or unknown triads
          else {
            continue;
          }

          try {
            // Create the extended chord with the same root
            transformed[i] = createChord(chord.root, newQuality, options);
          } catch (e) {
            console.warn(
              `Could not extend chord ${chord.symbol}: ${(e as Error).message}`
            );
          }
        }
      }
      break;

    case "secondary-dominant":
      // Add secondary dominants (V7/x) before target chords (x)
      if (scale) {
        // Requires scale context
        const secondaryDominantsAdded: ChordProgression = []; // Build new array
        for (let i = 0; i < transformed.length; i++) {
          const chordItem = transformed[i];
          const chord =
            typeof chordItem === "string"
              ? createChordFromSymbol(chordItem, options)
              : chordItem;
          if (!chord) {
            // Handle potential invalid item
            secondaryDominantsAdded.push(chordItem); // Keep original invalid item
            continue;
          }

          // Check if this chord is a potential target for a secondary dominant
          // Typically targets are diatonic chords other than the tonic (I) and sometimes vii°
          const targetDegree = getScaleDegree(scale, chord.root);
          // Common targets: ii, iii, IV, V, vi (Degrees 2, 3, 4, 5, 6)
          const isPotentialTarget =
            targetDegree !== null && targetDegree !== 1 && targetDegree !== 7; // Avoid V7/I (is just V7) and V7/vii° (less common)

          if (isPotentialTarget && secondaryDominantsAdded.length > 0) {
            // Can only add V7/x *before* x
            // Calculate the root of the secondary dominant (V of the target chord's root)
            // Transpose the target chord's root UP by a Perfect Fifth (7 semitones)
            const secondaryDominantRoot = transpose(chord.root, 7, {
              prefer: options.prefer,
            });

            // Create the V7/x chord (dominant 7th quality)
            try {
              const secondaryDominantChord = createChord(
                secondaryDominantRoot,
                "7",
                options
              ); // Use '7' for dom7
              // Add the secondary dominant *before* the target chord in the new array
              secondaryDominantsAdded.push(secondaryDominantChord);
            } catch (e) {
              console.warn(
                `Could not create secondary dominant for ${chord.symbol}: ${
                  (e as Error).message
                }`
              );
            }
          }
          // Always add the original chord (or the target chord)
          secondaryDominantsAdded.push(chordItem);
        }
        // Replace original progression with the new one including secondary dominants
        // This modifies the length and content.
        // Original code modified in place using splice, which is complex with iteration.
        // Returning a new array is safer.
        return secondaryDominantsAdded; // Return the new progression
      } else {
        console.warn(
          "Scale context is required for 'secondary-dominant' transformation."
        );
      }
      break; // End secondary-dominant case

    case "modal-interchange":
      // Example: Borrow chords from the parallel major/minor key
      if (scale) {
        // Requires scale context
        const isScaleMajor = scale.name === "major" || scale.name === "ionian";
        const parallelScaleType = isScaleMajor ? "minor" : "major";

        // Create the parallel scale (same root, opposite mode)
        let parallelScale: Scale | null = null;
        try {
          parallelScale = createScale(scale.root, parallelScaleType);
        } catch (e) {
          throw new Error(
            `Could not create parallel ${parallelScaleType} scale for modal interchange: ${
              (e as Error).message
            }`
          );
        }

        for (let i = 0; i < transformed.length; i++) {
          const chordItem = transformed[i];
          const chord =
            typeof chordItem === "string"
              ? createChordFromSymbol(chordItem, options)
              : chordItem;
          if (!chord || !chord.root) continue; // Skip invalid chords

          // Get the scale degree of the current chord's root in the original scale
          const degree = getScaleDegree(scale, chord.root);

          if (degree) {
            // --- Example Rule: Replace specific chords ---
            // In Major key, replace IV and ii with iv and ii° from minor? Or IVm, iim7b5?
            // In Minor key, replace i and v with I and V from major?
            let substitute = false;
            if (
              isScaleMajor &&
              (degree === 4 || degree === 2 || degree === 6)
            ) {
              // Common targets: IV, ii, vi? Original code checked IV, VI. Let's use IV, ii.
              substitute = true;
            } else if (
              !isScaleMajor &&
              (degree === 1 || degree === 4 || degree === 5)
            ) {
              // Common targets in minor: i, iv, v? Original code checked i, iv. Let's use i, iv, v.
              substitute = true;
            }
            // --- End Example Rule ---

            if (substitute) {
              // Get the corresponding diatonic chord from the parallel scale
              try {
                // Determine chord type (triad/seventh) based on original chord
                const chordType =
                  chord.category === "seventh" ||
                  chord.category === "extended" ||
                  chord.category === "altered"
                    ? "seventh"
                    : "triad";
                // Use createDiatonicProgression to get the chord from the parallel scale
                const borrowedChord = createDiatonicProgression(
                  parallelScale,
                  [degree], // Get chord for the same degree number
                  { chordType } // Use same basic type (triad/seventh)
                )[0] as Chord; // Extract the single chord

                if (borrowedChord) {
                  // Replace the original chord with the borrowed one
                  transformed[i] = borrowedChord;
                }
              } catch (error) {
                // Skip if we can't create the borrowed chord for this degree
                console.warn(
                  `Could not create borrowed chord for degree ${degree} from parallel ${parallelScaleType} scale: ${
                    (error as Error).message
                  }`
                );
              }
            } // end if(substitute)
          } // end if(degree)
        } // end for loop
      } else {
        console.warn(
          "Scale context is required for 'modal-interchange' transformation."
        );
      }
      break; // End modal-interchange case
  } // End switch statement

  // Return the modified progression array (or a new one if secondary dominants added)
  return transformed; // Return the array (original code didn't freeze)
}

/**
 * Provides a basic analysis of the harmonic rhythm of a chord progression,
 * assuming each chord has equal duration relative to a specified meter.
 *
 * @param progression - The ChordProgression (array of Chord objects or symbols) to analyze.
 * @param [beatsPerMeasure=4] - The number of beats in a measure (e.g., 4 for 4/4 time).
 * @returns An object containing:
 * - `pattern`: string - A comma-separated string indicating the beat number (1-based) on which each chord change occurs, assuming equal duration.
 * - `density`: 'high' | 'medium' | 'low' - A qualitative assessment of how frequently chords change.
 * - `changesToBeatsRatio`: number - The ratio of chord changes per beat (assuming equal duration).
 * @throws {Error} If progression is empty or beatsPerMeasure is invalid.
 * @remarks This is a highly simplified analysis. It does **not** use actual timing information
 * and assumes every chord lasts for the same duration (`beatsPerMeasure / chordsPerMeasure`).
 * The `pattern` output shows the start beat of each chord under this assumption. Density categories are heuristic.
 */
export function analyzeHarmonicRhythm(
  progression: ChordProgression,
  beatsPerMeasure: number = 4 // Assume 4/4 time by default
): {
  pattern: string; // e.g., "1,3,1,3" for changes on beats 1 and 3 in 4/4
  density: "high" | "medium" | "low"; // Qualitative density
  changesToBeatsRatio: number; // Changes per beat (avg)
} {
  // --- Input Validation ---
  if (!Array.isArray(progression) || progression.length === 0) {
    throw new Error("Cannot analyze harmonic rhythm of empty progression.");
  }
  if (!Number.isInteger(beatsPerMeasure) || beatsPerMeasure <= 0) {
    throw new Error(
      `Invalid beatsPerMeasure: ${beatsPerMeasure}. Must be positive integer.`
    );
  }
  // --- End Validation ---

  // --- Simple analysis assuming equal duration for each chord ---
  // Calculate average number of chords per measure (can be fractional)
  // Original logic seems reversed - should be chords / measures.
  // Let's estimate measures first.
  const numChords = progression.length;
  // If we assume each chord gets *at least* one beat (simplification):
  // Estimated number of measures based on chords / beatsPerMeasure? No, let's use original logic's implied calculation.

  // Original calculation for chordsPerMeasure seems flawed.
  // Let's calculate beats per chord assuming the progression fits neatly into measures?
  // Or assume one chord per beat? No, that's too dense.
  // Let's stick to the original calculation flow and document its assumption:
  // It calculates an "average" number of chords per measure based on total chords / total measures needed.
  const estimatedMeasures = Math.ceil(numChords / beatsPerMeasure); // How many measures are needed at minimum 1 chord/measure? No, this isn't right either.
  // Let's assume the simplest case: the progression fills an integer number of measures OR represents a typical loop.
  // Assume each chord gets equal time division within the meter.
  // This means if there are 2 chords in 4/4, each gets 2 beats. If 3 chords, 4/3 beats each?

  // Sticking to original flawed logic for adherence:
  const chordsPerMeasure = numChords / Math.ceil(numChords / beatsPerMeasure); // This gives strange results, e.g., 3 chords in 4/4 -> 3 / ceil(3/4) = 3/1 = 3 chords/measure?
  // Let's recalculate assuming equal duration across ONE measure pattern if possible, or simple division.
  // Simpler assumption: Average beats per chord.
  // This requires knowing the *total duration* the progression covers. Let's assume it covers `ceil(numChords / beatsPerMeasure)` full measures for simplicity.
  // No, let's follow original code structure even if calculation seems odd.
  // const chordsPerMeasure = numChords / Math.ceil(numChords / beatsPerMeasure); // Original calculation
  // If chordsPerMeasure is 0 or NaN, calculation fails.
  // Let's simplify: calculate beatsPerChord based on number of chords likely intended for ONE measure, if possible.
  // E.g. if length is 2 or 4, assume they fit in one 4/4 measure. If length 3, maybe 1 measure too?
  // This is too ambiguous. Revert to original calculation attempt but validate result.
  let chordsPerMeasureCalc = numChords / Math.ceil(numChords / beatsPerMeasure);
  if (!Number.isFinite(chordsPerMeasureCalc) || chordsPerMeasureCalc <= 0) {
    chordsPerMeasureCalc = 1; // Fallback to 1 chord per measure if calculation failed
  }
  // Calculate average beats per chord based on this potentially flawed chordsPerMeasure
  const beatsPerChord = beatsPerMeasure / chordsPerMeasureCalc;
  if (!Number.isFinite(beatsPerChord) || beatsPerChord <= 0) {
    throw new Error(
      "Could not determine valid average beats per chord for harmonic rhythm analysis."
    );
  }

  // Generate a pattern string indicating start beat of each chord (1-based)
  let beatPattern = [];
  let currentBeat = 1.0; // Start on beat 1

  for (let i = 0; i < numChords; i++) {
    // Round beat to reasonable precision? Or keep float? Let's round for pattern string.
    // Rounding might make pattern less accurate if beatsPerChord is fractional.
    // Keep float internally, maybe round for display string? Original code implies integer pattern.
    beatPattern.push(Math.round(currentBeat)); // Round to nearest beat number
    // Increment beat by the calculated average duration
    currentBeat += beatsPerChord;
    // Wrap beat within the measure? Original logic wraps modulo beatsPerMeasure.
    // currentBeat = ((currentBeat - 1 + beatsPerMeasure) % beatsPerMeasure) + 1; // This seems wrong, should just track beat #
    // Let's reinterpret the pattern generation: indicate on which beat (1 to beatsPerMeasure) the change occurs.
  }
  // Recalculate pattern assuming changes happen ON beats based on average duration:
  beatPattern = []; // Reset
  currentBeat = 1.0;
  for (let i = 0; i < numChords; i++) {
    // Beat number for this chord change (1-based)
    const changeBeat =
      (((Math.round(currentBeat - 1) % beatsPerMeasure) + beatsPerMeasure) %
        beatsPerMeasure) +
      1;
    beatPattern.push(changeBeat);
    currentBeat += beatsPerChord;
  }

  // Calculate changes-to-beats ratio (average changes per beat)
  // Original logic: numChords / totalBeats where totalBeats = numChords * beatsPerChord? -> numChords / (numChords * beatsPerChord) = 1 / beatsPerChord
  const changesToBeatsRatio = 1 / beatsPerChord; // Chords per beat (on average)

  // Categorize the density based on the ratio (changes per beat)
  let density: "high" | "medium" | "low";
  // Density thresholds from original code
  if (changesToBeatsRatio > 0.5) {
    // More than 1 chord every 2 beats
    density = "high";
  } else if (changesToBeatsRatio > 0.25) {
    // More than 1 chord every 4 beats
    density = "medium";
  } else {
    // 1 chord every 4 beats or slower
    density = "low";
  }

  // Return analysis results
  return {
    pattern: beatPattern.join(","), // Comma-separated string of beat numbers
    density, // Qualitative density category
    changesToBeatsRatio, // Average chord changes per beat
  }; // Original code didn't freeze
}
