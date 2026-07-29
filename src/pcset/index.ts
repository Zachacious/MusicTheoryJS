/**
 * @module pcset
 * Pitch-class sets as 12-bit integers ("chromas"): bit k set means pitch
 * class k is present (C = bit 0 … B = bit 11). Set operations are bitwise —
 * subset checks, equality, and rotation (transposition) are single integer
 * ops, which is what makes dictionary-driven chord/scale detection fast.
 */

import { Interval, MusicTheoryError, Pitch, chroma, interval } from "../core";
import { mod } from "../core/util";
import { POPCOUNT12 } from "./popcount";

/** A 12-bit pitch-class set. Bit k = pitch class k present (C = bit 0). */
export type Chroma = number;

/**
 * True for integers 0-4095.
 *
 * @example
 * ```ts
 * import { isChroma, chromaFromNotes } from "musictheoryjs";
 *
 * isChroma(chromaFromNotes(["C", "E", "G"])); // => true
 * isChroma(4096); // => false
 * isChroma(2.5); // => false
 * ```
 */
export function isChroma(value: unknown): value is Chroma {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4095;
}

function assertChroma(value: number): void {
  if (!isChroma(value)) {
    throw new MusicTheoryError(`Invalid chroma ${value}: must be an integer 0-4095.`);
  }
}

/**
 * Build a chroma from notes (octaves and duplicates are irrelevant).
 *
 * @example
 * ```ts
 * import { chromaFromNotes, chromaBits } from "musictheoryjs";
 *
 * chromaFromNotes(["C", "E", "G"]); // => 145
 * chromaBits(chromaFromNotes(["C", "E", "G"])); // => [0, 4, 7]
 * // Octaves and duplicates do not matter:
 * chromaFromNotes(["C4", "E5", "G3", "C6"]); // => 145
 * ```
 */
export function chromaFromNotes(notes: ReadonlyArray<string | Pitch>): Chroma {
  let c = 0;
  for (const n of notes) c |= 1 << chroma(n);
  return c;
}

/**
 * Build a chroma from intervals measured from an implied root at bit 0.
 *
 * @example
 * ```ts
 * import { chromaFromIntervals, chromaFromNotes } from "musictheoryjs";
 *
 * chromaFromIntervals(["P1", "M3", "P5", "m7"]); // => 1169
 * // Same set as a C7 spelled in notes:
 * chromaFromIntervals(["P1", "M3", "P5", "m7"]) === chromaFromNotes(["C", "E", "G", "Bb"]); // => true
 * ```
 */
export function chromaFromIntervals(
  intervals: ReadonlyArray<string | Interval>
): Chroma {
  let c = 0;
  for (const i of intervals) c |= 1 << mod(interval(i).semitones, 12);
  return c;
}

/**
 * Number of pitch classes in the set.
 *
 * @example
 * ```ts
 * import { chromaCardinality, chromaFromNotes } from "musictheoryjs";
 *
 * chromaCardinality(chromaFromNotes(["C", "E", "G"])); // => 3
 * chromaCardinality(0b101010110101); // => 7
 * chromaCardinality(4096); // => throws "Invalid chroma"
 * ```
 */
export function chromaCardinality(c: Chroma): number {
  assertChroma(c);
  return POPCOUNT12[c];
}

/**
 * Transpose the set by `semitones` (bit rotation; negative rotates down).
 *
 * @example
 * ```ts
 * import { rotateChroma, chromaFromNotes, chromaBits } from "musictheoryjs";
 *
 * const cMajor = chromaFromNotes(["C", "E", "G"]);
 * rotateChroma(cMajor, 2) === chromaFromNotes(["D", "F#", "A"]); // => true
 * // Down a minor third lands on A major (A = 9, C# = 1, E = 4):
 * chromaBits(rotateChroma(cMajor, -3)); // => [1, 4, 9]
 * ```
 */
export function rotateChroma(c: Chroma, semitones: number): Chroma {
  assertChroma(c);
  if (!Number.isSafeInteger(semitones)) {
    throw new MusicTheoryError(
      `Invalid rotation ${semitones}: must be a safe integer number of semitones.`
    );
  }
  const n = mod(semitones, 12);
  return ((c << n) | (c >>> (12 - n))) & 0xfff;
}

/**
 * True if every pitch class of `contained` is in `container`.
 *
 * @example
 * ```ts
 * import { chromaContains, chromaFromNotes } from "musictheoryjs";
 *
 * const cMajorScale = chromaFromNotes(["C", "D", "E", "F", "G", "A", "B"]);
 * chromaContains(cMajorScale, chromaFromNotes(["C", "E", "G"])); // => true
 * chromaContains(cMajorScale, chromaFromNotes(["D", "F#", "A"])); // => false
 * ```
 */
export function chromaContains(container: Chroma, contained: Chroma): boolean {
  assertChroma(container);
  assertChroma(contained);
  return (container & contained) === contained;
}

/**
 * The pitch classes present, ascending (e.g. C major triad → [0, 4, 7]).
 *
 * @example
 * ```ts
 * import { chromaBits, chromaFromNotes } from "musictheoryjs";
 *
 * chromaBits(chromaFromNotes(["C", "Eb", "G"])); // => [0, 3, 7]
 * // The major scale as a binary literal (bit 0 = C on the right):
 * chromaBits(0b101010110101); // => [0, 2, 4, 5, 7, 9, 11]
 * ```
 */
export function chromaBits(c: Chroma): number[] {
  assertChroma(c);
  const bits: number[] = [];
  for (let k = 0; k < 12; k++) if ((c & (1 << k)) !== 0) bits.push(k);
  return bits;
}

/**
 * The set re-rooted on each of its members: one rotation per set bit, in
 * ascending bit order. For a major scale this yields the seven mode chromas.
 *
 * @example
 * ```ts
 * import { chromaModes, chromaIntervals, chromaFromNotes } from "musictheoryjs";
 *
 * const major = chromaFromNotes(["C", "D", "E", "F", "G", "A", "B"]);
 * chromaModes(major).length; // => 7
 * // The second mode is dorian:
 * chromaIntervals(chromaModes(major)[1]); // => ["P1", "M2", "m3", "P4", "P5", "M6", "m7"]
 * ```
 */
export function chromaModes(c: Chroma): Chroma[] {
  return chromaBits(c).map((k) => rotateChroma(c, -k));
}

const SEMITONE_INTERVAL_NAMES = [
  "P1", "m2", "M2", "m3", "M3", "P4", "d5", "P5", "m6", "M6", "m7", "M7",
];

/**
 * Canonical interval names for the set, measured from bit 0.
 *
 * @example
 * ```ts
 * import { chromaIntervals, chromaFromNotes } from "musictheoryjs";
 *
 * chromaIntervals(chromaFromNotes(["C", "E", "G", "Bb"])); // => ["P1", "M3", "P5", "m7"]
 * // The tritone canonicalizes to d5:
 * chromaIntervals(chromaFromNotes(["C", "F#"])); // => ["P1", "d5"]
 * ```
 */
export function chromaIntervals(c: Chroma): string[] {
  return chromaBits(c).map((k) => SEMITONE_INTERVAL_NAMES[k]);
}
