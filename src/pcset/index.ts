/**
 * @module pcset
 * Pitch-class sets as 12-bit integers ("chromas"): bit k set means pitch
 * class k is present (C = bit 0 … B = bit 11). Set operations are bitwise —
 * subset checks, equality, and rotation (transposition) are single integer
 * ops, which is what makes dictionary-driven chord/scale detection fast.
 */

import { Interval, MusicTheoryError, Pitch, chroma, interval } from "../core";
import { mod } from "../core/util";

/** A 12-bit pitch-class set. Bit k = pitch class k present (C = bit 0). */
export type Chroma = number;

/** True for integers 0-4095. */
export function isChroma(value: unknown): value is Chroma {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4095;
}

function assertChroma(value: number): void {
  if (!isChroma(value)) {
    throw new MusicTheoryError(`Invalid chroma ${value}: must be an integer 0-4095.`);
  }
}

/** Build a chroma from notes (octaves and duplicates are irrelevant). */
export function chromaFromNotes(notes: ReadonlyArray<string | Pitch>): Chroma {
  let c = 0;
  for (const n of notes) c |= 1 << chroma(n);
  return c;
}

/** Build a chroma from intervals measured from an implied root at bit 0. */
export function chromaFromIntervals(
  intervals: ReadonlyArray<string | Interval>
): Chroma {
  let c = 0;
  for (const i of intervals) c |= 1 << mod(interval(i).semitones, 12);
  return c;
}

/** Number of pitch classes in the set. */
export function chromaCardinality(c: Chroma): number {
  assertChroma(c);
  let x = c;
  let count = 0;
  while (x !== 0) {
    x &= x - 1;
    count++;
  }
  return count;
}

/** Transpose the set by `semitones` (bit rotation; negative rotates down). */
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

/** True if every pitch class of `contained` is in `container`. */
export function chromaContains(container: Chroma, contained: Chroma): boolean {
  assertChroma(container);
  assertChroma(contained);
  return (container & contained) === contained;
}

/** The pitch classes present, ascending (e.g. C major triad → [0, 4, 7]). */
export function chromaBits(c: Chroma): number[] {
  assertChroma(c);
  const bits: number[] = [];
  for (let k = 0; k < 12; k++) if ((c & (1 << k)) !== 0) bits.push(k);
  return bits;
}

/**
 * The set re-rooted on each of its members: one rotation per set bit, in
 * ascending bit order. For a major scale this yields the seven mode chromas.
 */
export function chromaModes(c: Chroma): Chroma[] {
  return chromaBits(c).map((k) => rotateChroma(c, -k));
}

const SEMITONE_INTERVAL_NAMES = [
  "P1", "m2", "M2", "m3", "M3", "P4", "d5", "P5", "m6", "M6", "m7", "M7",
];

/** Canonical interval names for the set, measured from bit 0. */
export function chromaIntervals(c: Chroma): string[] {
  return chromaBits(c).map((k) => SEMITONE_INTERVAL_NAMES[k]);
}
