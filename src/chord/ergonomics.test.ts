/**
 * Phase 1 ergonomics on chords: ChordLike inputs, semitone templates,
 * transposition, JSON round-trips, free functions, and widened voicings.
 */
import { describe, expect, test } from "bun:test";
import { Chord, chord, chordNoteNames, chordNotes, invertChord } from "./chord";
import { closeVoicing, drop2 } from "./voicing";

describe("Chord.from widened inputs", () => {
  test("symbols still parse", () => {
    expect(Chord.from("Cmaj7").noteNames()).toEqual(["C4", "E4", "G4", "B4"]);
  });

  test("spec qualities accept symbol-suffix aliases", () => {
    expect(Chord.from({ root: "D4", quality: "m7" }).quality).toBe("min7");
    expect(Chord.from({ root: "C4", quality: "Δ7" }).quality).toBe("maj7");
    expect(Chord.from({ root: "C4", quality: "-7" }).quality).toBe("min7");
  });

  test("accepts a {root, quality} spec", () => {
    const c = Chord.from({ root: "D4", quality: "min7" });
    expect(c.noteNames()).toEqual(["D4", "F4", "A4", "C5"]);
    expect(c.quality).toBe("min7");
  });

  test("accepts a {root, intervals} spec with named intervals", () => {
    const c = Chord.from({ root: "C4", intervals: ["P1", "M3", "P5", "M7"] });
    expect(c.noteNames()).toEqual(["C4", "E4", "G4", "B4"]);
    expect(c.quality).toBeUndefined();
  });

  test("passes an existing Chord through unchanged", () => {
    const c = Chord.from("F#m");
    expect(Chord.from(c)).toBe(c);
  });

  test("rejects a spec with neither intervals nor a known quality", () => {
    expect(() => Chord.from({ root: "C4", quality: "nonsense" })).toThrow(
      RangeError
    );
  });
});

describe("Chord.fromSemitones", () => {
  test("recognises known qualities", () => {
    expect(Chord.fromSemitones("C4", [0, 4, 7]).quality).toBe("maj");
    expect(Chord.fromSemitones("A3", [0, 3, 7, 10]).quality).toBe("min7");
  });

  test("dim7 takes the canonical diminished-seventh spelling", () => {
    const c = Chord.fromSemitones("C4", [0, 3, 6, 9]);
    expect(c.quality).toBe("dim7");
    expect(c.noteNames()).toEqual(["C4", "Eb4", "Gb4", "Bbb4"]);
  });

  test("octave doublings are kept, not collapsed to the reduced quality", () => {
    const c = Chord.fromSemitones("C4", [0, 4, 7, 12]);
    expect(c.quality).toBeUndefined();
    expect(c.noteNames()).toEqual(["C4", "E4", "G4", "C5"]);
  });

  test("unknown sets fall back to conventional spelling, no quality", () => {
    const c = Chord.fromSemitones("C4", [0, 1, 2]);
    expect(c.quality).toBeUndefined();
    expect(c.noteNames()).toEqual(["C4", "Db4", "D4"]);
  });
});

describe("Chord.transpose", () => {
  test("moves the root and keeps quality", () => {
    const c = Chord.from("Cmaj7").transpose("M2");
    expect(c.toString()).toBe("Dmaj7");
  });

  test("accepts semitone counts", () => {
    expect(Chord.from("Am").transpose(3).toString()).toBe("Cm");
  });
});

describe("Chord JSON round-trip", () => {
  test("canonical chords revive with quality", () => {
    const original = Chord.from("Bbm7");
    const revived = Chord.fromJSON(JSON.stringify(original));
    expect(revived.equals(original)).toBe(true);
    expect(revived.quality).toBe("min7");
  });

  test("inverted (custom) chords revive exactly", () => {
    const original = Chord.from("C").invert();
    const revived = Chord.fromJSON(JSON.stringify(original));
    expect(revived.equals(original)).toBe(true);
    expect(revived.quality).toBeUndefined();
  });
});

describe("free functions", () => {
  test("mirror the class methods over ChordLike", () => {
    expect(chordNoteNames("G7")).toEqual(["G4", "B4", "D5", "F5"]);
    expect(chordNotes({ root: "C4", quality: "min" })[1]?.toString()).toBe(
      "Eb4"
    );
    expect(chord("E7").quality).toBe("dom7");
  });

  test("invertChord applies repeated inversions", () => {
    expect(invertChord("C", 1).noteNames()).toEqual(["E4", "G4", "C5"]);
    expect(invertChord("C", 2).noteNames()).toEqual(["G4", "C5", "E5"]);
  });
});

describe("voicings accept ChordLike", () => {
  test("symbols work directly", () => {
    expect(closeVoicing("C").map(String)).toEqual(["C4", "E4", "G4"]);
    expect(drop2("Cmaj7").map(String)).toEqual(["G3", "C4", "E4", "B4"]);
  });

  test("specs work directly", () => {
    expect(closeVoicing({ root: "A3", quality: "min" }).map(String)).toEqual([
      "A3",
      "C4",
      "E4",
    ]);
  });
});
