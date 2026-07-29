/**
 * Differential tests against a reference implementation (dev-dependency
 * only, never shipped): for inputs both libraries understand, spelled
 * output must agree exactly. A divergence is either our bug (fix it) or a
 * deliberate difference (add it to SKIP with the reason).
 */
import { describe, expect, test } from "bun:test";
import {
  Chord as RefChord,
  Interval as RefInterval,
  Note as RefNote,
} from "tonal";
import { Chord } from "./chord/chord";
import { intervalBetween, intervalName } from "./interval/interval";
import { parseInterval } from "./interval/parse";
import { Note } from "./note/note";

/** Chord symbols to compare, spanning every quality family we support. */
const CHORD_SYMBOLS = [
  "C",
  "Cm",
  "Cdim",
  "Caug",
  "Csus2",
  "Csus4",
  "C5",
  "C6",
  "Cm6",
  "C7",
  "Cmaj7",
  "Cm7",
  "Cm7b5",
  "Cdim7",
  "C7b5",
  "C9",
  "Cmaj9",
  "Cm9",
  "Cadd9",
  "C11",
  "Cm11",
  "C13",
  "Cmaj13",
  "Cm13",
  "C7b9",
  "C7#9",
  "C7#11",
  "F#m7",
  "Bbmaj7",
  "Eb7",
  "Abm7b5",
  "Dbmaj7",
  "G#m",
  "Bm7b5",
  "E7#9",
  "A13",
  "Ddim7",
  "Gm6",
] as const;

/**
 * Known, deliberate divergences from the reference, with reasons. Currently
 * none: the Phase 2 dictionary rebuild aligned the eleventh chord (`C11` now
 * omits the third, the common voicing).
 */
const SKIP = new Set<string>();

describe("chord parity vs reference", () => {
  for (const symbol of CHORD_SYMBOLS) {
    if (SKIP.has(symbol)) continue;
    test(`agrees on ${symbol}`, () => {
      const ref = RefChord.get(symbol);
      if (ref.empty || ref.notes.length === 0) return; // reference can't parse
      const ours = Chord.from(symbol).notes.map((n) =>
        n.toString({ octave: false })
      );
      expect(ours).toEqual([...ref.notes]);
    });
  }
});

/** (start, interval) pairs exercising spelling-sensitive transposition. */
const TRANSPOSE_CASES: ReadonlyArray<readonly [string, string]> = [
  ["C4", "P5"],
  ["C4", "M3"],
  ["C4", "m3"],
  ["C4", "d4"],
  ["C4", "A4"],
  ["Eb4", "P5"],
  ["G#4", "M3"],
  ["Fb4", "M2"],
  ["B#3", "m2"],
  ["Db4", "A2"],
  ["F#4", "P4"],
  ["Cb4", "P5"],
  ["A4", "M6"],
  ["E4", "M7"],
  ["Bb3", "m6"],
  ["C4", "M9"],
  ["D4", "P11"],
  ["G3", "M13"],
  ["C4", "P8"],
  ["C4", "d5"],
];

/** Convert our interval name ("P5", "-m3") to the reference's ("5P", "-3m"). */
function toRefIntervalName(name: string): string {
  const m = /^(-?)([A-Za-z]+)(\d+)$/.exec(name);
  if (!m) throw new Error(`unexpected interval name ${name}`);
  const [, sign, quality, number] = m;
  return `${sign}${number}${quality}`;
}

describe("transposition parity vs reference", () => {
  for (const [start, iv] of TRANSPOSE_CASES) {
    test(`${start} + ${iv}`, () => {
      const ours = Note.from(start).transpose(parseInterval(iv)).toString();
      const ref = RefNote.transpose(start, toRefIntervalName(iv));
      expect(ours).toBe(ref);
    });
  }
});

/** Note pairs whose spelled distance must match the reference. */
const DISTANCE_CASES: ReadonlyArray<readonly [string, string]> = [
  ["C4", "G4"],
  ["C4", "E4"],
  ["C4", "Eb4"],
  ["C4", "F#4"],
  ["C4", "Gb4"],
  ["E4", "C5"],
  ["Gb4", "F#5"],
  ["B3", "C4"],
  ["C4", "C5"],
  ["F#4", "Bb4"],
];

describe("interval distance parity vs reference", () => {
  for (const [a, b] of DISTANCE_CASES) {
    test(`${a} → ${b}`, () => {
      const ours = intervalName(intervalBetween(Note.from(a), Note.from(b)));
      const ref = RefInterval.distance(a, b);
      expect(toRefIntervalName(ours)).toBe(ref);
    });
  }
});

describe("midi and frequency parity vs reference", () => {
  const NOTES = ["C4", "A4", "F#3", "Bb5", "Cb4", "B#3", "G#2", "Ebb4"];
  for (const name of NOTES) {
    test(`agrees on ${name}`, () => {
      const ours = Note.from(name);
      expect(ours.midi).toBe(RefNote.midi(name) as number);
      expect(ours.frequency).toBeCloseTo(RefNote.freq(name) as number, 6);
    });
  }
});
