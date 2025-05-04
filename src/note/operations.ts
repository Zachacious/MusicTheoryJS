import { CENTS_PER_SEMITONE, MICROTONAL_CENTS_ADJUSTMENT } from "./constants";
import {
  EnharmonicPreference,
  MicrotonalModifier,
  MicrotonalNote,
  Note,
  TuningSystem,
  isMicrotonalNote,
} from "./types";
import {
  centsToRatio,
  formatNotation,
  formatNote,
  getCentsBetween,
  getMidiWithCents,
  noteToMidi,
} from "./calculations";
import {
  createNoteFromFrequency,
  createNoteFromMidi,
  createNoteFromParts,
  createNoteFromQuarterToneIndex,
} from "./creation";

import { Interval } from "../interval"; // Assumed to be imported from your interval module

/**
 * Checks if two Note objects represent the same pitch (enharmonically equivalent).
 * Compares pitch class index and octave (and cents for microtonal notes).
 */
export function notesAreEqual(
  note1: Note | null | undefined,
  note2: Note | null | undefined,
  toleranceCents: number = 5 // Allow small differences in cents
): boolean {
  if (note1 === note2) return true;
  if (!note1 || !note2) return false;

  // For standard notes without microtonal properties
  if (!isMicrotonalNote(note1) && !isMicrotonalNote(note2)) {
    // Compare using midi if available (faster)
    if (note1.midi !== undefined && note2.midi !== undefined) {
      return note1.midi === note2.midi;
    }

    // Otherwise compare pitch class and octave
    return (
      note1.pitchClassIndex === note2.pitchClassIndex &&
      note1.octave === note2.octave
    );
  }

  // For microtonal notes, compare with cents precision
  const midiWithCents1 = getMidiWithCents(note1);
  const midiWithCents2 = getMidiWithCents(note2);

  // Convert difference to cents
  const centsDifference = Math.abs(
    (midiWithCents1 - midiWithCents2) * CENTS_PER_SEMITONE
  );

  // Consider equal if within tolerance
  return centsDifference <= toleranceCents;
}

/**
 * Checks if two Note objects are strictly identical (same spelling and pitch).
 * Compares letter, accidental, octave, and microtonal properties.
 */
export function notesAreStrictlyEqual(
  note1: Note | null | undefined,
  note2: Note | null | undefined
): boolean {
  if (note1 === note2) return true;
  if (!note1 || !note2) return false;

  // Check basic properties
  const basicEqual =
    note1.letter === note2.letter &&
    note1.accidental === note2.accidental &&
    note1.octave === note2.octave;

  if (!basicEqual) return false;

  // Check microtonal properties if either note has them
  if (isMicrotonalNote(note1) || isMicrotonalNote(note2)) {
    // If one has microtonal props and the other doesn't, they're not equal
    if (isMicrotonalNote(note1) !== isMicrotonalNote(note2)) return false;

    // Both are microtonal, so compare microtonal properties
    const microNote1 = note1 as MicrotonalNote;
    const microNote2 = note2 as MicrotonalNote;

    return (
      microNote1.cents === microNote2.cents &&
      microNote1.microtonalModifier === microNote2.microtonalModifier &&
      microNote1.tuningSystem === microNote2.tuningSystem
    );
  }

  // Neither has microtonal properties
  return true;
}

/**
 * Options for transposition
 */
export interface TransposeOptions {
  /** How to spell enharmonics (default: sharp) */
  prefer?: EnharmonicPreference;
  /** Whether to include cached values (default: true) */
  includeCachedValues?: boolean;
  /** Whether to preserve microtonal properties during transposition */
  preserveMicrotonalProperties?: boolean;
  /** Specify a tuning system for the transposed note */
  tuningSystem?: TuningSystem;
  /** Whether to transpose by exact cents (for microtonal intervals) */
  transposeByCents?: boolean;
}

/**
 * Transposes a Note by a given Interval (in semitones).
 * Returns a new Note object with the transposed pitch.
 */
export function transpose(
  note: Note,
  interval: Interval,
  options?: TransposeOptions
): Note {
  if (!note) {
    throw new Error("Invalid note provided to transpose.");
  }

  const prefer = options?.prefer ?? "sharp";
  const includeCachedValues = options?.includeCachedValues ?? true;
  const preserveMicrotonal = options?.preserveMicrotonalProperties ?? true;
  const transposeByCents = options?.transposeByCents ?? false;

  // For microtonal notes with transposeByCents option
  if (transposeByCents && typeof interval === "number") {
    // Convert interval to cents
    const centsDelta = interval * CENTS_PER_SEMITONE;

    // If we have frequency, we can be precise
    if (note.frequency) {
      // Calculate new frequency: f2 = f1 * 2^(cents/1200)
      const newFrequency = note.frequency * Math.pow(2, centsDelta / 1200);

      return createNoteFromFrequency({
        frequency: newFrequency,
        prefer,
        includeCachedValues,
        microtonalModifier: preserveMicrotonal
          ? note.microtonalModifier
          : undefined,
        tuningSystem: options?.tuningSystem ?? (note as any).tuningSystem,
      });
    }

    // Without frequency, use MIDI + cents
    const midiWithCents = getMidiWithCents(note);
    const newMidiWithCents = midiWithCents + (interval as number);

    // Split into MIDI and cents components
    const newMidi = Math.floor(newMidiWithCents);
    const newCents = Math.round(
      (newMidiWithCents - newMidi) * CENTS_PER_SEMITONE
    );

    // Validate range
    if (newMidi < 0 || newMidi > 127) {
      throw new Error(
        `Transposition results in invalid MIDI value: ${newMidi} (from note ${formatNote(
          note
        )} and interval ${interval})`
      );
    }

    // Create from MIDI with cents
    return createNoteFromMidi({
      midi: newMidi,
      prefer,
      includeCachedValues,
      cents: newCents === 0 ? undefined : newCents,
      microtonalModifier: preserveMicrotonal
        ? note.microtonalModifier
        : undefined,
      tuningSystem: options?.tuningSystem ?? (note as any).tuningSystem,
    });
  }

  // Standard transposition for non-microtonal notes or when not using cents
  const startMidi = noteToMidi(note);
  const targetMidi = startMidi + (interval as number);

  if (targetMidi < 0 || targetMidi > 127) {
    throw new Error(
      `Transposition results in invalid MIDI value: ${targetMidi} (from note ${formatNote(
        note
      )} and interval ${interval})`
    );
  }

  // Create the transposed note, preserving microtonal properties if requested
  if (preserveMicrotonal && isMicrotonalNote(note)) {
    const microNote = note as MicrotonalNote;
    return createNoteFromMidi({
      midi: targetMidi,
      prefer,
      includeCachedValues,
      cents: microNote.cents,
      microtonalModifier: microNote.microtonalModifier,
      tuningSystem: options?.tuningSystem ?? microNote.tuningSystem,
    });
  }

  // Standard transposition without microtonal properties
  return createNoteFromMidi({
    midi: targetMidi,
    prefer,
    includeCachedValues,
    tuningSystem: options?.tuningSystem,
  });
}

/**
 * Calculates the interval in semitones between two notes.
 * For microtonal notes, includes cents precision.
 */
export function intervalBetween(
  note1: Note,
  note2: Note,
  includeCents: boolean = true
): number {
  if (!note1 || !note2) {
    throw new Error("Invalid notes provided to intervalBetween.");
  }

  if (!includeCents) {
    // Return just the semitone difference
    const midi1 = noteToMidi(note1);
    const midi2 = noteToMidi(note2);
    return midi2 - midi1;
  }

  // Get precise interval including cents
  const midiWithCents1 = getMidiWithCents(note1);
  const midiWithCents2 = getMidiWithCents(note2);

  return midiWithCents2 - midiWithCents1;
}

/**
 * Returns the cents difference between two notes
 */
export function centsBetween(note1: Note, note2: Note): number {
  return getCentsBetween(note1, note2);
}

/**
 * Transposes a note by a given number of octaves.
 */
export function transposeOctave(
  note: Note,
  numOctaves: number,
  options?: {
    includeCachedValues?: boolean;
    preserveMicrotonalProperties?: boolean;
  }
): Note {
  if (!Number.isInteger(numOctaves)) {
    throw new Error(`Number of octaves must be an integer: ${numOctaves}`);
  }

  const includeCachedValues = options?.includeCachedValues ?? true;
  const preserveMicrotonal = options?.preserveMicrotonalProperties ?? true;

  // Create a new note with adjusted octave
  const baseNote = createNoteFromParts({
    letter: note.letter,
    accidental: note.accidental,
    octave: note.octave + numOctaves,
    includeCachedValues: includeCachedValues && !preserveMicrotonal,
  });

  // If no microtonal properties to preserve, we're done
  if (!preserveMicrotonal || !isMicrotonalNote(note)) {
    return baseNote;
  }

  // Add microtonal properties
  const microNote = note as MicrotonalNote;

  return Object.freeze({
    ...baseNote,
    cents: microNote.cents,
    microtonalModifier: microNote.microtonalModifier,
    tuningSystem: microNote.tuningSystem,
    // Recalculate cached values if needed
    ...(includeCachedValues
      ? {
          notation: formatNote({
            ...baseNote,
            microtonalModifier: microNote.microtonalModifier,
          }),
          frequency:
            baseNote.midi !== undefined
              ? (baseNote.frequency as number) *
                centsToRatio(microNote.cents || 0)
              : undefined,
        }
      : {}),
  });
}

/**
 * Compares two notes to determine which is higher.
 * @returns Positive number if note1 is higher, negative if note2 is higher, 0 if equal
 */
export function compareNotes(
  note1: Note,
  note2: Note,
  includeCents: boolean = true
): number {
  if (!note1 || !note2) {
    throw new Error("Invalid notes provided to compareNotes.");
  }

  if (!includeCents) {
    // Simple comparison by MIDI number
    const midi1 = noteToMidi(note1);
    const midi2 = noteToMidi(note2);
    return midi1 - midi2;
  }

  // Include microtonal precision
  const midiWithCents1 = getMidiWithCents(note1);
  const midiWithCents2 = getMidiWithCents(note2);

  return midiWithCents1 - midiWithCents2;
}

/**
 * Respells a note enharmonically according to the specified preference.
 * Preserves microtonal properties unless specified otherwise.
 */
export function respellNote(
  note: Note,
  options?: {
    prefer?: EnharmonicPreference;
    includeCachedValues?: boolean;
    preserveMicrotonalProperties?: boolean;
  }
): Note {
  const prefer = options?.prefer ?? "sharp";
  const includeCachedValues = options?.includeCachedValues ?? true;
  const preserveMicrotonal = options?.preserveMicrotonalProperties ?? true;

  // Get MIDI number
  const midi = noteToMidi(note);

  // Recreate note with the desired spelling preference
  const baseNote = createNoteFromMidi({
    midi,
    prefer,
    includeCachedValues: includeCachedValues && !preserveMicrotonal,
  });

  // If no microtonal properties to preserve, we're done
  if (!preserveMicrotonal || !isMicrotonalNote(note)) {
    return baseNote;
  }

  // Add microtonal properties
  const microNote = note as MicrotonalNote;

  return Object.freeze({
    ...baseNote,
    cents: microNote.cents,
    microtonalModifier: microNote.microtonalModifier,
    tuningSystem: microNote.tuningSystem,
    // Recalculate cached values if needed
    ...(includeCachedValues
      ? {
          notation: formatNote({
            ...baseNote,
            microtonalModifier: microNote.microtonalModifier,
          }),
          frequency:
            baseNote.frequency !== undefined
              ? (baseNote.frequency as number) *
                centsToRatio(microNote.cents || 0)
              : undefined,
        }
      : {}),
  });
}

/**
 * Creates a microtonal note from a standard note by adding cents deviation
 */
export function addCentsToNote(
  note: Note,
  cents: number,
  options?: {
    includeCachedValues?: boolean;
    autoSelectMicrotonalModifier?: boolean;
  }
): MicrotonalNote {
  const includeCachedValues = options?.includeCachedValues ?? true;
  const autoSelectModifier = options?.autoSelectMicrotonalModifier ?? false;

  // If the note already has cents, add them together
  const existingCents = (note as any).cents || 0;
  const totalCents = existingCents + cents;

  // Check if we need to normalize (if total exceeds +/- 50 cents)
  let normalizedCents = totalCents;
  let adjustedNote = note;

  if (Math.abs(totalCents) >= 100) {
    // Calculate the semitone shift needed
    const semitoneShift =
      Math.floor(Math.abs(totalCents) / 100) * Math.sign(totalCents);
    normalizedCents = totalCents - semitoneShift * 100;

    // Transpose the base note by the required semitones
    adjustedNote = transpose(note, semitoneShift);
  }

  // Determine the best microtonal modifier based on cents
  let microtonalModifier: MicrotonalModifier = "";

  if (autoSelectModifier) {
    // Find the closest modifier
    let closestDiff = Infinity;
    let closestModifier: MicrotonalModifier = "";

    for (const [modifier, modifierCents] of Object.entries(
      MICROTONAL_CENTS_ADJUSTMENT
    )) {
      const diff = Math.abs(normalizedCents - modifierCents);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestModifier = modifier as MicrotonalModifier;
      }
    }

    // Use the closest modifier if it's within 10 cents
    if (closestDiff <= 10) {
      microtonalModifier = closestModifier;
    }
  } else if (note.microtonalModifier) {
    // Keep existing modifier unless cents have changed dramatically
    microtonalModifier = note.microtonalModifier;
  }

  // Create properties for the new note
  const newNoteProps: any = {
    ...adjustedNote,
    cents: normalizedCents,
    microtonalModifier,
  };

  // Calculate new values if requested
  if (includeCachedValues) {
    // Update notation to include microtonal information
    newNoteProps.notation = formatNotation(
      adjustedNote.letter,
      adjustedNote.accidental,
      adjustedNote.octave,
      microtonalModifier
    );

    // Update frequency if we have a base frequency
    if (adjustedNote.frequency) {
      // Apply cents deviation: f' = f * 2^(cents/1200)
      newNoteProps.frequency =
        adjustedNote.frequency * Math.pow(2, normalizedCents / 1200);
    }
  }

  return Object.freeze(newNoteProps) as MicrotonalNote;
}

/**
 * Creates a quarter-tone note that is a quarter step above or below a standard note.
 */
export function createQuarterToneNote(
  note: Note,
  direction: "up" | "down" = "up",
  options?: {
    includeCachedValues?: boolean;
  }
): MicrotonalNote {
  const cents = direction === "up" ? 50 : -50;
  const microtonalModifier = direction === "up" ? "+" : "-";

  return addCentsToNote(note, cents, {
    includeCachedValues: options?.includeCachedValues ?? true,
    autoSelectMicrotonalModifier: false,
  });
}

/**
 * Transposes a note by the specified number of cents.
 */
export function transposeByCents(
  note: Note,
  centsInterval: number,
  options?: {
    prefer?: EnharmonicPreference;
    includeCachedValues?: boolean;
  }
): Note {
  const prefer = options?.prefer ?? "sharp";
  const includeCachedValues = options?.includeCachedValues ?? true;

  // If we have a frequency, use that for precise calculation
  if (note.frequency !== undefined) {
    // Calculate new frequency: f2 = f1 * 2^(cents/1200)
    const newFrequency = note.frequency * Math.pow(2, centsInterval / 1200);

    return createNoteFromFrequency({
      frequency: newFrequency,
      prefer,
      includeCachedValues,
    });
  }

  // If no frequency, calculate using MIDI plus cents
  const midiWithCents = getMidiWithCents(note);
  const centsAsDecimal = centsInterval / CENTS_PER_SEMITONE;
  const newMidiWithCents = midiWithCents + centsAsDecimal;

  // Split into MIDI and cents
  const newMidi = Math.floor(newMidiWithCents);
  const newCents = Math.round(
    (newMidiWithCents - newMidi) * CENTS_PER_SEMITONE
  );

  // Check MIDI range
  if (newMidi < 0 || newMidi > 127) {
    throw new Error(
      `Transposition by ${centsInterval} cents results in invalid MIDI value: ${newMidi}`
    );
  }

  // Create the note from MIDI with cents
  return createNoteFromMidi({
    midi: newMidi,
    prefer,
    includeCachedValues,
    cents: newCents,
  });
}

/**
 * Converts a note to the quarter-tone system.
 */
export function convertToQuarterTone(
  note: Note,
  options?: {
    includeCachedValues?: boolean;
  }
): Note {
  const includeCachedValues = options?.includeCachedValues ?? true;

  // Get the MIDI number and cents
  const midi = noteToMidi(note);
  const cents = (note as any).cents || 0;

  // Calculate quarter-tone index (0-23)
  // Each semitone has two quarter tones
  const semitoneIndex = midi % 12;
  const isMidQuarterTone = Math.abs(cents) >= 25 && Math.abs(cents) <= 75;

  // Determine direction of quarter tone
  const isUp = cents >= 0;

  // Calculate quarter-tone index
  const quarterToneIndex =
    semitoneIndex * 2 + (isMidQuarterTone && isUp ? 1 : 0);

  // Create quarter tone note
  return createNoteFromQuarterToneIndex({
    quarterToneIndex,
    octave: note.octave,
    includeCachedValues,
    // Include any remaining cents (difference from exact quarter tone)
    cents: isMidQuarterTone ? (isUp ? cents - 50 : cents + 50) : cents,
  });
}
