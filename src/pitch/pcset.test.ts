import { describe, expect, test } from "bun:test";
import {
  PCSET_ALL,
  pcsetHas,
  pcsetIsSubset,
  pcsetIsSuperset,
  pcsetMask,
  pcsetPitchClasses,
  pcsetSize,
  pcsetTranspose,
} from "./pcset";

describe("pcset masks", () => {
  test("mask round-trips through pitch classes", () => {
    expect(pcsetPitchClasses(pcsetMask([7, 0, 4, 4]))).toEqual([0, 4, 7]);
    expect(pcsetPitchClasses(0)).toEqual([]);
    expect(pcsetPitchClasses(PCSET_ALL)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
  });

  test("values wrap mod 12, including negatives", () => {
    expect(pcsetMask([12, 25, -5])).toBe(pcsetMask([0, 1, 7]));
    expect(pcsetHas(pcsetMask([0]), 24)).toBe(true);
    expect(pcsetHas(pcsetMask([0]), -12)).toBe(true);
  });

  test("size is the popcount", () => {
    expect(pcsetSize(0)).toBe(0);
    expect(pcsetSize(pcsetMask([0, 4, 7]))).toBe(3);
    expect(pcsetSize(PCSET_ALL)).toBe(12);
  });

  test("transposition rotates within 12 bits", () => {
    const cMajor = pcsetMask([0, 4, 7]);
    expect(pcsetTranspose(cMajor, 2)).toBe(pcsetMask([2, 6, 9]));
    expect(pcsetTranspose(cMajor, -1)).toBe(pcsetMask([11, 3, 6]));
    expect(pcsetTranspose(cMajor, 12)).toBe(cMajor);
    expect(pcsetTranspose(cMajor, 0)).toBe(cMajor);
    // A full cycle of single-step rotations returns to the start.
    let m = pcsetMask([0, 1, 5, 8]);
    for (let i = 0; i < 12; i++) m = pcsetTranspose(m, 1);
    expect(m).toBe(pcsetMask([0, 1, 5, 8]));
  });

  test("subset and superset queries", () => {
    const scale = pcsetMask([0, 2, 4, 5, 7, 9, 11]);
    const triad = pcsetMask([0, 4, 7]);
    expect(pcsetIsSubset(triad, scale)).toBe(true);
    expect(pcsetIsSubset(scale, triad)).toBe(false);
    expect(pcsetIsSubset(triad, triad)).toBe(true);
    expect(pcsetIsSubset(0, triad)).toBe(true);
    expect(pcsetIsSuperset(scale, triad)).toBe(true);
    expect(pcsetIsSuperset(triad, scale)).toBe(false);
  });
});
