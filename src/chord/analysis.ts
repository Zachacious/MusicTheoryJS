/**
 * @module Chord/Analysis
 * @description
 * This module provides functions for analyzing musical chords represented by arrays of Notes.
 * Capabilities include identifying the chord's root and quality, determining inversion,
 * finding tensions and alterations relative to standard formulas, analyzing harmonic function
 * within a scale context, comparing chords, and performing basic microtonal chord identification.
 */

// Import chord constants and types
import { CHORD_FORMULAS, SCALE_DEGREE_SEMITONES } from "./constants";
import { Chord, ChordQuality } from "./types"; // ChordFormula seems unused here
// Import necessary Note types and functions
import {
  Note,
  PitchClassIndex,
  compareNotes,
  getCentsBetween,
  intervalBetween,
  notesAreEqual,
} from "../note";
// Import necessary Scale types and functions
import { Scale, getScaleDegree } from "../scale";

// Import chord identification function from creation module
import { identifyChord } from "./creation";

// Import calculation function needed for microtonal detection
// import { intervalInCents } from "../note/calculations"; // Note: Assumes correct relative path

/**
 * Defines the structure for the detailed analysis results of a chord.
 * @interface ChordAnalysisResult
 * @property {Note} root - The identified root Note of the chord.
 * @property {ChordQuality} quality - The identified quality or type of the chord (e.g., "major", "min7", "sus4").
 * @property {boolean} isStandardChord - True if the input notes exactly match the standard formula for the identified quality (no missing essential tones, no extra tones).
 * @property {Note} bass - The lowest sounding Note in the input array.
 * @property {number} inversion - The inversion of the chord (0 for root position, 1 for first inversion, etc.), based on which chord tone (from the formula) is in the bass.
 * @property {string[]} tensions - An array of strings representing identified tensions or extensions (e.g., "9", "b9", "#11", "13") present in the chord beyond the basic triad or seventh.
 * @property {string[]} missingNotes - An array of strings representing essential chord tones (from the formula) that were *not* found in the input notes (e.g., "5" if the fifth is missing from a triad).
 * @property {string[]} extraNotes - An array of strings attempting to identify notes present in the input that are *not* part of the standard chord formula (e.g., "add4", "#2"). Identification is based on the closest scale degree.
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
 * Analyzes an array of notes to determine the chord's root, quality, inversion,
 * bass note, tensions, and any missing or extra notes compared to standard formulas.
 *
 * @param notes - An array of Note objects representing the chord. Must contain at least 2 notes.
 * @returns A ChordAnalysisResult object containing the analysis details, or `null` if the chord cannot be identified or has fewer than 2 notes.
 * @throws {Error} If chord identification fails internally (though `identifyChord` might return null instead).
 * @remarks Relies on `identifyChord` to find the root/quality and `CHORD_FORMULAS` / `SCALE_DEGREE_SEMITONES` for comparison. Tension/extra note identification logic is based on comparing input pitch classes to expected formula pitch classes and standard degree intervals. Bass note is the lowest note by pitch in the input array. Inversion is determined by finding the formula degree corresponding to the bass note's pitch class.
 * @example
 * ```ts
 * // Assuming identifyChord and createNote exist and work as expected
 * const cMajor7Notes = ['C4', 'E4', 'G4', 'B4'].map(s => createNote(s));
 * const analysis = analyzeChord(cMajor7Notes);
 * if (analysis) {
 * console.log(analysis.root.notation); // "C4" (or equivalent C note)
 * console.log(analysis.quality); // "maj7"
 * console.log(analysis.bass.notation); // "C4"
 * console.log(analysis.inversion); // 0
 * console.log(analysis.isStandardChord); // true
 * console.log(analysis.tensions); // []
 * console.log(analysis.missingNotes); // []
 * console.log(analysis.extraNotes); // []
 * }
 *
 * const cAdd9Notes = ['C4', 'E4', 'G4', 'D5'].map(s => createNote(s));
 * const analysis2 = analyzeChord(cAdd9Notes);
 * if (analysis2) {
 * console.log(analysis2.quality); // "major" (identifyChord likely returns base triad)
 * console.log(analysis2.extraNotes); // ['9'] (if logic correctly identifies D as the 9th)
 * console.log(analysis2.isStandardChord); // false
 * }
 * ```
 */
export function analyzeChord(notes: Note[]): ChordAnalysisResult | null {
  // Need at least 2 notes
  if (!Array.isArray(notes) || notes.length < 2) {
    return null;
  }
  const validNotes = notes.filter((n) => n != null);
  if (validNotes.length < 2) {
    return null;
  }

  // Identify the basic chord using the imported function
  const identified = identifyChord(validNotes);
  if (!identified) {
    return null;
  }
  const { root, quality } = identified;
  const formula = CHORD_FORMULAS[quality];

  if (!formula) {
    console.warn(
      `Analysis limited: No standard formula found for chord quality "${quality}".`
    );
    const sortedNotes = [...validNotes].sort((a, b) =>
      compareNotes(a, b, true)
    ); // Correct sort
    return Object.freeze({
      // Freeze result
      root,
      quality,
      isStandardChord: false,
      bass: sortedNotes[0],
      inversion: 0, // Cannot determine without formula
      tensions: [],
      missingNotes: ["formula_unknown"],
      extraNotes: [],
    });
  }

  const actualPitchClasses = [
    ...new Set(validNotes.map((note) => note.pitchClassIndex)),
  ];
  const expectedPitchClasses: number[] = [];
  const scaleDegrees = Object.keys(formula)
    .map((d) => parseInt(d, 10))
    .sort((a, b) => a - b); // Ensure sorted degrees

  if (!scaleDegrees.includes(1)) scaleDegrees.unshift(1); // Ensure root degree exists

  for (const degree of scaleDegrees) {
    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) continue;
    const alteration = formula[degree] ?? 0; // Default alteration to 0 if missing
    semitones += alteration;
    const expectedPC = (root.pitchClassIndex + semitones + 12) % 12;
    expectedPitchClasses.push(expectedPC);
  }
  const uniqueExpectedPCs = [...new Set(expectedPitchClasses)];

  // Determine tensions (degrees > standard structure)
  const tensions: string[] = [];
  const standardDegreesMax =
    quality.includes("7") ||
    quality.includes("9") ||
    quality.includes("11") ||
    quality.includes("13")
      ? 7
      : 5;
  for (const degree of scaleDegrees) {
    if (degree > standardDegreesMax) {
      const alteration = formula[degree] ?? 0;
      const degreeName =
        alteration < 0
          ? `b${degree}`
          : alteration > 0
          ? `#${degree}`
          : `${degree}`;
      tensions.push(degreeName);
    }
  }

  // Find missing notes
  const missingNotes: string[] = [];
  const actualPCSet = new Set(actualPitchClasses); // Use Set for faster lookup
  for (let i = 0; i < scaleDegrees.length; i++) {
    const degree = scaleDegrees[i];
    // Only check for missing essential tones (<= standardDegreesMax), not tensions themselves
    if (degree > standardDegreesMax) continue;

    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) continue;
    const alteration = formula[degree] ?? 0;
    semitones += alteration;
    const expectedPC = (root.pitchClassIndex + semitones + 12) % 12;
    if (!actualPCSet.has(expectedPC as PitchClassIndex)) {
      const degreeName =
        alteration < 0
          ? `b${degree}`
          : alteration > 0
          ? `#${degree}`
          : `${degree}`;
      missingNotes.push(degreeName);
    }
  }

  // Find extra notes and attempt to name them more robustly
  const extraNotes: string[] = [];
  const expectedPCSet = new Set(uniqueExpectedPCs); // Use Set for faster lookup
  for (const actualPC of actualPitchClasses) {
    if (!expectedPCSet.has(actualPC)) {
      let bestDegreeName = "?";
      let smallestDiff = 6;
      let exactInterval = (actualPC - root.pitchClassIndex + 12) % 12; // Interval from root

      for (const [degreeStr, baseSemitones] of Object.entries(
        SCALE_DEGREE_SEMITONES
      )) {
        const degreePC = (root.pitchClassIndex + baseSemitones + 12) % 12;
        const diff = Math.min(
          (actualPC - degreePC + 12) % 12,
          (degreePC - actualPC + 12) % 12
        );

        if (diff < smallestDiff) {
          smallestDiff = diff;
          // Naming based on comparison to the closest standard degree interval
          const intervalDiff = exactInterval - baseSemitones;
          if (
            Math.abs(intervalDiff) < 1e-6 ||
            Math.abs(intervalDiff - 12) < 1e-6 ||
            Math.abs(intervalDiff + 12) < 1e-6
          ) {
            // Roughly equal
            bestDegreeName = degreeStr; // Natural
          } else if (intervalDiff === 1 || intervalDiff === -11) {
            // One semitone sharp
            bestDegreeName = `#${degreeStr}`;
          } else if (intervalDiff === -1 || intervalDiff === 11) {
            // One semitone flat
            bestDegreeName = `b${degreeStr}`;
          } else {
            // Could add double sharp/flat or just indicate difference
            bestDegreeName = `~${degreeStr}`; // Indicate it's near this degree but altered more
          }
        }
      }
      extraNotes.push(bestDegreeName);
    }
  }

  // Sort the input notes by pitch correctly to find the bass note
  const sortedNotes = [...validNotes].sort((a, b) => compareNotes(a, b, true)); // Use precise compare
  const bass = sortedNotes[0];

  // Determine inversion
  let inversion = 0;
  const bassPC = bass.pitchClassIndex;
  if (!notesAreEqual(bass, root)) {
    // Check pitch equality
    for (let i = 0; i < scaleDegrees.length; i++) {
      const degree = scaleDegrees[i];
      let semitones = SCALE_DEGREE_SEMITONES[degree];
      if (semitones === undefined) continue;
      const alteration = formula[degree] ?? 0;
      semitones += alteration;
      const expectedPC = (root.pitchClassIndex + semitones + 12) % 12;
      if (expectedPC === bassPC) {
        inversion = i;
        break;
      }
    }
  }

  // Determine if standard chord voicing (essential notes present, no extra notes)
  // Only check for missing essential degrees (<= standardDegreesMax)
  const essentialDegrees = scaleDegrees.filter((d) => d <= standardDegreesMax);
  let hasMissingEssential = false;
  for (const degree of essentialDegrees) {
    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) continue;
    const alteration = formula[degree] ?? 0;
    semitones += alteration;
    const expectedPC = (root.pitchClassIndex + semitones + 12) % 12;
    if (!actualPCSet.has(expectedPC as PitchClassIndex)) {
      hasMissingEssential = true;
      break;
    }
  }
  const isStandardChord = !hasMissingEssential && extraNotes.length === 0;

  // Return the analysis results, frozen
  return Object.freeze({
    root,
    quality,
    isStandardChord,
    bass,
    inversion,
    tensions,
    missingNotes, // List of missing essential and non-essential degrees based on formula
    extraNotes,
  });
}

/**
 * Checks if a given chord (represented by a Chord object or an array of Notes)
 * fits within a specified scale. A chord fits if all of its unique pitch classes
 * are present in the scale.
 *
 * @param chord - The Chord object or array of Notes to check.
 * @param scale - The Scale object to check against.
 * @returns An object containing:
 * - `fits`: boolean - True if all chord pitch classes are in the scale's pitch class set.
 * - `chordDegree`: number | null - The 1-based scale degree of the chord's root within the scale (null if root's pitch class is not in the scale).
 * - `nonScaleNotes`: Note[] - An array containing the specific Note instances from the chord whose pitch classes were not found in the scale.
 * @throws {Error} If chord or scale inputs are invalid or lack necessary properties.
 * @example
 * ```ts
 * const cMajorScale = createScaleByName('C4', 'major');
 * const cMajorChord = { root: createNote('C4'), notes: [...] }; // Assume Chord object
 * const dMinorChord = { root: createNote('D4'), notes: [...] };
 * const dMajorChord = { root: createNote('D4'), notes: [createNote('D4'), createNote('F#4'), createNote('A4')] };
 *
 * const result1 = chordFitsScale(cMajorChord, cMajorScale);
 * // -> { fits: true, chordDegree: 1, nonScaleNotes: [] }
 * const result2 = chordFitsScale(dMinorChord, cMajorScale);
 * // -> { fits: true, chordDegree: 2, nonScaleNotes: [] }
 * const result3 = chordFitsScale(dMajorChord, cMajorScale);
 * // -> { fits: false, chordDegree: 2, nonScaleNotes: [ Note{F#4} ] }
 * ```
 */
export function chordFitsScale(
  chord: Chord | Note[], // Allow Chord object or just notes array
  scale: Scale
): {
  fits: boolean;
  chordDegree: number | null; // 1-based degree of root in scale
  nonScaleNotes: Note[]; // Notes from chord not in scale (pitch class check)
} {
  // --- Input Validation & Setup ---
  if (!scale || !scale.notes) {
    // Basic scale validation
    throw new Error("Invalid scale provided to chordFitsScale.");
  }
  // Determine chord notes and root, handling both input types
  const chordNotes = Array.isArray(chord) ? chord : chord?.notes;
  // If array, assume first note is root for degree check? Or require Chord object?
  // Let's try to get root from Chord object or first note of array.
  const chordRoot = Array.isArray(chord) ? chord[0] : chord?.root;
  if (!Array.isArray(chordNotes) || chordNotes.length === 0 || !chordRoot) {
    throw new Error(
      "Invalid chord or note array provided (must have notes and determinable root)."
    );
  }
  // Filter invalid notes just in case
  const validChordNotes = chordNotes.filter((n) => n != null);
  if (validChordNotes.length === 0) {
    throw new Error("Chord contains no valid notes.");
  }
  // --- End Validation ---

  // Create a Set of pitch classes present in the scale for efficient lookup
  const scalePitchClasses = new Set(scale.notes.map((n) => n.pitchClassIndex));

  // Check if the chord's root note's pitch class is in the scale
  const rootDegree = getScaleDegree(scale, chordRoot); // getScaleDegree checks pitch class

  // Check each unique note (by pitch class) in the chord
  const nonScaleNotes: Note[] = [];
  const checkedPCs = new Set<number>(); // Avoid duplicate checks/additions

  for (const note of validChordNotes) {
    const pc = note.pitchClassIndex;
    if (checkedPCs.has(pc)) continue; // Skip if PC already processed

    // Check if this pitch class exists in the scale's set
    if (!scalePitchClasses.has(pc)) {
      nonScaleNotes.push(note); // Add the specific note instance that doesn't fit
    }
    checkedPCs.add(pc); // Mark this pitch class as checked
  }

  // The chord fits if the array of non-scale notes is empty
  const fits = nonScaleNotes.length === 0;

  // Return analysis result
  return {
    fits,
    chordDegree: rootDegree, // Degree of the root (may be null)
    nonScaleNotes, // Array of specific notes not fitting scale pitch classes
  }; // Original code didn't freeze here
}

/**
 * Finds the common notes (by pitch class) between two chords and calculates
 * a simple voice-leading distance heuristic.
 *
 * @param chord1 - The first Chord object or array of Notes.
 * @param chord2 - The second Chord object or array of Notes.
 * @returns An object containing:
 * - `commonNotes`: Note[] - An array of Note objects from the *first* chord whose pitch classes are also present in the second chord (unique pitch classes).
 * - `commonCount`: number - The number of unique common pitch classes.
 * - `voiceLeadingDistance`: number - A heuristic measure of voice leading smoothness, calculated as the sum of the minimum absolute semitone intervals required to move each voice from chord1 to the nearest voice in chord2. Lower numbers suggest smoother voice leading.
 * @throws {Error} If either chord input is invalid or contains no notes.
 * @remarks Common notes are identified based on pitch class only. Voice leading distance is a simplified heuristic and doesn't account for inversions or optimal voice pairing in complex scenarios. Uses precise `intervalBetween(note1, note2, true)` for distance calculation.
 */
export function findCommonTones(
  chord1: Chord | Note[],
  chord2: Chord | Note[]
): {
  commonNotes: Note[]; // Notes from chord1 that are common by pitch class
  commonCount: number; // Count of common pitch classes
  voiceLeadingDistance: number; // Sum of minimum semitone distances between voices
} {
  // --- Input Validation & Setup ---
  // Extract valid notes from inputs
  const notes1 = (Array.isArray(chord1) ? chord1 : chord1?.notes)?.filter(
    (n) => n != null
  );
  const notes2 = (Array.isArray(chord2) ? chord2 : chord2?.notes)?.filter(
    (n) => n != null
  );
  if (!notes1 || notes1.length === 0 || !notes2 || notes2.length === 0) {
    throw new Error(
      "Invalid chord(s) provided to findCommonTones (must contain notes)."
    );
  }
  // --- End Validation ---

  // Get unique pitch classes for both chords
  const pcSet1 = new Set(notes1.map((note) => note.pitchClassIndex));
  const pcSet2 = new Set(notes2.map((note) => note.pitchClassIndex));

  // Find common pitch classes (intersection)
  const commonPC = new Set([...pcSet1].filter((pc) => pcSet2.has(pc)));
  const commonCount = commonPC.size;

  // Find the actual Note objects from the *first* chord that correspond to common pitch classes.
  // Ensure only one Note instance per common pitch class is included.
  const commonNotes: Note[] = [];
  const addedPCs = new Set<number>();
  for (const note1 of notes1) {
    const pc = note1.pitchClassIndex;
    // If this note's PC is common and we haven't added a note for this PC yet
    if (commonPC.has(pc) && !addedPCs.has(pc)) {
      commonNotes.push(note1); // Add the first instance found in chord1
      addedPCs.add(pc); // Mark PC as added
    }
  }

  // --- Calculate voice leading distance heuristic ---
  let totalDistance = 0;

  // For each note in the first chord...
  for (const note1 of notes1) {
    let minDistance = Infinity; // Reset minimum distance for this voice

    // ...find the minimum absolute semitone distance to any note in the second chord.
    for (const note2 of notes2) {
      // Use intervalBetween with includeCents=true for precise distance
      const distance = Math.abs(intervalBetween(note1, note2, true));
      minDistance = Math.min(minDistance, distance);
    }

    // Add this voice's minimum required movement to the total distance
    // Only add if a distance was found (minDistance is not Infinity)
    if (minDistance !== Infinity) {
      totalDistance += minDistance;
    }
    // If a note in chord1 has no corresponding note in chord2 (e.g. different chord sizes),
    // its contribution to the distance is effectively ignored in this simple sum.
    // More complex metrics might handle unmatched notes differently.
  }

  // Return the results
  return {
    commonNotes, // Array of Note objects from chord1
    commonCount, // Number of unique shared pitch classes
    voiceLeadingDistance: totalDistance, // Sum of minimum voice movements in semitones
  }; // Original code didn't freeze here
}

/**
 * Analyzes the likely harmonic function (Tonic, Predominant, Dominant, Other) of a chord
 * within the context of a given scale. Also provides a simple qualitative tension assessment.
 *
 * @param chord - The Chord object or array of Notes to analyze. Requires identifiable root and quality.
 * @param scale - The Scale object providing the harmonic context (typically a 7-note scale for standard functions).
 * @returns An object containing:
 * - `function`: 'tonic', 'predominant', 'dominant', or 'other' - The determined harmonic function based on the chord root's scale degree.
 * - `scaleDegree`: number | null - The 1-based scale degree of the chord's root in the scale (null if root is not in the scale).
 * - `tension`: 'stable', 'mild', 'strong' - A qualitative assessment of the chord's inherent tension (based on quality) and its diatonicity within the scale.
 * @throws {Error} If chord or scale inputs are invalid or chord quality cannot be determined.
 * @remarks Function assignment uses standard diatonic theory mappings (Tonic=I,iii,vi; Predominant=ii,IV; Dominant=V,vii). Tension assessment is simplified based on chord quality (Maj/Min=stable, Dim/Aug/7th/Ext=strong) and increased if the chord contains non-scale tones relative to the provided scale.
 */
export function analyzeChordFunction(
  chord: Chord | Note[],
  scale: Scale
): {
  function: "tonic" | "predominant" | "dominant" | "other"; // Harmonic function
  scaleDegree: number | null; // 1-based degree of chord root in scale
  tension: "stable" | "mild" | "strong"; // Estimated tension level
} {
  // --- Input Validation & Setup ---
  // Determine notes, root, and quality from input
  const chordNotes = Array.isArray(chord) ? chord : chord?.notes;
  const chordRoot = Array.isArray(chord) ? chord[0] : chord?.root;
  // Identify quality if necessary (and possible)
  const chordQuality = Array.isArray(chord)
    ? identifyChord(chord)?.quality
    : chord?.quality;

  // Validate inputs
  if (!scale || !scale.notes) {
    throw new Error("Invalid scale provided for function analysis.");
  }
  if (
    !Array.isArray(chordNotes) ||
    chordNotes.length === 0 ||
    !chordRoot ||
    !chordQuality
  ) {
    throw new Error(
      "Invalid chord provided or quality could not be determined for function analysis."
    );
  }
  const validChordNotes = chordNotes.filter((n) => n != null);
  if (validChordNotes.length === 0) {
    throw new Error("Chord contains no valid notes.");
  }
  // --- End Validation ---

  // Check if the chord fits within the scale and get its root degree
  // Use validated notes here
  const { fits, chordDegree } = chordFitsScale(validChordNotes, scale);

  // If the root note isn't even in the scale, function is 'other'
  if (chordDegree === null) {
    return { function: "other", scaleDegree: null, tension: "strong" }; // Non-diatonic root -> strong tension/other function
  }

  // Determine standard harmonic function based on the root's scale degree (1-based)
  // This mapping assumes a diatonic (major/minor like) context, typically 7 degrees.
  let harmonicFunction: "tonic" | "predominant" | "dominant" | "other";

  switch (chordDegree) {
    case 1: // I chord
    case 6: // vi chord (relative minor, often tonic function)
      harmonicFunction = "tonic";
      break;
    case 3: // iii chord (can be tonic or dominant depending on context, often considered tonic)
      harmonicFunction = "tonic";
      break;

    case 4: // IV chord
    case 2: // ii chord (supertonic, often predominant function)
      harmonicFunction = "predominant";
      break;

    case 5: // V chord
    case 7: // vii chord (leading-tone/subtonic, often dominant function)
      harmonicFunction = "dominant";
      break;

    default: // Handles degrees outside 1-7 if scale isn't heptatonic
      harmonicFunction = "other";
  }

  // --- Determine basic tension level based on chord quality ---
  let tension: "stable" | "mild" | "strong";

  // Inherently stable qualities
  if (chordQuality === "major" || chordQuality === "minor") {
    tension = "stable";
  }
  // Inherently tense qualities (original code check)
  else if (
    chordQuality.includes("dim") || // diminished, halfDim7, dim7
    chordQuality.includes("aug") || // augmented, aug7
    chordQuality.includes("7") || // Dominant 7th, Maj7, min7 etc. (presence of 7th adds tension)
    // Check for common extension indicators adding tension
    chordQuality.includes("9") ||
    chordQuality.includes("11") ||
    chordQuality.includes("13")
  ) {
    tension = "strong";
  }
  // Other qualities (like sus chords) might be considered mild resolution points or having moderate tension
  else {
    tension = "mild"; // Default for sus, add6, etc.
  }

  // Increase tension level if the chord contains notes outside the scale context
  if (!fits) {
    // If chord has non-scale tones, elevate tension, maxing out at 'strong'
    tension = tension === "stable" ? "mild" : "strong";
  }

  // Return the analysis results
  return {
    function: harmonicFunction,
    scaleDegree: chordDegree, // 1-based degree or null
    tension,
  }; // Original code didn't freeze
}

/**
 * Analyzes the voice leading and harmonic connection between two consecutive chords.
 * Provides heuristic assessments of smoothness (based on voice leading distance),
 * common tones, overall voice leading quality, and checks for basic parallel/direct fifths
 * (based on pitch class, ignoring specific voicings).
 *
 * @param chord1 - The first Chord object or array of Notes.
 * @param chord2 - The second Chord object or array of Notes.
 * @returns An object containing analysis of the connection:
 * - `smoothness`: Qualitative assessment ('very smooth' to 'abrupt') based on voice leading distance.
 * - `commonTones`: The number of unique common pitch classes.
 * - `voiceLeadingQuality`: Qualitative assessment ('excellent' to 'poor') based on common tones, voice leading distance, and presence of parallel/direct fifths.
 * - `parallelFifths`: Boolean indicating if basic parallel perfect fifths between corresponding pitch classes were detected.
 * - `directFifths`: Boolean indicating if basic direct (hidden) perfect fifths between outer voices (soprano/bass moving in same direction to a P5) were detected.
 * @throws {Error} If either chord input is invalid or contains no notes.
 * @remarks Voice leading distance and quality assessments are heuristic. Parallel/direct fifth checks are basic (based on pitch class correspondence and outer voice motion) and may not catch all instances according to strict counterpoint rules, especially with inversions or complex voicings. Assumes notes within chords are sorted for outer voice detection.
 */
export function analyzeChordConnection(
  chord1: Chord | Note[],
  chord2: Chord | Note[]
): {
  smoothness: "very smooth" | "smooth" | "moderate" | "abrupt";
  commonTones: number;
  voiceLeadingQuality: "excellent" | "good" | "fair" | "poor";
  parallelFifths: boolean;
  directFifths: boolean;
} {
  // --- Input Validation & Setup ---
  // Extract valid notes and sort them by pitch for consistent analysis
  const notes1 = (Array.isArray(chord1) ? chord1 : chord1?.notes)
    ?.filter((n) => n != null)
    .sort((a, b) => compareNotes(a, b, true));
  const notes2 = (Array.isArray(chord2) ? chord2 : chord2?.notes)
    ?.filter((n) => n != null)
    .sort((a, b) => compareNotes(a, b, true));
  if (!notes1 || notes1.length === 0 || !notes2 || notes2.length === 0) {
    throw new Error(
      "Invalid chord(s) provided to analyzeChordConnection (must contain notes)."
    );
  }
  // --- End Validation ---

  // 1. Find common tones and voice leading distance using helper
  // Pass the sorted notes arrays to findCommonTones
  const { commonCount, voiceLeadingDistance } = findCommonTones(notes1, notes2);

  // 2. Determine qualitative smoothness based on voice leading distance heuristic
  // Using the fixed thresholds from the original code.
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

  // 3. Check for basic parallel perfect fifths (based on pitch class)
  let parallelFifths = false;
  // Iterate through pairs of notes in the first chord
  for (let i = 0; i < notes1.length; i++) {
    for (let j = i + 1; j < notes1.length; j++) {
      // Calculate interval mod 12 between the pair (use integer semitones)
      const interval1 =
        Math.abs(intervalBetween(notes1[i], notes1[j], false)) % 12;

      // If it's a perfect fifth (7 semitones)
      if (interval1 === 7) {
        // Find notes in the second chord with the *same pitch classes*
        const note1PC = notes1[i].pitchClassIndex;
        const note2PC = notes1[j].pitchClassIndex;

        // Find corresponding notes in chord2 (if they exist)
        const correspondingNote1 = notes2.find(
          (n) => n.pitchClassIndex === note1PC
        );
        const correspondingNote2 = notes2.find(
          (n) => n.pitchClassIndex === note2PC
        );

        // If both corresponding notes exist in the second chord...
        if (correspondingNote1 && correspondingNote2) {
          // ...check if the interval between them is also a perfect fifth
          const interval2 =
            Math.abs(
              intervalBetween(correspondingNote1, correspondingNote2, false)
            ) % 12;
          if (interval2 === 7) {
            // Found parallel perfect fifth based on pitch class correspondence
            parallelFifths = true;
            break; // Exit inner loop once found
          }
        }
      }
    }
    if (parallelFifths) break; // Exit outer loop once found
  }

  // 4. Check for basic direct (hidden) fifths between outer voices
  let directFifths = false;
  // Requires at least two notes in each chord for outer voices
  if (notes1.length > 0 && notes2.length > 0) {
    // Check length > 0, original was > 1 which might be safer? Keep > 0 from original.
    // Get outer voices (lowest = bass, highest = soprano assuming sorted notes)
    const soprano1 = notes1[notes1.length - 1];
    const bass1 = notes1[0];
    const soprano2 = notes2[notes2.length - 1];
    const bass2 = notes2[0];

    // Calculate precise movement including cents
    const sopranoMove = intervalBetween(soprano1, soprano2, true);
    const bassMove = intervalBetween(bass1, bass2, true);

    // Determine direction (-1 down, +1 up, 0 stationary) - original logic
    const sopranoDirection = sopranoMove > 0 ? 1 : sopranoMove < 0 ? -1 : 0;
    const bassDirection = bassMove > 0 ? 1 : bassMove < 0 ? -1 : 0;

    // Check if both outer voices move in the same direction (and are not stationary)
    // Original strict equality check `===` kept.
    if (
      sopranoDirection !== 0 &&
      bassDirection !== 0 &&
      sopranoDirection === bassDirection
    ) {
      // Check if the interval between outer voices in the second chord is a perfect fifth (7 semitones mod 12)
      const interval = Math.abs(intervalBetween(bass2, soprano2, false)) % 12; // Use integer semitones
      if (interval === 7) {
        // Found potential direct fifth
        directFifths = true;
      }
    }
  }

  // 5. Evaluate overall voice leading quality (heuristic based on original thresholds)
  let voiceLeadingQuality: "excellent" | "good" | "fair" | "poor";
  if (parallelFifths || directFifths) {
    voiceLeadingQuality = "poor";
  } else if (commonCount >= 2 && voiceLeadingDistance <= 4) {
    // Original check
    voiceLeadingQuality = "excellent";
  } else if (commonCount >= 1 && voiceLeadingDistance <= 7) {
    // Original check
    voiceLeadingQuality = "good";
  } else if (voiceLeadingDistance <= 12) {
    // Original check
    voiceLeadingQuality = "fair";
  } else {
    voiceLeadingQuality = "poor";
  }

  // Return the combined analysis
  return {
    smoothness,
    commonTones: commonCount,
    voiceLeadingQuality,
    parallelFifths,
    directFifths,
  }; // Original code didn't freeze
}

/**
 * Represents a potential microtonal chord match.
 * @interface DetectedMicrotonalChord
 * @property {string} type - Identifier for the type of microtonal chord detected (e.g., "just-major").
 * @property {Note} root - The Note identified as the root for this match.
 * @property {string} description - A brief description of the detected chord type.
 * @property {number[]} intervals - The actual intervals (in cents) calculated from the identified root to the other notes in the input set.
 * @property {number} confidence - A heuristic score (0-1) indicating the likelihood of the match based on interval proximity to known patterns.
 */
interface DetectedMicrotonalChord {
  // Keep interface local if not exported
  type: string;
  root: Note;
  description: string;
  intervals: number[];
  confidence: number;
}

/**
 * Analyzes a set of notes to identify potential microtonal chord types based on
 * interval patterns measured in cents relative to potential roots.
 * Checks against a limited set of known microtonal structures (e.g., Just Major/Minor).
 *
 * @param notes - An array of Note objects (potentially microtonal) to analyze. Requires at least 2 notes.
 * @param [options={}] - Optional settings for the analysis.
 * @param [options.toleranceCents=10] - The maximum allowed deviation in cents when matching intervals against known patterns. Defaults to 10 cents.
 * @returns An array of objects representing potential microtonal chord matches, sorted by confidence (descending). Each object includes the chord `type`, identified `root`, a `description`, the calculated `intervals` in cents, and a heuristic `confidence` score. Returns empty array if fewer than 2 notes or no matches found.
 * @throws {Error} If input notes array is invalid.
 * @remarks This is a heuristic analysis comparing calculated cents intervals against predefined microtonal chord structures (currently Just Major/Minor and an example Quarter-Dim). It tries each note as a potential root. Confidence scores are basic placeholders.
 */
export function analyzeMicrotonalChord(
  notes: Note[],
  options: {
    toleranceCents?: number;
  } = {}
): DetectedMicrotonalChord[] {
  // Return type using internal interface
  // --- Input Validation ---
  if (!Array.isArray(notes) || notes.length < 2) {
    // Return empty array for insufficient notes, rather than throwing? Match original behavior.
    return [];
  }
  const validNotes = notes.filter((n) => n != null);
  if (validNotes.length < 2) {
    return [];
  }
  // --- End Validation ---

  const results: DetectedMicrotonalChord[] = []; // Use internal interface type

  // Set tolerance for matching intervals in cents
  const toleranceCents = options.toleranceCents ?? 10; // Default 10 cents tolerance

  // Try each valid note as a potential root
  for (const potentialRoot of validNotes) {
    // Calculate precise intervals in cents from this potential root to all other valid notes
    // Use intervalInCents as per original code
    const intervals = validNotes
      .filter((note) => note !== potentialRoot) // Exclude the root itself
      .map((note) => getCentsBetween(potentialRoot, note)); // Precise cents calculation

    // Sort the calculated intervals numerically for consistent comparison
    intervals.sort((a, b) => a - b);

    // --- Check against known microtonal chord types (Examples from original code) ---

    // Just intonation major triad (intervals approx. 386, 702 cents)
    // Use more precise values for comparison if available
    const justMajorIntervals = [386.31, 701.96];
    if (intervalsMatch(intervals, justMajorIntervals, toleranceCents)) {
      results.push({
        type: "just-major",
        root: potentialRoot,
        description: "Just Intonation Major Triad (ratios ~4:5:6)",
        intervals: intervals, // REMOVED Object.freeze()
        confidence: 0.9,
      });
    }

    // Just intonation minor triad (intervals approx. 316, 702 cents)
    const justMinorIntervals = [315.64, 701.96];
    if (intervalsMatch(intervals, justMinorIntervals, toleranceCents)) {
      results.push({
        type: "just-minor",
        root: potentialRoot,
        description: "Just Intonation Minor Triad (ratios ~10:12:15)",
        intervals: intervals, // REMOVED Object.freeze()
        confidence: 0.9,
      });
    }

    // Quarter-tone diminished triad example (Root, ~250c, ~600c)
    // Original code had [250, 600] - Represents m3-50c, d5? Needs context.
    const quarterToneDimIntervals = [250, 600]; // Example definition
    if (intervalsMatch(intervals, quarterToneDimIntervals, toleranceCents)) {
      results.push({
        type: "quarter-dim",
        root: potentialRoot,
        description: "Quarter-tone Diminished Triad (example: R, m3-50c, d5)",
        intervals: intervals, // REMOVED Object.freeze()
        confidence: 0.8,
      });
    }

    // --- Add more microtonal chord types patterns here as needed ---
  } // End loop through potential roots

  // Sort results by confidence score (descending)
  results.sort((a, b) => b.confidence - a.confidence);

  return results; // Return array of potential matches (original code didn't freeze outer array)
}

/**
 * @internal
 * Helper function to check if an array of actual intervals (in cents) matches an
 * expected pattern of intervals within a given tolerance. Assumes both arrays are sorted.
 *
 * @param actual - The array of calculated intervals in cents, assumed sorted ascending.
 * @param expected - The array of expected intervals in cents for the pattern, assumed sorted ascending.
 * @param toleranceCents - The maximum allowed absolute difference (in cents) for intervals to be considered matching.
 * @returns True if the lengths match and all actual intervals are within tolerance of the expected intervals, false otherwise.
 */
// Helper function to check if intervals match a pattern within tolerance
function intervalsMatch(
  actual: number[],
  expected: number[],
  toleranceCents: number
): boolean {
  // Check if the number of intervals matches (crucial for chord type matching)
  if (actual.length !== expected.length) {
    return false;
  }

  // Check if every actual interval is close enough to the corresponding expected interval
  // Assumes both arrays are sorted.
  return actual.every(
    (interval, i) => Math.abs(interval - expected[i]) <= toleranceCents
  );
}
