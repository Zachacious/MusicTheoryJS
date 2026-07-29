import { describe, expect, it } from "vitest";

import { MusicTheoryError } from "../../src/core";
import {
  COMMON_PROGRESSIONS,
  parseProgression,
  progressionChords,
  progressionRomans,
  suggestNextChords,
} from "../../src/progression";

describe("parseProgression()", () => {
  it("accepts numerals, chord symbols, and N.C. in one progression", () => {
    const steps = parseProgression("C major", "Dm7 | G7 | N.C. | Imaj7");
    expect(steps.map((s) => s.function)).toEqual(["SD", "D", "", "T"]);
    expect(steps[0].roman!.symbol).toBe("ii7");
    expect(steps[2].chord).toBeNull();
    expect(steps[3].chord!.symbol).toBe("Cmaj7");
  });

  it("accepts arrays and string separators equally", () => {
    const a = parseProgression("C major", ["ii7", "V7", "Imaj7"]);
    const b = parseProgression("C major", "ii7 - V7 - Imaj7");
    expect(a.map((s) => s.chord!.symbol)).toEqual(b.map((s) => s.chord!.symbol));
  });

  it("tags applied dominants as D", () => {
    const steps = parseProgression("C major", ["A7", "Dm7"]);
    expect(steps[0].roman!.symbol).toBe("V7/ii");
    expect(steps[0].function).toBe("D");
  });

  it("tags minor-key borrowed degrees via the three variants", () => {
    const steps = parseProgression("a minor", ["Am", "F", "G", "E7"]);
    expect(steps.map((s) => s.roman!.symbol)).toEqual(["i", "bVI", "bVII", "V7"]);
    expect(steps[1].function).toBe("SD");
    expect(steps[3].function).toBe("D");
  });

  it("throws on unparseable tokens and empty input", () => {
    expect(() => parseProgression("C major", "ii7 wat")).toThrow(MusicTheoryError);
    expect(() => parseProgression("C major", "")).toThrow(MusicTheoryError);
  });
});

describe("progressionChords() / progressionRomans()", () => {
  it("resolves numerals to symbols and back", () => {
    const romans = ["ii7", "V7", "Imaj7"];
    const chords = progressionChords("Eb major", romans);
    expect(chords).toEqual(["Fm7", "Bb7", "Ebmaj7"]);
    expect(progressionRomans("Eb major", chords)).toEqual(romans);
  });

  it("keeps secondary functions through the round-trip", () => {
    const chords = progressionChords("C major", ["I", "V7/V", "V7", "I"]);
    expect(chords).toEqual(["C", "D7", "G7", "C"]);
    expect(progressionRomans("C major", chords)).toEqual(["I", "V7/V", "V7", "I"]);
  });

  it("passes N.C. through unchanged", () => {
    expect(progressionChords("C major", ["I", "N.C.", "V7"])).toEqual(["C", "N.C.", "G7"]);
  });
});

describe("COMMON_PROGRESSIONS", () => {
  it("resolves the classics correctly", () => {
    expect(progressionChords("C major", COMMON_PROGRESSIONS["ii-V-I"])).toEqual(["Dm7", "G7", "Cmaj7"]);
    expect(progressionChords("a minor", COMMON_PROGRESSIONS.andalusian)).toEqual(["Am", "G", "F", "E"]);
    expect(progressionChords("C major", COMMON_PROGRESSIONS.pop)).toEqual(["C", "G", "Am", "F"]);
    expect(COMMON_PROGRESSIONS["12-bar-blues"]).toHaveLength(12);
  });
});

describe("suggestNextChords() (audit defect #13 regression: real scoring)", () => {
  it("returns discriminating scores, not a uniform tie", () => {
    const suggestions = suggestNextChords("C major", ["ii7"]);
    const scores = new Set(suggestions.map((s) => s.score));
    expect(scores.size).toBeGreaterThan(1);
  });

  it("ranks V7 strictly first after ii7", () => {
    const [top, second] = suggestNextChords("C major", ["ii7"]);
    expect(top.symbol).toBe("G7");
    expect(top.score).toBeGreaterThan(second.score);
  });

  it("ranks the tonic first after V7, with the deceptive vi close behind", () => {
    const suggestions = suggestNextChords("C major", ["ii7", "V7"]);
    expect(suggestions[0].symbol).toBe("Cmaj7");
    const vi = suggestions.find((s) => s.symbol === "Am7");
    expect(vi).toBeDefined();
    expect(vi!.score).toBeGreaterThan(0.5);
  });

  it("resolves a pending applied dominant to its target", () => {
    const suggestions = suggestNextChords("C major", ["I", "A7"]);
    expect(["Dm7", "D7"]).toContain(suggestions[0].symbol);
    expect(suggestions.some((s) => s.symbol === "Dm7" && s.score > 0.7)).toBe(true);
  });

  it("suggests the tonic first for an empty progression", () => {
    expect(suggestNextChords("C major", [])[0].symbol).toBe("Cmaj7");
    expect(suggestNextChords("a minor", [])[0].symbol).toBe("Am7");
    expect(suggestNextChords("C major", "  ")[0].symbol).toBe("Cmaj7");
  });

  it("respects maxResults and annotates romans", () => {
    const suggestions = suggestNextChords("C major", ["ii7"], { maxResults: 3 });
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0].roman).toBe("V7");
  });
});
