/**
 * Pitch-class sets as 12-bit masks.
 *
 * A pitch-class set is represented as a single integer in which bit `n` is set
 * when pitch class `n` is present (C = bit 0 … B = bit 11). That makes the
 * operations detection is built on — equality, subset tests, transposition —
 * single integer instructions instead of array walks: chord and scale
 * detection compare one number per candidate root.
 *
 * These are the pure integer primitives; `pcsetOf` in the analysis module
 * builds a mask from notes.
 */

import { mod } from "../math/index";

/** The mask with all twelve pitch classes present. */
export const PCSET_ALL = 0xfff;

/**
 * Build a mask from pitch classes (or any semitone values — each is wrapped
 * mod 12).
 *
 * @example
 * ```ts
 * import { pcsetMask } from "musictheoryjs";
 * pcsetMask([0, 4, 7]); // => 0b000010010001
 * pcsetMask([12, 16, 19]) === pcsetMask([0, 4, 7]); // => true
 * ```
 */
export function pcsetMask(pitchClasses: Iterable<number>): number {
  let mask = 0;
  for (const pc of pitchClasses) mask |= 1 << mod(pc, 12);
  return mask;
}

/**
 * The sorted pitch classes present in a mask.
 *
 * @example
 * ```ts
 * import { pcsetPitchClasses } from "musictheoryjs";
 * pcsetPitchClasses(0b000010010001); // => [0, 4, 7]
 * ```
 */
export function pcsetPitchClasses(mask: number): number[] {
  const pcs: number[] = [];
  for (let pc = 0; pc < 12; pc++) {
    if (mask & (1 << pc)) pcs.push(pc);
  }
  return pcs;
}

/**
 * How many pitch classes a mask contains.
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetSize } from "musictheoryjs";
 * pcsetSize(pcsetMask([0, 4, 7])); // => 3
 * ```
 */
export function pcsetSize(mask: number): number {
  let count = 0;
  for (let m = mask & PCSET_ALL; m !== 0; m &= m - 1) count++;
  return count;
}

/**
 * True when the mask contains the pitch class (wrapped mod 12).
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetHas } from "musictheoryjs";
 * pcsetHas(pcsetMask([0, 4, 7]), 4); // => true
 * pcsetHas(pcsetMask([0, 4, 7]), 16); // => true
 * pcsetHas(pcsetMask([0, 4, 7]), 5); // => false
 * ```
 */
export function pcsetHas(mask: number, pitchClass: number): boolean {
  return (mask & (1 << mod(pitchClass, 12))) !== 0;
}

/**
 * Transpose a mask by a number of semitones (a 12-bit rotation).
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetTranspose } from "musictheoryjs";
 * pcsetTranspose(pcsetMask([0, 4, 7]), 2) === pcsetMask([2, 6, 9]); // => true
 * pcsetTranspose(pcsetMask([0, 4, 7]), -12) === pcsetMask([0, 4, 7]); // => true
 * ```
 */
export function pcsetTranspose(mask: number, semitones: number): number {
  const n = mod(semitones, 12);
  const m = mask & PCSET_ALL;
  return ((m << n) | (m >> (12 - n))) & PCSET_ALL;
}

/**
 * True when every pitch class of `sub` is present in `sup`.
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetIsSubset } from "musictheoryjs";
 * const cMajorScale = pcsetMask([0, 2, 4, 5, 7, 9, 11]);
 * pcsetIsSubset(pcsetMask([0, 4, 7]), cMajorScale); // => true
 * pcsetIsSubset(pcsetMask([0, 4, 8]), cMajorScale); // => false
 * ```
 */
export function pcsetIsSubset(sub: number, sup: number): boolean {
  return (sub & sup) === (sub & PCSET_ALL);
}

/**
 * True when `sup` contains every pitch class of `sub`.
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetIsSuperset } from "musictheoryjs";
 * const cMajorScale = pcsetMask([0, 2, 4, 5, 7, 9, 11]);
 * pcsetIsSuperset(cMajorScale, pcsetMask([0, 4, 7])); // => true
 * pcsetIsSuperset(pcsetMask([0, 4, 7]), cMajorScale); // => false
 * ```
 */
export function pcsetIsSuperset(sup: number, sub: number): boolean {
  return pcsetIsSubset(sub, sup);
}
