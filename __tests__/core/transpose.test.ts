import { describe, expect, it } from "vitest";

import {
  MusicTheoryError,
  distance,
  intervalName,
  noteName,
  pitch,
  transpose,
} from "../../src/core";

describe("core/ops", () => {
  describe("transpose — exact spelling (Phase 1 acceptance table)", () => {
    const cases: Array<[string, string, string]> = [
      ["Eb4", "P5", "Bb4"],
      ["C4", "m3", "Eb4"],
      ["G#4", "M3", "B#4"],
      ["F4", "m3", "Ab4"],
      ["C4", "m6", "Ab4"],
      ["C4", "A4", "F#4"],
      ["C4", "d5", "Gb4"],
      ["B3", "m2", "C4"],
      ["B3", "A4", "E#4"],
      ["Cb4", "M3", "Eb4"],
      ["Fb4", "P5", "Cb5"],
      ["C4", "P8", "C5"],
      ["C4", "-P5", "F3"],
      ["C4", "-m3", "A3"],
      ["D4", "M9", "E5"],
      ["C4", "M13", "A5"],
      ["Dbb4", "A1", "Db4"],
      ["F#4", "d4", "Bb4"],
    ];

    it.each(cases)("%s + %s = %s", (start, ivl, expected) => {
      expect(noteName(transpose(start, ivl))).toBe(expected);
    });

    it("spells the Cb major scale correctly", () => {
      const scale = ["P1", "M2", "M3", "P4", "P5", "M6", "M7"].map((i) =>
        noteName(transpose("Cb4", i))
      );
      expect(scale).toEqual(["Cb4", "Db4", "Eb4", "Fb4", "Gb4", "Ab4", "Bb4"]);
    });

    it("spells the C# major scale correctly", () => {
      const scale = ["P1", "M2", "M3", "P4", "P5", "M6", "M7"].map((i) =>
        noteName(transpose("C#4", i))
      );
      expect(scale).toEqual(["C#4", "D#4", "E#4", "F#4", "G#4", "A#4", "B#4"]);
    });

    it("spells the F major scale with Bb (not A#)", () => {
      const scale = ["P1", "M2", "M3", "P4", "P5", "M6", "M7"].map((i) =>
        noteName(transpose("F4", i))
      );
      expect(scale).toEqual(["F4", "G4", "A4", "Bb4", "C5", "D5", "E5"]);
    });

    it("transposes pitch classes without octaves", () => {
      expect(noteName(transpose("Eb", "P5"))).toBe("Bb");
      expect(noteName(transpose("B", "m2"))).toBe("C");
    });

    it("preserves cents deviations", () => {
      expect(transpose(pitch(0, 0, 4, 25), "M3").cents).toBe(25);
    });
  });

  describe("distance", () => {
    it("measures spelled intervals between octave-specific notes", () => {
      expect(intervalName(distance("C4", "G4"))).toBe("P5");
      expect(intervalName(distance("C4", "Eb4"))).toBe("m3");
      expect(intervalName(distance("G#4", "B#4"))).toBe("M3");
      expect(intervalName(distance("C4", "C5"))).toBe("P8");
      expect(intervalName(distance("C4", "B#4"))).toBe("A7");
      expect(intervalName(distance("C4", "F3"))).toBe("-P5");
      expect(intervalName(distance("E4", "C4"))).toBe("-M3");
      expect(intervalName(distance("C4", "C4"))).toBe("P1");
    });

    it("measures ascending intervals between pitch classes", () => {
      expect(intervalName(distance("C", "G"))).toBe("P5");
      expect(intervalName(distance("B", "C"))).toBe("m2");
      expect(intervalName(distance("Bb", "D"))).toBe("M3");
      expect(intervalName(distance("C", "C#"))).toBe("A1");
      expect(intervalName(distance("C#", "C"))).toBe("-A1"); // same-letter: raw alteration difference
    });

    it("round-trips through transpose", () => {
      expect(noteName(transpose("C4", distance("C4", "F#5")))).toBe("F#5");
    });

    it("rejects mixing pitch classes with octave-specific notes", () => {
      expect(() => distance("C", "G4")).toThrow(MusicTheoryError);
      expect(() => distance("C4", "G")).toThrow(MusicTheoryError);
    });
  });
});
