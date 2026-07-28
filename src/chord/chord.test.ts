import { describe, expect, test } from "bun:test";
import { Chord, chord } from "./chord";
import { parseChordSymbol, tryParseChordSymbol } from "./parse";

describe("chord symbol parsing", () => {
  test("maps aliases to canonical qualities", () => {
    expect(parseChordSymbol("C").quality).toBe("maj");
    expect(parseChordSymbol("Cm").quality).toBe("min");
    expect(parseChordSymbol("Cmin7").quality).toBe("min7");
    expect(parseChordSymbol("CM7").quality).toBe("maj7");
    expect(parseChordSymbol("C7").quality).toBe("dom7");
    expect(parseChordSymbol("Cm7b5").quality).toBe("min7b5");
  });

  test("parses accidental roots", () => {
    expect(parseChordSymbol("F#m").root).toEqual({
      step: 3,
      alteration: 1,
      octave: 4,
    });
    expect(parseChordSymbol("Bb7").root.step).toBe(6);
  });

  test("tryParse returns null for garbage", () => {
    expect(tryParseChordSymbol("Hqux")).toBeNull();
    expect(tryParseChordSymbol("Cwut")).toBeNull();
  });
});

describe("chord tones spell correctly", () => {
  test("C major triad", () => {
    expect(chord("C").noteNames()).toEqual(["C4", "E4", "G4"]);
  });

  test("C minor triad uses Eb, not D#", () => {
    expect(chord("Cm").noteNames()).toEqual(["C4", "Eb4", "G4"]);
  });

  test("Cmaj7", () => {
    expect(chord("Cmaj7").noteNames()).toEqual(["C4", "E4", "G4", "B4"]);
  });

  test("G7", () => {
    expect(chord("G7").noteNames()).toEqual(["G4", "B4", "D5", "F5"]);
  });

  test("Bdim7 spells the diminished seventh", () => {
    expect(chord("Bdim7").noteNames()).toEqual(["B4", "D5", "F5", "Ab5"]);
  });

  test("F#m7b5", () => {
    expect(chord("F#m7b5").noteNames()).toEqual(["F#4", "A4", "C5", "E5"]);
  });
});

describe("quality detection", () => {
  test("major vs minor", () => {
    expect(chord("C").isMajor()).toBe(true);
    expect(chord("C").isMinor()).toBe(false);
    expect(chord("Cm").isMinor()).toBe(true);
  });

  test("diminished and augmented", () => {
    expect(chord("Cdim").isDiminished()).toBe(true);
    expect(chord("Caug").isAugmented()).toBe(true);
    expect(chord("C").isDiminished()).toBe(false);
  });
});

describe("inversion", () => {
  test("first inversion moves the root up an octave", () => {
    const c = chord("C"); // C4 E4 G4
    const inv = c.invert();
    expect(inv.noteNames()).toEqual(["E4", "G4", "C5"]);
  });

  test("inversion is immutable", () => {
    const c = chord("C");
    c.invert();
    expect(c.noteNames()).toEqual(["C4", "E4", "G4"]);
  });
});

describe("construction and formatting", () => {
  test("Chord.of builds from root + quality", () => {
    expect(Chord.of("D4", "min7").noteNames()).toEqual([
      "D4",
      "F4",
      "A4",
      "C5",
    ]);
  });

  test("toString round-trips known qualities", () => {
    expect(chord("Cmaj7").toString()).toBe("Cmaj7");
    expect(chord("Cm").toString()).toBe("Cm");
    expect(chord("F#m7b5").toString()).toBe("F#m7b5");
  });

  test("inverted chords render as note names", () => {
    expect(chord("C").invert().toString()).toBe("E4,G4,C5");
  });

  test("equals compares root and intervals", () => {
    expect(chord("Cmaj7").equals(Chord.of("C4", "maj7"))).toBe(true);
    expect(chord("Cmaj7").equals(chord("Cm7"))).toBe(false);
  });
});
