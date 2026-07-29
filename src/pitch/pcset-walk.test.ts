import { describe, expect, test } from "bun:test";
import {
  pcsetDegree,
  pcsetMask,
  pcsetModes,
  pcsetNearest,
  pcsetPitchClasses,
  pcsetStep,
} from "./pcset";

const MAJOR = pcsetMask([0, 2, 4, 5, 7, 9, 11]);
const TRIAD = pcsetMask([0, 4, 7]);

describe("pcsetModes", () => {
  test("returns one rotation per present pitch class", () => {
    expect(pcsetModes(MAJOR)).toHaveLength(7);
    expect(pcsetModes(MAJOR, false)).toHaveLength(12);
    expect(pcsetModes(TRIAD)).toHaveLength(3);
  });

  test("the second mode of major is dorian", () => {
    expect(pcsetPitchClasses(pcsetModes(MAJOR)[1] as number)).toEqual([
      0, 2, 3, 5, 7, 9, 10,
    ]);
  });

  test("the first mode is the set itself", () => {
    expect(pcsetModes(MAJOR)[0]).toBe(MAJOR);
  });

  test("every mode has the same size as the original", () => {
    for (const mode of pcsetModes(MAJOR)) {
      expect(pcsetPitchClasses(mode)).toHaveLength(7);
    }
  });
});

describe("pcsetNearest", () => {
  test("snaps to the closest member, resolving ties upward", () => {
    expect(pcsetNearest(TRIAD, 61)).toBe(60);
    expect(pcsetNearest(TRIAD, 66)).toBe(67);
    expect(pcsetNearest(TRIAD, 64)).toBe(64);
    // D sits exactly between C and E, so the upward tie-break decides.
    expect(pcsetNearest(TRIAD, 62)).toBe(64);
    // F is one above E and two below G, so it snaps down.
    expect(pcsetNearest(TRIAD, 65)).toBe(64);
  });

  test("works across octaves", () => {
    expect(pcsetNearest(TRIAD, 73)).toBe(72);
    expect(pcsetNearest(TRIAD, 49)).toBe(48);
  });

  test("rejects an empty set", () => {
    expect(() => pcsetNearest(0, 60)).toThrow(RangeError);
  });
});

describe("pcsetStep and pcsetDegree", () => {
  test("walks the set as a scale, climbing octaves", () => {
    expect(pcsetStep(TRIAD, 60, 0)).toBe(60);
    expect(pcsetStep(TRIAD, 60, 1)).toBe(64);
    expect(pcsetStep(TRIAD, 60, 2)).toBe(67);
    expect(pcsetStep(TRIAD, 60, 3)).toBe(72);
    expect(pcsetStep(TRIAD, 60, 6)).toBe(84);
  });

  test("descends for negative steps", () => {
    expect(pcsetStep(TRIAD, 60, -1)).toBe(55);
    expect(pcsetStep(TRIAD, 60, -2)).toBe(52);
    expect(pcsetStep(TRIAD, 60, -3)).toBe(48);
  });

  test("degrees are the same walk numbered from 1", () => {
    expect(pcsetDegree(TRIAD, 60, 1)).toBe(pcsetStep(TRIAD, 60, 0));
    expect(pcsetDegree(TRIAD, 60, 4)).toBe(pcsetStep(TRIAD, 60, 3));
    expect(pcsetDegree(TRIAD, 60, -1)).toBe(pcsetStep(TRIAD, 60, -1));
  });

  test("degree 0 is rejected rather than guessed at", () => {
    expect(() => pcsetDegree(TRIAD, 60, 0)).toThrow(RangeError);
  });

  test("a full turn of the set is exactly an octave", () => {
    for (const mask of [TRIAD, MAJOR, pcsetMask([0, 3, 6, 9])]) {
      const size = pcsetPitchClasses(mask).length;
      expect(pcsetStep(mask, 60, size) - pcsetStep(mask, 60, 0)).toBe(12);
    }
  });

  test("rejects an empty set and a fractional step", () => {
    expect(() => pcsetStep(0, 60, 1)).toThrow(RangeError);
    expect(() => pcsetStep(TRIAD, 60, 1.5)).toThrow(RangeError);
  });
});
