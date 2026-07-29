import { describe, expect, test } from "bun:test";
import {
  COMMON_PROGRESSIONS,
  parseProgression,
  progressionChords,
  progressionRomans,
  suggestNextChords,
} from "./progression";

describe("parseProgression", () => {
  test("mixes numerals, symbols, and N.C. in one input", () => {
    const steps = parseProgression("C major", "ii7 G7 N.C. Cmaj7");
    expect(steps.map((s) => s.chord?.toString() ?? null)).toEqual([
      "Dm7",
      "G7",
      null,
      "Cmaj7",
    ]);
    expect(steps.map((s) => s.roman?.symbol ?? null)).toEqual([
      "ii7",
      "V7",
      null,
      "Imaj7",
    ]);
    expect(steps.map((s) => s.function)).toEqual(["SD", "D", "", "T"]);
  });

  test("accepts bars and commas as separators, and arrays", () => {
    expect(
      parseProgression("C major", "Dm7 | G7, Cmaj7").map((s) => s.input)
    ).toEqual(["Dm7", "G7", "Cmaj7"]);
    expect(parseProgression("C major", ["I", "V"]).length).toBe(2);
    expect(parseProgression("C major", "")).toEqual([]);
  });

  test("chart-style minor symbols with dashes survive (no dash splitting)", () => {
    const steps = parseProgression("C major", "D-7 G7");
    expect(steps[0]?.chord?.toString()).toBe("Dm7");
  });

  test("applied dominants get function D", () => {
    const steps = parseProgression("C major", "C A7 Dm7 G7");
    expect(steps.map((s) => s.roman?.symbol)).toEqual([
      "I",
      "V7/ii",
      "ii7",
      "V7",
    ]);
    expect(steps[1]?.function).toBe("D");
  });

  test("minor keys label harmonic-minor chords through their variant", () => {
    const steps = parseProgression("A minor", "Am E7 G#dim");
    expect(steps.map((s) => s.function)).toEqual(["T", "D", "D"]);
  });

  test("rejects junk tokens", () => {
    expect(() => parseProgression("C major", "I wat V")).toThrow(SyntaxError);
  });
});

describe("named progressions", () => {
  test("the library resolves in any key", () => {
    expect(progressionChords("C major", "12-bar-blues").slice(0, 4)).toEqual([
      "C7",
      "F7",
      "C7",
      "C7",
    ]);
    // Scale-relative numerals: in minor the subtonic is VII, so the
    // andalusian entry resolves without accidentals.
    expect(
      progressionChords("A minor", COMMON_PROGRESSIONS.andalusian ?? [])
    ).toEqual(["Am", "G", "F", "E"]);
    expect(progressionChords("G major", "pop")).toEqual(["G", "D", "Em", "C"]);
  });

  test("names work everywhere a progression is accepted", () => {
    expect(
      parseProgression("G major", "pop").map((s) => s.chord?.toString())
    ).toEqual(["G", "D", "Em", "C"]);
    expect(progressionRomans("C major", "12-bar-blues").slice(0, 4)).toEqual([
      "I7",
      "IV7",
      "I7",
      "I7",
    ]);
    expect(suggestNextChords("C major", "ii-V-I").length).toBeGreaterThan(0);
    // Object.prototype members are not progression names.
    expect(() => parseProgression("C major", "constructor")).toThrow(
      SyntaxError
    );
  });

  test("every named progression parses in C major and C minor", () => {
    for (const [name, romans] of Object.entries(COMMON_PROGRESSIONS)) {
      const key =
        name.startsWith("minor") || name === "andalusian"
          ? "C minor"
          : "C major";
      expect(parseProgression(key, romans).length).toBe(romans.length);
    }
  });
});

describe("progressionRomans", () => {
  test("labels chart symbols", () => {
    expect(
      progressionRomans("Eb major", ["Fm7", "Bb7", "Ebmaj7", "C7"])
    ).toEqual(["ii7", "V7", "Imaj7", "V7/ii"]);
  });
});

describe("suggestNextChords", () => {
  test("after ii, the V7 ranks strictly first", () => {
    const next = suggestNextChords("C major", ["Dm7"]);
    expect(next[0]?.chord.toString()).toBe("G7");
    expect((next[0]?.score ?? 0) > (next[1]?.score ?? 0)).toBe(true);
  });

  test("a pending applied dominant resolves to its target", () => {
    const next = suggestNextChords("C major", ["C", "A7"]);
    expect(next[0]?.chord.toString()).toBe("Dm7");
  });

  test("empty progressions lead with the tonic", () => {
    expect(suggestNextChords("Eb major", [])[0]?.chord.toString()).toBe(
      "Ebmaj7"
    );
    expect(suggestNextChords("A minor", "")[0]?.chord.toString()).toBe("Am7");
  });

  test("maxResults caps and validates", () => {
    expect(
      suggestNextChords("C major", ["Dm7"], { maxResults: 2 }).length
    ).toBe(2);
    expect(() =>
      suggestNextChords("C major", ["Dm7"], { maxResults: -1 })
    ).toThrow(RangeError);
  });

  test("minor keys include harmonic-minor colours in the pool", () => {
    const symbols = suggestNextChords("A minor", ["Bm7b5"], {
      maxResults: 24,
    }).map((s) => s.chord.toString());
    expect(symbols).toContain("E7"); // harmonic minor's V7
  });
});
