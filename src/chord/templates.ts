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
const m9 = interval(9, "m");
const M9 = interval(9, "M");
const A9 = interval(9, "A");
const P11 = interval(11, "P");
const A11 = interval(11, "A");
const M13 = interval(13, "M");

/** A named chord template: intervals of each chord tone above the root. */
export type ChordTemplate = readonly Interval[];

export const CHORD_TEMPLATES = {
  // Triads
  maj: [P1, M3, P5], // 0 4 7
  min: [P1, m3, P5], // 0 3 7
  dim: [P1, m3, d5], // 0 3 6
  aug: [P1, M3, A5], // 0 4 8
  sus2: [P1, M2, P5], // 0 2 7
  sus4: [P1, P4, P5], // 0 5 7
  power: [P1, P5], // 0 7 (fifth / no third)
  // Sixths
  maj6: [P1, M3, P5, M6], // 0 4 7 9
  min6: [P1, m3, P5, M6], // 0 3 7 9
  maj69: [P1, M3, P5, M6, M9], // 0 4 7 9 14
  min69: [P1, m3, P5, M6, M9], // 0 3 7 9 14
  // Sevenths
  dom7: [P1, M3, P5, m7], // 0 4 7 10
  maj7: [P1, M3, P5, M7], // 0 4 7 11
  min7: [P1, m3, P5, m7], // 0 3 7 10
  minMaj7: [P1, m3, P5, M7], // 0 3 7 11
  dim7: [P1, m3, d5, d7], // 0 3 6 9
  min7b5: [P1, m3, d5, m7], // 0 3 6 10
  aug7: [P1, M3, A5, m7], // 0 4 8 10
  dom7b5: [P1, M3, d5, m7], // 0 4 6 10
  // Altered dominants
  dom7b9: [P1, M3, P5, m7, m9], // 0 4 7 10 13
  dom7s9: [P1, M3, P5, m7, A9], // 0 4 7 10 15
  dom7s11: [P1, M3, P5, m7, A11], // 0 4 7 10 18
  // Ninths
  dom9: [P1, M3, P5, m7, M9], // 0 4 7 10 14
  maj9: [P1, M3, P5, M7, M9], // 0 4 7 11 14
  min9: [P1, m3, P5, m7, M9], // 0 3 7 10 14
  add9: [P1, M3, P5, M9], // 0 4 7 14
  // Elevenths
  dom11: [P1, M3, P5, m7, M9, P11], // 0 4 7 10 14 17
  maj11: [P1, M3, P5, M7, M9, P11], // 0 4 7 11 14 17
  min11: [P1, m3, P5, m7, M9, P11], // 0 3 7 10 14 17
  // Thirteenths (11th commonly omitted)
  dom13: [P1, M3, P5, m7, M9, M13], // 0 4 7 10 14 21
  maj13: [P1, M3, P5, M7, M9, M13], // 0 4 7 11 14 21
  min13: [P1, m3, P5, m7, M9, M13], // 0 3 7 10 14 21
} satisfies Record<string, ChordTemplate>;

/** Canonical quality name of a chord template. */
export type ChordQuality = keyof typeof CHORD_TEMPLATES;

/** True if `name` is a known built-in chord template. */
export function isChordQuality(name: string): name is ChordQuality {
  return Object.hasOwn(CHORD_TEMPLATES, name);
}
