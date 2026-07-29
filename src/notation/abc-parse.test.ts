import { describe, expect, test } from "bun:test";
import { Scale } from "../scale/scale";
import { toABC } from "./abc";
import { abcToNote, fromABC, noteToABC, tokenizeABC } from "./abc-parse";

describe("tokenizeABC", () => {
  test("splits accidental, letter, and octave marks", () => {
    expect(tokenizeABC("^F")).toEqual({
      accidental: "^",
      letter: "F",
      octave: "",
    });
    expect(tokenizeABC("__B,,")).toEqual({
      accidental: "__",
      letter: "B",
      octave: ",,",
    });
    expect(tokenizeABC("c'")).toEqual({
      accidental: "",
      letter: "c",
      octave: "'",
    });
  });

  test("rejects non-pitches", () => {
    expect(tokenizeABC("x")).toBeNull();
    expect(tokenizeABC("z")).toBeNull();
    expect(tokenizeABC("")).toBeNull();
  });
});

describe("abcToNote", () => {
  test("reads case and octave marks as register", () => {
    expect(abcToNote("C").toString()).toBe("C4");
    expect(abcToNote("c").toString()).toBe("C5");
    expect(abcToNote("C,").toString()).toBe("C3");
    expect(abcToNote("C,,").toString()).toBe("C2");
    expect(abcToNote("c'").toString()).toBe("C6");
  });

  test("reads accidentals, including doubles and naturals", () => {
    expect(abcToNote("^F").toString()).toBe("F#4");
    expect(abcToNote("_B").toString()).toBe("Bb4");
    expect(abcToNote("^^F").toString()).toBe("F##4");
    expect(abcToNote("__B").toString()).toBe("Bbb4");
    // An explicit natural overrides the supplied signature.
    expect(abcToNote("=F", { F: 1 }).toString()).toBe("F4");
  });

  test("falls back to the key signature when no accidental is written", () => {
    expect(abcToNote("F", { F: 1 }).toString()).toBe("F#4");
    expect(abcToNote("F").toString()).toBe("F4");
  });

  test("rejects invalid input", () => {
    expect(() => abcToNote("H")).toThrow(SyntaxError);
  });
});

describe("noteToABC", () => {
  test("writes register and accidental", () => {
    expect(noteToABC("C4")).toBe("C");
    expect(noteToABC("C5")).toBe("c");
    expect(noteToABC("C3")).toBe("C,");
    expect(noteToABC("F#4")).toBe("^F");
    expect(noteToABC("Bb5")).toBe("_b");
  });

  test("round-trips every pitch it can write", () => {
    for (const name of ["C4", "F#4", "Bb3", "G5", "A2", "Ebb4", "C##6"]) {
      expect(abcToNote(noteToABC(name)).toString()).toBe(name);
    }
  });
});

describe("fromABC", () => {
  test("reads header fields and notes", () => {
    const tune = fromABC("X:1\nT:Scale\nM:4/4\nK:D\nD2 E2 F2 G2 |]");
    expect(tune.title).toBe("Scale");
    expect(tune.meter).toBe("4/4");
    expect(tune.key).toBe("D");
    // F is sharp by key signature.
    expect(tune.notes.map(String)).toEqual(["D4", "E4", "F#4", "G4"]);
  });

  test("accidentals persist to the end of their measure only", () => {
    const tune = fromABC("K:C\n^F F | F |]");
    expect(tune.notes.map(String)).toEqual(["F#4", "F#4", "F4"]);
  });

  test("collects chord tones and skips rests", () => {
    expect(fromABC("K:C\n[CEG]4 |]").notes.map(String)).toEqual([
      "C4",
      "E4",
      "G4",
    ]);
    expect(fromABC("K:C\nz4 C2 |]").notes.map(String)).toEqual(["C4"]);
  });

  test("skips chord symbols and decorations rather than reading them as notes", () => {
    // The quoted "Am" must not contribute an A and an m.
    expect(fromABC('K:C\n"Am" C2 D2 |]').notes.map(String)).toEqual([
      "C4",
      "D4",
    ]);
    expect(fromABC("K:C\n!trill! C2 |]").notes.map(String)).toEqual(["C4"]);
  });

  test("reads modal key fields", () => {
    // D dorian shares C major's signature: nothing is inflected.
    expect(fromABC("K:Ddor\nD2 F2 C2 |]").notes.map(String)).toEqual([
      "D4",
      "F4",
      "C4",
    ]);
    // E dorian shares D major's two sharps, so F and C are sharp.
    expect(fromABC("K:Edor\nE2 F2 C2 |]").notes.map(String)).toEqual([
      "E4",
      "F#4",
      "C#4",
    ]);
    // A minor is spelled natively, not via a mode lookup.
    expect(fromABC("K:Am\nA2 C2 |]").notes.map(String)).toEqual(["A4", "C4"]);
  });

  test("tolerates a tune with no header", () => {
    expect(fromABC("C D E").notes.map(String)).toEqual(["C4", "D4", "E4"]);
  });

  test("round-trips what toABC writes", () => {
    const notes = ["C4", "D4", "E4", "F#4", "G4", "A4", "B4", "C5"];
    expect(fromABC(toABC(notes)).notes.map(String)).toEqual(notes);

    const scale = Scale.from("D4", "major");
    const rendered = toABC(scale, { key: "D major" });
    expect(fromABC(rendered).notes.map(String)).toEqual(
      scale.notes.map(String)
    );
  });
});
