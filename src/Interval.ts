/**
 * Interval.ts
 * This module defines musical intervals and their corresponding semitone values.
 */
export type Interval = number;

export const UNISON = 0;
export const HALF_STEP = 1;
export const MINOR_SECOND = 1;
export const WHOLE_STEP = 2;
export const MAJOR_SECOND = 2;
export const MINOR_THIRD = 3;
export const MAJOR_THIRD = 4;
export const PERFECT_FOURTH = 5;
export const TRITONE = 6;
export const PERFECT_FIFTH = 7;
export const MINOR_SIXTH = 8;
export const MAJOR_SIXTH = 9;
export const MINOR_SEVENTH = 10;
export const MAJOR_SEVENTH = 11;
export const OCTAVE = 12;

/** Checks if an interval represents a simple interval (within one octave, including unison/octave). */
export function isSimpleInterval(interval: Interval): boolean {
  return interval >= 0 && interval <= 12;
}

/** Calculates the simple interval equivalent (within an octave) for any interval. */
export function simplifyInterval(interval: Interval): Interval {
  return interval % 12; // Use modulo for this
}

/** Inverts a simple interval. */
export function invertInterval(interval: Interval): Interval | undefined {
  if (!isSimpleInterval(interval) || interval === UNISON) {
    // Inversion typically defined for simple intervals > unison
    // Return undefined or throw error based on desired strictness
    return undefined;
  }
  return OCTAVE - interval;
}
