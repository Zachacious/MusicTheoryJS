import { describe, expect, test } from "bun:test";
import { centsTuning } from "../tuning/custom";
import { equalTemperament } from "../tuning/tuning";
import { Scale, scaleFromTuning } from "./scale";

describe("Western scales spell correctly", () => {
  test("C major is C D E F G A B (not E# / Fb)", () => {
    expect(Scale.from("C4", "major").noteNames()).toEqual([
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
    ]);
  });

  test("C lydian uses F# not Gb", () => {
    expect(Scale.from("C4", "lydian").noteNames()).toContain("F#4");
  });

  test("D dorian", () => {
    expect(Scale.from("D4", "dorian").noteNames()).toEqual([
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
      "C5",
    ]);
  });

  test("A natural minor", () => {
    expect(Scale.from("A3", "minor").noteNames()).toEqual([
      "A3",
      "B3",
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
    ]);
  });

  test("Bb major keeps flats", () => {
    expect(Scale.from("Bb3", "major").noteNames()).toEqual([
      "Bb3",
      "C4",
      "D4",
      "Eb4",
      "F4",
      "G4",
      "A4",
    ]);
  });

  test("harmonic minor has the raised leading tone", () => {
    expect(Scale.from("A3", "harmonicMinor").noteNames()).toContain("G#4");
  });
});

describe("degrees and membership", () => {
  test("degree is 1-based and wraps octaves", () => {
    const cMajor = Scale.from("C4", "major");
    expect(cMajor.degree(1).toString()).toBe("C4");
    expect(cMajor.degree(3).toString()).toBe("E4");
    expect(cMajor.degree(8).toString()).toBe("C5");
    expect(cMajor.degree(9).toString()).toBe("D5");
  });

  test("negative/zero degrees wrap downward", () => {
    const cMajor = Scale.from("C4", "major");
    expect(cMajor.degree(0).toString()).toBe("B3");
  });

  test("contains is octave-agnostic and enharmonic-aware", () => {
    const cMajor = Scale.from("C4", "major");
    expect(cMajor.contains("E5")).toBe(true);
    expect(cMajor.contains("F#4")).toBe(false);
    expect(cMajor.contains("Fb4")).toBe(true); // Fb == E, which is in C major
  });

  test("size reflects note count", () => {
    expect(Scale.from("C4", "majorPentatonic").size).toBe(5);
    expect(Scale.from("C4", "wholeTone").size).toBe(6);
  });
});

describe("microtonal scales from tunings", () => {
  test("24-EDO scale degrees are 50 cents apart", () => {
    const degrees = scaleFromTuning(equalTemperament(24));
    expect(degrees).toHaveLength(24);
    expect(degrees[1]?.cents).toBeCloseTo(50, 6);
    expect(degrees[2]?.cents).toBeCloseTo(100, 6);
  });

  test("a maqam Rast scale yields neutral intervals with real frequencies", () => {
    const rast = centsTuning([0, 204, 355, 498, 702, 906, 1057], {
      name: "Rast",
    });
    const degrees = scaleFromTuning(rast, { frequency: 264 }, true);
    expect(degrees).toHaveLength(8); // 7 + closing period
    expect(degrees[2]?.cents).toBe(355); // neutral third
    expect(degrees[0]?.frequency).toBeCloseTo(264, 6);
    expect(degrees[7]?.cents).toBe(1200); // octave
    expect(degrees[7]?.frequency).toBeCloseTo(528, 6); // one octave up
  });
});
