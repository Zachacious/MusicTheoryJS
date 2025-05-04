import {
  Note,
  addCentsToNote,
  createNoteFromParts,
  notesAreEqual,
} from "./note";

// Define the tuning system function type
export type TuningSystemFunction = (note: Note, reference: Note) => number;

// Define the tuning system interface
interface TuningSystemDefinition {
  name: string;
  description: string;
  adjustmentFunction: TuningSystemFunction;
}

// Define standard tuning systems
export const TUNING_SYSTEMS: Record<string, TuningSystemDefinition> = {
  // Equal temperament
  equalTemperament: {
    name: "12-tone Equal Temperament",
    description: "Standard tuning with 12 equal semitones per octave",
    adjustmentFunction: (note: Note, reference: Note) => 0, // No adjustment
  },

  // Just intonation
  justIntonation: {
    name: "Just Intonation",
    description: "Tuning based on pure frequency ratios",
    adjustmentFunction: calculateJustIntonationAdjustment,
  },

  // Pythagorean tuning
  pythagorean: {
    name: "Pythagorean Tuning",
    description: "Tuning based on perfect fifths",
    adjustmentFunction: calculatePythagoreanAdjustment,
  },

  // Quarter-comma meantone
  quarterMeantone: {
    name: "Quarter-comma Meantone",
    description: "Renaissance temperament with pure major thirds",
    adjustmentFunction: calculateQCMeantoneAdjustment,
  },

  // Other EDOs
  "19-EDO": {
    name: "19-tone Equal Temperament",
    description: "19 equal divisions of the octave",
    adjustmentFunction: (note: Note, reference: Note) =>
      convertEDOtoCents(note, reference, 19),
  },

  "31-EDO": {
    name: "31-tone Equal Temperament",
    description: "31 equal divisions of the octave",
    adjustmentFunction: (note: Note, reference: Note) =>
      convertEDOtoCents(note, reference, 31),
  },
};

/**
 * Apply a specific tuning system to a set of notes
 */
export function applyTuningSystem(
  notes: ReadonlyArray<Note>, // Change from Note[] to ReadonlyArray<Note>
  system: string | TuningSystemFunction,
  referenceNote?: Note
): Note[] {
  // Use A4 = 440Hz as default reference
  const reference =
    referenceNote ||
    createNoteFromParts({
      letter: "A",
      accidental: "",
      octave: 4,
    });

  // Determine the adjustment function to use
  let adjustmentFunction: TuningSystemFunction;

  if (typeof system === "string") {
    // If it's a string, look up the system in TUNING_SYSTEMS
    const systemDefinition = TUNING_SYSTEMS[system];
    if (!systemDefinition) {
      throw new Error(`Unknown tuning system: ${system}`);
    }
    adjustmentFunction = systemDefinition.adjustmentFunction;
  } else {
    // If it's a function, use it directly
    adjustmentFunction = system;
  }

  // Apply the tuning adjustments to each note
  return notes.map((note) => {
    // Skip the reference note itself
    if (notesAreEqual(note, reference)) return note;

    // Calculate cent adjustment
    const centsAdjustment = adjustmentFunction(note, reference);

    // Apply the adjustment to create a new note
    return centsAdjustment === 0 ? note : addCentsToNote(note, centsAdjustment);
  });
}

/**
 * Calculate cents adjustment for just intonation relative to a reference note
 */
function calculateJustIntonationAdjustment(
  note: Note,
  reference: Note
): number {
  // Calculate the interval between reference and note in semitones
  const semitonesFromRef =
    (note.pitchClassIndex - reference.pitchClassIndex + 12) % 12;
  const octaveDistance =
    note.octave -
    reference.octave +
    Math.floor((note.pitchClassIndex - reference.pitchClassIndex + 12) / 12);

  // Just intonation ratios for each interval (relative to tonic)
  const justRatios: Record<number, { ratio: number; cents: number }> = {
    0: { ratio: 1 / 1, cents: 0 }, // Perfect unison
    1: { ratio: 16 / 15, cents: 112 }, // Minor second
    2: { ratio: 9 / 8, cents: 204 }, // Major second
    3: { ratio: 6 / 5, cents: 316 }, // Minor third
    4: { ratio: 5 / 4, cents: 386 }, // Major third
    5: { ratio: 4 / 3, cents: 498 }, // Perfect fourth
    6: { ratio: 45 / 32, cents: 590 }, // Augmented fourth
    7: { ratio: 3 / 2, cents: 702 }, // Perfect fifth
    8: { ratio: 8 / 5, cents: 814 }, // Minor sixth
    9: { ratio: 5 / 3, cents: 884 }, // Major sixth
    10: { ratio: 9 / 5, cents: 1018 }, // Minor seventh
    11: { ratio: 15 / 8, cents: 1088 }, // Major seventh
  };

  // Get the just ratio and cents for this interval
  const justInterval = justRatios[semitonesFromRef];

  // Calculate the equal tempered cents for this interval
  const equalTemperedCents = semitonesFromRef * 100;

  // The adjustment is the difference between just and equal tempered
  let adjustment = justInterval.cents - equalTemperedCents;

  // Adjust for octaves
  adjustment += octaveDistance * 1200 - octaveDistance * 1200; // Both are the same, so net zero

  return adjustment;
}

/**
 * Calculate cents adjustment for Pythagorean tuning
 */
function calculatePythagoreanAdjustment(note: Note, reference: Note): number {
  // Calculate the interval between reference and note in semitones
  const semitonesFromRef =
    (note.pitchClassIndex - reference.pitchClassIndex + 12) % 12;

  // Pythagorean tuning is based on stacked perfect fifths
  // The cents deviations from equal temperament:
  const pythagoreanOffsets: Record<number, number> = {
    0: 0, // Unison - no deviation
    1: 14, // Minor second is sharp
    2: 4, // Major second is slightly sharp
    3: 18, // Minor third is sharp
    4: 8, // Major third is quite sharp
    5: -2, // Perfect fourth is slightly flat
    6: 12, // Tritone is sharp
    7: 2, // Perfect fifth is slightly sharp
    8: 16, // Minor sixth is sharp
    9: 6, // Major sixth is sharp
    10: 20, // Minor seventh is sharp
    11: 10, // Major seventh is sharp
  };

  return pythagoreanOffsets[semitonesFromRef];
}

/**
 * Calculate cents adjustment for quarter-comma meantone
 */
function calculateQCMeantoneAdjustment(note: Note, reference: Note): number {
  // Calculate the interval between reference and note in semitones
  const semitonesFromRef =
    (note.pitchClassIndex - reference.pitchClassIndex + 12) % 12;

  // Quarter-comma meantone offsets from 12-TET in cents
  const meantoneOffsets: Record<number, number> = {
    0: 0, // Unison
    1: -24, // Minor second is flatter
    2: -7, // Major second is slightly flat
    3: 10, // Minor third is slightly sharp
    4: -14, // Major third is pure (flatter than 12-TET)
    5: 3, // Perfect fourth is very close
    6: -21, // Tritone is flat
    7: -3, // Perfect fifth is slightly flat
    8: 14, // Minor sixth is sharper
    9: -10, // Major sixth is flatter
    10: 7, // Minor seventh is slightly sharp
    11: -17, // Major seventh is flat
  };

  return meantoneOffsets[semitonesFromRef];
}

/**
 * Convert an EDO step to cents adjustment from equal temperament
 */
function convertEDOtoCents(
  note: Note,
  reference: Note,
  divisions: number
): number {
  // Calculate the interval between reference and note in semitones
  const semitonesFromRef =
    (note.pitchClassIndex - reference.pitchClassIndex + 12) % 12;

  // Calculate the step size in cents for this EDO
  const centsPerStep = 1200 / divisions;

  // Find the closest step in the EDO to our 12-TET semitone
  const edoStep = Math.round((semitonesFromRef * 100) / centsPerStep);

  // Calculate the cents of that step
  const edoCents = edoStep * centsPerStep;

  // Calculate the difference from 12-TET
  return edoCents - semitonesFromRef * 100;
}

/**
 * Function to register custom tuning systems
 */
export function registerTuningSystem(
  name: string,
  properties: {
    name: string;
    description: string;
    adjustmentFunction: TuningSystemFunction;
  }
): void {
  TUNING_SYSTEMS[name] = properties;
}

/**
 * Get the frequency ratio between two notes
 */
export function getFrequencyRatio(note1: Note, note2: Note): number {
  // This needs implementation - should use the frequency property if available
  // or calculate it based on the notes' properties
  if (note1.frequency && note2.frequency) {
    return note2.frequency / note1.frequency;
  }

  // Calculate ratio from semitones if frequencies aren't available
  const semitones =
    ((note2.pitchClassIndex - note1.pitchClassIndex + 12) % 12) +
    (note2.octave - note1.octave) * 12;

  // 2^(n/12) gives the frequency ratio for n semitones
  return Math.pow(2, semitones / 12);
}

/**
 * Calculate cents value from a frequency ratio
 */
export function ratioToCents(ratio: number): number {
  // The formula for ratio to cents is: 1200 * log2(ratio)
  return 1200 * Math.log2(ratio);
}

/**
 * Convert cents to a frequency ratio
 */
export function centsToRatio(cents: number): number {
  // The formula for cents to ratio is: 2^(cents/1200)
  return Math.pow(2, cents / 1200);
}

/**
 * Get the cents deviation between two frequencies
 */
export function centsBetweenFrequencies(freq1: number, freq2: number): number {
  return 1200 * Math.log2(freq2 / freq1);
}
