/**
 * This file handles conversion between notes and frequencies,
 * resolving circular dependency issues.
 */

import {
  A4_FREQUENCY,
  A4_MIDI,
  CENTS_PER_SEMITONE,
  SEMITONES_PER_OCTAVE,
} from "./constants";
import { EnharmonicPreference, Note } from "./types";
import { calculateCentsDeviation, noteToMidi } from "./calculations";
import { createNoteFromFrequency, createNoteFromMidi } from "./creation";

/**
 * Calculates frequency in Hz for a given note (A4 = 440Hz standard)
 */
export function noteToFrequency(note: Note): number {
  // Return cached value if available
  if (note.frequency !== undefined) {
    return note.frequency;
  }

  const midi = noteToMidi(note);

  // A4 is MIDI note 69, which is our reference point
  const halfStepsFromA4 = midi - A4_MIDI;

  // Calculate base equal temperament frequency
  let frequency =
    A4_FREQUENCY * Math.pow(2, halfStepsFromA4 / SEMITONES_PER_OCTAVE);

  // Apply cents deviation if present
  if (note.cents !== undefined) {
    frequency *= Math.pow(
      2,
      note.cents / (CENTS_PER_SEMITONE * SEMITONES_PER_OCTAVE)
    );
  }

  return frequency;
}

/**
 * Converts a frequency in Hz to the closest note
 */
export function frequencyToNote(
  frequency: number,
  options?: {
    prefer?: EnharmonicPreference;
    includeCachedValues?: boolean;
  }
): Note {
  const prefer = options?.prefer ?? "sharp";
  const includeCachedValues = options?.includeCachedValues ?? true;

  // Avoid negative or zero frequencies
  if (frequency <= 0) {
    throw new Error(`Invalid frequency: ${frequency}. Must be positive.`);
  }

  // Calculate MIDI number from frequency
  const midiFloat =
    SEMITONES_PER_OCTAVE * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI;

  // Calculate the closest MIDI note
  const closestMidi = Math.round(midiFloat);

  // Calculate cents deviation from equal temperament
  const cents = calculateCentsDeviation(frequency);

  // Create note from calculated values
  return createNoteFromFrequency({
    frequency,
    prefer,
    includeCachedValues,
    cents,
  });
}

/**
 * Changes the tuning reference (A4) frequency and recalculates note frequency
 */
export function retune(
  note: Note,
  referenceFrequency: number = A4_FREQUENCY,
  options?: {
    prefer?: EnharmonicPreference;
    includeCachedValues?: boolean;
  }
): Note {
  if (!note) {
    throw new Error("Invalid note provided for retuning.");
  }

  const prefer = options?.prefer ?? "sharp";
  const includeCachedValues = options?.includeCachedValues ?? true;

  // If no original frequency, calculate it first
  const originalFreq = note.frequency || noteToFrequency(note);

  // Calculate ratio between new reference and standard A4
  const referenceRatio = referenceFrequency / A4_FREQUENCY;

  // Apply that ratio to the note's frequency
  const newFrequency = originalFreq * referenceRatio;

  // Create a new note with the adjusted frequency
  return createNoteFromFrequency({
    frequency: newFrequency,
    prefer,
    includeCachedValues,
  });
}

/**
 * Calculate the frequency ratio between two notes
 */
export function getFrequencyRatio(note1: Note, note2: Note): number {
  const freq1 = noteToFrequency(note1);
  const freq2 = noteToFrequency(note2);

  return freq2 / freq1;
}

/**
 * Create a note with a specific frequency ratio from a reference note
 */
export function createNoteByRatio(
  referenceNote: Note,
  ratio: number,
  options?: { prefer?: EnharmonicPreference }
): Note {
  const refFreq = noteToFrequency(referenceNote);
  const newFreq = refFreq * ratio;

  return createNoteFromFrequency({
    frequency: newFreq,
    prefer: options?.prefer,
  });
}
