/**
 * @module Chord/Roman
 * @description
 * This module provides functions specifically for working with Roman numeral analysis of chords.
 * It includes utilities for parsing Roman numeral symbols (e.g., "V7", "ii°", "IV6/4"),
 * creating Chord objects from Roman numerals within a specific scale context, analyzing
 * existing chords to determine their Roman numeral representation in a scale, and generating
 * sets of diatonic chords with their corresponding Roman numerals for a given scale.
 */

import {
  Chord,
  ChordInversion,
  ChordOptions,
  ChordQuality,
  RomanAnalysis,
  RomanNumeral,
} from "./types";
// Import chord constants (ROMAN_NUMERALS, SCALE_DEGREES_TO_ROMAN) and types
import { ROMAN_NUMERALS, SCALE_DEGREES_TO_ROMAN } from "./constants";
// Import Scale types and functions
import { Scale, getDegree, getScaleDegree } from "../scale";

// Import chord creation function
import { createChord } from "./creation";
// Import Note types and functions
import { notesAreEqual } from "../note"; // transpose unused here

// Note: createChordFromRomanNumeral and parseRomanNumeral are defined HERE, not imported.

/**
 * Defines the structure returned by parsing a Roman numeral string.
 * It breaks down the symbol into its constituent theoretical components.
 * @interface ParsedRomanNumeral
 * @property {RomanNumeral} numeral - The core Roman numeral string (e.g., "I", "ii", "VII").
 * @property {number} degree - The scale degree number (1-7) corresponding to the numeral.
 * @property {ChordQuality} quality - The inferred base chord quality (e.g., "major", "minor", "diminished", "augmented") before considering extensions/alterations explicitly listed.
 * @property {boolean} isMajor - True if the base numeral was uppercase (typically Major/Augmented), False if lowercase (typically minor/diminished).
 * @property {number} inversion - The inversion number derived from figured bass notation (0=root, 1=6, 2=6/4, 3=4/2 or 4/3). Defaults to 0.
 * @property {number[]} addedTones - Array of numbers representing added tones explicitly noted (e.g., [9] from "add9"). Currently only parses `addX`.
 * @property {string[]} alterations - Array of strings representing alterations explicitly noted (e.g., ["b5", "#9"]). Currently only parses `bX` or `#X` formats.
 */
export interface ParsedRomanNumeral {
  numeral: RomanNumeral; // The roman numeral string part (e.g., "I", "vii")
  degree: number; // The scale degree (1-7)
  quality: ChordQuality; // The base chord quality inferred
  isMajor: boolean; // Whether the numeral was uppercase
  inversion: number; // Inversion from figured bass (0, 1, 2, 3)
  addedTones: number[]; // Any added tones (9, 11, 13, etc) - simplified parsing
  alterations: string[]; // Any alterations (b5, #9, etc) - simplified parsing
}

/**
 * Parses a Roman numeral chord symbol string (e.g., "V7", "ii°", "I6", "IV+", "vii°7/V")
 * into its constituent parts: base numeral, degree, inferred quality, inversion, and basic alterations/extensions.
 *
 * @param symbol - The Roman numeral string to parse.
 * @returns A ParsedRomanNumeral object containing the components, or throws an error if parsing fails.
 * @throws {Error} If the input string is not a valid or recognizable Roman numeral format.
 * @remarks The parsing logic for quality, extensions, alterations, and inversions is simplified
 * and handles common cases. It may not cover all complex figured bass notations or alteration combinations.
 * Secondary functions (like "/V") are not parsed here. Case determines major/minor quality assumption.
 */
export function parseRomanNumeral(symbol: string): ParsedRomanNumeral {
  // --- Input Validation ---
  if (typeof symbol !== "string" || symbol.trim().length === 0) {
    throw new Error(`Invalid input: Roman numeral symbol cannot be empty.`);
  }
  const trimmedSymbol = symbol.trim();
  // --- End Validation ---

  // 1. Extract the base roman numeral part (I to VII, case sensitive)
  const numeralMatch = trimmedSymbol.match(/^([IVXivx]+)/); // Match one or more I, V, X chars, case sensitive
  if (!numeralMatch) {
    // No valid Roman numeral characters found at the beginning
    throw new Error(
      `Invalid roman numeral format: Symbol "${trimmedSymbol}" does not start with I, V, or X.`
    );
  }
  const numeralPart = numeralMatch[1]; // The captured numeral (e.g., "I", "vi", "VII")

  // 2. Determine if the base quality is major (uppercase) or minor (lowercase)
  const isMajor = /^[IVX]+$/.test(numeralPart); // True if only uppercase I, V, X used

  // 3. Get the corresponding scale degree number (1-7) from the constants map
  const degree = ROMAN_NUMERALS[numeralPart]; // Uses map handling both cases
  if (!degree) {
    // Should not happen if regex matched correctly, but check defensively
    throw new Error(`Unknown roman numeral base: ${numeralPart}`);
  }

  // 4. Parse the remaining part for quality symbols, extensions, inversions, alterations
  let quality: ChordQuality; // Initialize quality
  let inversion = 0; // Default to root position
  const addedTones: number[] = []; // Initialize arrays for extras
  const alterations: string[] = [];

  // Get the part of the symbol *after* the base numeral
  let remaining = trimmedSymbol.substring(numeralPart.length);

  // Check for primary quality symbols first: diminished (° or o), augmented (+)
  // These override the major/minor assumption from the numeral case.
  if (remaining.startsWith("°") || remaining.startsWith("o")) {
    quality = "diminished";
    remaining = remaining.substring(1); // Consume the symbol
  } else if (remaining.startsWith("+")) {
    quality = "augmented";
    remaining = remaining.substring(1); // Consume the symbol
  } else {
    // Default quality based on numeral case (major/minor triad)
    quality = isMajor ? "major" : "minor";
  }

  // Check for seventh chord indicators (e.g., "7", "maj7" - simple check)
  // This simplified logic assumes '7' means add a 7th interval based on initial quality.
  // It updates the quality variable. More robust parsing might handle "m7", "M7" prefixes differently.
  if (remaining.includes("maj7")) {
    // Check specific cases first
    quality = quality === "minor" ? "minMaj7" : "maj7"; // Handle minMaj7 vs maj7
    remaining = remaining.replace("maj7", "");
  } else if (remaining.includes("7")) {
    // Determine specific 7th quality based on triad quality
    if (quality === "major") quality = "7"; // Major triad + 7 -> Dominant 7
    else if (quality === "minor")
      quality = "min7"; // Minor triad + 7 -> Minor 7
    else if (quality === "diminished") quality = "half-dim7";
    // Dim triad + 7 -> Half-dim 7 (m7b5) - common default. Full dim7 is "o7" or "dim7"
    else if (quality === "augmented") quality = "aug7"; // Aug triad + 7 -> Augmented 7
    // Handle full dim7 symbol if quality was already dim
    if (
      (symbol.includes("o7") || symbol.includes("dim7")) &&
      quality === "half-dim7"
    ) {
      quality = "dim7"; // Correct to fully diminished if symbol indicates it
    }
    remaining = remaining.replace("7", ""); // Consume the "7"
  }
  // Note: This logic for sevenths is basic. Parsing "m7", "M7", etc. directly might be more robust.

  // Check for inversions using common figured bass symbols (6/4, 6, 4/3, 4/2)
  // Order matters: check for multi-char symbols first.
  if (remaining.includes("6/4")) {
    inversion = 2; // Second inversion
    remaining = remaining.replace("6/4", "");
  } else if (remaining.includes("4/3")) {
    // Third inversion (e.g., V4/3)
    inversion = 3;
    remaining = remaining.replace("4/3", "");
  } else if (remaining.includes("4/2")) {
    // Third inversion (e.g., V4/2)
    inversion = 3;
    remaining = remaining.replace("4/2", "");
  } else if (remaining.includes("6")) {
    // Must check after 6/4
    inversion = 1; // First inversion
    remaining = remaining.replace("6", "");
  }
  // Note: Doesn't handle more complex figured bass like 6/5, 7/5/3 etc.

  // Check for added tones (simple "addX" format from original code)
  // Match "add" followed by digits
  const addedMatch = remaining.match(/add(\d+)/i); // Case-insensitive add
  if (addedMatch) {
    const addedNum = parseInt(addedMatch[1], 10);
    if (!isNaN(addedNum)) addedTones.push(addedNum);
    remaining = remaining.replace(addedMatch[0], ""); // Consume "addX"
  }

  // Check for alterations (simple #X or bX format from original code)
  // Match # or b followed by digits, globally
  const alterationMatch = remaining.match(/[b#]\d+/g);
  if (alterationMatch) {
    // Add all found alteration strings (e.g., "b5", "#9")
    alterations.push(...alterationMatch);
    // Note: Original code didn't remove these from 'remaining'. Assume parsing is done.
  }

  // --- Final Assembly ---
  // The base 'quality' determined earlier might need refinement based on alterations found.
  // E.g. if V7 and alterations includes "b9", the effective quality might be considered "7b9".
  // This parser doesn't currently refine the quality based on alterations array.

  return {
    numeral: numeralPart as RomanNumeral, // The base numeral I, ii, etc.
    degree, // The scale degree 1-7
    quality, // The determined base quality (maj, min, dim, aug, 7, maj7 etc.)
    isMajor, // If the numeral was uppercase
    inversion, // 0, 1, 2, 3 based on figured bass found
    addedTones, // Array of added tones parsed (e.g., [9])
    alterations, // Array of alteration strings parsed (e.g., ["b5", "#9"])
  };
}

/**
 * Creates a Chord object from parsed Roman numeral information within the context of a given scale.
 *
 * @param romanInfo - Either a Roman numeral string (which will be parsed) or a pre-parsed `ParsedRomanNumeral` object.
 * @param scale - The Scale object providing the key context (tonic and notes) needed to determine the chord's root note and diatonic quality.
 * @param [options={}] - Optional settings for chord creation (passed to `createChord`). See {@link ChordOptions}.
 * @returns The created Chord object.
 * @throws {Error} If the Roman numeral is invalid, the scale is invalid, the degree is invalid for the scale, or chord creation fails.
 * @see {@link parseRomanNumeral} - For parsing details.
 * @see {@link createChord} - The underlying chord creation function used.
 * @example
 * ```ts
 * const cMajorScale = createScaleByName('C4', 'major');
 *
 * // Create from string
 * const g7Chord = createChordFromRomanNumeral("V7", cMajorScale);
 * console.log(g7Chord.symbol); // "G7"
 *
 * // Create from parsed object
 * const parsed = parseRomanNumeral("ii°6"); // Assuming minor scale context for ° -> dim
 * // In C Major, ii is Dm. Let's try ii in C Major. parsed quality might be 'minor'.
 * const parsed_ii = parseRomanNumeral("ii");
 * if(parsed_ii) {
 * const dMinorChord = createChordFromRomanNumeral(parsed_ii, cMajorScale);
 * console.log(dMinorChord.symbol); // "Dm"
 * }
 *
 * // Create V7/V? No, secondary dominants not handled by simple parseRomanNumeral.
 * ```
 */
export function createChordFromRomanNumeral(
  romanInfo: ParsedRomanNumeral | string, // Accept parsed object or string
  scale: Scale,
  options: Partial<ChordOptions> = {}
): Chord {
  // --- Input Validation ---
  if (!scale || !scale.root) {
    throw new Error("Invalid scale provided.");
  }
  if (!romanInfo) {
    throw new Error("Invalid romanInfo (string or object) provided.");
  }
  // --- End Validation ---

  // Parse the roman numeral string if necessary
  const parsedRoman =
    typeof romanInfo === "string" ? parseRomanNumeral(romanInfo) : romanInfo;

  // Validate parsed info
  if (
    !parsedRoman ||
    typeof parsedRoman.degree !== "number" ||
    !parsedRoman.quality
  ) {
    throw new Error(
      `Failed to parse or invalid Roman numeral info: ${romanInfo}`
    );
  }

  // Get the root Note object for this scale degree using the scale context
  const root = getDegree(scale, parsedRoman.degree); // getDegree is 1-based
  if (!root) {
    // If the degree doesn't exist in the scale (e.g., degree 8 in a 7-note scale)
    throw new Error(
      `Invalid scale degree ${parsedRoman.degree} for the provided scale.`
    );
  }

  // Determine the final quality to use. The parser gives a base quality.
  // TODO: Potentially refine quality based on parsed alterations? E.g. if quality='7' and alterations=['b5'], should quality become '7b5'?
  // Current implementation uses the quality directly from the parser.
  const qualityToCreate = parsedRoman.quality;

  // Create the chord using the determined root note, quality, and specified options.
  // Pass the parsed inversion number.
  // The `as ChordInversion` cast was present in the original code.
  const chord = createChord(root, qualityToCreate, {
    ...options, // Pass general options like prefer, includeCachedValues
    inversion: parsedRoman.inversion as ChordInversion, // Apply parsed inversion
    // Note: Parsed addedTones and alterations are not directly used by createChord currently.
    // Handling them would require modifications to createChord or createNotesFromFormula.
  });

  // Return the created chord object
  return chord;
}

/**
 * Analyzes a Chord object within a given scale context to determine its Roman numeral representation.
 * Finds the scale degree of the chord's root and formats the Roman numeral based on the chord's quality and inversion.
 * Attempts to handle enharmonically spelled roots.
 *
 * @param chord - The Chord object to analyze.
 * @param scale - The Scale object providing the key context.
 * @returns A RomanAnalysis object containing the full numeral string, degree, quality suffix, etc., or `null` if the chord's root is not diatonic to the scale (even enharmonically).
 * @throws {Error} If chord or scale inputs are invalid.
 * @see {@link RomanAnalysis} - The structure of the returned analysis object.
 * @example
 * ```ts
 * const cMajorScale = createScaleByName('C4', 'major');
 * const g7Chord = createChordFromSymbol("G7");
 * const analysis = analyzeChordAsRomanNumeral(g7Chord, cMajorScale);
 * if (analysis) {
 * console.log(analysis.numeral); // "V7"
 * console.log(analysis.degree); // 5
 * }
 *
 * const dMinorChord = createChord({ root: createNote('D4'), quality: 'minor'});
 * const analysis2 = analyzeChordAsRomanNumeral(dMinorChord, cMajorScale);
 * if(analysis2) {
 * console.log(analysis2.numeral); // "ii"
 * }
 * ```
 */
export function analyzeChordAsRomanNumeral(
  chord: Chord,
  scale: Scale
): RomanAnalysis | null {
  // RomanAnalysis defined in ./types
  // --- Input Validation ---
  if (!chord || !chord.root || !chord.quality) {
    throw new Error("Invalid chord provided for Roman numeral analysis.");
  }
  if (!scale || !scale.notes || !scale.root) {
    throw new Error("Invalid scale provided for Roman numeral analysis.");
  }
  // --- End Validation ---

  // Get the scale degree of the chord's root note's pitch class
  let degree = getScaleDegree(scale, chord.root); // Returns 1-based degree or null

  // If the root's exact spelling/pitch class isn't found, check for enharmonic equivalents
  if (degree === null) {
    let foundEnharmonic = false;
    // Iterate through scale notes to find a note with the same pitch class
    for (const scaleNote of scale.notes) {
      // Using notesAreEqual (pitch equality check) might be safer than just PC check
      if (notesAreEqual(scaleNote, chord.root)) {
        // Check if pitch matches
        // Found an enharmonically equivalent note in the scale. Get its degree.
        const enharmonicDegree = getScaleDegree(scale, scaleNote);
        if (enharmonicDegree !== null) {
          degree = enharmonicDegree; // Use the degree of the enharmonic equivalent
          foundEnharmonic = true;
          break; // Stop searching once found
        }
      }
      // Original code compared pitchClassIndex directly. Keeping that logic:
      /*
           if (scaleNote.pitchClassIndex === chord.root.pitchClassIndex) {
               const enharmonicDegree = getScaleDegree(scale, scaleNote); // Should return degree if PC matches
               if (enharmonicDegree !== null) {
                  degree = enharmonicDegree;
                  foundEnharmonic = true;
                  break;
               }
           }
           */
    }

    // If still no degree found after checking enharmonics, the chord is non-diatonic by root.
    if (!foundEnharmonic) {
      return null; // Root (enharmonically) not in scale
    }
  }

  // If a degree was found (either directly or enharmonically)
  if (degree !== null) {
    // Delegate to the internal helper function to format the Roman numeral string
    return analyzeChordWithDegree(chord, scale, degree);
  }

  // Should be unreachable if logic above is correct, but return null as fallback
  return null;
}

/**
 * @internal
 * Internal helper function to format the Roman numeral string and analysis details
 * once the chord, scale, and scale degree of the chord's root are known.
 *
 * @param chord - The Chord object being analyzed.
 * @param scale - The Scale context.
 * @param degree - The 1-based scale degree of the chord's root within the scale.
 * @returns A RomanAnalysis object.
 */
function analyzeChordWithDegree(
  chord: Chord,
  scale: Scale, // Scale parameter kept from original signature, though not used in this specific logic block
  degree: number // 1-based degree
): RomanAnalysis {
  // Returns RomanAnalysis object
  // Determine if the chord quality is generally Major/Augmented (uppercase numeral)
  // or minor/diminished (lowercase numeral). Based on simple quality name checks.
  const isMajorQuality =
    chord.quality === "major" || // Include base major triad
    chord.quality === "augmented" ||
    chord.quality === "7" || // Dominant 7th is major triad based
    chord.quality === "maj7" || // Major 7th
    chord.quality === "aug7" || // Augmented 7th
    // Include extended chords based on major/dominant
    chord.quality === "9" ||
    chord.quality === "11" ||
    chord.quality === "13" ||
    chord.quality === "maj9" ||
    chord.quality === "maj11" ||
    chord.quality === "maj13" ||
    chord.quality === "6" ||
    chord.quality === "6/9"; // Add 6th chords? Yes, major 6th is major based.

  // Get the base Roman numeral (I-VII) using the degree and major/minor case
  const romanNumeralBase =
    SCALE_DEGREES_TO_ROMAN[degree]?.[isMajorQuality ? "true" : "false"];
  // Fallback if degree is outside 1-7 (shouldn't happen if called correctly)
  if (!romanNumeralBase) {
    console.warn(`Could not find Roman numeral for degree ${degree}.`);
    // Return partial analysis? Or throw? Returning partial analysis.
    return {
      numeral: `deg${degree}?`,
      degree,
      isMajor: isMajorQuality,
      quality: "?",
      inversion: "",
      scale,
    };
  }

  // --- Format the quality suffix ---
  let qualitySuffix = "";
  if (chord.quality === "diminished" || chord.quality.includes("dim")) {
    // Check includes for dim7 etc.
    qualitySuffix = "°";
  } else if (chord.quality === "augmented") {
    // Check includes aug7? No, '+' is usually triad.
    qualitySuffix = "+";
  }
  // Add 7th indicator if quality name contains '7'
  if (chord.quality.includes("7")) {
    // Distinguish maj7? Original didn't explicitly.
    // if (chord.quality === "maj7" && !isMajorQuality) { // Check was (!isMajor) - seems wrong? Should be if it IS major quality?
    //    // Original logic seemed potentially reversed. Roman numeral case handles base quality.
    // }
    // Just add '7' if it's any kind of 7th chord (except dim/aug handled above)
    if (qualitySuffix === "")
      qualitySuffix = "7"; // Add 7 if no dim/aug suffix yet
    else if (qualitySuffix === "°" && chord.quality === "dim7")
      qualitySuffix += "7"; // Add 7 for dim7 -> °7
    else if (qualitySuffix === "+" && chord.quality === "aug7")
      qualitySuffix += "7"; // Add 7 for aug7 -> +7
    // Handle half-dim: ø7
    if (chord.quality === "half-dim7") qualitySuffix = "ø7";
  }

  // --- Format inversion as figured bass suffix ---
  let inversionStr = "";
  // Use chord's inversion property (assuming it was calculated correctly)
  const inversion = chord.inversion ?? 0; // Default to 0 if undefined

  if (inversion === 1) {
    // First inversion
    inversionStr = "6"; // Figured bass '6'
    // Sometimes 6/3, but 6 is common shorthand
  } else if (inversion === 2) {
    // Second inversion
    inversionStr = "6/4"; // Figured bass '6/4'
  } else if (inversion === 3) {
    // Third inversion (for 7th chords)
    // Common figures are 4/3 or 4/2 (sometimes just 2)
    inversionStr = "4/2"; // Or "4/3"? Use "4/2" based on original code.
  }

  // Combine all components: Base Numeral + Quality Suffix + Inversion Suffix
  const fullNumeral = romanNumeralBase + qualitySuffix + inversionStr;

  // Return the full analysis object
  return {
    numeral: fullNumeral, // The complete Roman numeral string
    degree, // The 1-based scale degree
    isMajor: isMajorQuality, // If the base triad quality is Major/Augmented
    quality: qualitySuffix, // The suffix indicating quality/seventh (e.g., "°", "+", "7", "maj7")
    inversion: inversionStr, // The figured bass string for inversion ("6", "6/4", "4/2")
    scale, // Include the scale context
  }; // Original code didn't freeze
}

/**
 * Generates an array containing all diatonic chords (triads or sevenths) for a given scale,
 * along with their corresponding Roman numeral analysis within that scale.
 *
 * @param scale - The Scale object (typically diatonic like major or minor).
 * @param [options={}] - Optional settings.
 * @param [options.chordType='triad'] - Specifies whether to generate 'triad' or 'seventh' chords.
 * @param [options.prefer] - Enharmonic preference passed to chord creation.
 * @param [options.includeCachedValues] - Cache flag passed to chord creation.
 * @returns An array of objects, each containing the diatonic `chord` (Chord object) and its `roman` (RomanAnalysis object) representation for each degree of the scale. Returns empty array if scale is invalid or has fewer than 7 notes? (Check createDiatonicChord dependency)
 * @throws {Error} If the input scale is invalid or chord creation/analysis fails for a degree.
 * @see {@link createDiatonicChord} - Used to generate the chords.
 * @see {@link analyzeChordAsRomanNumeral} - Used to analyze the generated chords.
 * @example
 * ```ts
 * const cMajorScale = createScaleByName('C4', 'major');
 * const diatonicTriads = getAllDiatonicChords(cMajorScale, { chordType: 'triad' });
 * diatonicTriads.forEach(item => console.log(`${item.roman.numeral}: ${item.chord.symbol}`));
 * // Output:
 * // I: C
 * // ii: Dm
 * // iii: Em
 * // IV: F
 * // V: G
 * // vi: Am
 * // vii°: Bdim
 *
 * const diatonicSevenths = getAllDiatonicChords(cMajorScale, { chordType: 'seventh' });
 * diatonicSevenths.forEach(item => console.log(`${item.roman.numeral}: ${item.chord.symbol}`));
 * // Output:
 * // Imaj7: Cmaj7
 * // ii7: Dm7
 * // iii7: Em7
 * // IVmaj7: Fmaj7
 * // V7: G7
 * // vi7: Am7
 * // viiø7: Bm7b5 (or Bø7)
 * ```
 */
export function getAllDiatonicChords(
  scale: Scale,
  options: Partial<
    ChordOptions & {
      // Include standard ChordOptions
      chordType?: "triad" | "seventh"; // Type of diatonic chord to generate
    }
  > = {}
): { chord: Chord; roman: RomanAnalysis }[] {
  // Return array of pairs
  // --- Input Validation ---
  if (!scale || !scale.notes || scale.notes.length === 0) {
    throw new Error("Invalid or empty scale provided to getAllDiatonicChords.");
  }
  // Analysis typically assumes heptatonic, but function will run for any scale length
  // if (scale.notes.length !== 7) { console.warn(...) }
  // --- End Validation ---

  const chordType = options.chordType || "triad"; // Default to triads
  const results: { chord: Chord; roman: RomanAnalysis }[] = []; // Initialize result array

  // Generate a chord for each scale degree (1 to scale length)
  for (let degree = 1; degree <= scale.notes.length; degree++) {
    try {
      // Get the diatonic chord built on this scale degree
      // Assumes createDiatonicChord is available and correctly calculates quality
      // The `as Chord` cast was present in the original code.
      const chord = createDiatonicChord(scale, degree, {
        // Pass down relevant options from input options
        prefer: options.prefer,
        includeCachedValues: options.includeCachedValues,
        tuningSystem: options.tuningSystem,
        // Specify the chord type (triad or seventh)
        chordType,
      }) as Chord; // Assuming createDiatonicChord returns Chord | string based on romanNumerals option; needs check. Let's assume it returns Chord here.

      // Analyze the created chord to get its Roman numeral representation within this scale
      const roman = analyzeChordAsRomanNumeral(chord, scale);

      // If analysis was successful, add the pair to the results
      if (roman) {
        results.push({ chord, roman });
      } else {
        // This shouldn't happen if the chord was created diatonically, but log if it does.
        console.warn(
          `Could not analyze diatonic chord created for degree ${degree}.`
        );
      }
    } catch (error) {
      // Log error but continue to next degree if chord creation/analysis fails
      console.error(
        `Error processing diatonic chord for degree ${degree}: ${
          (error as Error).message
        }`
      );
      continue;
    }
  }

  // Return the array of {chord, roman} pairs
  return results; // Original code didn't freeze
}

/**
 * Creates the diatonic chord (triad or seventh) built on a specific degree of a given scale.
 * It determines the chord's quality (major, minor, diminished, etc.) based on the intervals
 * formed by stacking thirds using notes available *within the scale*.
 *
 * @param scale - The Scale object providing the key context and notes.
 * @param degree - The 1-based scale degree on which to build the chord (e.g., 1 for tonic, 5 for dominant).
 * @param [options={}] - Optional settings.
 * @param [options.chordType='triad'] - Specifies whether to generate a 'triad' or 'seventh' chord.
 * @param [options.prefer] - Enharmonic preference passed to chord creation.
 * @param [options.includeCachedValues] - Cache flag passed to chord creation.
 * @returns The generated diatonic Chord object.
 * @throws {Error} If the scale is invalid, the degree is invalid, or the diatonic chord quality cannot be determined from the scale notes.
 * @remarks This function calculates chord quality by finding the 3rd, 5th, (and 7th) scale degrees relative to the input degree and checking the intervals formed. It assumes standard tertian (stacked thirds) harmony.
 * Note: This function appears duplicated in `progression.ts` in the user's original code structure. This documentation describes this specific instance.
 */
export function createDiatonicChord(
  scale: Scale,
  degree: number, // 1-based degree
  options: Partial<
    ChordOptions & {
      /** Type of chord to build (triad or seventh). Default: 'triad' */
      chordType?: "triad" | "seventh";
    }
  > = {}
): Chord {
  // Returns Chord object
  // --- Input Validation ---
  if (!scale || !scale.notes || scale.notes.length === 0) {
    throw new Error("Invalid or empty scale provided.");
  }
  if (!Number.isInteger(degree) || degree <= 0) {
    // Basic check for positive integer
    throw new Error(
      `Invalid scale degree: ${degree}. Must be a positive integer.`
    );
  }
  // --- End Validation ---

  const chordType = options.chordType || "triad"; // Default to triads

  // Get the root note for this scale degree using the scale helper
  const root = getDegree(scale, degree);
  if (!root) {
    // Handle invalid degree for the given scale length
    throw new Error(
      `Invalid scale degree: ${degree} for scale with ${scale.notes.length} notes.`
    );
  }

  // --- Determine Chord Quality based on Scale Intervals ---
  const scaleNotes = scale.notes;
  const notesInScale = scaleNotes.length; // Use actual scale length for modulo

  // Find the 1-based degree index for the third, fifth, and seventh ABOVE the root degree, wrapping around the scale
  // Example: if root is degree 2, third is degree 4, fifth is degree 6 (in a 7-note scale)
  // Original modulo logic seemed potentially off by 1? (degree + 1) % N should be degree+2? Let's verify.
  // Root=1 (idx 0). Third=3 (idx 2). Fifth=5 (idx 4). Seventh=7 (idx 6).
  // Degree 1 -> Third is 1+2=3. Fifth is 1+4=5. Seventh is 1+6=7.
  // Degree 2 -> Third is 2+2=4. Fifth is 2+4=6. Seventh is 2+6=8 -> wraps to 1.
  // Degree 'd'. Third is degree 'd+2'. Fifth is degree 'd+4'. Seventh is degree 'd+6'.
  // Need 1-based degrees for getDegree function.
  const thirdDegreeNum = ((degree - 1 + 2) % notesInScale) + 1; // Calculate target degree number (1-based)
  const fifthDegreeNum = ((degree - 1 + 4) % notesInScale) + 1;
  const seventhDegreeNum = ((degree - 1 + 6) % notesInScale) + 1;

  // Get the actual Note objects for these diatonic scale degrees
  const thirdNote = getDegree(scale, thirdDegreeNum);
  const fifthNote = getDegree(scale, fifthDegreeNum);
  // Only get seventhNote if needed
  const seventhNote =
    chordType === "seventh" ? getDegree(scale, seventhDegreeNum) : null;

  // Check if required notes (3rd, 5th) were found
  if (!thirdNote || !fifthNote) {
    // This might happen with very small scales or invalid degree logic
    throw new Error(
      `Could not determine chord quality for scale degree ${degree}: failed to find diatonic 3rd or 5th.`
    );
  }
  // Also check seventh if needed
  if (chordType === "seventh" && !seventhNote) {
    throw new Error(
      `Could not determine seventh chord quality for scale degree ${degree}: failed to find diatonic 7th.`
    );
  }

  // Calculate intervals (semitones) from the chord's root to the diatonic 3rd/5th/7th
  // Ensure positive modulo result
  const thirdInterval =
    (thirdNote.pitchClassIndex - root.pitchClassIndex + 12) % 12;
  const fifthInterval =
    (fifthNote.pitchClassIndex - root.pitchClassIndex + 12) % 12;

  // --- Determine Triad Quality ---
  let quality: ChordQuality;
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
    // If intervals don't match standard triads built diatonically
    console.warn(
      `Unusual diatonic triad intervals at degree ${degree}: 3rd=${thirdInterval}, 5th=${fifthInterval}.`
    );
    // Fallback or throw? Original code threw error.
    throw new Error(
      `Cannot determine standard diatonic triad quality at scale degree ${degree}.`
    );
  }

  // --- Adjust Quality for Seventh Chords ---
  if (chordType === "seventh" && seventhNote) {
    // Ensure seventhNote is valid
    // Calculate seventh interval relative to the root
    const seventhInterval =
      (seventhNote.pitchClassIndex - root.pitchClassIndex + 12) % 12;

    // Determine common 7th quality based on triad and 7th interval
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
      // m3, P5, M7
      quality = "minMaj7";
    } else if (quality === "diminished" && seventhInterval === 10) {
      // m3, d5, m7
      quality = "half-dim7"; // m7b5
    } else if (quality === "diminished" && seventhInterval === 9) {
      // m3, d5, d7(bb7)
      // Note: Original code checked interval 8 (Major 6th?) for dim7, seems incorrect. Should be bb7 (9 semitones from root).
      quality = "dim7"; // Fully diminished 7th
    } else if (quality === "augmented" && seventhInterval === 10) {
      // M3, A5, m7
      quality = "aug7";
    }
    // Else: If seventh interval doesn't form a standard type with the triad,
    // the quality remains the determined triad quality. Original code had no explicit fallback here.
  }

  // Create the final chord object using the determined root and quality
  // Pass down other relevant options from the input options object
  return createChord(root, quality, options);
}
