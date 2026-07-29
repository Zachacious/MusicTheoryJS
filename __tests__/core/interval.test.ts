import { describe, expect, it } from "vitest";

import {
  MusicTheoryError,
  add,
  interval,
  intervalDirection,
  intervalName,
  intervalNumber,
  intervalQuality,
  invert,
  isInterval,
  simplify,
  subtract,
  tryInterval,
} from "../../src/core";

describe("core/interval", () => {
  describe("interval (parsing)", () => {
    it("parses quality-first and number-first orders identically", () => {
      expect(interval("m3")).toEqual({ steps: 2, semitones: 3 });
      expect(interval("3m")).toEqual({ steps: 2, semitones: 3 });
      expect(interval("P5")).toEqual({ steps: 4, semitones: 7 });
      expect(interval("5P")).toEqual({ steps: 4, semitones: 7 });
    });

    it("parses the standard vocabulary", () => {
      expect(interval("P1")).toEqual({ steps: 0, semitones: 0 });
      expect(interval("A4")).toEqual({ steps: 3, semitones: 6 });
      expect(interval("d5")).toEqual({ steps: 4, semitones: 6 });
      expect(interval("M7")).toEqual({ steps: 6, semitones: 11 });
      expect(interval("d7")).toEqual({ steps: 6, semitones: 9 });
      expect(interval("P8")).toEqual({ steps: 7, semitones: 12 });
      expect(interval("AA4")).toEqual({ steps: 3, semitones: 7 });
      expect(interval("dd5")).toEqual({ steps: 4, semitones: 5 });
    });

    it("parses compound intervals", () => {
      expect(interval("M9")).toEqual({ steps: 8, semitones: 14 });
      expect(interval("P11")).toEqual({ steps: 10, semitones: 17 });
      expect(interval("m10")).toEqual({ steps: 9, semitones: 15 });
      expect(interval("P15")).toEqual({ steps: 14, semitones: 24 });
    });

    it("parses direction signs", () => {
      expect(interval("-m3")).toEqual({ steps: -2, semitones: -3 });
      expect(interval("-P5")).toEqual({ steps: -4, semitones: -7 });
      expect(interval("+M3")).toEqual({ steps: 2, semitones: 4 });
      expect(interval("-3m")).toEqual({ steps: -2, semitones: -3 });
    });

    it("accepts and normalizes Interval objects", () => {
      expect(interval({ steps: 2, semitones: 3 })).toEqual({ steps: 2, semitones: 3 });
      expect(Object.isFrozen(interval({ steps: 2, semitones: 3 }))).toBe(true);
    });

    it("caches repeated parses and survives overflow", () => {
      expect(interval("m3")).toBe(interval("m3"));
      for (let i = 1; i <= 10_050; i++) tryInterval(`A${i}`);
      expect(intervalName(interval("m3"))).toBe("m3");
    });

    it("rejects theory violations and malformed input", () => {
      expect(tryInterval("P3")).toBeNull(); // thirds are not perfect
      expect(tryInterval("M5")).toBeNull(); // fifths are not major
      expect(tryInterval("m4")).toBeNull(); // fourths are not minor
      expect(tryInterval("M0")).toBeNull();
      expect(tryInterval("x3")).toBeNull();
      expect(tryInterval("")).toBeNull();
      expect(tryInterval(3 as unknown as string)).toBeNull();
      expect(tryInterval({ steps: 1.5, semitones: 3 } as never)).toBeNull();
      expect(tryInterval({ steps: 2 ** 53, semitones: 0 } as never)).toBeNull();
      expect(() => interval("P3")).toThrow(MusicTheoryError);
    });

    it("ignores inherited properties on object input", () => {
      const inherited = Object.create({ steps: 2, semitones: 3 }) as never;
      expect(tryInterval(inherited)).toBeNull();
    });

    it("parses every name the formatter can emit (round-trip guarantee)", () => {
      expect(interval("AAAAA4")).toEqual({ steps: 3, semitones: 10 });
      expect(intervalName(interval("AAAAA4"))).toBe("AAAAA4");
      const exotic = { steps: 3, semitones: -2 }; // formats as ddddddd4
      expect(interval(intervalName(exotic))).toEqual(exotic);
      const extreme = intervalName(interval({ steps: 6, semitones: 19 })); // AAAAAAAA7
      expect(interval(extreme)).toEqual({ steps: 6, semitones: 19 });
    });
  });

  describe("isInterval", () => {
    it("guards structurally", () => {
      expect(isInterval({ steps: 2, semitones: 3 })).toBe(true);
      expect(isInterval(null)).toBe(false);
      expect(isInterval("m3")).toBe(false);
      expect(isInterval({ steps: 2 })).toBe(false);
    });
  });

  describe("intervalName and derivations", () => {
    it("round-trips names", () => {
      for (const name of ["P1", "m2", "M3", "A4", "d5", "P5", "m6", "M7", "P8", "M9", "dd4", "AA5", "-m3", "-P11"]) {
        expect(intervalName(interval(name))).toBe(name);
      }
    });

    it("derives quality from the (steps, semitones) pair", () => {
      expect(intervalName({ steps: 1, semitones: 3 })).toBe("A2");
      expect(intervalName({ steps: 2, semitones: 2 })).toBe("d3");
      expect(intervalName({ steps: 0, semitones: -1 })).toBe("-A1");
      expect(intervalName({ steps: 0, semitones: 5 })).toBe("AAAAA1"); // exotic but derivable
    });

    it("exposes quality, number, and direction", () => {
      expect(intervalQuality("dd5")).toBe("dd");
      expect(intervalQuality("P8")).toBe("P");
      expect(intervalQuality("m3")).toBe("m");
      expect(intervalNumber("-m10")).toBe(10);
      expect(intervalNumber("P1")).toBe(1);
      expect(intervalDirection("-M3")).toBe(-1);
      expect(intervalDirection("M3")).toBe(1);
      expect(intervalDirection("P1")).toBe(1);
    });
  });

  describe("arithmetic", () => {
    it("adds and subtracts as vectors", () => {
      expect(intervalName(add("M3", "m3"))).toBe("P5");
      expect(intervalName(add("M2", "M2"))).toBe("M3");
      expect(intervalName(add("P4", "P5"))).toBe("P8");
      expect(intervalName(add("M3", "-M3"))).toBe("P1");
      expect(intervalName(subtract("P5", "M3"))).toBe("m3");
      expect(intervalName(subtract("P8", "P4"))).toBe("P5");
    });

    it("simplifies compound intervals, keeping octaves as octaves", () => {
      expect(intervalName(simplify("M9"))).toBe("M2");
      expect(intervalName(simplify("m10"))).toBe("m3");
      expect(intervalName(simplify("A11"))).toBe("A4");
      expect(intervalName(simplify("P8"))).toBe("P8");
      expect(intervalName(simplify("P15"))).toBe("P8");
      expect(intervalName(simplify("m3"))).toBe("m3");
      expect(intervalName(simplify("-M9"))).toBe("-M2");
    });

    it("inverts per standard rules, preserving direction", () => {
      const cases: Array<[string, string]> = [
        ["m3", "M6"], ["M3", "m6"], ["P4", "P5"], ["A4", "d5"],
        ["d5", "A4"], ["P1", "P8"], ["P8", "P1"], ["M7", "m2"],
        ["M9", "m7"], ["-m3", "-M6"],
      ];
      for (const [input, expected] of cases) {
        expect(intervalName(invert(input))).toBe(expected);
      }
    });
  });
});
