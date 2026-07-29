import { describe, expect, it } from "vitest";

import { MusicTheoryError, note, noteName } from "../../src/core";
import {
  addCents,
  centsBetween,
  centsToRatio,
  edoScale,
  edoStepCents,
  edoTranspose,
  fromRatio,
  JUST_RATIOS,
  justNote,
  justRatio,
  microtonalName,
  parseRatio,
  ratioToCents,
} from "../../src/micro";

describe("addCents() normalization (the salvaged math, on the core)", () => {
  it("keeps small deviations on the same spelling", () => {
    const p = addCents("A4", -19);
    expect(noteName(p)).toBe("A4");
    expect(p.cents).toBe(-19);
  });

  it("folds whole semitones into the spelling, remainder into cents", () => {
    expect(microtonalName(addCents("C4", 250))).toBe("D4+50c");
    // Exactly-half deviations normalize to +50 on the lower note: (-50, 50].
    expect(microtonalName(addCents("C4", -250))).toBe("A3+50c");
    expect(microtonalName(addCents("C4", 1200))).toBe("C5");
    expect(microtonalName(addCents("B4", 100))).toBe("C5");
  });

  it("keeps the result cents within (-50, 50]", () => {
    for (const cents of [-701, -250, -49.9, 0, 49.9, 149, 701, 1234.5]) {
      const p = addCents("F#3", cents);
      expect(p.cents ?? 0).toBeGreaterThan(-50);
      expect(p.cents ?? 0).toBeLessThanOrEqual(50);
    }
  });

  it("accumulates an existing cents deviation", () => {
    expect(microtonalName(addCents(addCents("C4", 30), 30))).toBe("C#4-40c");
  });

  it("works on pitch classes and honors spelling preference", () => {
    expect(microtonalName(addCents("C", 100))).toBe("C#");
    expect(microtonalName(addCents("C", 100, { prefer: "flat" }))).toBe("Db");
    expect(addCents("C", 100).oct).toBeUndefined();
  });

  it("round-trips: centsBetween(p, addCents(p, x)) === x", () => {
    for (const x of [-1234, -50, 0, 33.33, 250, 1200]) {
      expect(centsBetween("E3", addCents("E3", x))).toBeCloseTo(x, 9);
    }
  });

  it("rejects non-finite cents", () => {
    expect(() => addCents("C4", NaN)).toThrow(MusicTheoryError);
  });
});

describe("centsBetween()", () => {
  it("measures octave-specific and pitch-class distances", () => {
    expect(centsBetween("C4", "A4")).toBe(900);
    expect(centsBetween("A4", "C4")).toBe(-900);
    expect(centsBetween("C", "G")).toBe(700);
    expect(centsBetween("G", "C")).toBe(500); // ascending within an octave
  });

  it("refuses mixed pitch-class / octave inputs", () => {
    expect(() => centsBetween("C", "G4")).toThrow(MusicTheoryError);
  });
});

describe("ratio conversions", () => {
  it("converts exactly, never pre-rounded", () => {
    expect(ratioToCents(2)).toBe(1200);
    expect(ratioToCents(3 / 2)).toBeCloseTo(701.955, 3);
    expect(ratioToCents(5 / 4)).toBeCloseTo(386.3137, 4);
    expect(centsToRatio(1200)).toBe(2);
    expect(centsToRatio(ratioToCents(1.37))).toBeCloseTo(1.37, 12);
  });

  it("parseRatio() accepts numbers, fractions, decimals (salvaged parsing)", () => {
    expect(parseRatio(1.5)).toBe(1.5);
    expect(parseRatio("3/2")).toBe(1.5);
    expect(parseRatio(" 5/4 ")).toBe(1.25);
    expect(parseRatio("1.25")).toBe(1.25);
    expect(() => parseRatio("0/5")).toThrow(MusicTheoryError);
    expect(() => parseRatio("x/y")).toThrow(MusicTheoryError);
    expect(() => parseRatio(-1)).toThrow(MusicTheoryError);
  });
});

describe("just intonation", () => {
  it("keeps full-precision ratios keyed by spelled interval", () => {
    expect(JUST_RATIOS.M3).toBe(5 / 4);
    expect(JUST_RATIOS.A4).toBe(45 / 32);
    expect(JUST_RATIOS.d5).toBe(64 / 45);
    expect(ratioToCents(JUST_RATIOS.M3)).toBeCloseTo(386.3137, 4);
  });

  it("justRatio() extends over octaves and direction", () => {
    expect(justRatio("P5")).toBe(1.5);
    expect(justRatio("M10")).toBe(2.5); // 2 × 5/4
    expect(justRatio("-P5")).toBe(2 / 3);
    expect(() => justRatio("AAA3")).toThrow(MusicTheoryError);
  });

  it("justNote() keeps the interval's spelling with the ratio's cents", () => {
    expect(microtonalName(justNote("C4", "M3"))).toBe("E4-13.69c");
    expect(microtonalName(justNote("C4", "P5"))).toBe("G4+1.96c");
    // The spelled-pitch payoff: A4 and d5 from C differ in letter AND cents.
    expect(microtonalName(justNote("C4", "A4"))).toBe("F#4-9.78c");
    expect(microtonalName(justNote("C4", "d5"))).toBe("Gb4+9.78c");
  });

  it("fromRatio() lands on the nearest 12-TET spelling (the old docs' example)", () => {
    const e4 = fromRatio("C4", "5/4");
    expect(noteName(e4)).toBe("E4");
    expect(e4.cents).toBeCloseTo(-13.686, 2);
    expect(fromRatio("C4", 1.5).cents).toBeCloseTo(1.955, 2);
    // Interval names resolve through JUST_RATIOS, compound ones included.
    expect(noteName(fromRatio("C4", "M10"))).toBe("E5");
    expect(fromRatio("C4", "M10").cents).toBeCloseTo(-13.686, 2);
  });
});

describe("EDO", () => {
  it("computes exact step sizes", () => {
    expect(edoStepCents(1, 24)).toBe(50);
    expect(edoStepCents(7, 19)).toBeCloseTo(442.105, 3);
    expect(() => edoStepCents(1, 0)).toThrow(MusicTheoryError);
  });

  it("transposes by steps (quarter-tones are 24-EDO)", () => {
    expect(microtonalName(edoTranspose("C4", 3, 24))).toBe("C#4+50c");
    expect(microtonalName(edoTranspose("C4", 12, 12))).toBe("C5");
    expect(microtonalName(edoTranspose("C4", -1, 24))).toBe("B3+50c");
  });

  it("builds one-octave scales inclusive of the octave", () => {
    const scale = edoScale("C4", 24);
    expect(scale).toHaveLength(25);
    expect(noteName(scale[0])).toBe("C4");
    expect(noteName(scale[24])).toBe("C5");
    expect(centsBetween(scale[0], scale[1])).toBeCloseTo(50, 9);
  });
});

describe("microtonalName()", () => {
  it("formats deviations that noteName drops", () => {
    expect(microtonalName("C4")).toBe("C4");
    expect(microtonalName(addCents("A4", 19.561))).toBe("A4+19.56c");
    expect(microtonalName(note({ step: 2, alt: -1, oct: 3, cents: -13.7 }))).toBe("Eb3-13.7c");
  });
});
