/**
 * Chord templates, expressed as spelled intervals from the root.
 *
 * As with scales, spelling the intervals (M3 vs d4) keeps generated chord tones
 * correctly named. Each entry maps a chord-symbol quality to its intervals.
 */

import { type Interval, interval } from "../interval/interval";

const P1 = interval(1, "P");
const M2 = interval(2, "M");
const m3 = interval(3, "m");
const M3 = interval(3, "M");
const P4 = interval(4, "P");
const d5 = interval(5, "d");
const P5 = interval(5, "P");
const A5 = interval(5, "A");
const M6 = interval(6, "M");
const d7 = interval(7, "d");
const m7 = interval(7, "m");
const M7 = interval(7, "M");
const M9 = interval(9, "M");

/** A named chord template: intervals of each chord tone above the root. */
export type ChordTemplate = readonly Interval[];

export const CHORD_TEMPLATES = {
  maj: [P1, M3, P5],
  min: [P1, m3, P5],
  dim: [P1, m3, d5],
  aug: [P1, M3, A5],
  sus2: [P1, M2, P5],
  sus4: [P1, P4, P5],
  maj6: [P1, M3, P5, M6],
  min6: [P1, m3, P5, M6],
  dom7: [P1, M3, P5, m7],
  maj7: [P1, M3, P5, M7],
  min7: [P1, m3, P5, m7],
  minMaj7: [P1, m3, P5, M7],
  dim7: [P1, m3, d5, d7],
  min7b5: [P1, m3, d5, m7],
  aug7: [P1, M3, A5, m7],
  dom9: [P1, M3, P5, m7, M9],
  maj9: [P1, M3, P5, M7, M9],
  min9: [P1, m3, P5, m7, M9],
  add9: [P1, M3, P5, M9],
} satisfies Record<string, ChordTemplate>;

/** Canonical quality name of a chord template. */
export type ChordQuality = keyof typeof CHORD_TEMPLATES;

/** True if `name` is a known built-in chord template. */
export function isChordQuality(name: string): name is ChordQuality {
  return Object.hasOwn(CHORD_TEMPLATES, name);
}
