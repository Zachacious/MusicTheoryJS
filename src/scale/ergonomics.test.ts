/**
 * Phase 1 ergonomics on scales: ScaleLike inputs, semitone templates,
 * diatonic stepping, transposition, JSON round-trips, and scale ranges.
 */
import { describe, expect, test } from "bun:test";
import { note } from "../note/note";
import { mode } from "./modes";
import { scaleRange } from "./range";
import {
  Scale,
  scale,
  scaleContains,
  scaleDegree,
  scaleNoteNames,
  scaleNotes,
  scaleStep,
} from "./scale";

describe("Scale.from widened inputs", () => {
  test("two-argument form still works", () => {
    expect(Scale.from("D4", "dorian").noteNames()).toEqual([
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
      "C5",
    ]);
  });

  test("parses a string form", () => {
    expect(Scale.from("C4 major").noteNames()).toEqual([
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
    ]);
    expect(Scale.from("C harmonicMinor").name).toBe("harmonicMinor");
  });

  test("accepts a spec object with a template name", () => {
    const s = Scale.from({ tonic: "E4", name: "phrygian" });
    expect(s.noteNames()[1]).toBe("F4");
  });

  test("accepts a spec object with named intervals", () => {
    const s = Scale.from({ tonic: "C4", intervals: ["P1", "M2", "M3"] });
    expect(s.noteNames()).toEqual(["C4", "D4", "E4"]);
  });

  test("passes an existing Scale through unchanged", () => {
    const s = Scale.from("C4", "major");
    expect(Scale.from(s)).toBe(s);
  });

  test("rejects nonsense strings", () => {
    expect(() => Scale.from("C4 nonsense")).toThrow(SyntaxError);
    expect(() => Scale.from("notanote major")).toThrow(SyntaxError);
  });
});

describe("Scale.fromSemitones", () => {
  test("spells the major scale conventionally", () => {
    const s = Scale.fromSemitones("C4", [0, 2, 4, 5, 7, 9, 11]);
    expect(s.noteNames()).toEqual(["C4", "D4", "E4", "F4", "G4", "A4", "B4"]);
  });

  test("the tritone follows the preference", () => {
    expect(Scale.fromSemitones("C4", [0, 6]).noteNames()).toEqual([
      "C4",
      "F#4",
    ]);
    expect(
      Scale.fromSemitones("C4", [0, 6], { prefer: "flat" }).noteNames()
    ).toEqual(["C4", "Gb4"]);
  });
});

describe("diatonic stepping", () => {
  const cMajor = Scale.from("C4", "major");

  test("steps up and down within the scale", () => {
    expect(cMajor.step("E5", 2).toString()).toBe("G5");
    expect(cMajor.step("C4", -1).toString()).toBe("B3");
    expect(cMajor.step("B4", 1).toString()).toBe("C5");
  });

  test("zero steps returns the note itself", () => {
    expect(cMajor.step("F3", 0).toString()).toBe("F3");
  });

  test("degreeOf finds the degree, octave-agnostic", () => {
    expect(cMajor.degreeOf("G7")).toBe(5);
    expect(cMajor.degreeOf("F#4")).toBeNull();
  });

  test("stepping a non-member throws", () => {
    expect(() => cMajor.step("F#4", 1)).toThrow(RangeError);
  });
});

describe("Scale.transpose", () => {
  test("moves the tonic and keeps the template", () => {
    const s = Scale.from("C4", "major").transpose("P4");
    expect(s.noteNames()[0]).toBe("F4");
    expect(s.noteNames()[3]).toBe("Bb4");
    expect(s.name).toBe("major");
  });

  test("accepts semitone counts", () => {
    expect(Scale.from("C4", "minor").transpose(2).tonic.toString()).toBe("D4");
  });
});

describe("Scale JSON round-trip", () => {
  test("template scales revive with their name", () => {
    const original = Scale.from("Eb4", "mixolydian");
    const revived = Scale.fromJSON(JSON.stringify(original));
    expect(revived.noteNames()).toEqual(original.noteNames());
    expect(revived.name).toBe("mixolydian");
  });

  test("custom-interval scales revive exactly", () => {
    const original = Scale.from({
      tonic: "C4",
      intervals: ["P1", "m3", "d5"],
      name: "custom-dim",
    });
    const revived = Scale.fromJSON(JSON.stringify(original));
    expect(revived.noteNames()).toEqual(["C4", "Eb4", "Gb4"]);
    expect(revived.name).toBe("custom-dim");
  });
});

describe("free functions", () => {
  test("mirror the class methods over ScaleLike", () => {
    expect(scaleNoteNames("C4 major")[0]).toBe("C4");
    expect(scaleNotes({ tonic: "A4", name: "minor" })[2]?.toString()).toBe(
      "C5"
    );
    expect(scaleDegree("C4 major", 8).toString()).toBe("C5");
    expect(scaleContains("C4 major", "F#4")).toBe(false);
    expect(scaleStep("C4 major", "E4", 2).toString()).toBe("G4");
    expect(scale("D4", "dorian").name).toBe("dorian");
  });

  test("mode accepts ScaleLike", () => {
    expect(mode("C4 major", 2).noteNames()[0]).toBe("D4");
  });
});

describe("scaleRange", () => {
  test("walks scale tones between two pitches", () => {
    expect(scaleRange("C4 major", "C4", "C5").map(String)).toEqual([
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
      "C5",
    ]);
  });

  test("bounds need not be scale members", () => {
    expect(scaleRange("C4 major", "C#4", "F#4").map(String)).toEqual([
      "D4",
      "E4",
      "F4",
    ]);
  });

  test("descends when from is higher", () => {
    expect(scaleRange("C4 major", "E4", "B3").map(String)).toEqual([
      "E4",
      "D4",
      "C4",
      "B3",
    ]);
  });

  test("spans octaves below and above the tonic", () => {
    const run = scaleRange("C4 minorPentatonic", "C3", "C5");
    expect(run[0]?.toString()).toBe("C3");
    expect(run[run.length - 1]?.toString()).toBe("C5");
    expect(run).toHaveLength(11);
  });
});
