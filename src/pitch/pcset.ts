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
  // Mask both operands so stray bits above bit 11 can never sway the answer.
  return (sub & sup & PCSET_ALL) === (sub & PCSET_ALL);
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

/**
 * The rotations of a set — its modes. By default only the rotations that begin
 * on a pitch class actually present are returned, which for a seven-note scale
 * gives the seven modes; pass `false` to get all twelve transpositional
 * rotations regardless.
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetModes, pcsetPitchClasses } from "musictheoryjs";
 * const major = pcsetMask([0, 2, 4, 5, 7, 9, 11]);
 * pcsetModes(major).length; // => 7
 * pcsetModes(major, false).length; // => 12
 * // The second mode of major is dorian.
 * pcsetPitchClasses(pcsetModes(major)[1]); // => [0, 2, 3, 5, 7, 9, 10]
 * ```
 */
export function pcsetModes(mask: number, onlyPresent = true): number[] {
  const m = mask & PCSET_ALL;
  const out: number[] = [];
  for (let pc = 0; pc < 12; pc++) {
    // Rotating *down* by `pc` puts pitch class `pc` at the root, which is what
    // "the mode starting on that degree" means.
    if (onlyPresent && !(m & (1 << pc))) continue;
    out.push(pcsetTranspose(m, -pc));
  }
  return out;
}

/**
 * The MIDI note in `mask` nearest to `midi`. Ties (a pitch exactly between two
 * members of the set) resolve upward.
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetNearest } from "musictheoryjs";
 * const cMajorTriad = pcsetMask([0, 4, 7]);
 * pcsetNearest(cMajorTriad, 61); // => 60
 * pcsetNearest(cMajorTriad, 66); // => 67
 * pcsetNearest(cMajorTriad, 64); // => 64
 * ```
 */
export function pcsetNearest(mask: number, midi: number): number {
  const m = mask & PCSET_ALL;
  if (m === 0) {
    throw new RangeError("cannot snap to an empty pitch-class set");
  }
  for (let distance = 0; distance <= 6; distance++) {
    // Upward first, so an exact tie lands on the higher neighbour.
    if (m & (1 << mod(midi + distance, 12))) return midi + distance;
    if (m & (1 << mod(midi - distance, 12))) return midi - distance;
  }
  // Unreachable: any non-empty 12-bit set has a member within 6 semitones.
  return midi;
}

/**
 * Walk the set as a scale: the MIDI note `step` positions above `tonic`,
 * counting only pitch classes in the set. Step 0 is the tonic itself, negative
 * steps descend, and the walk keeps climbing through octaves indefinitely.
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetStep } from "musictheoryjs";
 * const cMajorTriad = pcsetMask([0, 4, 7]);
 * pcsetStep(cMajorTriad, 60, 0); // => 60
 * pcsetStep(cMajorTriad, 60, 1); // => 64
 * pcsetStep(cMajorTriad, 60, 3); // => 72
 * pcsetStep(cMajorTriad, 60, -1); // => 55
 * ```
 */
export function pcsetStep(mask: number, tonic: number, step: number): number {
  const m = mask & PCSET_ALL;
  if (m === 0) {
    throw new RangeError("cannot step through an empty pitch-class set");
  }
  if (!Number.isInteger(step)) {
    throw new RangeError(`step must be an integer, got ${step}`);
  }
  const size = pcsetSize(m);
  const pcs = pcsetPitchClasses(m);
  const tonicPc = mod(tonic, 12);
  // Re-root the pitch classes on the tonic so index 0 is always the tonic,
  // then let the octave fall out of how many times the index wraps.
  const rooted = pcs.map((pc) => mod(pc - tonicPc, 12)).sort((a, b) => a - b);
  const index = mod(step, size);
  const octaves = Math.floor(step / size);
  return tonic + (rooted[index] as number) + 12 * octaves;
}

/**
 * The same walk as {@link pcsetStep}, but numbered the way musicians count
 * degrees: 1 is the tonic, 2 the next note up, and 0 is rejected rather than
 * silently meaning something.
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetDegree } from "musictheoryjs";
 * const cMajorTriad = pcsetMask([0, 4, 7]);
 * pcsetDegree(cMajorTriad, 60, 1); // => 60
 * pcsetDegree(cMajorTriad, 60, 4); // => 72
 * pcsetDegree(cMajorTriad, 60, -1); // => 55
 * pcsetDegree(cMajorTriad, 60, 0); // => throws "degree 0"
 * ```
 */
export function pcsetDegree(
  mask: number,
  tonic: number,
  degree: number
): number {
  if (degree === 0) {
    throw new RangeError("degree 0 does not exist; degrees start at 1");
  }
  // Negative degrees count downward from the tonic: -1 is the note below it.
  return pcsetStep(mask, tonic, degree > 0 ? degree - 1 : degree);
}

/**
 * Invert a mask around an axis: each pitch class `pc` becomes
 * `axis - pc` (the set-theory operation I<sub>n</sub>). The default axis 0
 * mirrors around C.
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetInvert } from "musictheoryjs";
 * pcsetInvert(pcsetMask([0, 4, 7])) === pcsetMask([0, 8, 5]); // => true
 * // I7 of a major triad is the minor triad on the same root.
 * pcsetInvert(pcsetMask([0, 4, 7]), 7) === pcsetMask([0, 3, 7]); // => true
 * ```
 */
export function pcsetInvert(mask: number, axis = 0): number {
  let inverted = 0;
  for (const pc of pcsetPitchClasses(mask)) {
    inverted |= 1 << mod(axis - pc, 12);
  }
  return inverted;
}

/**
 * The pitch classes a mask does not contain.
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetComplement, pcsetSize } from "musictheoryjs";
 * const diatonic = pcsetMask([0, 2, 4, 5, 7, 9, 11]);
 * pcsetComplement(diatonic) === pcsetMask([1, 3, 6, 8, 10]); // => true
 * pcsetSize(pcsetComplement(0)); // => 12
 * ```
 */
export function pcsetComplement(mask: number): number {
  return PCSET_ALL & ~mask;
}

/** True when `a`, read as zero-based intervals, is more packed than `b` by
 * Rahn's rule: compare from the right, smaller interval wins. */
function packedBefore(a: readonly number[], b: readonly number[]): boolean {
  for (let i = a.length - 1; i > 0; i--) {
    const d = (a[i] as number) - (b[i] as number);
    if (d !== 0) return d < 0;
  }
  return false;
}

/** Every rotation of a set as `{ pcs, zero }`: the pitch classes in order
 * and their intervals above the first. */
function rotations(
  pcs: readonly number[]
): { pcs: number[]; zero: number[] }[] {
  return pcs.map((first, i) => {
    const rotated = [...pcs.slice(i), ...pcs.slice(0, i)];
    return { pcs: rotated, zero: rotated.map((pc) => mod(pc - first, 12)) };
  });
}

/**
 * The normal form of a set: its pitch classes in the most compact rotation
 * (smallest outer interval, ties packed toward the bottom, per Rahn).
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetNormalForm } from "musictheoryjs";
 * pcsetNormalForm(pcsetMask([0, 7, 8, 11])); // => [7, 8, 11, 0]
 * pcsetNormalForm(pcsetMask([0, 4, 7])); // => [0, 4, 7]
 * pcsetNormalForm(0); // => []
 * ```
 */
export function pcsetNormalForm(mask: number): number[] {
  const pcs = pcsetPitchClasses(mask);
  if (pcs.length === 0) return [];
  let best = rotations(pcs)[0] as { pcs: number[]; zero: number[] };
  for (const candidate of rotations(pcs)) {
    if (packedBefore(candidate.zero, best.zero)) best = candidate;
  }
  return best.pcs;
}

/**
 * The prime form of a set: its normal form or its inversion's, whichever is
 * more packed, transposed to start on 0 (Rahn's convention, the one modern
 * set-theory references use). Two sets with the same prime form are the
 * same set class — every transposition and inversion collapses to one name.
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetPrimeForm } from "musictheoryjs";
 * pcsetPrimeForm(pcsetMask([0, 4, 7])); // => [0, 3, 7]
 * pcsetPrimeForm(pcsetMask([0, 3, 7])); // => [0, 3, 7]
 * // Any major scale is set class 7-35.
 * pcsetPrimeForm(pcsetMask([2, 4, 6, 7, 9, 11, 1])); // => [0, 1, 3, 5, 6, 8, 10]
 * ```
 */
export function pcsetPrimeForm(mask: number): number[] {
  const pcs = pcsetPitchClasses(mask);
  if (pcs.length === 0) return [];
  const zero = (m: number): number[] => {
    const normal = pcsetNormalForm(m);
    const first = normal[0] as number;
    return normal.map((pc) => mod(pc - first, 12));
  };
  const upright = zero(mask & PCSET_ALL);
  const mirrored = zero(pcsetInvert(mask));
  return packedBefore(mirrored, upright) ? mirrored : upright;
}

/**
 * The interval-class vector: how many of each interval class (1–6, minor
 * second through tritone) the set contains between its pairs.
 *
 * @example
 * ```ts
 * import { pcsetMask, pcsetIntervalVector } from "musictheoryjs";
 * pcsetIntervalVector(pcsetMask([0, 4, 7])); // => [0, 0, 1, 1, 1, 0]
 * // The diatonic set's famous vector: one of everything scarce, six fifths.
 * pcsetIntervalVector(pcsetMask([0, 2, 4, 5, 7, 9, 11])); // => [2, 5, 4, 3, 6, 1]
 * ```
 */
export function pcsetIntervalVector(mask: number): number[] {
  const pcs = pcsetPitchClasses(mask);
  const vector = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < pcs.length; i++) {
    for (let j = i + 1; j < pcs.length; j++) {
      const d = (pcs[j] as number) - (pcs[i] as number);
      const ic = Math.min(d, 12 - d);
      vector[ic - 1] = (vector[ic - 1] as number) + 1;
    }
  }
  return vector;
}
