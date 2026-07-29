/**
 * Phase 1 ergonomics on notes: numeric/named transposition, frequency,
 * JSON round-trips, bulk transposition, and chromatic ranges.
 */
import { describe, expect, test } from "bun:test";
import { Note, note, transposeNotes } from "./note";
import { noteRange } from "./range";

describe("Note.transpose widened inputs", () => {
  test("accepts interval names", () => {
    expect(note("C4").transpose("P5").toString()).toBe("G4");
    expect(note("C4").transpose("-M2").toString()).toBe("Bb3");
    expect(note("G#4").transpose("M3").toString()).toBe("B#4");
  });

  test("accepts bare semitone counts with conventional spelling", () => {
    expect(note("C4").transpose(3).toString()).toBe("Eb4");
    expect(note("C4").transpose(4).toString()).toBe("E4");
    expect(note("C4").transpose(7).toString()).toBe("G4");
    expect(note("C4").transpose(-1).toString()).toBe("B3");
    expect(note("C4").transpose(12).toString()).toBe("C5");
    expect(note("A4").transpose(0).toString()).toBe("A4");
  });
});

describe("Note.frequency", () => {
  test("A4 is 440 and octaves double", () => {
    expect(note("A4").frequency).toBeCloseTo(440);
    expect(note("A5").frequency).toBeCloseTo(880);
    expect(note("A3").frequency).toBeCloseTo(220);
  });

  test("matches fromFrequency round-trip", () => {
    const c4 = note("C4");
    expect(Note.fromFrequency(c4.frequency).toString()).toBe("C4");
  });
});

describe("Note JSON round-trip", () => {
  test("toJSON/fromJSON preserve spelling", () => {
    const original = note("Fx5");
    const revived = Note.fromJSON(JSON.parse(JSON.stringify(original)));
    expect(revived.equals(original)).toBe(true);
  });

  test("fromJSON also accepts the raw JSON text", () => {
    expect(Note.fromJSON(JSON.stringify(note("C#4"))).toString()).toBe("C#4");
  });
});

describe("transposeNotes", () => {
  test("transposes a mixed list by a name", () => {
    const result = transposeNotes(["C4", "E4", "G4"], "M2");
    expect(result.map((n) => n.toString())).toEqual(["D4", "F#4", "A4"]);
  });

  test("transposes by semitones", () => {
    const result = transposeNotes(["C4", { step: 2 as const }], -12);
    expect(result.map((n) => n.toString())).toEqual(["C3", "E3"]);
  });
});

describe("noteRange", () => {
  test("ascending is inclusive and sharp-spelled by default", () => {
    expect(noteRange("C4", "E4").map((n) => n.toString())).toEqual([
      "C4",
      "C#4",
      "D4",
      "D#4",
      "E4",
    ]);
  });

  test("descending flips direction and prefers flats", () => {
    expect(noteRange("E4", "C4").map((n) => n.toString())).toEqual([
      "E4",
      "Eb4",
      "D4",
      "Db4",
      "C4",
    ]);
  });

  test("prefer overrides the default spelling", () => {
    expect(
      noteRange("C4", "D4", { prefer: "flat" }).map((n) => n.toString())
    ).toEqual(["C4", "Db4", "D4"]);
  });

  test("a single-note range is just the note", () => {
    expect(noteRange("G4", "G4").map((n) => n.toString())).toEqual(["G4"]);
  });

  test("crosses octave boundaries", () => {
    const run = noteRange("A3", "C4").map((n) => n.toString());
    expect(run).toEqual(["A3", "A#3", "B3", "C4"]);
  });
});
