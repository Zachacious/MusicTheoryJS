import { describe, expect, test } from "bun:test";
import { Note, sortNotes, sortNotesUnique, transposeFifths } from "./note";

describe("transposeFifths", () => {
  test("moves around the circle, keeping the circle's spelling", () => {
    expect(transposeFifths("C4", 0).toString()).toBe("C4");
    expect(transposeFifths("C4", 1).toString()).toBe("G4");
    expect(transposeFifths("C4", -1).toString()).toBe("F3");
    expect(transposeFifths("C4", 6).toString({ octave: false })).toBe("F#");
    expect(transposeFifths("C4", -6).toString({ octave: false })).toBe("Gb");
    expect(transposeFifths("C4", 12).toString({ octave: false })).toBe("B#");
  });

  test("the register climbs with the stack", () => {
    expect(transposeFifths("C4", 2).toString()).toBe("D5");
    expect(transposeFifths("C4", 3).toString()).toBe("A5");
    expect(transposeFifths("C4", -2).toString()).toBe("Bb2");
  });

  test("twelve fifths up is a sharp, twelve down a flat — never enharmonic", () => {
    expect(transposeFifths("C4", 12).letter).toBe("B");
    expect(transposeFifths("C4", -12).letter).toBe("D");
  });

  test("is reversible", () => {
    for (const n of [-6, -1, 0, 1, 5]) {
      const there = transposeFifths("C4", n);
      expect(transposeFifths(there, -n).toString()).toBe("C4");
    }
  });

  test("rejects a fractional count", () => {
    expect(() => transposeFifths("C4", 1.5)).toThrow(RangeError);
  });
});

describe("sortNotes", () => {
  test("orders by sounding pitch, across octaves", () => {
    expect(sortNotes(["G4", "C4", "E4"]).map(String)).toEqual([
      "C4",
      "E4",
      "G4",
    ]);
    expect(sortNotes(["C5", "C4", "C3"]).map(String)).toEqual([
      "C3",
      "C4",
      "C5",
    ]);
  });

  test("descends on request", () => {
    expect(sortNotes(["C4", "G4", "E4"], true).map(String)).toEqual([
      "G4",
      "E4",
      "C4",
    ]);
  });

  test("leaves the input untouched and accepts mixed forms", () => {
    const input = ["G4", "C4"];
    sortNotes(input);
    expect(input).toEqual(["G4", "C4"]);
    expect(sortNotes([Note.from("G4"), "C4"]).map(String)).toEqual([
      "C4",
      "G4",
    ]);
  });
});

describe("sortNotesUnique", () => {
  test("drops repeated spellings", () => {
    expect(sortNotesUnique(["G4", "C4", "G4"]).map(String)).toEqual([
      "C4",
      "G4",
    ]);
  });

  test("keeps enharmonics apart — they are different spellings", () => {
    expect(sortNotesUnique(["C#4", "Db4"])).toHaveLength(2);
  });

  test("treats different octaves as distinct", () => {
    expect(sortNotesUnique(["C4", "C5", "C4"]).map(String)).toEqual([
      "C4",
      "C5",
    ]);
  });

  test("descends on request", () => {
    expect(sortNotesUnique(["C4", "G4", "C4"], true).map(String)).toEqual([
      "G4",
      "C4",
    ]);
  });
});
