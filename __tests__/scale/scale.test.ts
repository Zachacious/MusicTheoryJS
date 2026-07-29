import { describe, expect, it } from "vitest";

import { MusicTheoryError } from "../../src/core";
import {
  mode,
  modes,
  scale,
  scaleBrightness,
  scaleChords,
  scaleNotes,
  tryScale,
} from "../../src/scale";

describe("scale()", () => {
  it("spells every degree exactly (Cb major, the classic trap)", () => {
    expect(scale("Cb major").notes).toEqual(["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"]);
    expect(scale("C# harmonic minor").notes).toEqual(["C#", "D#", "E", "F#", "G#", "A", "B#"]);
    expect(scale("F# major").notes).toEqual(["F#", "G#", "A#", "B", "C#", "D#", "E#"]);
    expect(scale("Bb dorian").notes).toEqual(["Bb", "C", "Db", "Eb", "F", "G", "Ab"]);
  });

  it("accepts tonic + type, aliases, and case-insensitive tonics", () => {
    expect(scale("Eb", "melodic minor").name).toBe("Eb melodic minor");
    expect(scale("C ionian").type).toBe("major");
    expect(scale("bb minor").tonic).toBe("Bb");
  });

  it("is frozen and round-trips through scale()", () => {
    const s = scale("D dorian");
    expect(Object.isFrozen(s)).toBe(true);
    expect(scale(s).name).toBe("D dorian");
  });

  it("throws with suggestions; tryScale returns null", () => {
    expect(() => scale("C majr")).toThrow('did you mean "major"?');
    expect(() => scale("C")).toThrow(MusicTheoryError);
    expect(tryScale("Q major")).toBeNull();
  });
});

describe("modes (audit defect #1 regression: no mode ever throws)", () => {
  it("names the modes of the major scale", () => {
    expect(modes("C major").map((m) => m.name)).toEqual([
      "C major", "D dorian", "E phrygian", "F lydian",
      "G mixolydian", "A minor", "B locrian",
    ]);
  });

  it("reuses the parent's spelled notes", () => {
    expect(mode("C major", 2).notes).toEqual(["D", "E", "F", "G", "A", "B", "C"]);
    expect(mode("Eb major", 7).notes).toEqual(["D", "Eb", "F", "G", "Ab", "Bb", "C"]);
  });

  it("works for every degree of every major key", () => {
    const tonics = ["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];
    for (const tonic of tonics) {
      const s = scale(tonic, "major");
      for (let d = 1; d <= 7; d++) {
        const m = mode(s, d);
        expect(m.notes).toHaveLength(7);
        expect(m.tonic).toBe(s.notes[d - 1]);
        expect(m.type).not.toBe("");
      }
    }
  });

  it("names melodic-minor modes from the dictionary", () => {
    expect(modes("C melodic minor").map((m) => m.type)).toEqual([
      "melodic minor", "dorian b2", "lydian augmented", "lydian dominant",
      "mixolydian b6", "locrian #2", "altered",
    ]);
  });

  it("handles non-heptatonic modes (naming them when the dictionary can)", () => {
    const m = mode("C major pentatonic", 2);
    expect(m.notes).toEqual(["D", "E", "G", "A", "C"]);
    expect(m.type).toBe("egyptian");
    expect(mode("C hirajoshi", 2).type).toBe("iwato");
  });

  it("rejects out-of-range degrees", () => {
    expect(() => mode("C major", 0)).toThrow(MusicTheoryError);
    expect(() => mode("C major", 8)).toThrow(MusicTheoryError);
  });
});

describe("scaleChords()", () => {
  it("harmonizes major in triads and sevenths", () => {
    expect(scaleChords("C major", 3)).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    expect(scaleChords("C major", 4)).toEqual(["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"]);
  });

  it("harmonizes harmonic minor sevenths", () => {
    expect(scaleChords("C harmonic minor", 4)).toEqual([
      "CmM7", "Dm7b5", "Ebmaj7#5", "Fm7", "G7", "Abmaj7", "Bdim7",
    ]);
  });
});

describe("scaleNotes()", () => {
  it("realizes octaves ascending from the tonic", () => {
    expect(scaleNotes("F# major", 3)).toEqual(["F#3", "G#3", "A#3", "B3", "C#4", "D#4", "E#4"]);
    expect(scaleNotes("C major")).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
  });
});

describe("scaleBrightness (audit defect #2 regression)", () => {
  it("orders the church modes lydian → locrian, strictly", () => {
    const order = ["C lydian", "C major", "C mixolydian", "C dorian", "C minor", "C phrygian", "C locrian"];
    const values = order.map(scaleBrightness);
    for (let i = 1; i < values.length; i++) {
      expect(values[i], `${order[i]} must be darker than ${order[i - 1]}`).toBeLessThan(values[i - 1]);
    }
  });

  it("never reports minor scales brighter than major (the inverted-scoring bug)", () => {
    expect(scaleBrightness("C minor")).toBeLessThan(scaleBrightness("C major"));
    expect(scaleBrightness("C phrygian")).toBeLessThan(scaleBrightness("C major"));
    expect(scaleBrightness("C locrian")).toBeLessThan(scaleBrightness("C minor"));
  });
});
