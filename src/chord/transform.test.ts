import { describe, expect, test } from "bun:test";
import { Chord } from "./chord";
import {
  chromaticMediants,
  leadingToneExchange,
  negativeChord,
  negativeNote,
  neoRiemannian,
  parallelTriad,
  relativeTriad,
} from "./transform";

describe("Neo-Riemannian operations", () => {
  test("known mappings", () => {
    expect(parallelTriad("C").toString()).toBe("Cm");
    expect(relativeTriad("C").toString()).toBe("Am");
    expect(relativeTriad("Am").toString()).toBe("C");
    expect(leadingToneExchange("C").toString()).toBe("Em");
    expect(leadingToneExchange("Ab").toString()).toBe("Cm");
    expect(neoRiemannian("C", "PL").toString()).toBe("Ab");
    expect(neoRiemannian("C", "PLP").toString()).toBe("Abm");
    expect(neoRiemannian("C", "LP").toString()).toBe("E");
  });

  test("each operation is an involution, spelling and octave included", () => {
    const triads = ["C", "F#m", "Eb", "Bbm", "G#m", "Db", "Am"];
    for (const symbol of triads) {
      for (const op of [parallelTriad, relativeTriad, leadingToneExchange]) {
        const once = op(symbol);
        const twice = op(once);
        expect(twice.toString()).toBe(Chord.from(symbol).toString());
        expect(twice.root.octave).toBe(4);
      }
    }
  });

  test("spelling stays exact through operations", () => {
    // L of Cb major: root up a M3 = Eb, minor.
    expect(leadingToneExchange("Cb").toString()).toBe("Ebm");
    // R of F# major: root down a m3 = D#, minor (not Eb).
    expect(relativeTriad("F#").toString()).toBe("D#m");
  });

  test("non-triads are rejected", () => {
    expect(() => parallelTriad("C7")).toThrow(RangeError);
    expect(() => relativeTriad("Cdim")).toThrow(RangeError);
    expect(() => neoRiemannian("Csus4", "P")).toThrow(RangeError);
    expect(() => neoRiemannian("C", "PLX")).toThrow(SyntaxError);
  });
});

describe("chromatic mediants", () => {
  test("four same-mode mediants, correctly spelled", () => {
    expect(chromaticMediants("C").map(String)).toEqual(["E", "Eb", "A", "Ab"]);
    expect(chromaticMediants("Am").map(String)).toEqual([
      "C#m",
      "Cm",
      "F#m",
      "Fm",
    ]);
    expect(chromaticMediants("Eb").map(String)).toEqual(["G", "Gb", "C", "Cb"]);
  });
});

describe("negative harmony", () => {
  test("the classic C-axis table", () => {
    const pairs: ReadonlyArray<readonly [string, string]> = [
      ["C4", "G4"],
      ["D4", "F4"],
      ["E4", "Eb4"],
      ["B4", "Ab4"],
      ["A4", "Bb4"],
      ["F#4", "Db4"],
    ];
    for (const [from, to] of pairs) {
      expect(negativeNote(from, "C").toString()).toBe(to);
    }
  });

  test("reflection is a pitch-class involution", () => {
    for (const tonic of ["C", "E", "Bb", "F#"]) {
      for (let pc = 0; pc < 12; pc++) {
        const note = negativeNote(
          { step: 0, alteration: pc, octave: 4 },
          tonic
        );
        const back = negativeNote(note, tonic);
        expect(back.pitchClass).toBe(((pc % 12) + 12) % 12);
      }
    }
  });

  test("chord reflections match the literature", () => {
    expect(negativeChord("G7", "C").toString()).toBe("Fm6"); // V7 ↔ iv6
    expect(negativeChord("C", "C").toString()).toBe("Cm");
    expect(negativeChord("F", "C").toString()).toBe("Gm");
    expect(negativeChord("Am", "C").toString()).toBe("Eb"); // vi ↔ bIII
    expect(negativeChord("Em", "C").toString()).toBe("Ab"); // iii ↔ bVI
  });

  test("reflections with no chord reading throw", () => {
    const cluster = { root: "C4", intervals: ["P1", "m2", "M2"] };
    expect(() => negativeChord(cluster, "C")).toThrow(RangeError);
  });
});
