import { describe, expect, test } from "bun:test";
import { interval, intervalName } from "./interval";
import {
  asInterval,
  intervalFromSemitones,
  parseInterval,
  tryParseInterval,
} from "./parse";

describe("parseInterval", () => {
  test("parses the common names", () => {
    expect(parseInterval("P1")).toEqual({ steps: 0, semitones: 0 });
    expect(parseInterval("m3")).toEqual({ steps: 2, semitones: 3 });
    expect(parseInterval("M3")).toEqual({ steps: 2, semitones: 4 });
    expect(parseInterval("P5")).toEqual({ steps: 4, semitones: 7 });
    expect(parseInterval("A4")).toEqual({ steps: 3, semitones: 6 });
    expect(parseInterval("d5")).toEqual({ steps: 4, semitones: 6 });
    expect(parseInterval("P8")).toEqual({ steps: 7, semitones: 12 });
  });

  test("parses compound and stacked-quality names", () => {
    expect(parseInterval("M9")).toEqual({ steps: 8, semitones: 14 });
    expect(parseInterval("P12")).toEqual({ steps: 11, semitones: 19 });
    expect(parseInterval("AA4")).toEqual({ steps: 3, semitones: 7 });
    expect(parseInterval("dd7")).toEqual({ steps: 6, semitones: 8 });
  });

  test("parses descending names", () => {
    expect(parseInterval("-m3")).toEqual({ steps: -2, semitones: -3 });
    expect(parseInterval("-P5")).toEqual({ steps: -4, semitones: -7 });
  });

  test("a negated unison carries plain zeros, not -0", () => {
    const iv = parseInterval("-P1");
    expect(Object.is(iv.steps, 0)).toBe(true);
    expect(Object.is(iv.semitones, 0)).toBe(true);
    expect(Object.is(intervalFromSemitones(-0).semitones, 0)).toBe(true);
  });

  test("round-trips with intervalName", () => {
    const names = [
      "P1",
      "m2",
      "M2",
      "m3",
      "M3",
      "P4",
      "A4",
      "d5",
      "P5",
      "m6",
      "M6",
      "m7",
      "M7",
      "P8",
      "M9",
      "m10",
      "P11",
      "dd7",
      "AA2",
      "-m3",
      "-P5",
      "-M9",
    ];
    for (const name of names) {
      expect(intervalName(parseInterval(name))).toBe(name);
    }
  });

  test("throws SyntaxError on malformed input", () => {
    expect(() => parseInterval("")).toThrow(SyntaxError);
    expect(() => parseInterval("5P")).toThrow(SyntaxError);
    expect(() => parseInterval("X3")).toThrow(SyntaxError);
    expect(() => parseInterval("p5")).toThrow(SyntaxError);
    expect(() => parseInterval("P")).toThrow(SyntaxError);
  });

  test("throws RangeError on impossible quality/number pairs", () => {
    expect(() => parseInterval("M5")).toThrow(RangeError);
    expect(() => parseInterval("P3")).toThrow(RangeError);
    expect(() => parseInterval("P0")).toThrow(RangeError);
  });
});

describe("tryParseInterval", () => {
  test("returns the interval for valid names", () => {
    expect(tryParseInterval("P5")).toEqual({ steps: 4, semitones: 7 });
  });

  test("returns null for malformed or impossible names", () => {
    expect(tryParseInterval("nope")).toBeNull();
    expect(tryParseInterval("M5")).toBeNull();
    expect(tryParseInterval("")).toBeNull();
  });
});

describe("intervalFromSemitones", () => {
  test("maps counts to conventional spellings", () => {
    expect(intervalName(intervalFromSemitones(0))).toBe("P1");
    expect(intervalName(intervalFromSemitones(1))).toBe("m2");
    expect(intervalName(intervalFromSemitones(2))).toBe("M2");
    expect(intervalName(intervalFromSemitones(3))).toBe("m3");
    expect(intervalName(intervalFromSemitones(4))).toBe("M3");
    expect(intervalName(intervalFromSemitones(5))).toBe("P4");
    expect(intervalName(intervalFromSemitones(7))).toBe("P5");
    expect(intervalName(intervalFromSemitones(8))).toBe("m6");
    expect(intervalName(intervalFromSemitones(9))).toBe("M6");
    expect(intervalName(intervalFromSemitones(10))).toBe("m7");
    expect(intervalName(intervalFromSemitones(11))).toBe("M7");
    expect(intervalName(intervalFromSemitones(12))).toBe("P8");
  });

  test("the tritone follows the preference", () => {
    expect(intervalName(intervalFromSemitones(6))).toBe("A4");
    expect(intervalName(intervalFromSemitones(6, "flat"))).toBe("d5");
    expect(intervalName(intervalFromSemitones(18, "flat"))).toBe("d12");
  });

  test("compound and negative counts", () => {
    expect(intervalName(intervalFromSemitones(14))).toBe("M9");
    expect(intervalName(intervalFromSemitones(19))).toBe("P12");
    expect(intervalName(intervalFromSemitones(-7))).toBe("-P5");
    expect(intervalName(intervalFromSemitones(-3))).toBe("-m3");
    expect(intervalFromSemitones(-14)).toEqual({ steps: -8, semitones: -14 });
  });

  test("rejects non-integers", () => {
    expect(() => intervalFromSemitones(2.5)).toThrow(RangeError);
  });
});

describe("asInterval", () => {
  test("passes intervals through and converts names and numbers", () => {
    const iv = interval(5, "P");
    expect(asInterval(iv)).toBe(iv);
    expect(asInterval("P5")).toEqual(iv);
    expect(asInterval(7)).toEqual(iv);
  });
});
