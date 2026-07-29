import { describe, expect, it } from "vitest";

import { MusicTheoryError } from "../../src/core";
import {
  chromaBits,
  chromaCardinality,
  chromaContains,
  chromaFromIntervals,
  chromaFromNotes,
  chromaIntervals,
  chromaModes,
  isChroma,
  rotateChroma,
} from "../../src/pcset";

const C_MAJOR_TRIAD = 0b000010010001; // C E G = 145
const C_MAJOR_SCALE = 2741; // C D E F G A B

describe("pcset", () => {
  it("builds chromas from notes, ignoring octaves and duplicates", () => {
    expect(chromaFromNotes(["C", "E", "G"])).toBe(C_MAJOR_TRIAD);
    expect(chromaFromNotes(["C4", "E5", "G3", "C6"])).toBe(C_MAJOR_TRIAD);
    expect(chromaFromNotes(["B#3", "Fb4"])).toBe(0b000000010001); // B#=C, Fb=E
  });

  it("builds chromas from intervals", () => {
    expect(chromaFromIntervals(["P1", "M3", "P5"])).toBe(C_MAJOR_TRIAD);
    expect(chromaFromIntervals(["P1", "M2", "M3", "P4", "P5", "M6", "M7"])).toBe(
      C_MAJOR_SCALE
    );
    expect(chromaFromIntervals(["P1", "M9"])).toBe(0b000000000101); // compound wraps
  });

  it("counts cardinality", () => {
    expect(chromaCardinality(0)).toBe(0);
    expect(chromaCardinality(C_MAJOR_TRIAD)).toBe(3);
    expect(chromaCardinality(C_MAJOR_SCALE)).toBe(7);
    expect(chromaCardinality(0xfff)).toBe(12);
  });

  it("rotates (transposes) sets with wraparound", () => {
    expect(rotateChroma(C_MAJOR_TRIAD, 2)).toBe(chromaFromNotes(["D", "F#", "A"]));
    expect(rotateChroma(1 << 11, 1)).toBe(1);
    expect(rotateChroma(C_MAJOR_TRIAD, 12)).toBe(C_MAJOR_TRIAD);
    expect(rotateChroma(C_MAJOR_TRIAD, -12)).toBe(C_MAJOR_TRIAD);
    expect(rotateChroma(rotateChroma(C_MAJOR_SCALE, 5), -5)).toBe(C_MAJOR_SCALE);
  });

  it("tests containment", () => {
    expect(chromaContains(C_MAJOR_SCALE, C_MAJOR_TRIAD)).toBe(true);
    expect(chromaContains(C_MAJOR_TRIAD, C_MAJOR_SCALE)).toBe(false);
    expect(chromaContains(C_MAJOR_TRIAD, C_MAJOR_TRIAD)).toBe(true);
  });

  it("lists set bits and interval names", () => {
    expect(chromaBits(C_MAJOR_TRIAD)).toEqual([0, 4, 7]);
    expect(chromaIntervals(C_MAJOR_TRIAD)).toEqual(["P1", "M3", "P5"]);
    expect(chromaIntervals(chromaFromNotes(["C", "F#"]))).toEqual(["P1", "d5"]);
  });

  it("computes modes as rotations onto each member", () => {
    const modes = chromaModes(C_MAJOR_SCALE);
    expect(modes).toHaveLength(7);
    expect(modes[0]).toBe(C_MAJOR_SCALE); // ionian
    expect(modes[1]).toBe(chromaFromIntervals(["P1", "M2", "m3", "P4", "P5", "M6", "m7"])); // dorian
    expect(modes[5]).toBe(chromaFromIntervals(["P1", "M2", "m3", "P4", "P5", "m6", "m7"])); // aeolian
    for (const m of modes) expect((m & 1) !== 0).toBe(true); // every mode is rooted
  });

  it("validates chroma arguments", () => {
    expect(isChroma(145)).toBe(true);
    expect(isChroma(4096)).toBe(false);
    expect(isChroma(-1)).toBe(false);
    expect(isChroma(1.5)).toBe(false);
    expect(isChroma("145")).toBe(false);
    expect(() => rotateChroma(4096, 1)).toThrow(MusicTheoryError);
    expect(() => chromaCardinality(-1)).toThrow(MusicTheoryError);
    expect(() => rotateChroma(145, 0.5)).toThrow(MusicTheoryError);
    expect(() => rotateChroma(145, NaN)).toThrow(MusicTheoryError);
  });
});
