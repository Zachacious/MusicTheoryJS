import { describe, expect, it } from "vitest";

import { interval, tryInterval } from "../../src/core";
import { chromaFromIntervals } from "../../src/pcset";
import {
  CHORD_TYPES,
  SCALE_TYPES,
  detectChords,
  detectScales,
  getChordType,
  getScaleType,
} from "../../src/dict";

describe("dictionaries", () => {
  it("has substantial coverage", () => {
    expect(CHORD_TYPES.length).toBeGreaterThanOrEqual(100);
    expect(SCALE_TYPES.length).toBeGreaterThanOrEqual(85);
  });

  it("every entry is internally consistent", () => {
    for (const entry of [...CHORD_TYPES, ...SCALE_TYPES]) {
      expect(entry.intervals[0]).toBe("P1");
      expect(entry.intervals.every((i) => tryInterval(i) !== null)).toBe(true);
      expect(chromaFromIntervals(entry.intervals)).toBe(entry.chroma);
      expect((entry.chroma & 1) !== 0).toBe(true); // root always present
      expect(interval(entry.intervals[0]).semitones).toBe(0);
    }
    // Chord symbols are built from the display alias; every entry needs one.
    for (const entry of CHORD_TYPES) {
      expect(entry.aliases.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("is deeply frozen — shared dictionary state cannot be corrupted", () => {
    expect(Object.isFrozen(CHORD_TYPES)).toBe(true);
    expect(Object.isFrozen(SCALE_TYPES)).toBe(true);
    for (const entry of [...CHORD_TYPES, ...SCALE_TYPES]) {
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.aliases)).toBe(true);
      expect(Object.isFrozen(entry.intervals)).toBe(true);
    }
  });

  it("looks up chord types by name and alias", () => {
    expect(getChordType("maj7")?.name).toBe("major seventh");
    expect(getChordType("major seventh")?.intervals).toEqual(["P1", "M3", "P5", "M7"]);
    expect(getChordType("m7b5")?.name).toBe("half-diminished");
    expect(getChordType("nope")).toBeNull();
    expect(getChordType("")).toBeNull();
  });

  it("looks up scale types by name and alias", () => {
    expect(getScaleType("ionian")?.name).toBe("major");
    expect(getScaleType("major")?.chroma).toBe(2741);
    expect(getScaleType("aeolian")?.name).toBe("minor");
    expect(getScaleType("dorian")?.intervals).toEqual([
      "P1", "M2", "m3", "P4", "P5", "M6", "m7",
    ]);
    expect(getScaleType("nope")).toBeNull();
  });
});

describe("detectScales — discriminating ranked scores (Phase 2 acceptance)", () => {
  const C_MAJOR = ["C", "D", "E", "F", "G", "A", "B"];
  const A_MINOR = ["A", "B", "C", "D", "E", "F", "G"];

  it("ranks C major strictly first for a C major input", () => {
    const results = detectScales(C_MAJOR);
    expect(results[0]).toMatchObject({ tonic: "C", type: "major", score: 1, exact: true });
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("ranks A minor first — not A major — for an A natural minor input", () => {
    const results = detectScales(A_MINOR);
    expect(results[0]).toMatchObject({ tonic: "A", type: "minor", score: 1, exact: true });
    expect(
      results.find((r) => r.tonic === "A" && r.type === "major")
    ).toBeUndefined(); // A major scores 0.4, below the cutoff
  });

  it("detects pentatonic scales exactly", () => {
    const results = detectScales(["C", "D", "E", "G", "A"]);
    expect(results[0]).toMatchObject({ tonic: "C", type: "major pentatonic", score: 1 });
  });

  it("honors an explicit tonic", () => {
    const results = detectScales(C_MAJOR, { tonic: "D" });
    expect(results[0]).toMatchObject({ tonic: "D", type: "dorian", score: 1 });
  });

  it("supports minScore and maxResults options", () => {
    expect(detectScales(C_MAJOR, { maxResults: 3 })).toHaveLength(3);
    const strict = detectScales(C_MAJOR, { minScore: 1 });
    expect(strict.length).toBeGreaterThan(0);
    expect(strict.every((r) => r.score === 1)).toBe(true);
  });

  it("validates minScore and maxResults", () => {
    expect(() => detectScales(C_MAJOR, { maxResults: -1 })).toThrow();
    expect(() => detectScales(C_MAJOR, { maxResults: 1.5 })).toThrow();
    expect(() => detectScales(C_MAJOR, { minScore: NaN })).toThrow();
    expect(detectScales(C_MAJOR, { maxResults: 0 })).toEqual([]);
  });

  it("throws on empty input", () => {
    expect(() => detectScales([])).toThrow();
  });
});

describe("detectChords — ranked with inversions and partials", () => {
  it("detects basic qualities in root position", () => {
    expect(detectChords(["C", "E", "G"])[0].symbol).toBe("C");
    expect(detectChords(["C", "Eb", "G", "Bb"])[0].symbol).toBe("Cm7");
    expect(detectChords(["C", "E", "G", "B"])[0].symbol).toBe("Cmaj7");
    expect(detectChords(["G", "B", "D", "F"])[0].symbol).toBe("G7");
  });

  it("prefers the bass-rooted reading but keeps alternatives", () => {
    const results = detectChords(["C", "E", "G", "A"]);
    expect(results[0].symbol).toBe("C6");
    expect(results.map((r) => r.symbol)).toContain("Am7/C");
  });

  it("uses the lowest note as bass when octaves are given", () => {
    const results = detectChords(["E3", "G3", "C4"]);
    expect(results[0].symbol).toBe("C/E");
    expect(results[0].bass).toBe("E");
  });

  it("finds the bass regardless of input order", () => {
    const results = detectChords(["C4", "G3", "E3"]);
    expect(results[0].symbol).toBe("C/E");
  });

  it("keeps the input's spelling for the tonic", () => {
    expect(detectChords(["Eb", "G", "Bb"])[0].symbol).toBe("Eb");
    expect(detectChords(["D#", "F##", "A#"])[0].symbol).toBe("D#");
  });

  it("handles omitted fifths as partial matches", () => {
    const results = detectChords(["C", "E", "B"]);
    expect(results[0].tonic).toBe("C");
    expect(results[0].type).toBe("major seventh");
    expect(results[0].score).toBeLessThan(1);
    expect(results[0].exact).toBe(false);
  });

  it("reports exact matches via the exact flag, independent of score", () => {
    const dim7 = detectChords(["C", "Eb", "Gb", "A"])[0];
    expect(dim7.symbol).toBe("Cdim7");
    expect(dim7.exact).toBe(true);
    expect(dim7.score).toBeCloseTo(0.93, 5); // fifth-less types are down-weighted
    expect(detectChords(["C", "E", "G"])[0].exact).toBe(true);
  });

  it("breaks same-chroma ties by alias count (commonness proxy)", () => {
    // C-E-G#-B matches both "major seventh flat sixth" and "augmented
    // seventh" (identical chromas); the common maj7#5 reading must win.
    expect(detectChords(["C", "E", "G#", "B"])[0].symbol).toBe("Cmaj7#5");
  });

  it("validates maxResults", () => {
    expect(() => detectChords(["C", "E", "G"], { maxResults: -1 })).toThrow();
    expect(detectChords(["C", "E", "G"], { maxResults: 0 })).toEqual([]);
  });

  it("returns [] for fewer than two distinct pitch classes and throws on empty", () => {
    expect(detectChords(["C4", "C5"])).toEqual([]);
    expect(() => detectChords([])).toThrow();
  });
});
