import { describe, expect, test } from "bun:test";
import {
  addIntervals,
  intervalFifths,
  intervalName,
  invertInterval,
  simplifyInterval,
  subtractIntervals,
} from "./interval";
import { parseInterval } from "./parse";

const name = (s: string) => intervalName(parseInterval(s));

describe("subtractIntervals", () => {
  test("is the inverse of addition", () => {
    for (const [a, b] of [
      ["P5", "M3"],
      ["P8", "P5"],
      ["M9", "M2"],
      ["A4", "m3"],
    ] as const) {
      const diff = subtractIntervals(parseInterval(a), parseInterval(b));
      expect(intervalName(addIntervals(diff, parseInterval(b)))).toBe(name(a));
    }
  });

  test("names the familiar differences", () => {
    expect(
      intervalName(subtractIntervals(parseInterval("P5"), parseInterval("M3")))
    ).toBe("m3");
    expect(
      intervalName(subtractIntervals(parseInterval("P8"), parseInterval("P5")))
    ).toBe("P4");
  });
});

describe("simplifyInterval", () => {
  test("reduces compounds but keeps the octave an octave", () => {
    expect(intervalName(simplifyInterval(parseInterval("M9")))).toBe("M2");
    expect(intervalName(simplifyInterval(parseInterval("P15")))).toBe("P8");
    expect(intervalName(simplifyInterval(parseInterval("P8")))).toBe("P8");
    expect(intervalName(simplifyInterval(parseInterval("P1")))).toBe("P1");
    expect(intervalName(simplifyInterval(parseInterval("P5")))).toBe("P5");
  });

  test("preserves direction and quality", () => {
    expect(intervalName(simplifyInterval(parseInterval("-M10")))).toBe("-M3");
    expect(intervalName(simplifyInterval(parseInterval("A11")))).toBe("A4");
  });

  test("is idempotent", () => {
    for (const iv of ["M9", "P15", "A11", "-M10", "P5"]) {
      const once = simplifyInterval(parseInterval(iv));
      expect(intervalName(simplifyInterval(once))).toBe(intervalName(once));
    }
  });
});

describe("invertInterval", () => {
  test("inverts about the octave, swapping quality", () => {
    expect(intervalName(invertInterval(parseInterval("M3")))).toBe("m6");
    expect(intervalName(invertInterval(parseInterval("m3")))).toBe("M6");
    expect(intervalName(invertInterval(parseInterval("P5")))).toBe("P4");
    expect(intervalName(invertInterval(parseInterval("A4")))).toBe("d5");
    expect(intervalName(invertInterval(parseInterval("d5")))).toBe("A4");
    expect(intervalName(invertInterval(parseInterval("P1")))).toBe("P8");
    expect(intervalName(invertInterval(parseInterval("P8")))).toBe("P1");
  });

  test("inverting twice returns the simple original", () => {
    for (const iv of ["M3", "m6", "P5", "A4", "M2", "m7"]) {
      const back = invertInterval(invertInterval(parseInterval(iv)));
      expect(intervalName(back)).toBe(iv);
    }
  });

  test("an inversion pair always spans an octave", () => {
    for (const iv of ["M3", "P5", "m2", "M7", "A4"]) {
      const original = parseInterval(iv);
      const sum = addIntervals(original, invertInterval(original));
      expect(sum.semitones).toBe(12);
      expect(sum.steps).toBe(7);
    }
  });

  test("compounds reduce before inverting", () => {
    expect(intervalName(invertInterval(parseInterval("M10")))).toBe("m6");
  });
});

describe("intervalFifths", () => {
  test("stacks literal fifths", () => {
    expect(intervalName(intervalFifths(0))).toBe("P1");
    expect(intervalName(intervalFifths(1))).toBe("P5");
    expect(intervalName(intervalFifths(2))).toBe("M9");
    expect(intervalName(intervalFifths(-1))).toBe("-P5");
  });

  test("simplifies to the circle-of-fifths pitch classes", () => {
    const simple = (n: number) =>
      intervalName(simplifyInterval(intervalFifths(n)));
    expect(simple(2)).toBe("M2");
    expect(simple(-1)).toBe("-P5");
    expect(simple(6)).toBe("A4");
  });

  test("rejects a fractional count", () => {
    expect(() => intervalFifths(1.5)).toThrow(RangeError);
  });
});

describe("parse cache", () => {
  test("repeated parses agree and stay immutable", () => {
    const a = parseInterval("P5");
    const b = parseInterval("P5");
    expect(a).toEqual(b);
    // Cached entries are frozen, so a caller cannot corrupt the shared value.
    expect(Object.isFrozen(a)).toBe(true);
  });

  test("a well-formed but impossible name still throws every time", () => {
    expect(() => parseInterval("M5")).toThrow(RangeError);
    expect(() => parseInterval("M5")).toThrow(RangeError);
  });

  test("a malformed name still throws every time", () => {
    expect(() => parseInterval("nonsense")).toThrow(SyntaxError);
    expect(() => parseInterval("nonsense")).toThrow(SyntaxError);
  });
});
