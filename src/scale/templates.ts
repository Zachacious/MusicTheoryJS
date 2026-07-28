/**
 * Western scale templates, expressed as spelled intervals from the tonic.
 *
 * Using spelled intervals (rather than raw semitone offsets) is what makes the
 * generated notes spell correctly: a C major scale comes out C D E F G A B, and
 * a C lydian comes out with F# (not Gb), because each degree carries its
 * diatonic step, not just its pitch class.
 *
 * These cover the common Western scales/modes; genuinely microtonal scales
 * (maqam, gamelan, xenharmonic) are built from a `Tuning` instead — see the
 * tuning module and `scaleFromTuning`.
 */

import { type Interval, interval } from "../interval/interval";

const P1 = interval(1, "P");
const m2 = interval(2, "m");
const M2 = interval(2, "M");
const A2 = interval(2, "A");
const m3 = interval(3, "m");
const M3 = interval(3, "M");
const P4 = interval(4, "P");
const A4 = interval(4, "A");
const d5 = interval(5, "d");
const P5 = interval(5, "P");
const A5 = interval(5, "A");
const m6 = interval(6, "m");
const M6 = interval(6, "M");
const A6 = interval(6, "A");
const d7 = interval(7, "d");
const m7 = interval(7, "m");
const M7 = interval(7, "M");

/** A named scale template: the intervals of each degree above the tonic. */
export type ScaleTemplate = readonly Interval[];

export const SCALE_TEMPLATES = {
  major: [P1, M2, M3, P4, P5, M6, M7],
  ionian: [P1, M2, M3, P4, P5, M6, M7],
  dorian: [P1, M2, m3, P4, P5, M6, m7],
  phrygian: [P1, m2, m3, P4, P5, m6, m7],
  lydian: [P1, M2, M3, A4, P5, M6, M7],
  mixolydian: [P1, M2, M3, P4, P5, M6, m7],
  aeolian: [P1, M2, m3, P4, P5, m6, m7],
  minor: [P1, M2, m3, P4, P5, m6, m7],
  locrian: [P1, m2, m3, P4, d5, m6, m7],
  harmonicMinor: [P1, M2, m3, P4, P5, m6, M7],
  melodicMinor: [P1, M2, m3, P4, P5, M6, M7],
  harmonicMajor: [P1, M2, M3, P4, P5, m6, M7],
  majorPentatonic: [P1, M2, M3, P5, M6],
  minorPentatonic: [P1, m3, P4, P5, m7],
  minorBlues: [P1, m3, P4, d5, P5, m7],
  majorBlues: [P1, M2, m3, M3, P5, M6],
  wholeTone: [P1, M2, M3, A4, A5, A6],
  diminished: [P1, M2, m3, P4, d5, m6, M6, M7],
  hungarianMinor: [P1, M2, m3, A4, P5, m6, M7],
  doubleHarmonic: [P1, m2, M3, P4, P5, m6, M7],
  neapolitanMinor: [P1, m2, m3, P4, P5, m6, M7],
  neapolitanMajor: [P1, m2, m3, P4, P5, M6, M7],
  augmented: [P1, m3, M3, P5, m6, M7],
  phrygianDominant: [P1, m2, M3, P4, P5, m6, m7],
  lydianDominant: [P1, M2, M3, A4, P5, M6, m7],
  // A2 appears here as the augmented-second step characteristic of these scales.
  gypsyMinor: [P1, M2, m3, A4, P5, m6, M7], // 0 2 3 6 7 8 11
  hungarianMajor: [P1, A2, M3, A4, P5, M6, m7], // 0 3 4 6 7 9 10

  // Bebop (8-note)
  bebopDominant: [P1, M2, M3, P4, P5, M6, m7, M7], // 0 2 4 5 7 9 10 11
  bebopMajor: [P1, M2, M3, P4, P5, m6, M6, M7], // 0 2 4 5 7 8 9 11
  // Octatonic half-whole (complements `diminished`, which is whole-half)
  dominantDiminished: [P1, m2, m3, M3, A4, P5, M6, m7], // 0 1 3 4 6 7 9 10

  // Symmetric / exotic
  enigmatic: [P1, m2, M3, A4, A5, A6, M7], // 0 1 4 6 8 10 11
  prometheus: [P1, M2, M3, A4, M6, m7], // 0 2 4 6 9 10 (mystic chord)
  acoustic: [P1, M2, M3, A4, P5, M6, m7], // 0 2 4 6 7 9 10 (lydian dominant / overtone)

  // Seven-note relatives
  halfDiminished: [P1, M2, m3, P4, d5, m6, m7], // 0 2 3 5 6 8 10 (locrian ♮2)
  romanian: [P1, M2, m3, A4, P5, M6, m7], // 0 2 3 6 7 9 10 (ukrainian dorian)
  persian: [P1, m2, M3, P4, d5, m6, M7], // 0 1 4 5 6 8 11
  arabian: [P1, M2, M3, P4, d5, m6, m7], // 0 2 4 5 6 8 10 (major locrian)
  oriental: [P1, m2, M3, P4, d5, M6, m7], // 0 1 4 5 6 9 10

  // Pentatonic / world (5-note)
  egyptian: [P1, M2, P4, P5, m7], // 0 2 5 7 10 (suspended pentatonic)
  yo: [P1, M2, P4, P5, M6], // 0 2 5 7 9
  hirajoshi: [P1, M2, m3, P5, m6], // 0 2 3 7 8
  insen: [P1, m2, P4, P5, m7], // 0 1 5 7 10
  iwato: [P1, m2, P4, d5, m7], // 0 1 5 6 10
  kumoi: [P1, M2, m3, P5, M6], // 0 2 3 7 9
  chinese: [P1, M3, A4, P5, M7], // 0 4 6 7 11
  pelog: [P1, m2, m3, P5, m6], // 0 1 3 7 8
} satisfies Record<string, ScaleTemplate>;

/** Names of all built-in scale templates. */
export type ScaleName = keyof typeof SCALE_TEMPLATES;

/** True if `name` is a known built-in scale template. */
export function isScaleName(name: string): name is ScaleName {
  return Object.hasOwn(SCALE_TEMPLATES, name);
}
