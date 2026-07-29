/**
 * Differential tests: run generated corpora through our core and through an
 * established reference implementation (dev-dependency only, never shipped),
 * and require agreement. Any divergence is either our bug or a documented,
 * justified improvement.
 */
import { describe, expect, it } from "vitest";
import { Interval as RefInterval, Note as RefNote } from "tonal";

import {
  distance,
  interval,
  midi,
  noteName,
  transpose,
  tryInterval,
} from "../../src/core";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

function buildNotes(accidentals: string[], octaves: number[]): string[] {
  return LETTERS.flatMap((l) =>
    accidentals.flatMap((a) => octaves.map((o) => `${l}${a}${o}`))
  );
}

const PERFECT_NUMBERS = new Set([1, 4, 5, 8, 11, 12]);

/** [ourName, referenceName] pairs, e.g. ["M3", "3M"] / ["-m10", "-10m"]. */
function buildIntervals(): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  for (let num = 1; num <= 14; num++) {
    const qualities = PERFECT_NUMBERS.has(num)
      ? ["P", "A", "d"]
      : ["M", "m", "A", "d"];
    for (const q of qualities) {
      result.push([`${q}${num}`, `${num}${q}`]);
      result.push([`-${q}${num}`, `-${num}${q}`]);
    }
  }
  return result;
}

describe("core vs reference implementation", () => {
  it("agrees on transposition for a 21,000-case corpus", () => {
    const notes = buildNotes(["bb", "b", "", "#", "##"], [1, 2, 3, 4, 5, 6]); // 210
    const intervals = buildIntervals(); // 100
    const mismatches: string[] = [];
    let skipped = 0;
    let cases = 0;
    for (const n of notes) {
      for (const [ourIvl, refIvl] of intervals) {
        cases++;
        const theirs = RefNote.transpose(n, refIvl);
        if (theirs === "") {
          skipped++;
          continue;
        }
        const ours = noteName(transpose(n, ourIvl));
        if (ours !== theirs) {
          mismatches.push(`${n} + ${ourIvl}: ours=${ours} ref=${theirs}`);
        }
      }
    }
    expect(cases).toBeGreaterThanOrEqual(10_000);
    expect(skipped).toBe(0);
    expect(mismatches.slice(0, 20)).toEqual([]);
    expect(mismatches.length).toBe(0);
  });

  it("agrees on distance wherever the reference is self-consistent (7,056 pairs)", () => {
    const notes = buildNotes(["b", "", "#"], [2, 3, 4, 5]); // 84
    const mismatches: string[] = [];
    const referenceInconsistent: string[] = [];
    for (const a of notes) {
      for (const b of notes) {
        const ours = distance(a, b);
        const refName = RefInterval.distance(a, b);
        if (RefNote.transpose(a, refName) !== b) {
          // The reference's distance fails its own roundtrip here — a known
          // octave-offset edge when letter direction and pitch direction
          // disagree (E#4→Fb4 is a dd2; the reference answers -AA7 an octave
          // off). On these pairs we only require OUR roundtrip to hold.
          referenceInconsistent.push(`${a} -> ${b}`);
          if (noteName(transpose(a, ours)) !== b) {
            mismatches.push(`${a} -> ${b}: our roundtrip failed`);
          }
          continue;
        }
        const theirs = tryInterval(refName);
        if (
          theirs === null ||
          theirs.steps !== ours.steps ||
          theirs.semitones !== ours.semitones
        ) {
          mismatches.push(
            `${a} -> ${b}: ours=${ours.steps}/${ours.semitones} ref=${refName}`
          );
        }
      }
    }
    expect(mismatches.slice(0, 20)).toEqual([]);
    expect(mismatches.length).toBe(0);
    // Exactly the E#↔Fb / B#↔Cb letter-vs-pitch direction pairs; pinned so
    // silent growth of the "reference is wrong" bucket fails the suite.
    expect(referenceInconsistent.length).toBeLessThanOrEqual(20);
  });

  it("agrees on MIDI numbers", () => {
    const notes = buildNotes(["bb", "b", "", "#", "##"], [1, 2, 3, 4, 5, 6]);
    const mismatches = notes.filter((n) => midi(n) !== RefNote.midi(n));
    expect(mismatches).toEqual([]);
  });

  it("agrees on interval semitone sizes", () => {
    const mismatches = buildIntervals().filter(
      ([ours, ref]) => interval(ours).semitones !== RefInterval.semitones(ref)
    );
    expect(mismatches).toEqual([]);
  });
});
