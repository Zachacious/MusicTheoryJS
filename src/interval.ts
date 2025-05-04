/**
 * @module Interval
 * @description
 * This module defines the concept of a musical interval, primarily represented as a
 * distance in semitones. It provides named constants for common intervals and utility
 * functions for classifying, simplifying, and inverting intervals.
 */

/**
 * Represents the distance between two musical pitches, measured in semitones.
 * Positive numbers typically indicate ascending intervals, negative descending,
 * though calculations often use absolute values or modulo arithmetic.
 * @typedef {number} Interval
 */
export type Interval = number;

/**
 * Represents a unison interval (0 semitones).
 * @readonly
 * @type {Interval}
 */
export const UNISON = 0;
/**
 * Represents a half step, or minor second interval (1 semitone).
 * @readonly
 * @type {Interval}
 */
export const HALF_STEP = 1;
/**
 * Represents a minor second interval (1 semitone). Synonym for HALF_STEP.
 * @readonly
 * @type {Interval}
 */
export const MINOR_SECOND = 1;
/**
 * Represents a whole step, or major second interval (2 semitones).
 * @readonly
 * @type {Interval}
 */
export const WHOLE_STEP = 2;
/**
 * Represents a major second interval (2 semitones). Synonym for WHOLE_STEP.
 * @readonly
 * @type {Interval}
 */
export const MAJOR_SECOND = 2;
/**
 * Represents a minor third interval (3 semitones).
 * @readonly
 * @type {Interval}
 */
export const MINOR_THIRD = 3;
/**
 * Represents a major third interval (4 semitones).
 * @readonly
 * @type {Interval}
 */
export const MAJOR_THIRD = 4;
/**
 * Represents a perfect fourth interval (5 semitones).
 * @readonly
 * @type {Interval}
 */
export const PERFECT_FOURTH = 5;
/**
 * Represents a tritone interval (6 semitones).
 * This can be an augmented fourth or a diminished fifth.
 * @readonly
 * @type {Interval}
 */
export const TRITONE = 6;
/**
 * Represents a perfect fifth interval (7 semitones).
 * @readonly
 * @type {Interval}
 */
export const PERFECT_FIFTH = 7;
/**
 * Represents a minor sixth interval (8 semitones).
 * @readonly
 * @type {Interval}
 */
export const MINOR_SIXTH = 8;
/**
 * Represents a major sixth interval (9 semitones).
 * @readonly
 * @type {Interval}
 */
export const MAJOR_SIXTH = 9;
/**
 * Represents a minor seventh interval (10 semitones).
 * @readonly
 * @type {Interval}
 */
export const MINOR_SEVENTH = 10;
/**
 * Represents a major seventh interval (11 semitones).
 * @readonly
 * @type {Interval}
 */
export const MAJOR_SEVENTH = 11;
/**
 * Represents a perfect octave interval (12 semitones).
 * @readonly
 * @type {Interval}
 */
export const OCTAVE = 12;

/**
 * Checks if an interval size (in semitones) falls within the range of a
 * simple interval, which is defined as being between unison (0) and one octave (12), inclusive.
 *
 * @param interval - The interval size in semitones.
 * @returns `true` if the interval is simple (0 to 12), `false` otherwise.
 * @example
 * ```ts
 * isSimpleInterval(7); // true (Perfect Fifth)
 * isSimpleInterval(12); // true (Octave)
 * isSimpleInterval(14); // false (Major Ninth - compound)
 * isSimpleInterval(-2); // false (Descending interval)
 * ```
 */
export function isSimpleInterval(interval: Interval): boolean {
  // Check if the interval is non-negative and less than or equal to an octave
  return interval >= 0 && interval <= 12;
}

/**
 * Calculates the simple interval equivalent (within the range 0-11) for any interval,
 * including compound intervals (greater than 12) or negative intervals.
 * Uses the modulo operator.
 *
 * @param interval - The interval size in semitones (can be positive, negative, or compound).
 * @returns The equivalent simple interval size in semitones (range 0-11).
 * @remarks Note that the JavaScript modulo operator (`%`) preserves the sign for negative inputs
 * (e.g., `-2 % 12` results in `-2`). If a positive result (0-11) is always desired for negative inputs,
 * use `(interval % 12 + 12) % 12`. This function adheres to the original simple modulo logic.
 * @example
 * ```ts
 * simplifyInterval(14); // 2 (Major Ninth simplifies to Major Second)
 * simplifyInterval(7);  // 7 (Perfect Fifth is already simple)
 * simplifyInterval(0);  // 0 (Unison)
 * simplifyInterval(12); // 0 (Octave simplifies to Unison interval class)
 * simplifyInterval(-2); // -2 (JS modulo behavior, maps to Major Seventh below)
 * simplifyInterval(-10); // -10 (JS modulo behavior, maps to Major Second below)
 * // To always get positive result (0-11):
 * // const positiveInterval = (interval % 12 + 12) % 12;
 * // positiveInterval(-2) -> 10
 * ```
 */
export function simplifyInterval(interval: Interval): Interval {
  // The modulo operator gives the remainder when divided by 12.
  return interval % 12; // Note: JS % behavior for negative numbers.
}

/**
 * Calculates the inversion of a simple interval (0 < interval <= 12).
 * The inversion is the interval that, when added to the original interval, completes an octave (12 semitones).
 * For example, a Major Third (4 semitones) inverts to a Minor Sixth (8 semitones), because 4 + 8 = 12.
 *
 * @param interval - The simple interval size in semitones to invert. Must be between 1 and 12 inclusive.
 * @returns The inverted interval size in semitones, or `undefined` if the input interval is not simple (0 < interval <= 12).
 * @example
 * ```ts
 * invertInterval(4);  // 8 (Major Third -> Minor Sixth)
 * invertInterval(7);  // 5 (Perfect Fifth -> Perfect Fourth)
 * invertInterval(11); // 1 (Major Seventh -> Minor Second)
 * invertInterval(12); // 0 (Octave -> Unison)
 * invertInterval(0);  // undefined (Unison cannot be inverted meaningfully in this context)
 * invertInterval(14); // undefined (Compound interval)
 * invertInterval(-5); // undefined (Negative interval)
 * ```
 */
export function invertInterval(interval: Interval): Interval | undefined {
  // Inversion is typically defined only for simple intervals greater than unison.
  // Check if the interval is within the valid range (1 to 12).
  if (!isSimpleInterval(interval) || interval === UNISON) {
    // Original check logic
    // if (interval <= 0 || interval > 12) { // Alternative stricter check? Stick to original.
    // Return undefined for unison, compound intervals, or negative intervals.
    return undefined;
  }
  // The inverted interval is the difference between an octave and the original interval.
  return OCTAVE - interval; // 12 - interval
}
