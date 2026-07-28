import { describe, expect, test } from "bun:test";
import { detectChord, detectQuality } from "./analysis";

describe("detectQuality", () => {
  test("recognises common triads/sevenths from intervals above root", () => {
    expect(detectQuality([0, 4, 7])).toBe("maj");
    expect(detectQuality([0, 3, 7])).toBe("min");
    expect(detectQuality([0, 3, 6])).toBe("dim");
    expect(detectQuality([0, 4, 7, 11])).toBe("maj7");
    expect(detectQuality([0, 4, 7, 10])).toBe("dom7");
  });

  test("returns undefined for unknown sets", () => {
    expect(detectQuality([0, 1, 2])).toBeUndefined();
  });
});

describe("detectChord", () => {
  test("identifies a chord from notes (bass as root)", () => {
    expect(detectChord(["C4", "E4", "G4"])?.toString()).toBe("C");
    expect(detectChord(["C4", "Eb4", "G4"])?.toString()).toBe("Cm");
    expect(detectChord(["C4", "E4", "G4", "B4"])?.toString()).toBe("Cmaj7");
  });

  test("finds a root among non-bass notes when needed", () => {
    // G B D is a G major triad regardless of note order
    const chord = detectChord(["D4", "G4", "B4"]);
    expect(chord?.root.letter).toBe("G");
    expect(chord?.toString()).toBe("G");
  });

  test("returns null when nothing matches", () => {
    expect(detectChord(["C4", "C#4", "D4"])).toBeNull();
    expect(detectChord([])).toBeNull();
  });
});
