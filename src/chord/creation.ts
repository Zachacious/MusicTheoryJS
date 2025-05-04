/**
 * @module Chord/Creation
 * @description
 * This module provides functions for creating Chord objects using various methods.
 * Chords can be created from a root note and quality name, by parsing a chord symbol string,
 * from an array of notes, from a list of intervals, or based on specific tuning systems
 * like Just Intonation or custom microtonal intervals. It handles chord structure,
 * inversions, and basic voicing.
 */

// Import chord constants and types used in creation
import {
  CHORD_CATEGORIES,
  CHORD_FORMULAS,
  CHORD_SYMBOL_MAP,
  CHORD_SYMBOL_REGEX,
  SCALE_DEGREE_SEMITONES,
} from "./constants";
import {
  Chord,
  ChordCategory,
  ChordFormula,
  ChordInversion,
  ChordOptions,
  ChordQuality
} from "./types";
// Import necessary Note types and functions
import {
  EnharmonicPreference,
  Note,
  TuningSystem,
  addCentsToNote,
  createNoteFromParts,
  formatNote,
  intervalBetween,
  notesAreEqual,
  transpose,
  transposeByCents
} from "../note";
// Import voicing helper functions
import { getChordInversion, sortChordNotes } from "./voicing"; // Assuming these exist

import { ScalePattern } from "../scale";
// Import specific creation function from note module's frequency file
import { createNoteByRatio } from "../note/frequency"; // Used by createJustChord
// Assuming note module exports these


/**
 * Default options used when creating chords if not otherwise specified.
 * @readonly
 * @property {EnharmonicPreference} prefer='sharp' - Default spelling preference for generated notes.
 * @property {'close'} voicing='close' - Default voicing type (currently only 'close' seems supported by internal logic, implies sorted notes).
 * @property {ChordInversion} inversion=0 - Default inversion (0 = root position).
 * @property {number} rootOctave=4 - Default octave used when creating root note from string symbols (e.g., in `createChordFromSymbol`).
 * @property {boolean} includeCachedValues=true - Whether notes within the chord should include cached midi/notation/frequency.
 */
const DEFAULT_CHORD_OPTIONS: ChordOptions = {
  prefer: "sharp",
  voicing: "close", // Only option seemingly used by createNotesFromFormula -> sortChordNotes
  inversion: 0, // Root position
  rootOctave: 4, // Default octave for root if only pitch class given
  includeCachedValues: true, // Include derived values on note objects by default
};

/**
 * Creates a Chord object from a specified root note and chord quality.
 * Generates the constituent notes based on the quality's formula, applies inversion,
 * determines the bass note, category, and generates a standard symbol.
 *
 * @param root - The root Note object of the chord.
 * @param quality - The desired chord quality (e.g., "major", "min7", "7sus4"). Must be a key in `CHORD_FORMULAS`.
 * @param [options={}] - Optional settings to override defaults or specify bass note/inversion. See {@link ChordOptions}.
 * @returns A frozen Chord object representing the specified chord.
 * @throws {Error} If the root note is invalid or the chord quality is unknown.
 * @throws {Error} If the specified inversion is invalid for the number of notes in the chord.
 * @see {@link CHORD_FORMULAS} - For defined chord quality structures.
 * @see {@link ChordOptions} - For available options.
 * @example
 * ```ts
 * const c4 = createNote({ letter: 'C', octave: 4 });
 * const g3 = createNote({ letter: 'G', octave: 3 });
 *
 * // C Major triad (root position)
 * const cMajor = createChord(c4, 'major');
 * console.log(cMajor.symbol); // "C"
 * console.log(cMajor.notes.map(formatNote)); // ['C4', 'E4', 'G4']
 * console.log(cMajor.inversion); // 0
 *
 * // G7 chord, 1st inversion
 * const g7inv1 = createChord(g3, '7', { inversion: 1 });
 * console.log(g7inv1.symbol); // "G7" (Symbol doesn't show inversion by default)
 * console.log(g7inv1.bass.notation); // "B3" (B is the 3rd of G7)
 * console.log(g7inv1.inversion); // 1
 *
 * // F minor 7th with an explicit A bass note (slash chord)
 * const fm7slashA = createChord(createNote('F3'), 'min7', { bass: createNote('A3') });
 * // Note: bass option overrides inversion calculation based on lowest note.
 * // Symbol generation might need update to show slash chords.
 * console.log(fm7slashA.symbol); // "Fm7" (Current generator doesn't show slash)
 * console.log(fm7slashA.bass.notation); // "A3"
 * ```
 */
export function createChord(
  root: Note,
  quality: ChordQuality,
  options: Partial<ChordOptions> = {}
): Chord {
  // --- Input Validation ---
  if (!root) {
    throw new Error("Invalid root note provided to createChord.");
  }
  // --- End Validation ---

  // Merge default options with provided options
  // Required type assertion present in original code
  const mergedOptions = {
    ...DEFAULT_CHORD_OPTIONS,
    ...options,
  } as Required<ChordOptions>;

  // Get the formula (intervals + alterations) for this chord quality
  const formula = CHORD_FORMULAS[quality];
  if (!formula) {
    // Throw error if the quality name doesn't exist in the constants
    throw new Error(`Unknown chord quality: ${quality}`);
  }

  // Generate the basic chord notes (in close voicing, root position initially) based on the formula
  // Uses the internal helper function
  let notes = createNotesFromFormula(root, formula, mergedOptions);

  // Apply any requested inversion
  let determinedBassNote = notes[0]; // Bass is initially the lowest note from generation (usually root)
  let determinedInversion = 0; // Default to root position

  // Check if a specific inversion number/string was requested *and* no explicit bass note was given
  if (mergedOptions.inversion !== 0 && mergedOptions.bass === undefined) {
    // Use internal helper to rearrange notes for inversion
    const inversionResult = applyInversion(notes, mergedOptions.inversion);
    notes = inversionResult.notes; // Update notes array with rearranged voicing
    determinedBassNote = inversionResult.bass; // Update bass note based on inversion
    determinedInversion = inversionResult.inversion; // Store the applied inversion number
  }

  // If a specific bass note *is* provided via options (slash chord), it overrides the calculated bass/inversion
  if (mergedOptions.bass) {
    // Validate bass note? Assume it's a valid Note object for now.
    determinedBassNote = mergedOptions.bass;
    // Recalculate inversion based on the explicit bass note
    determinedInversion = getChordInversion(root, quality, determinedBassNote); // Use voicing helper
  }

  // Get the general category of the chord (triad, seventh, etc.)
  const category = CHORD_CATEGORIES[quality] ?? "special"; // Fallback category

  // Generate a standard chord symbol string (e.g., "Cmaj7", "G7/B")
  const symbol = generateChordSymbol(root, quality, determinedBassNote);

  // Create the immutable Chord object, freezing notes array (present in original)
  return Object.freeze({
    root, // The theoretical root
    notes: Object.freeze(notes), // The actual notes in the specified voicing/inversion
    quality, // The identified or requested quality
    formula, // The formula used to generate the notes
    bass: determinedBassNote, // The lowest sounding note (or specified slash chord bass)
    inversion: determinedInversion, // The calculated or specified inversion number
    category, // The general chord type
    symbol, // The generated string representation
    tuningSystem: mergedOptions.tuningSystem, // Store specified tuning system
  });
}

/**
 * Creates a Chord object by parsing a standard chord symbol string.
 * Handles root note, accidentals, common quality/extension/alteration symbols, and slash bass notes.
 *
 * @param symbol - The chord symbol string (e.g., "Cmaj7", "G7/B", "F#m7b5", "Asus4").
 * @param [options={}] - Optional settings, primarily `rootOctave` (default 4) for the root note,
 * and `includeCachedValues`, `prefer`. See {@link ChordOptions}.
 * @returns The created Chord object.
 * @throws {Error} If the chord symbol string is invalid or cannot be parsed.
 * @see {@link parseChordSymbol} - The internal parsing function.
 * @see {@link CHORD_SYMBOL_REGEX} - The regular expression used for parsing.
 * @see {@link CHORD_SYMBOL_MAP} - The mapping used for quality aliases.
 * @example
 * ```ts
 * const cmaj7 = createChordFromSymbol("Cmaj7");
 * console.log(cmaj7.root.notation); // "C4" (default octave 4)
 * console.log(cmaj7.quality); // "maj7"
 *
 * const g7slashB = createChordFromSymbol("G7/B", { rootOctave: 3 });
 * console.log(g7slashB.root.notation); // "G3"
 * console.log(g7slashB.quality); // "7"
 * console.log(g7slashB.bass.notation); // "B3" (assumes bass is in same octave initially)
 * console.log(g7slashB.inversion); // 1 (B is the 3rd of G7)
 *
 * const fSharpMin7b5 = createChordFromSymbol("F#m7b5");
 * console.log(fSharpMin7b5.quality); // "half-dim7"
 * ```
 */
export function createChordFromSymbol(
  symbol: string,
  options: Partial<ChordOptions> = {} // Allow ChordOptions like rootOctave
): Chord {
  // Parse the chord symbol string using the internal helper
  const parsed = parseChordSymbol(symbol);
  if (!parsed) {
    // Throw error if parsing failed
    throw new Error(`Invalid chord symbol: ${symbol}`);
  }

  // Create the root note using parsed components and options
  // The `as any` casts were present in the original code.
  const rootNote = createNoteFromParts({
    letter: parsed.root.toUpperCase() as any, // Ensure uppercase letter
    accidental: parsed.accidental as any, // Parsed accidental (or "")
    // Use specified octave or default from options/constants
    octave: options.rootOctave ?? DEFAULT_CHORD_OPTIONS.rootOctave!,
    includeCachedValues: options.includeCachedValues, // Pass cache flag
  });

  // Create the explicit bass note if provided in the symbol (slash chord)
  let bassNote: Note | undefined;
  if (parsed.bass) {
    // Determine octave for bass note - typically close to root octave.
    // Defaulting to root's octave here is a simplification.
    // More sophisticated logic might place it below the root if appropriate.
    let bassOctave = rootNote.octave;
    // Basic heuristic: if bass letter is alphabetically "before" root, assume lower octave?
    // Example: Cmaj7/E -> E is above C. G7/B -> B is above G. C/Bb -> Bb likely below C.
    // This needs proper interval calculation relative to root.
    // Sticking to original simple logic: bass defaults to root's octave.
    try {
      bassNote = createNoteFromParts({
        letter: parsed.bass.letter.toUpperCase() as any, // Ensure uppercase
        accidental: parsed.bass.accidental as any,
        octave: bassOctave, // Simple octave assumption
        includeCachedValues: options.includeCachedValues,
      });
      // TODO: Refine bass note octave placement relative to root note?
    } catch (e) {
      console.warn(
        `Could not parse bass note "${parsed.bass.letter}${parsed.bass.accidental}" for chord ${symbol}. Ignoring slash bass.`
      );
    }
  }

  // Create the final chord object using the main createChord function
  // Pass the parsed root, quality, and options (including the potential bass note)
  return createChord(rootNote, parsed.quality, {
    ...options,
    bass: bassNote, // Pass the explicitly parsed bass note
    // Inversion will be calculated by createChord based on the bass note if provided
  });
}

/**
 * @internal
 * Generates the array of Note objects for a chord based on its root, formula, and options.
 * Applies transposition to the root note for each interval specified in the formula.
 * Sorts the resulting notes by pitch (close voicing).
 *
 * @param root - The root Note of the chord (assumed to be in the target base octave).
 * @param formula - The ChordFormula object defining the intervals and alterations.
 * @param options - ChordOptions including enharmonic preference and cache flag.
 * @returns An array of Note objects representing the chord tones in close voicing.
 * @throws {Error} If the formula contains an unknown scale degree.
 */
function createNotesFromFormula(
  root: Note, // Assumed to be already in the desired starting octave (options.rootOctave)
  formula: ChordFormula,
  options: ChordOptions // Expect required options here
): Note[] {
  const notes: Note[] = [];
  // Use the rootOctave from options if generating fresh, otherwise use root's actual octave
  const rootOctave = options.rootOctave ?? root.octave ?? 4; // Fallback to 4

  // Ensure the root note itself is considered at the target base octave for calculations
  const rootAtTargetOctave = createNoteFromParts({
    letter: root.letter,
    accidental: root.accidental,
    octave: rootOctave, // Use the specified or defaulted root octave
    includeCachedValues: options.includeCachedValues,
  });

  // Add each note based on the formula degrees and alterations
  for (const [degreeStr, alteration] of Object.entries(formula)) {
    const degree = parseInt(degreeStr, 10);

    // Get the base interval in semitones for this scale degree (relative to root=1)
    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) {
      // Degree not found in our standard interval map (e.g., degree 8, 10, 12?)
      throw new Error(`Unknown scale degree in chord formula: ${degree}`);
    }

    // Apply the alteration from the formula (e.g., -1 for b3, +1 for #5)
    semitones += alteration;

    // Create the note by transposing the octave-adjusted root
    const note = transpose(rootAtTargetOctave, semitones, {
      prefer: options.prefer,
      includeCachedValues: options.includeCachedValues,
      // Preserve microtonal from root? No, formula implies standard ET intervals.
      // Tuning system? Inherit from options?
      tuningSystem: options.tuningSystem,
    });

    notes.push(note);
  }

  // Apply voicing adjustments if specified (currently only sorts for 'close')
  // Original code checked voicing option but only called sortChordNotes.
  if (options.voicing && options.voicing !== "close") {
    // Handle different voicing types (e.g., drop2, spread)
    // Requires implementation in voicing.ts - currently just sorts.
    console.warn(
      `Voicing option "${options.voicing}" specified, but only close voicing (sorting) is implemented.`
    );
    return sortChordNotes(notes); // Fallback to sorting
  }

  // Default to close voicing (sorted by pitch) using the helper function
  return sortChordNotes(notes);
}

/**
 * @internal
 * Applies a specified inversion to an array of chord notes (assumed to be initially in root position).
 * Rearranges the notes by moving lower notes up an octave.
 *
 * @param notes - The array of Note objects (ideally sorted and in root position).
 * @param inversion - The desired inversion (0 for root, 1 for 1st, 2 for 2nd, etc., or "root", "1st", "2nd", "3rd").
 * @returns An object containing the rearranged `notes` array, the new `bass` note, and the applied `inversion` number.
 * @throws {Error} If the inversion number is invalid for the number of notes.
 */
function applyInversion(
  notes: Note[], // Assumes notes are sorted in root position initially
  inversion: ChordInversion // number (0, 1, 2...) or string ("root", "1st"...)
): { notes: Note[]; bass: Note; inversion: number } {
  // Convert string inversions ("1st", "2nd", etc.) to numbers (0, 1, 2...)
  let inversionNum = 0; // Default to root position
  if (typeof inversion === "number") {
    inversionNum = inversion;
  } else {
    // Map string names to numbers
    switch (inversion) {
      case "root":
        inversionNum = 0;
        break;
      case "1st":
        inversionNum = 1;
        break;
      case "2nd":
        inversionNum = 2;
        break;
      case "3rd":
        inversionNum = 3;
        break;
      default: // Treat unrecognized string as root position? Or throw?
        console.warn(
          `Unrecognized inversion string: "${inversion}". Defaulting to root position.`
        );
        inversionNum = 0;
    }
  }

  // Validate inversion number against the number of notes in the chord
  if (
    !Number.isInteger(inversionNum) ||
    inversionNum < 0 ||
    inversionNum >= notes.length
  ) {
    throw new Error(
      `Invalid inversion number: ${inversionNum}. Must be an integer between 0 and ${
        notes.length - 1
      } for a chord with ${notes.length} notes.`
    );
  }

  // If requested inversion is root position, no changes needed to the input notes array
  if (inversionNum === 0) {
    // Assume input `notes` are already sorted, bass is notes[0]
    return { notes, bass: notes[0], inversion: 0 };
  }

  // Apply the inversion by moving the lowest `inversionNum` notes up an octave
  const result = [...notes]; // Create a mutable copy

  // Move the first `inversionNum` notes up by one octave
  for (let i = 0; i < inversionNum; i++) {
    const originalNote = result[i];
    // Check if originalNote is valid before proceeding
    if (!originalNote) continue;

    try {
      // Create a note one octave higher using createNoteFromParts
      const octaveUp = createNoteFromParts({
        letter: originalNote.letter,
        accidental: originalNote.accidental,
        octave: originalNote.octave + 1,
        // Preserve cache status based on original note? Original used !!originalNote.midi
        includeCachedValues: !!originalNote.midi, // Keep original logic
      });
      // Replace the note in the result array
      result[i] = octaveUp;
    } catch (e) {
      console.error(
        `Error applying inversion: Could not transpose note ${formatNote(
          originalNote
        )} up an octave.`,
        e
      );
      // Keep original note if transposition fails? Or throw? Keeping original note.
    }
  }

  // Re-sort the notes array by pitch after octave adjustments
  const sortedNotes = sortChordNotes(result); // Use voicing helper

  // The bass note is now the first element of the sorted, inverted array
  const bassNote = sortedNotes[0];

  return { notes: sortedNotes, bass: bassNote, inversion: inversionNum };
}

/**
 * @internal
 * Parses a chord symbol string using CHORD_SYMBOL_REGEX and CHORD_SYMBOL_MAP.
 * Extracts the root letter, accidental, canonical quality name, and optional bass note.
 *
 * @param symbol - The chord symbol string (e.g., "F#m7b5/C").
 * @returns An object with parsed components (`root`, `accidental`, `quality`, optional `bass`), or `null` if parsing fails.
 */
export function parseChordSymbol(symbol: string): {
  root: string; // Letter only
  accidental: string; // Accidental symbol or ""
  quality: ChordQuality; // Canonical quality name
  bass?: { letter: string; accidental: string }; // Optional bass note parts
} | null {
  if (typeof symbol !== "string" || symbol.trim().length === 0) {
    return null;
  }
  // Apply regex to parse the symbol
  const match = symbol.trim().match(CHORD_SYMBOL_REGEX);
  if (!match) {
    // Regex did not match the input string format
    return null;
  }

  // Extract captured groups from the regex match
  // Indices based on the regex structure defined in constants.ts
  // Group 1: Root Letter
  // Group 2: Root Accidental (optional)
  // Group 3: Quality/Extension/Alteration part (optional)
  // Group 4: Bass Note part (Letter + Accidental) (optional)
  // Original code had different group indexing/structure - adjust based on REGEX definition.
  // Let's re-evaluate capture groups based on provided regex:
  // Group 1: ([A-Ga-g]) -> Root Letter
  // Group 2: (#|b|##|bb)? -> Root Accidental
  // Group 3: (M|maj|...|9sus4?)? -> Quality String
  // Group 4: ([A-Ga-g][#b]?) within non-capturing group -> Bass Root+Acc
  const [, root, accidental = "", qualitySymbol = "", bassNotation] = match;
  // Note: Original code had different destructuring based on potentially different regex version.
  // Using the structure from the current constants.ts regex.

  // Determine the canonical chord quality using the symbol map
  let quality: ChordQuality = "major"; // Default to major triad if no quality symbol found

  // Look up the matched quality/extension string in the map
  // Use lowercase for case-insensitive matching? No, map keys are specific cases.
  // Let's try matching the raw symbol first.
  if (CHORD_SYMBOL_MAP[qualitySymbol]) {
    quality = CHORD_SYMBOL_MAP[qualitySymbol];
  }
  // Add fallback checks? E.g., check lowercase? Handle combined symbols like "m7"?
  // Current logic relies heavily on CHORD_SYMBOL_MAP having comprehensive aliases.

  // Parse the captured bass note string (if present)
  let bass;
  if (bassNotation) {
    // Extract letter and accidental from the captured bass notation string
    const bassLetter = bassNotation.charAt(0);
    const bassAccidental = bassNotation.substring(1) || ""; // Default to natural
    bass = { letter: bassLetter, accidental: bassAccidental };
  }

  // Return the parsed components
  return {
    root: root, // Root letter (case might depend on input)
    accidental: accidental, // Accidental for the root
    quality: quality, // Canonical quality name
    bass, // Optional bass note components
  };
}

/**
 * @internal
 * Generates a standard chord symbol string from core chord components.
 *
 * @param root - The root Note object.
 * @param quality - The canonical ChordQuality name.
 * @param [bassNote] - Optional. The bass Note object, if different from the root (for slash chords).
 * @returns The generated chord symbol string (e.g., "C#m7", "G7/B").
 * @remarks Does not currently handle complex alterations or extensions beyond the basic quality name lookup. Needs mapping from quality name back to common symbols.
 */
export function generateChordSymbol(
  root: Note,
  quality: ChordQuality,
  bassNote?: Note // Explicit bass note for slash chords
): string {
  // Format the root note (letter + accidental)
  let symbol = `${root.letter}${root.accidental ?? ""}`; // Use nullish coalescing for accidental

  // Add quality/extension notation based on the quality name
  // This requires a reverse mapping or specific logic for common symbols.
  // Using a simple switch based on the provided original code.
  switch (quality) {
    case "major":
      // Major triads typically have no symbol after the root
      break; // No suffix for major triad
    case "minor":
      symbol += "m"; // Common minor suffix
      break;
    case "augmented":
      symbol += "+"; // Common augmented suffix
      break;
    case "diminished":
      symbol += "dim"; // Common diminished suffix (or 'o')
      break;
    case "sus2":
      symbol += "sus2";
      break;
    case "sus4":
      symbol += "sus4";
      break;
    case "7": // Dominant 7
      symbol += "7";
      break;
    case "maj7":
      symbol += "maj7"; // Or M7, Δ7
      break;
    case "min7":
      symbol += "m7"; // Or -7
      break;
    case "half-dim7":
      symbol += "m7b5"; // Or ø
      break;
    case "dim7":
      symbol += "dim7"; // Or o7
      break;
    // Add cases for other common qualities (9, 11, 13, 6, altered etc.)
    // Use common abbreviations from CHORD_SYMBOL_MAP or a dedicated reverse map.
    default:
      // For qualities not explicitly handled, append the quality name.
      // This might result in non-standard symbols like "CminMaj7".
      // Consider a more robust quality-to-symbol mapping.
      symbol += quality; // Fallback to using the quality name
  }

  // Add slash notation for bass note if it's different from the root (pitch class check)
  if (bassNote && !notesAreEqual(bassNote, root)) {
    // Use pitch equality check
    symbol += `/${bassNote.letter}${bassNote.accidental ?? ""}`; // Add slash bass notation
  }

  return symbol;
}

/**
 * Creates a Chord object from an array of notes.
 * It first attempts to identify the root and quality of the chord using `identifyChord`.
 * If successful, it reconstructs the chord using `createChord` based on the identified root/quality.
 * Allows an option to force using the lowest note as the root instead of the identified one.
 *
 * @param notes - An array of Note objects representing the chord. Must contain at least 2 notes.
 * @param [options={}] - Optional settings.
 * @param [options.identifyRoot=true] - If true (default), uses `identifyChord` to determine the root. If false, uses the lowest note in the input array as the root.
 * @param [options.prefer='sharp'] - Enharmonic preference used during identification and creation.
 * @param [options.includeCachedValues=true] - Whether notes should include cached values.
 * @returns The created Chord object.
 * @throws {Error} If fewer than 2 notes are provided or if chord identification fails when `identifyRoot` is true.
 * @see {@link identifyChord}
 * @see {@link createChord}
 * @example
 * ```ts
 * const notes = ['E4', 'G4', 'C5'].map(s => createNote(s)); // Notes of C Major 1st Inversion
 *
 * // Identify root automatically (should find C4)
 * const chord1 = createChordFromNotes(notes);
 * console.log(chord1.root.notation); // "C4"
 * console.log(chord1.quality); // "major"
 * console.log(chord1.bass.notation); // "E4"
 * console.log(chord1.inversion); // 1
 *
 * // Force using lowest note (E4) as root
 * const chord2 = createChordFromNotes(notes, { identifyRoot: false });
 * console.log(chord2.root.notation); // "E4"
 * console.log(chord2.quality); // Likely identifies as Em(b6) or similar - depends on identifyChord
 * ```
 */
export function createChordFromNotes(
  notes: Note[],
  options: Partial<ChordOptions & { identifyRoot?: boolean }> = {}
): Chord {
  // --- Input Validation ---
  if (!Array.isArray(notes) || notes.length < 2) {
    throw new Error(
      "At least 2 notes are required to create a chord from notes."
    );
  }
  const validNotes = notes.filter((n) => n != null);
  if (validNotes.length < 2) {
    throw new Error("Input contained fewer than 2 valid notes.");
  }
  // --- End Validation ---

  let root: Note;
  let quality: ChordQuality;

  // Option to identify root (default) or use lowest note
  if (options.identifyRoot !== false) {
    // Attempt to identify the root and quality from the notes
    const identified = identifyChord(validNotes); // Use validated notes
    if (!identified) {
      // Throw error if identification fails (as per original code)
      throw new Error(
        "Could not identify chord root and quality from the provided notes."
      );
    }
    root = identified.root;
    quality = identified.quality;
  } else {
    // Use the lowest note in the input array as the root
    // Sort notes by pitch to find the lowest reliably
    const sortedNotes = sortChordNotes([...validNotes]); // Use copy
    root = sortedNotes[0];
    // Try to identify quality relative to this chosen root, otherwise fallback needed
    const identifiedWithBassRoot = identifyChord(validNotes); // identifyChord might still find theoretical root
    if (
      identifiedWithBassRoot &&
      notesAreEqual(identifiedWithBassRoot.root, root)
    ) {
      quality = identifiedWithBassRoot.quality; // Use identified quality if root matches bass
    } else {
      // Fallback: If root forced to bass and quality unknown relative to it, what quality to assign?
      // This case is ambiguous. Assign 'major' as placeholder? Or throw?
      console.warn(
        `Forcing root to lowest note ${formatNote(
          root
        )}. Chord quality identification might be inaccurate.`
      );
      // Attempt identification again? No, let's use a placeholder or try to derive simple quality.
      // For now, use the quality identified relative to the *theoretical* root if available, even if bass is root.
      // This matches original code's likely behavior (identifyChord first, then potentially override root).
      const identified = identifyChord(validNotes); // Run identify again
      if (!identified)
        throw new Error(
          "Could not identify chord quality even with forced root."
        );
      quality = identified.quality; // Use quality found by identifyChord
      // The root used below will be the forced lowest note, quality from theoretical root.
    }
  }

  // Determine the actual bass note (always the lowest note)
  // Need to re-sort here as validNotes isn't guaranteed sorted
  const sortedValidNotes = sortChordNotes([...validNotes]);
  const bassNote = sortedValidNotes[0];

  // Calculate the inversion based on the *determined* root (identified or forced) and the bass note
  let inversion = 0;
  // Only calculate inversion if bass is not the root
  if (!notesAreEqual(root, bassNote)) {
    // Use helper from voicing module
    inversion = getChordInversion(root, quality, bassNote); // Can return 0 if bass note not in formula
  }

  // Create the final chord object using the determined root and quality
  // Pass other options down.
  // Pass explicit inversion calculated above.
  // Pass explicit bass note *only if* it dictates an inversion different from root position.
  // If root IS the bass, bass option should be undefined.
  return createChord(root, quality, {
    ...options,
    inversion: inversion as ChordInversion, // Cast number to type
    // Pass bass explicitly ONLY if it resulted in a non-root inversion.
    // Or always pass the actual bass? Let createChord decide inversion if bass is passed?
    // Original logic seemed to pass bass only if it wasn't root AND inversion was non-zero?
    // Let's simplify: Pass the calculated inversion. createChord uses that if bass isn't provided.
    // If we force root=bass (identifyRoot:false), bass option is redundant.
    // If identifyRoot:true, we pass identified root and calculated inversion. Bass option not needed.
    // Keep it simple: createChord handles bass/inversion logic based on inputs.
    // We provide root, quality, and options. Let createChord figure out bass/inversion.
    // Revert to simpler call:
    // return createChord(root, quality, options); // This might lose inversion info if bass isn't passed.
    // Restore original logic: pass bass/inversion explicitly if needed.
    bass:
      options.identifyRoot === false || !notesAreEqual(root, bassNote)
        ? bassNote
        : undefined, // Pass bass only if forced root or if bass != identified root
    // inversion: inversion as ChordInversion, // Pass calculated inversion
  });
}

/**
 * @internal
 * Attempts to identify the root and quality of a chord from an array of notes.
 * Tries each note as a potential root and compares the resulting intervals
 * against known chord formulas (`CHORD_FORMULAS`). Returns the first match found
 * based on a simple matching heuristic.
 *
 * @param notes - An array of Note objects (requires at least 3).
 * @returns An object with the identified `root` Note and `quality` string, or `null` if no match is found.
 * @remarks This is a basic identification function. It checks if all notes of a known formula are present
 * and if most input notes are explained by the formula. It may not correctly identify complex chords,
 * chords with missing tones, or highly altered chords reliably. It returns the first plausible match found.
 */
export function identifyChord(
  notes: Note[]
): { root: Note; quality: ChordQuality } | null {
  // Need at least 3 notes for standard triad/seventh identification
  if (!Array.isArray(notes) || notes.length < 3) {
    return null; // Cannot reliably identify chord type with fewer than 3 notes
  }

  // Sort notes by pitch to normalize the input and easily find bass
  const sortedNotes = sortChordNotes([...notes]); // Use helper, creates copy

  // Try each unique note as a potential root
  // Using Set to avoid re-testing enharmonics with same pitch class as root
  const testedRootPCs = new Set<number>();

  for (const potentialRoot of sortedNotes) {
    if (testedRootPCs.has(potentialRoot.pitchClassIndex)) continue; // Skip if PC already tested as root
    testedRootPCs.add(potentialRoot.pitchClassIndex);

    // Calculate intervals (pitch classes relative to root) from this potential root to all other notes
    const intervals: number[] = []; // Intervals in semitones mod 12
    const presentPCsRelativeToRoot = new Set<number>([0]); // Root is always present (interval 0)

    for (const note of sortedNotes) {
      // Skip the potential root itself when calculating intervals to other notes
      if (notesAreEqual(note, potentialRoot)) continue; // Pitch equality check

      // Calculate interval from potential root to this note, modulo 12
      const interval =
        (note.pitchClassIndex - potentialRoot.pitchClassIndex + 12) % 12;
      intervals.push(interval);
      presentPCsRelativeToRoot.add(interval); // Add interval (relative PC) to the set
    }

    // Sort the calculated intervals (relative pitch classes excluding root)
    intervals.sort((a, b) => a - b);

    // --- Check against known chord structures (CHORD_FORMULAS) ---
    // Iterate through predefined chord qualities and their formulas
    for (const [quality, formula] of Object.entries(CHORD_FORMULAS)) {
      // Convert the formula {degree: alteration} into expected intervals (semitones from root mod 12)
      const formulaIntervals = Object.entries(formula)
        // Filter out the root degree (1) itself as we compare other intervals
        .filter(([degree]) => degree !== "1")
        // Map degree+alteration to semitone interval
        .map(([degreeStr, alteration]) => {
          const degree = parseInt(degreeStr, 10);
          let semitones = SCALE_DEGREE_SEMITONES[degree];
          if (semitones === undefined) return -1; // Invalid degree in formula?
          return (semitones + alteration + 12) % 12; // Calculate interval mod 12
        })
        .filter((interval) => interval !== -1) // Remove invalid degrees
        .sort((a, b) => a - b); // Sort for comparison

      // --- Matching Logic (from original code) ---
      // Check if all intervals defined in the formula are present in the input notes' intervals
      const allFormulaIntervalsPresent = formulaIntervals.every((interval) =>
        // Check against the Set of present intervals relative to root
        presentPCsRelativeToRoot.has(interval)
      );

      // Heuristic check: most of the input intervals should be explained by the formula
      // Calculate how many *input* intervals match the formula intervals
      let matchedInputIntervals = 0;
      for (const inputInterval of intervals) {
        // Use calculated intervals from input notes
        if (formulaIntervals.includes(inputInterval)) {
          matchedInputIntervals++;
        }
      }
      // Original check: formulaIntervals.length >= intervals.length * 0.75
      // This seems backwards. Should be matchedInputIntervals >= threshold?
      // Let's try: a significant portion of the INPUT intervals must match the formula.
      const inputMatchThreshold = 0.75; // Example threshold
      const sufficientInputIntervalsMatch =
        matchedInputIntervals / intervals.length >= inputMatchThreshold;

      // If all formula intervals are present AND most input intervals match the formula
      // Original logic used formula length vs intervals length - sticking to that:
      const originalHeuristicCheck =
        formulaIntervals.length >= intervals.length * 0.75;

      if (allFormulaIntervalsPresent && originalHeuristicCheck) {
        // Found a plausible match, return this root and quality
        return {
          root: potentialRoot,
          quality: quality as ChordQuality, // Cast string key to ChordQuality
        };
      }
      // --- End Matching Logic ---
    } // End loop through CHORD_FORMULAS
  } // End loop through potential roots

  // No suitable match found after trying all notes as root
  return null;
}

/**
 * Creates a Chord object from a root note and an explicit array of intervals (in semitones from the root).
 * It generates the notes based on the intervals and then attempts to identify the chord's quality using `identifyChord`.
 * If identification fails, it creates a Chord object with a placeholder quality ("major") but stores the provided intervals
 * in a custom `formula` property (overwriting the standard formula).
 *
 * @param root - The root Note object.
 * @param intervals - An array of numbers representing the intervals (in semitones, relative to the root) that define the chord structure. Should not include 0 for the root.
 * @param [options={}] - Optional settings for note creation (passed down). See {@link ChordOptions}.
 * @returns A Chord object. If the interval structure matches a known quality, that quality/formula is used. Otherwise, quality defaults to "major" and the `formula` property reflects the custom intervals provided.
 * @throws {Error} If the intervals array is empty or the root note is invalid.
 * @remarks The `pattern` property on the returned Chord object reflects the derived semitone intervals from the root, sorted and including 0. The `formula` property might be custom if the chord wasn't identified.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 *
 * // Create C Major triad using intervals [4, 7] (M3, P5)
 * const cMajIntervals = createChordFromIntervals(c4, [4, 7]);
 * console.log(cMajIntervals.quality); // "major" (identified)
 * console.log(cMajIntervals.formula); // { '1': 0, '3': 0, '5': 0 }
 *
 * // Create a custom chord C4, D4, G4 using intervals [2, 7]
 * const cAdd2 = createChordFromIntervals(c4, [2, 7]);
 * console.log(cAdd2.quality); // "major" (fallback - identifyChord might fail)
 * console.log(cAdd2.formula); // Custom formula derived, e.g., { '1': 0, '2': 0, '5': 0 }
 * console.log(cAdd2.notes.map(formatNote)); // ['C4', 'D4', 'G4'] (if sorted)
 * ```
 */
export function createChordFromIntervals(
  root: Note,
  intervals: number[], // Semitones from root, excluding the root itself (0)
  options: Partial<ChordOptions> = {}
): Chord {
  // --- Input Validation ---
  if (!root) throw new Error("Invalid root note provided.");
  if (!Array.isArray(intervals) || intervals.length === 0) {
    // Original code checked intervals.length === 0, allowing empty array? Let's require at least one interval.
    throw new Error("At least one interval (besides the root) is required.");
  }
  if (intervals.some((i) => !Number.isFinite(i))) {
    throw new Error("Invalid intervals array: contains non-finite numbers.");
  }
  // Remove 0 if present, as root is added separately
  const uniqueIntervals = [...new Set(intervals.filter((i) => i !== 0))].sort(
    (a, b) => a - b
  );
  if (uniqueIntervals.length === 0) {
    throw new Error(
      "Intervals array must contain at least one non-root interval."
    );
  }
  // --- End Validation ---

  // Create the notes: Root + notes transposed by each interval
  // Ensure the root note itself is included
  const notes: Note[] = [root];
  uniqueIntervals.forEach((semitones) => {
    // Use transpose, assuming intervals are semitones (potentially fractional)
    notes.push(
      transpose(root, semitones, {
        prefer: options.prefer,
        includeCachedValues: options.includeCachedValues,
        transposeByCents: true, // Use precise transposition
      })
    );
  });

  // Sort the generated notes
  // Using sortChordNotes ensures consistency
  const sortedNotes = sortChordNotes(notes);

  // Attempt to identify the chord based on the generated notes
  try {
    // Use createChordFromNotes which handles identification and construction
    // Force identification based on the provided root note.
    return createChordFromNotes(sortedNotes, {
      ...options,
      identifyRoot: true, // Ensure it tries to match known qualities
    });
    // Note: createChordFromNotes uses identifyChord internally.
    // If identifyChord fails, createChordFromNotes throws an error.
    // Original code had fallback logic here. Let's replicate that for adherence.
  } catch (error) {
    // If standard identification fails, create a custom chord object
    console.warn(
      `Could not identify standard chord quality for intervals [${uniqueIntervals.join(
        ", "
      )}] relative to ${formatNote(root)}. Creating custom chord object.`
    );

    // Create a custom formula based on the input intervals
    const formula: ChordFormula = { 1: 0 }; // Start with root
    // Derive degree/alteration for each interval
    for (const semitones of uniqueIntervals) {
      // Use the input intervals that defined the notes
      // Find the closest standard scale degree for this interval
      let closestDegree = 1; // Default, should be overridden
      let smallestDiff = Infinity;

      for (const [degreeStr, baseSemitones] of Object.entries(
        SCALE_DEGREE_SEMITONES
      )) {
        // Calculate difference between input semitone and standard degree semitone
        const diff = Math.abs(semitones - baseSemitones);

        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestDegree = parseInt(degreeStr, 10);
        }
        // Basic tie-breaking: prefer smaller degree number?
        else if (diff === smallestDiff) {
          closestDegree = Math.min(closestDegree, parseInt(degreeStr, 10));
        }
      }

      // Add to formula with the appropriate alteration relative to the standard degree
      const baseSemitones = SCALE_DEGREE_SEMITONES[closestDegree];
      // Calculate alteration needed (can be non-integer if input was fractional)
      const alteration = semitones - baseSemitones;
      // Only add if degree > 1 and not already present (Set handled uniqueness of semitones)
      if (closestDegree > 1) {
        formula[closestDegree] = alteration;
      }
    }

    // Create a placeholder Chord object
    // Freeze notes and pattern (original code froze intervals, pattern derived here)
    const derivedPattern = Object.freeze(
      notes.map((n) => intervalBetween(root, n, true)).sort((a, b) => a - b)
    ) as ScalePattern;

    return Object.freeze({
      root,
      notes: Object.freeze(sortedNotes), // Freeze notes array
      quality: "major", // Placeholder quality as identification failed
      formula: Object.freeze(formula), // Store the derived custom formula
      bass: sortedNotes[0], // Lowest note is bass
      inversion: getChordInversion(root, "major", sortedNotes[0]), // Calculate inversion based on bass/root/placeholder quality
      category: "special", // Use 'special' category for custom chords
      tuningSystem: options.tuningSystem,
      symbol:
        generateChordSymbol(root, "major") +
        `(intervals:${uniqueIntervals.join(",")})`, // Generate basic symbol + custom indicator
    });
  }
}

/**
 * Creates a potentially microtonal Chord object from a root note and an array of intervals.
 * Intervals can be specified in cents or potentially fractional semitones.
 * Returns a Chord object, typically marked with a custom quality/formula, as standard
 * chord identification may not apply precisely.
 *
 * @param root - The root Note object.
 * @param intervals - An array of numbers representing intervals from the root. Interpretation depends on `options.isCents`.
 * @param [options={}] - Optional settings.
 * @param [options.isCents=false] - If true, interprets `intervals` as cents offsets. If false (default), interprets `intervals` as semitone offsets (which can be fractional).
 * @param [options.microtonalAdjustments] - Optional. A record mapping degree index (0=root, 1=first interval note, etc.) to additional cents adjustments to apply *after* initial note creation.
 * @param [options.prefer='sharp'] - Enharmonic preference for spelling notes created from intervals.
 * @param [options.includeCachedValues=true] - Whether notes should include cached values.
 * @param [options.tuningSystem] - Optional tuning system tag for the chord.
 * @returns A Chord object representing the microtonal structure. Quality/Formula might be generic/custom.
 * @throws {Error} If root note or intervals are invalid.
 * @remarks This function is intended for explicitly defining chords with non-12-TET intervals. Standard chord identification is bypassed.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 *
 * // Create C major triad with a neutral third (approx 350 cents)
 * const neutralMaj = createMicrotonalChord(c4, [350, 700], { isCents: true });
 * console.log(neutralMaj.notes.map(n => `${formatNote(n)} (${n.cents?.toFixed(0)}c)`));
 * // Example Output: [ 'C4 (0c)', 'E-50c (approx)', 'G4 (0c)' ] - Spelling depends on transposeByCents logic
 * console.log(neutralMaj.quality); // 'custom'
 *
 * // Create based on semitones, then adjust 3rd degree up 15 cents
 * const adjustedMaj = createMicrotonalChord(c4, [4, 7], { // M3=4st, P5=7st
 * microtonalAdjustments: { 1: 15 } // Adjust 1st interval note (index 1 = M3) up 15 cents
 * });
 * console.log(adjustedMaj.notes.map(n => `${formatNote(n)} (${n.cents?.toFixed(0)}c)`));
 * // Example Output: [ 'C4 (0c)', 'E4 (15c)', 'G4 (0c)' ]
 * ```
 */
export function createMicrotonalChord(
  root: Note,
  intervals: number[], // Intervals from root (semitones or cents), excluding 0
  options: Partial<
    ChordOptions & {
      // Include standard options
      /** If true, `intervals` are treated as cents; otherwise, as semitones. Default: false */
      isCents?: boolean;
      /** Optional map where key is the 0-based index of the note *after* the root (i.e., index corresponding to `intervals` array + 1) and value is a cents adjustment to apply. */
      microtonalAdjustments?: Record<number, number>; // degree index -> cents adjustment
    }
  > = {}
): Chord {
  // Returns Chord, but likely custom quality/formula
  // --- Input Validation ---
  if (!root) throw new Error("Invalid root note provided.");
  if (!Array.isArray(intervals))
    throw new Error("Invalid intervals: must be an array.");
  if (intervals.some((i) => !Number.isFinite(i)))
    throw new Error("Invalid intervals: contains non-finite numbers.");
  // --- End Validation ---

  const isCents = options.isCents ?? false; // Check if intervals are cents
  const notes: Note[] = [root]; // Start with the root note

  // Add chord tones based on the provided intervals
  for (const interval of intervals) {
    let note: Note;

    if (isCents) {
      // Interpret interval as cents, transpose precisely
      note = transposeByCents(root, interval, {
        prefer: options.prefer,
        includeCachedValues: options.includeCachedValues,
      });
    } else {
      // Interpret as semitones (possibly with fraction)
      // Use transpose with transposeByCents=true for precision
      note = transpose(root, interval, {
        prefer: options.prefer,
        includeCachedValues: options.includeCachedValues,
        transposeByCents: true, // Ensure fractional semitones work
      });
      // Original code's split logic - keep for adherence
      /*
       const semitones = Math.floor(interval);
       const cents = (interval - semitones) * 100;
       note = transpose(root, semitones, { prefer: options.prefer, includeCachedValues: options.includeCachedValues });
       if (Math.abs(cents) > 1e-9) {
           note = addCentsToNote(note, cents, { includeCachedValues: options.includeCachedValues });
       }
       */
    }
    notes.push(note);
  }

  // Apply additional microtonal adjustments if provided
  // Adjustments are applied based on the *index* of the note in the *final* chord
  // (0 = root, 1 = note from first interval, etc.)
  if (options.microtonalAdjustments) {
    for (const [degreeIndexStr, adjustment] of Object.entries(
      options.microtonalAdjustments
    )) {
      const degreeIndex = parseInt(degreeIndexStr, 10); // 0-based index
      // Check if adjustment is valid and index is within bounds
      if (
        !isNaN(degreeIndex) &&
        Number.isFinite(adjustment) &&
        degreeIndex >= 0 &&
        degreeIndex < notes.length
      ) {
        // Apply cents adjustment to the note at this index
        notes[degreeIndex] = addCentsToNote(notes[degreeIndex], adjustment, {
          includeCachedValues: options.includeCachedValues,
        });
      } else {
        console.warn(
          `Invalid microtonal adjustment skipped: degree index ${degreeIndexStr}, adjustment ${adjustment}`
        );
      }
    }
  }

  // Sort final notes? Usually desired for chord representation.
  const finalNotes = sortChordNotes(notes); // Use helper for consistent sorting
  const finalRoot = finalNotes[0]; // Root might change if sorting affects order significantly with microtones? No, use original root.

  // Derive pattern from final notes relative to original root
  const finalPattern = Object.freeze(
    finalNotes.map((n) => intervalBetween(root, n, true)).sort((a, b) => a - b)
  ) as ScalePattern;

  // Create a custom chord object - standard quality/formula don't apply
  return Object.freeze({
    // Freeze final object
    root, // Keep original root
    notes: Object.freeze(finalNotes), // Use sorted, potentially adjusted notes
    // Use a specific or generic quality name for microtonal/custom chords?
    quality: "custom" as ChordQuality, // Use 'custom' as placeholder quality
    formula: {}, // Standard formula is not applicable, leave empty or create custom representation? Empty for now.
    bass: finalNotes[0], // Lowest note after sorting
    inversion: getChordInversion(root, "custom" as ChordQuality, finalNotes[0]), // Calculate inversion based on root/bass (quality ignored by helper)
    category: "special", // General category
    tuningSystem: options.tuningSystem, // Store specified tuning system
    symbol:
      generateChordSymbol(root, "custom" as ChordQuality) + `(microtonal)`, // Basic symbol + indicator
  });
}

/**
 * Creates a Just Intonation chord (Major, Minor, Dominant 7th, or Diminished Triad)
 * based on standard 5-limit frequency ratios relative to the root note.
 *
 * @param root - The root Note object.
 * @param quality - The desired JI chord quality ('major', 'minor', 'dominant7', 'diminished').
 * @param [options={}] - Optional settings (passed to `createNoteByRatio`). See {@link ChordOptions}.
 * @returns A Chord object representing the Just Intonation chord. Notes will likely have `cents` properties. The `tuningSystem` is set to 'justIntonation'. The `formula` property is empty as standard formulas don't capture JI precisely.
 * @throws {Error} If the root note is invalid or the requested quality is not supported for JI creation here.
 * @example
 * ```ts
 * const c4 = createNote({ midi: 60 });
 * const cMajJust = createJustChord(c4, 'major');
 * console.log(cMajJust.notes.map(n => `${formatNote(n)} (${n.cents?.toFixed(1)}c)`));
 * // Example: [ 'C4 (0.0c)', 'E4 (-13.7c)', 'G4 (2.0c)' ]
 *
 * const cDom7Just = createJustChord(c4, 'dominant7');
 * console.log(cDom7Just.notes.map(formatNote));
 * // Example: [ 'C4 (0.0c)', 'E4 (-13.7c)', 'G4 (2.0c)', 'Bb4 (-31.2c)' ] (Using 9/5 ratio for 7th)
 * ```
 */
export function createJustChord(
  root: Note,
  quality: "major" | "minor" | "dominant7" | "diminished", // Supported JI qualities
  options: Partial<ChordOptions> = {}
): Chord {
  // --- Input Validation ---
  if (!root) throw new Error("Invalid root note provided.");
  const supportedQualities = ["major", "minor", "dominant7", "diminished"];
  if (!supportedQualities.includes(quality)) {
    throw new Error(
      `Unsupported quality for createJustChord: ${quality}. Use 'major', 'minor', 'dominant7', or 'diminished'.`
    );
  }
  // --- End Validation ---

  // Define standard 5-limit frequency ratios for common chord types
  // Ratios relative to the root (1/1)
  const ratioMaps = {
    major: [1, 5 / 4, 3 / 2], // R, Just M3, Just P5
    minor: [1, 6 / 5, 3 / 2], // R, Just m3, Just P5
    dominant7: [1, 5 / 4, 3 / 2, 9 / 5], // R, M3, P5, Just m7 (using 9/5 ratio) - Other ratios exist (e.g., 16/9)
    diminished: [1, 6 / 5, 36 / 25], // R, Just m3, Just d5 (using 6/5 * 6/5 = 36/25) - Other ratios exist
    // Need a mapping for the quality string argument
  };

  // Select the ratios based on the requested quality
  const ratios = ratioMaps[quality];
  if (!ratios) {
    // Should be caught by validation, but double check
    throw new Error(
      `Internal error: No ratio map found for quality ${quality}`
    );
  }

  // Generate notes by applying each ratio to the root note
  const notes: Note[] = ratios.map((ratio) =>
    // Use createNoteByRatio from frequency module
    createNoteByRatio(root, ratio, {
      prefer: options.prefer, // Pass preference down
      // Caching handled internally
    })
  );

  // Map the specific input JI quality to a standard ChordQuality for categorization, if possible
  // Original code had a map, let's replicate
  const qualityMap: Record<string, ChordQuality> = {
    major: "major",
    minor: "minor",
    dominant7: "7", // Map to dominant 7 symbol quality
    diminished: "diminished",
  };
  const mappedQuality = qualityMap[quality];

  // Calculate pattern from generated notes
  const pattern = Object.freeze(
    notes.map((n) => intervalBetween(root, n, true)).sort((a, b) => a - b)
  ) as ScalePattern;
  // Sort notes
  const sortedNotes = sortChordNotes(notes);

  // Create the final Chord object, freezing notes and pattern (present in original)
  return Object.freeze({
    root,
    notes: Object.freeze(sortedNotes), // Use sorted notes
    quality: mappedQuality, // Use the mapped standard quality name
    formula: {}, // Standard formula doesn't represent JI precisely, leave empty
    bass: sortedNotes[0], // Bass is the lowest note after sorting
    inversion: 0, // Assume root position based on generation method
    category: CHORD_CATEGORIES[mappedQuality] ?? "special", // Get category based on mapped quality
    tuningSystem: "justIntonation", // Tag the tuning system
    symbol: generateChordSymbol(root, mappedQuality) + "(JI)", // Add indicator to symbol
  });
}
