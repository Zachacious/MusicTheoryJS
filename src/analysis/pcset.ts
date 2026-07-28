/**
 * Pitch-class set analysis — the spelling-independent view of a collection of
 * notes, plus the interval-class vector used in set theory to characterise a
 * sonority.
 */

import { mod } from "../math/index";
import { Note, type NoteLike } from "../note/note";
import { pitchClass as pitchClassOf } from "../pitch/spelled";

/** The six interval classes (ic1 … ic6). */
export type IntervalClassVector = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];

/** The sorted set of distinct pitch classes (0–11) present in `notes`. */
export function pitchClasses(
  notes: ReadonlyArray<Note | NoteLike | string>
): number[] {
  const set = new Set<number>();
  for (const n of notes) set.add(pitchClassOf(Note.from(n)));
  return [...set].sort((a, b) => a - b);
}

/**
 * The interval-class vector: for every unordered pair of distinct pitch
 * classes, count the interval class (the smaller of the interval and its
 * inversion, 1–6). Index 0 is ic1 (semitone) … index 5 is ic6 (tritone). This
 * is invariant under transposition and inversion, so it fingerprints a chord or
 * scale's intervallic content.
 */
export function intervalClassVector(
  notes: ReadonlyArray<Note | NoteLike | string>
): IntervalClassVector {
  const pcs = pitchClasses(notes);
  const v = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < pcs.length; i++) {
    for (let j = i + 1; j < pcs.length; j++) {
      const d = mod((pcs[j] as number) - (pcs[i] as number), 12);
      const ic = Math.min(d, 12 - d); // 1..6
      v[ic - 1] = (v[ic - 1] as number) + 1;
    }
  }
  return v as unknown as IntervalClassVector;
}
