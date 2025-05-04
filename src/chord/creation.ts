/**
 * Functions for creating chord objects
 */

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
  ChordQuality,
} from "./types";
import {
  EnharmonicPreference,
  Note,
  TuningSystem,
  addCentsToNote,
  createNote,
  createNoteFromParts,
  notesAreEqual,
  transpose,
  transposeByCents,
} from "../note";
import { getChordInversion, sortChordNotes } from "./voicing";

import { createNoteByRatio } from "../note/frequency";

/**
 * Default chord options
 */
const DEFAULT_CHORD_OPTIONS: ChordOptions = {
  prefer: "sharp",
  voicing: "close",
  inversion: 0,
  rootOctave: 4,
  includeCachedValues: true,
};

/**
 * Create a chord from a root note and a quality
 */
export function createChord(
  root: Note,
  quality: ChordQuality,
  options: Partial<ChordOptions> = {}
): Chord {
  // Merge default options
  const mergedOptions = { ...DEFAULT_CHORD_OPTIONS, ...options };

  // Get the formula for this chord quality
  const formula = CHORD_FORMULAS[quality];
  if (!formula) {
    throw new Error(`Unknown chord quality: ${quality}`);
  }

  // Generate the chord notes based on the formula
  let notes = createNotesFromFormula(root, formula, mergedOptions);

  // Apply any requested inversion
  let bassNote = root;
  let inversion = 0;

  if (mergedOptions.inversion !== undefined) {
    const inversionResult = applyInversion(notes, mergedOptions.inversion);
    notes = inversionResult.notes;
    bassNote = inversionResult.bass;
    inversion = inversionResult.inversion;
  }

  // If a specific bass note is provided (slash chord), use it
  if (mergedOptions.bass) {
    bassNote = mergedOptions.bass;
  }

  // Get the chord category
  const category = CHORD_CATEGORIES[quality];

  // Generate a chord symbol
  const symbol = generateChordSymbol(root, quality, bassNote);

  // Create the immutable chord object
  return Object.freeze({
    root,
    notes: Object.freeze(notes),
    quality,
    formula,
    bass: bassNote,
    inversion,
    category,
    symbol,
    tuningSystem: mergedOptions.tuningSystem,
  });
}

/**
 * Create a chord from a chord symbol string (e.g., "Cmaj7", "G7", "Fm")
 */
export function createChordFromSymbol(
  symbol: string,
  options: Partial<ChordOptions> = {}
): Chord {
  // Parse the chord symbol
  const parsed = parseChordSymbol(symbol);
  if (!parsed) {
    throw new Error(`Invalid chord symbol: ${symbol}`);
  }

  // Create the root note
  const rootNote = createNoteFromParts({
    letter: parsed.root.toUpperCase() as any,
    accidental: parsed.accidental as any,
    octave: options.rootOctave || DEFAULT_CHORD_OPTIONS.rootOctave!,
    includeCachedValues: options.includeCachedValues,
  });

  // Create any bass note if present
  let bassNote: Note | undefined;
  if (parsed.bass) {
    bassNote = createNoteFromParts({
      letter: parsed.bass.letter.toUpperCase() as any,
      accidental: parsed.bass.accidental as any,
      octave: rootNote.octave,
      includeCachedValues: options.includeCachedValues,
    });
  }

  // Create the chord
  return createChord(rootNote, parsed.quality, {
    ...options,
    bass: bassNote,
  });
}

/**
 * Create chord notes from a formula
 */
function createNotesFromFormula(
  root: Note,
  formula: ChordFormula,
  options: ChordOptions
): Note[] {
  const notes: Note[] = [];
  const rootOctave = options.rootOctave || 4;

  // Ensure the root note is in the correct octave
  const rootAtTargetOctave = createNoteFromParts({
    letter: root.letter,
    accidental: root.accidental,
    octave: rootOctave,
    includeCachedValues: options.includeCachedValues,
  });

  // Add each note based on the formula
  for (const [degreeStr, alteration] of Object.entries(formula)) {
    const degree = parseInt(degreeStr, 10);

    // Get the base semitones for this scale degree
    let semitones = SCALE_DEGREE_SEMITONES[degree];
    if (semitones === undefined) {
      throw new Error(`Unknown scale degree: ${degree}`);
    }

    // Apply alteration
    semitones += alteration;

    // Create the note
    const note = transpose(rootAtTargetOctave, semitones, {
      prefer: options.prefer,
      includeCachedValues: options.includeCachedValues,
    });

    notes.push(note);
  }

  // Apply voicing adjustments if specified
  if (options.voicing && options.voicing !== "close") {
    // Handle different voicing types
    // This will be implemented fully in the voicing.ts file
    return sortChordNotes(notes);
  }

  // Default to close voicing (sorted by pitch)
  return sortChordNotes(notes);
}

/**
 * Apply an inversion to a chord
 */
function applyInversion(
  notes: Note[],
  inversion: ChordInversion
): { notes: Note[]; bass: Note; inversion: number } {
  // Convert string inversions to numbers
  let inversionNum =
    typeof inversion === "number"
      ? inversion
      : inversion === "root"
      ? 0
      : inversion === "1st"
      ? 1
      : inversion === "2nd"
      ? 2
      : inversion === "3rd"
      ? 3
      : 0;

  // Validate inversion number
  if (inversionNum < 0 || inversionNum >= notes.length) {
    throw new Error(
      `Invalid inversion: ${inversion}. Must be between 0 and ${
        notes.length - 1
      }`
    );
  }

  // For root position, no changes needed
  if (inversionNum === 0) {
    return { notes, bass: notes[0], inversion: 0 };
  }

  // Apply the inversion by moving notes to the next octave
  const result = [...notes];

  // Move the first n notes up an octave
  for (let i = 0; i < inversionNum; i++) {
    // Create a note one octave higher
    const originalNote = result[i];
    const octaveUp = createNoteFromParts({
      letter: originalNote.letter,
      accidental: originalNote.accidental,
      octave: originalNote.octave + 1,
      includeCachedValues: !!originalNote.midi,
    });

    // Replace with the higher note
    result[i] = octaveUp;
  }

  // Re-sort the notes by pitch
  const sortedNotes = sortChordNotes(result);

  // The bass note is now different
  const bassNote = sortedNotes[0];

  return { notes: sortedNotes, bass: bassNote, inversion: inversionNum };
}

/**
 * Parse a chord symbol string into its components
 */
export function parseChordSymbol(symbol: string): {
  root: string;
  accidental: string;
  quality: ChordQuality;
  bass?: { letter: string; accidental: string };
} | null {
  // Apply regex to parse the symbol
  const match = symbol.match(CHORD_SYMBOL_REGEX);
  if (!match) {
    return null;
  }

  const [
    _,
    root,
    accidental = "",
    qualityPart = "",
    extension = "",
    bassNotation = "",
  ] = match;

  // Determine the chord quality
  let quality: ChordQuality = "major"; // Default to major triad

  // Try to map directly from the matched parts
  const qualityKey = qualityPart + extension || "";
  if (CHORD_SYMBOL_MAP[qualityKey]) {
    quality = CHORD_SYMBOL_MAP[qualityKey];
  }
  // If not found, try just the quality part
  else if (qualityPart && CHORD_SYMBOL_MAP[qualityPart]) {
    quality = CHORD_SYMBOL_MAP[qualityPart];
  }
  // Try just the extension
  else if (extension && CHORD_SYMBOL_MAP[extension]) {
    quality = CHORD_SYMBOL_MAP[extension];
  }

  // Parse any bass note for slash chords
  let bass;
  if (bassNotation) {
    const bassLetter = bassNotation.charAt(0);
    const bassAccidental = bassNotation.substring(1) || "";
    bass = { letter: bassLetter, accidental: bassAccidental };
  }

  return { root, accidental, quality, bass };
}

/**
 * Generate a chord symbol from a chord's components
 */
export function generateChordSymbol(
  root: Note,
  quality: ChordQuality,
  bassNote?: Note
): string {
  // Format the root note (letter + accidental)
  let symbol = `${root.letter}${root.accidental}`;

  // Add quality/extension notation
  switch (quality) {
    case "major":
      // Major triads typically have no symbol
      break;

    case "minor":
      symbol += "m";
      break;

    case "augmented":
      symbol += "+";
      break;

    case "diminished":
      symbol += "dim";
      break;

    case "sus2":
      symbol += "sus2";
      break;

    case "sus4":
      symbol += "sus4";
      break;

    default:
      // For other qualities, just append the quality name
      symbol += quality;
  }

  // Add slash notation for bass note if different from root
  if (bassNote && !notesAreEqual(bassNote, root)) {
    symbol += `/${bassNote.letter}${bassNote.accidental}`;
  }

  return symbol;
}

/**
 * Create a chord from a set of notes
 * This will attempt to identify the chord quality and root
 */
export function createChordFromNotes(
  notes: Note[],
  options: Partial<ChordOptions & { identifyRoot?: boolean }> = {}
): Chord {
  if (notes.length < 2) {
    throw new Error("At least 2 notes are required to create a chord");
  }

  // Identify the root and quality if requested
  const identified = identifyChord(notes);
  if (!identified) {
    throw new Error("Could not identify chord from these notes");
  }

  // Use identified root, or the lowest note if requested
  let root: Note;
  if (options.identifyRoot !== false) {
    root = identified.root;
  } else {
    // Sort notes by pitch and use the lowest as root
    const sortedNotes = sortChordNotes([...notes]);
    root = sortedNotes[0];
  }

  // Determine the bass note
  const sortedNotes = sortChordNotes([...notes]);
  const bassNote = sortedNotes[0];

  // Check if this is an inversion
  let inversion = 0;
  if (!notesAreEqual(root, bassNote)) {
    // Find what degree the bass note is
    inversion = getChordInversion(root, identified.quality, bassNote);
  }

  // Create the chord
  return createChord(root, identified.quality, {
    ...options,
    inversion: inversion as ChordInversion, // Cast to ChordInversion
    // Only pass bass explicitly if it's not a standard inversion
    bass:
      inversion === 0 && !notesAreEqual(root, bassNote) ? bassNote : undefined,
  });
}

/**
 * Identify a chord's root and quality from a set of notes
 */
export function identifyChord(
  notes: Note[]
): { root: Note; quality: ChordQuality } | null {
  // Need at least 3 notes for a proper chord
  if (notes.length < 3) {
    return null;
  }

  // Sort notes to normalize the input
  const sortedNotes = sortChordNotes([...notes]);

  // Try each note as a potential root
  for (const potentialRoot of sortedNotes) {
    // Calculate intervals between the potential root and all other notes
    const intervals: number[] = [];

    for (const note of sortedNotes) {
      if (!notesAreEqual(note, potentialRoot)) {
        // Calculate interval from root to this note
        const interval =
          (note.pitchClassIndex - potentialRoot.pitchClassIndex + 12) % 12;
        intervals.push(interval);
      }
    }

    // Sort intervals for easier matching
    intervals.sort((a, b) => a - b);

    // Check against common chord structures
    for (const [quality, formula] of Object.entries(CHORD_FORMULAS)) {
      // Convert formula to semitone intervals from root
      const formulaIntervals = Object.entries(formula)
        .filter(([degree]) => degree !== "1") // Skip the root (1)
        .map(([degreeStr, alteration]) => {
          const degree = parseInt(degreeStr, 10);
          return (SCALE_DEGREE_SEMITONES[degree] + alteration) % 12;
        });

      // Sort formula intervals
      formulaIntervals.sort((a, b) => a - b);

      // Check if this formula matches our intervals
      // It's a match if all formula intervals exist in our note intervals
      // And most of our note intervals are explained by the formula
      const matches = formulaIntervals.every((interval) =>
        intervals.includes(interval)
      );

      if (matches && formulaIntervals.length >= intervals.length * 0.75) {
        return {
          root: potentialRoot,
          quality: quality as ChordQuality,
        };
      }
    }
  }

  return null;
}

/**
 * Create a chord from a root and array of intervals
 */
export function createChordFromIntervals(
  root: Note,
  intervals: number[],
  options: Partial<ChordOptions> = {}
): Chord {
  if (intervals.length === 0) {
    throw new Error("At least one interval is required");
  }

  // Need to sort intervals and add the root (0)
  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  if (sortedIntervals[0] !== 0) {
    sortedIntervals.unshift(0); // Add root if not present
  }

  // Create the notes
  const notes: Note[] = sortedIntervals.map((semitones) =>
    transpose(root, semitones, {
      prefer: options.prefer,
      includeCachedValues: options.includeCachedValues,
    })
  );

  // Try to identify the chord
  try {
    return createChordFromNotes(notes, {
      ...options,
      identifyRoot: true,
    });
  } catch (error) {
    // If identification fails, create a chord with the root and notes,
    // but use a custom chord formula
    const formula: ChordFormula = { 1: 0 }; // Start with root

    for (const semitones of sortedIntervals) {
      if (semitones === 0) continue; // Skip root

      // Find the closest scale degree for this interval
      let closestDegree = 1;
      let smallestDiff = 12;

      for (const [degreeStr, baseSemitones] of Object.entries(
        SCALE_DEGREE_SEMITONES
      )) {
        const degree = parseInt(degreeStr, 10);
        const diff = Math.abs(semitones - baseSemitones);

        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestDegree = degree;
        }
      }

      // Add to formula with the appropriate alteration
      const baseSemitones = SCALE_DEGREE_SEMITONES[closestDegree];
      const alteration = semitones - baseSemitones;
      formula[closestDegree] = alteration;
    }

    // Use "major" as fallback quality - structure will come from formula
    return Object.freeze({
      root,
      notes: Object.freeze(notes),
      quality: "major", // Placeholder
      formula,
      bass: notes[0],
      inversion: 0,
      category: "special",
      tuningSystem: options.tuningSystem,
    });
  }
}

export function createMicrotonalChord(
  root: Note,
  intervals: number[],
  options: Partial<
    ChordOptions & {
      isCents?: boolean;
      microtonalAdjustments?: Record<number, number>; // degree to cents adjustment
    }
  > = {}
): Chord {
  const isCents = options.isCents ?? false;
  const notes: Note[] = [root];

  // Add chord tones based on intervals
  for (const interval of intervals) {
    let note: Note;

    if (isCents) {
      // Interpret interval as cents
      note = transposeByCents(root, interval, {
        prefer: options.prefer,
      });
    } else {
      // Interpret as semitones with possible fraction
      const semitones = Math.floor(interval);
      const cents = (interval - semitones) * 100;

      note = transpose(root, semitones, {
        prefer: options.prefer,
      });

      if (cents !== 0) {
        note = addCentsToNote(note, cents);
      }
    }

    notes.push(note);
  }

  // Apply additional microtonal adjustments if provided
  if (options.microtonalAdjustments) {
    for (const [degree, adjustment] of Object.entries(
      options.microtonalAdjustments
    )) {
      const degreeIndex = parseInt(degree, 10);
      if (degreeIndex < notes.length) {
        notes[degreeIndex] = addCentsToNote(notes[degreeIndex], adjustment);
      }
    }
  }

  // Create a custom chord (normal createChord won't handle microtonal properly)
  return {
    root,
    notes: Object.freeze(notes),
    quality: "custom" as ChordQuality, // We don't have standard names for microtonal chords
    formula: {}, // Would need custom formula representation
    bass: notes[0],
    inversion: 0,
    category: "special",
    tuningSystem: options.tuningSystem,
  };
}

/**
 * Create just intonation chord
 */
export function createJustChord(
  root: Note,
  quality: "major" | "minor" | "dominant7" | "diminished",
  options: Partial<ChordOptions> = {}
): Chord {
  // Define frequency ratios for common chord types in just intonation
  const ratioMaps = {
    major: [1, 5 / 4, 3 / 2], // perfect harmonics for major triad
    minor: [1, 6 / 5, 3 / 2], // minor third with perfect fifth
    dominant7: [1, 5 / 4, 3 / 2, 9 / 5], // major triad with minor seventh
    diminished: [1, 6 / 5, 7 / 5], // minor third with diminished fifth
  };

  const ratios = ratioMaps[quality];

  // Generate notes using the ratios
  const notes: Note[] = ratios.map((ratio) =>
    createNoteByRatio(root, ratio, {
      prefer: options.prefer,
    })
  );

  // Map just intonation quality to standard quality
  const qualityMap: Record<string, ChordQuality> = {
    major: "major",
    minor: "minor",
    dominant7: "7",
    diminished: "diminished",
  };

  // Create the chord
  return {
    root,
    notes: Object.freeze(notes),
    quality: qualityMap[quality],
    formula: {}, // This would need a custom formula that accounts for just intonation
    bass: notes[0],
    inversion: 0,
    category: "special",
    tuningSystem: "justIntonation",
  };
}
