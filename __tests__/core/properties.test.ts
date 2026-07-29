/**
 * Property-style invariant tests over exhaustive deterministic grids.
 * The spelled-pitch domain is finite and small, so full enumeration is
 * stronger (and reproducible) compared to random sampling.
 */
import { describe, expect, it } from "vitest";

import {
  add,
  chroma,
  distance,
  interval,
  intervalName,
  invert,
  midi,
  note,
  noteName,
  simplify,
  transpose,
} from "../../src/core";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const ACCIDENTALS = ["bb", "b", "", "#", "##"];
const OCTAVES = [2, 3, 4, 5];

const NOTES: string[] = LETTERS.flatMap((l) =>
  ACCIDENTALS.flatMap((a) => OCTAVES.map((o) => `${l}${a}${o}`))
); // 140 notes

const PERFECT_NUMBERS = new Set([1, 4, 5, 8, 11, 12]);
const INTERVALS: string[] = [];
for (let num = 1; num <= 14; num++) {
  if (num === 1) {
    // Unisons are named by semitone sign: (0,-1) is canonically "-A1", with
    // "d1" / "-P1" accepted as parse aliases that normalize to canonical form.
    INTERVALS.push("P1", "A1", "-A1");
    continue;
  }
  const qualities = PERFECT_NUMBERS.has(num) ? ["P", "A", "d"] : ["M", "m", "A", "d"];
  for (const q of qualities) {
    INTERVALS.push(`${q}${num}`);
    INTERVALS.push(`-${q}${num}`);
  }
} // 97 canonical interval names

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

describe("core invariants", () => {
  it("parse∘format is the identity for every pitch in the grid", () => {
    const failures = NOTES.filter((n) => noteName(note(n)) !== n);
    expect(failures).toEqual([]);
  });

  it("parse∘format is the identity for every interval in the grid", () => {
    const failures = INTERVALS.filter((i) => intervalName(interval(i)) !== i);
    expect(failures).toEqual([]);
  });

  it("transpose(a, distance(a, b)) === b for all note pairs (19,600 cases)", () => {
    const failures: string[] = [];
    for (const a of NOTES) {
      for (const b of NOTES) {
        if (noteName(transpose(a, distance(a, b))) !== b) {
          failures.push(`${a} -> ${b}`);
        }
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
    expect(failures.length).toBe(0);
  });

  it("distance(n, transpose(n, i)) === i for all note × interval pairs (14,000 cases)", () => {
    const failures: string[] = [];
    for (const n of NOTES) {
      for (const i of INTERVALS) {
        const target = transpose(n, i);
        const measured = distance(n, target);
        const expected = interval(i);
        if (
          measured.steps !== expected.steps ||
          measured.semitones !== expected.semitones
        ) {
          failures.push(`${n} + ${i}`);
        }
      }
    }
    expect(failures.slice(0, 20)).toEqual([]);
    expect(failures.length).toBe(0);
  });

  it("midi(transpose(n, i)) === midi(n) + i.semitones whenever both are in range", () => {
    const failures: string[] = [];
    for (const n of NOTES) {
      const start = midi(n);
      if (start === null) continue;
      for (const i of INTERVALS) {
        const end = midi(transpose(n, i));
        if (end === null) continue;
        if (end !== start + interval(i).semitones) failures.push(`${n} + ${i}`);
      }
    }
    expect(failures.length).toBe(0);
  });

  it("chroma(transpose(n, i)) === (chroma(n) + semitones) mod 12", () => {
    const failures: string[] = [];
    for (const n of NOTES) {
      for (const i of INTERVALS) {
        const expected = mod(chroma(n) + interval(i).semitones, 12);
        if (chroma(transpose(n, i)) !== expected) failures.push(`${n} + ${i}`);
      }
    }
    expect(failures.length).toBe(0);
  });

  it("i + invert(i) = P8 for every simple ascending interval", () => {
    const simpleAscending = INTERVALS.filter(
      (i) => !i.startsWith("-") && interval(i).steps <= 7
    );
    const failures = simpleAscending.filter(
      (i) => intervalName(add(i, invert(i))) !== "P8"
    );
    expect(failures).toEqual([]);
  });

  it("simplify is idempotent", () => {
    const failures = INTERVALS.filter((i) => {
      const once = simplify(i);
      const twice = simplify(once);
      return once.steps !== twice.steps || once.semitones !== twice.semitones;
    });
    expect(failures).toEqual([]);
  });

  it("transpose(transpose(n, a), b) === transpose(n, add(a, b)) (sampled)", () => {
    const someNotes = NOTES.filter((_, idx) => idx % 7 === 0);
    const someIntervals = INTERVALS.filter((_, idx) => idx % 10 === 0);
    const failures: string[] = [];
    for (const n of someNotes) {
      for (const a of someIntervals) {
        for (const b of someIntervals) {
          const sequential = noteName(transpose(transpose(n, a), b));
          const combined = noteName(transpose(n, add(a, b)));
          if (sequential !== combined) failures.push(`${n} + ${a} + ${b}`);
        }
      }
    }
    expect(failures.length).toBe(0);
  });
});
