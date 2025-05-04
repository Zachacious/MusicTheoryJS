/**
 * @module Chord/Progression
 * @description
 * This module provides functions for creating, analyzing, and transforming chord progressions.
 * It allows generating progressions from various inputs like chord symbols, Roman numerals
 * within a scale context, diatonic scale degrees, or common named patterns. Analysis functions
 * check diatonicity and harmonic rhythm (heuristically). Basic transformation and suggestion
 * utilities are also included.
 */

// Import necessary Note types and functions
import {
  Accidental,
  Note,
  NoteLetter,
  createNoteFromParts,
  formatNote,
  transpose,
} from "../note";
// Import chord constants and types
import { COMMON_PROGRESSIONS, ROMAN_NUMERALS } from "./constants";
import { Chord, ChordOptions, ChordProgression, ChordQuality } from "./types";
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
      scaleType?: "major" | "minor";
      romanNumerals?: boolean;
    }
  > = {}
): ChordProgression {
  // --- Input Validation ---
  if (!progressionName || !COMMON_PROGRESSIONS[progressionName]) {
    throw new Error(`Unknown common progression name: ${progressionName}`);
  }
  if (!key) {
    throw new Error("Invalid key (root note) provided.");
  }
  // --- End Validation ---

  const progressionPattern = COMMON_PROGRESSIONS[progressionName];
  const scaleType = options.scaleType || "major";

  let keyNote: Note;
  if (typeof key === "string") {
    // Basic parse for key string: Letter + Optional Accidental
    const match = key.trim().match(/^([A-G])([#bxb]*|)/i);
    if (!match) throw new Error(`Invalid key string format: ${key}`);
    const [, letterStr, accidentalStr = ""] = match;
    const letter = letterStr.toUpperCase();
    const accidental = accidentalStr;

    // Validate parts before type assertion
    if (!/^[A-G]$/.test(letter))
      throw new Error(`Invalid key letter parsed: "${letter}"`);
    const validAccidentals = ["", "#", "b", "##", "x", "bb"];
    if (!validAccidentals.includes(accidental))
      throw new Error(`Invalid key accidental parsed: "${accidental}"`);

    try {
      keyNote = createNoteFromParts({
        letter: letter as NoteLetter, // Assert type after validation
        accidental: accidental as Accidental, // Assert type after validation
        octave: 4, // Default octave for key context
        includeCachedValues: options.includeCachedValues,
      });
    } catch (e) {
      throw new Error(
        `Failed to create key note from string "${key}": ${
          (e as Error).message
        }`
      );
    }
  } else {
    keyNote = key;
  }

  if (!keyNote) {
    // Double check after potential parsing
    throw new Error(`Failed to parse or use provided key: ${key}`);
  }

  const scale = createScale(keyNote, scaleType, { prefer: options.prefer });
  if (!scale) {
    throw new Error(
      `Failed to create ${scaleType} scale for key ${formatNote(keyNote)}`
    );
  }

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
      // const baseRoman = ROMAN_NUMERALS[degree] ?? `deg${degree}`; // Fallback if degree > 7? No, use map lookup.
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
    | "substitute"
    | "extend"
    | "secondary-dominant"
    | "modal-interchange",
  options: Partial<ChordOptions & { scale?: Scale }> = {}
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
  const scale = options.scale; // Optional scale context
  if (
    (transformation === "secondary-dominant" ||
      transformation === "modal-interchange") &&
    !scale
  ) {
    throw new Error(
      `Scale option is required for transformation type: ${transformation}`
    );
  }
  // --- End Validation ---

  // Process transformations - most return a new array directly or modify a copy
  const processedProgression = progression.map(
    (
      item // Ensure all items are processed if needed
    ) =>
      typeof item === "string" ? createChordFromSymbol(item, options) : item
  );

  switch (transformation) {
    case "substitute": {
      const result: ChordProgression = [];
      for (const chord of processedProgression) {
        if (!chord || typeof chord === "string") {
          result.push(chord || "");
          continue;
        } // Handle null/string pass-through

        let transformedChord: Chord | string = chord; // Default to original
        // Example: Replace V7 with vii°7 if scale context allows
        if (
          scale &&
          (chord.quality === "7" || chord.quality === "dom7") &&
          getScaleDegree(scale, chord.root) === 5
        ) {
          const leadingToneNote = getDegree(scale, 7);
          if (leadingToneNote) {
            try {
              transformedChord = createChord(leadingToneNote, "dim7", options);
            } catch (e) {
              console.warn(
                `Substitution failed for ${chord.symbol}: ${
                  (e as Error).message
                }`
              );
            }
          }
        }
        // Add other substitution rules here...
        result.push(transformedChord);
      }
      return result;
    }

    case "extend": {
      return processedProgression.map((chord) => {
        if (!chord || typeof chord === "string" || chord.category !== "triad") {
          return chord || ""; // Pass through non-triads or invalid items
        }
        let newQuality: ChordQuality | null = null;
        if (chord.quality === "major") newQuality = "maj7";
        else if (chord.quality === "minor") newQuality = "min7";
        else if (chord.quality === "diminished") newQuality = "half-dim7";
        else if (chord.quality === "augmented") newQuality = "aug7";
        else return chord; // Return original if triad type cannot be extended simply

        try {
          return createChord(chord.root, newQuality, options);
        } catch (e) {
          console.warn(
            `Could not extend chord ${chord.symbol}: ${(e as Error).message}`
          );
          return chord; // Return original on failure
        }
      });
    }

    case "secondary-dominant": {
      if (!scale) return progression; // Should be caught by validation, but safety check
      const result: ChordProgression = [];
      for (const chord of processedProgression) {
        if (!chord || typeof chord === "string") {
          result.push(chord || "");
          continue;
        }

        const targetDegree = getScaleDegree(scale, chord.root);
        const isPotentialTarget =
          targetDegree !== null && targetDegree !== 1 && targetDegree !== 7;

        if (isPotentialTarget) {
          // Add V7/x *before* x
          try {
            const secondaryDominantRoot = transpose(chord.root, 7, {
              prefer: options.prefer,
            });
            const secondaryDominantChord = createChord(
              secondaryDominantRoot,
              "7",
              options
            );
            result.push(secondaryDominantChord);
          } catch (e) {
            console.warn(
              `Could not create secondary dominant for ${chord.symbol}: ${
                (e as Error).message
              }`
            );
          }
        }
        result.push(chord); // Add the original/target chord
      }
      return result;
    }

    case "modal-interchange": {
      if (!scale) return progression; // Should be caught by validation
      const isScaleMajor = scale.name === "major" || scale.name === "ionian";
      const parallelScaleType = isScaleMajor ? "minor" : "major";
      let parallelScale: Scale | null = null;
      try {
        parallelScale = createScale(scale.root, parallelScaleType);
      } catch (e) {
        throw new Error(
          `Could not create parallel ${parallelScaleType} scale: ${
            (e as Error).message
          }`
        );
      }

      // Build new array immutably
      return processedProgression.map((chord) => {
        if (!chord || typeof chord === "string" || !chord.root) {
          return chord || "";
        }

        const degree = getScaleDegree(scale, chord.root);
        if (degree) {
          let substitute = false;
          if (isScaleMajor && (degree === 4 || degree === 2)) {
            substitute = true;
          } // Borrow iv, ii°/iim7b5 ?
          else if (
            !isScaleMajor &&
            (degree === 1 || degree === 4 || degree === 5)
          ) {
            substitute = true;
          } // Borrow I, IV, V?

          if (substitute) {
            try {
              const chordType =
                chord.category === "seventh" ||
                chord.category === "extended" ||
                chord.category === "altered"
                  ? "seventh"
                  : "triad";
              const borrowedChord = createDiatonicProgression(
                parallelScale,
                [degree],
                { chordType }
              )[0] as Chord;
              if (borrowedChord) return borrowedChord; // Return borrowed chord
            } catch (error) {
              console.warn(
                `Could not create borrowed chord for degree ${degree}: ${
                  (error as Error).message
                }`
              );
            }
          }
        }
        return chord; // Return original chord if no substitution applies or fails
      });
    }

    default: // Should not be reachable due to validation
      return [...progression]; // Return a copy
  }
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
  beatsPerMeasure: number = 4
): {
  // pattern: string; // Removed pattern as it was misleading without timing
  density: "high" | "medium" | "low";
  averageChordsPerMeasure: number;
  // changesToBeatsRatio: number; // Removed as it depended on flawed calculation
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

  const numChords = progression.length;

  // Simple density calculation: Average chords per measure (heuristic)
  // Assume common time for density thresholding unless specified otherwise
  const averageChordsPerMeasure =
    numChords / Math.ceil(numChords / beatsPerMeasure); // Keep original calculation for average metric

  // Use a simpler metric for density category: chords per beat (avg over the measure)
  // This assumes chords are somewhat evenly distributed.
  const chordsPerBeatAvg = averageChordsPerMeasure / beatsPerMeasure;

  // Categorize the density based on chords per beat
  let density: "high" | "medium" | "low";
  if (chordsPerBeatAvg > 0.9) {
    // Close to or more than 1 chord per beat
    density = "high";
  } else if (chordsPerBeatAvg > 0.4) {
    // Roughly 1 chord every 2 beats or more
    density = "medium";
  } else {
    // Slower than 1 chord every 2 beats
    density = "low";
  }

  return {
    // pattern: `(${numChords} chords)`, // Simplified pattern description
    density,
    averageChordsPerMeasure: isNaN(averageChordsPerMeasure)
      ? numChords
      : averageChordsPerMeasure, // Return numChords if calculation failed
    // changesToBeatsRatio: chordsPerBeatAvg, // Can report this if desired
  };
}
