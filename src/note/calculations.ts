import {
  A4_FREQUENCY,
  A4_MIDI,
  C0_MIDI,
  CENTS_PER_SEMITONE,
  FLAT_NAMES,
  MICROTONAL_CENTS_ADJUSTMENT,
  QUARTER_TONE_NAMES,
  SEMITONES_PER_OCTAVE,
  SHARP_NAMES,
  TUNING_SYSTEMS,
} from "./constants";
import {
  Accidental,
  EnharmonicPreference,
  MicrotonalModifier,
  Note,
  NoteLetter,
  PitchClassIndex,
  TuningSystem,
  isMicrotonalNote,
} from "./types";
import { addCentsToNote, transpose } from "./operations";

/**
 * Calculates MIDI number from pitch class and octave
 */
export function calculateMidi(
  pitchClassIndex: PitchClassIndex,
  octave: number
): number {
  return pitchClassIndex + octave * SEMITONES_PER_OCTAVE + C0_MIDI;
}

/**
 * Formats a note into standard notation
 */
export function formatNotation(
  letter: NoteLetter,
  accidental: Accidental,
  octave: number,
  microtonalModifier: MicrotonalModifier = ""
): string {
  return `${letter}${accidental}${microtonalModifier}${octave}`;
}

/**
 * Converts a pitch class index to letter and accidental based on enharmonic preference
 */
export function pitchClassIndexToLetterAccidental(
  index: PitchClassIndex,
  prefer: EnharmonicPreference = "sharp"
): { letter: NoteLetter; accidental: Accidental } {
  const targetNames = prefer === "flat" ? FLAT_NAMES : SHARP_NAMES;
  const name = targetNames[index];

  const letter = name.charAt(0) as NoteLetter;
  const acc = name.substring(1);
  const accidental = (acc as Accidental) || "";

  return { letter, accidental };
}

/**
 * Converts a quarter-tone index (0-23) to letter and microtonal representation
 */
export function quarterToneIndexToLetterAccidental(quarterToneIndex: number): {
  letter: NoteLetter;
  accidental: Accidental;
  microtonalModifier: MicrotonalModifier;
} {
  // Ensure index is in range 0-23
  const wrappedIndex = ((quarterToneIndex % 24) + 24) % 24;

  const name = QUARTER_TONE_NAMES[wrappedIndex];
  const letter = name.charAt(0) as NoteLetter;

  // Extract accidental and microtonal modifier
  const restOfName = name.substring(1);

  // Parse the remaining string to determine accidental and microtonal modifier
  let accidental: Accidental = "";
  let microtonalModifier: MicrotonalModifier = "";

  if (restOfName.endsWith("+")) {
    // It's a quarter tone up (e.g., C+, F#+)
    microtonalModifier = "+";
    accidental = restOfName.substring(0, restOfName.length - 1) as Accidental;
  } else {
    // It's a standard note or plain accidental
    accidental = restOfName as Accidental;
  }

  return { letter, accidental, microtonalModifier };
}

/**
 * Gets the MIDI number for a note
 */
export function noteToMidi(note: Note): number {
  // Return cached value if available
  if (note.midi !== undefined) {
    return note.midi;
  }

  const baseMidi = calculateMidi(note.pitchClassIndex, note.octave);

  // If it's not a microtonal note, return the base MIDI
  if (!isMicrotonalNote(note)) {
    return baseMidi;
  }

  // For microtonal notes, we can't return a true MIDI number (which are integers)
  // We'll round to the nearest MIDI number (or we could potentially return a float for internal use)
  const centsAdjustment = note.cents;
  if (Math.abs(centsAdjustment) >= CENTS_PER_SEMITONE / 2) {
    // If adjustment is large enough, round to a different MIDI note
    return baseMidi + Math.round(centsAdjustment / CENTS_PER_SEMITONE);
  }

  return baseMidi;
}

/**
 * Formats a note as a string (e.g., "C#4", "D+4" for quarter-sharp)
 */
export function formatNote(note: Note): string {
  // Return cached value if available
  if (note.notation !== undefined) {
    return note.notation;
  }

  // Input validation
  if (!note || typeof note !== "object") {
    return "";
  }
  if (
    typeof note.letter !== "string" ||
    typeof note.accidental !== "string" ||
    typeof note.octave !== "number"
  ) {
    console.warn("Invalid Note object passed to formatNote:", note);
    return "";
  }

  return formatNotation(
    note.letter,
    note.accidental,
    note.octave,
    note.microtonalModifier || ""
  );
}

/**
 * Calculates frequency in Hz for a given note (A4 = 440Hz standard)
 */
export function noteToFrequency(note: Note): number {
  // Return cached value if available
  if (note.frequency !== undefined) {
    return note.frequency;
  }

  // Get the "standard" equal-tempered frequency
  const midiWithCents = getMidiWithCents(note);

  // Calculate frequency using the formula: f = 440 * 2^((midi - 69) / 12)
  const equalTemperedFrequency =
    A4_FREQUENCY * Math.pow(2, (midiWithCents - A4_MIDI) / 12);

  return equalTemperedFrequency;
}

/**
 * Get the MIDI number with cents as a floating-point number
 */
export function getMidiWithCents(note: Note): number {
  const baseMidi = calculateMidi(note.pitchClassIndex, note.octave);

  // Add cents adjustment if present
  if (note.cents !== undefined) {
    return baseMidi + note.cents / CENTS_PER_SEMITONE;
  }

  // Add microtonal modifier adjustment if present
  if (note.microtonalModifier) {
    const centsAdjustment =
      MICROTONAL_CENTS_ADJUSTMENT[note.microtonalModifier] || 0;
    return baseMidi + centsAdjustment / CENTS_PER_SEMITONE;
  }

  // If it's a standard 12-TET note
  const tuningSystem = (note as any).tuningSystem as TuningSystem | undefined;
  if (tuningSystem && tuningSystem !== "equalTemperament") {
    const tuning = TUNING_SYSTEMS[tuningSystem];
    if (tuning.centsAdjustment) {
      const centsAdjustment = tuning.centsAdjustment(note.pitchClassIndex);
      return baseMidi + centsAdjustment / CENTS_PER_SEMITONE;
    }
  }

  return baseMidi;
}

/**
 * Get the cents adjustment between two notes
 */
export function getCentsBetween(note1: Note, note2: Note): number {
  const midi1 = getMidiWithCents(note1);
  const midi2 = getMidiWithCents(note2);

  return (midi2 - midi1) * CENTS_PER_SEMITONE;
}

/**
 * Calculate cents deviation from the nearest equal temperament note
 */
export function calculateCentsDeviation(
  frequency: number,
  referenceFrequency: number = A4_FREQUENCY,
  referenceMidi: number = A4_MIDI
): number {
  // Calculate exact MIDI number as floating point
  const exactMidi =
    12 * Math.log2(frequency / referenceFrequency) + referenceMidi;

  // Get nearest integer MIDI
  const nearestMidi = Math.round(exactMidi);

  // Calculate cents deviation (difference in 100ths of a semitone)
  return (exactMidi - nearestMidi) * CENTS_PER_SEMITONE;
}

/**
 * Convert a cents value to a ratio multiplier
 */
export function centsToRatio(cents: number): number {
  return Math.pow(2, cents / 1200); // 1200 cents per octave
}

/**
 * Calculate the precise interval between two notes in cents
 * Accounts for microtonal adjustments
 */
export function intervalInCents(note1: Note, note2: Note): number {
  // Calculate the basic interval in semitones
  const octaveDifference = note2.octave - note1.octave;
  const semitones = (note2.pitchClassIndex - note1.pitchClassIndex + 12) % 12;
  const totalSemitones = semitones + octaveDifference * 12;

  // Convert to cents (1 semitone = 100 cents)
  let cents = totalSemitones * 100;

  // Add any microtonal adjustments
  // Add cents from note2
  if (isMicrotonalNote(note2)) {
    cents += note2.cents;
  } else if (note2.microtonalModifier) {
    cents += MICROTONAL_CENTS_ADJUSTMENT[note2.microtonalModifier] || 0;
  }

  // Subtract cents from note1
  if (isMicrotonalNote(note1)) {
    cents -= note1.cents;
  } else if (note1.microtonalModifier) {
    cents -= MICROTONAL_CENTS_ADJUSTMENT[note1.microtonalModifier] || 0;
  }

  return cents;
}

/**
 * Transpose a note by a precise cents value
 */
export function transposeByCents(
  note: Note,
  cents: number,
  options?: { prefer?: EnharmonicPreference }
): Note {
  // Calculate the semitone and cents components
  // There are 100 cents per semitone
  const semitones = Math.floor(Math.abs(cents) / 100) * Math.sign(cents);
  const remainingCents = cents - semitones * 100;

  // First transpose by whole semitones
  const transposed = transpose(note, semitones, options);

  // If there are remaining cents, add them
  if (remainingCents !== 0) {
    // Check if the note already has cents or a microtonal modifier
    if (isMicrotonalNote(transposed)) {
      // Add the remaining cents to the existing cents
      const totalCents = (transposed.cents || 0) + remainingCents;

      // Normalize cents if they exceed a semitone range
      const normalizedCents = totalCents % 100;
      const additionalSemitones = Math.floor(totalCents / 100);

      // Apply the additional semitones if needed
      const finalNote =
        additionalSemitones !== 0
          ? transpose(transposed, additionalSemitones, options)
          : transposed;

      // Return a new note with normalized cents
      return {
        ...finalNote,
        cents: normalizedCents,
        // Update the frequency if it exists
        frequency: finalNote.frequency
          ? finalNote.frequency * Math.pow(2, normalizedCents / 1200)
          : undefined,
      };
    } else {
      // Simply add the cents to a normal note
      return addCentsToNote(transposed, remainingCents);
    }
  }

  return transposed;
}
