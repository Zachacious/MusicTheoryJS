import { describe, expect, test } from "bun:test";
import {
  centsToRatio,
  clamp,
  gcd,
  mod,
  parseRatio,
  ratioToCents,
} from "./index";

describe("mod", () => {
  test("wraps negatives into the positive range", () => {
    expect(mod(-1, 12)).toBe(11);
    expect(mod(-13, 12)).toBe(11);
    expect(mod(0, 12)).toBe(0);
    expect(mod(12, 12)).toBe(0);
    expect(mod(13, 12)).toBe(1);
  });
});

describe("clamp", () => {
  test("clamps to inclusive bounds", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("gcd", () => {
  test("computes greatest common divisor", () => {
    expect(gcd(12, 8)).toBe(4);
    expect(gcd(17, 5)).toBe(1);
    expect(gcd(0, 0)).toBe(0);
    expect(gcd(9, 0)).toBe(9);
  });
});

describe("cents <-> ratio", () => {
  test("octave is 1200 cents", () => {
    expect(ratioToCents(2)).toBeCloseTo(1200, 6);
  });

  test("just perfect fifth is ~701.955 cents", () => {
    expect(ratioToCents(3 / 2)).toBeCloseTo(701.955, 3);
  });

  test("round-trips", () => {
    expect(centsToRatio(1200)).toBeCloseTo(2, 6);
    expect(centsToRatio(ratioToCents(5 / 4))).toBeCloseTo(5 / 4, 9);
  });

  test("rejects non-positive ratios", () => {
    expect(() => ratioToCents(0)).toThrow();
    expect(() => ratioToCents(-1)).toThrow();
  });
});

describe("parseRatio", () => {
  test("parses fractions, decimals, and numbers", () => {
    expect(parseRatio("3/2")).toBeCloseTo(1.5, 9);
    expect(parseRatio("1.25")).toBeCloseTo(1.25, 9);
    expect(parseRatio(2)).toBe(2);
  });

  test("rejects invalid input", () => {
    expect(() => parseRatio("0/1")).toThrow();
    expect(() => parseRatio("abc")).toThrow();
    expect(() => parseRatio(-1)).toThrow();
  });
});
