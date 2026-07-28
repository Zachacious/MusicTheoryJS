import { describe, expect, test } from "bun:test";
import {
  A4_440,
  A4_CENTS,
  centsBetween,
  fromFrequency,
  point,
  toFrequency,
  transposeCents,
} from "./point";

describe("frequency <-> cents", () => {
  test("A4 (5700 cents) is 440 Hz", () => {
    expect(toFrequency(point(A4_CENTS))).toBeCloseTo(440, 6);
  });

  test("C0 (0 cents) is ~16.35 Hz", () => {
    expect(toFrequency(point(0))).toBeCloseTo(16.3516, 3);
  });

  test("one octave up doubles frequency", () => {
    const a5 = toFrequency(point(A4_CENTS + 1200));
    expect(a5).toBeCloseTo(880, 6);
  });

  test("round-trips through frequency", () => {
    const p = point(5000);
    expect(fromFrequency(toFrequency(p)).cents).toBeCloseTo(5000, 6);
  });

  test("honours a custom reference", () => {
    const ref = { cents: A4_CENTS, frequency: 432 };
    expect(toFrequency(point(A4_CENTS), ref)).toBeCloseTo(432, 6);
  });

  test("rejects non-positive frequency", () => {
    expect(() => fromFrequency(0)).toThrow();
  });
});

describe("cents arithmetic", () => {
  test("centsBetween is signed", () => {
    expect(centsBetween(point(100), point(400))).toBe(300);
    expect(centsBetween(point(400), point(100))).toBe(-300);
  });

  test("transposeCents shifts by cents", () => {
    expect(transposeCents(point(100), 50).cents).toBe(150);
  });
});

describe("defaults", () => {
  test("A4_440 reference", () => {
    expect(A4_440.frequency).toBe(440);
    expect(A4_440.cents).toBe(A4_CENTS);
  });
});
