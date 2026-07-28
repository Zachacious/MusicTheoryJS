import { describe, expect, test } from "bun:test";
import { formatAccidental, formatNote } from "./format";
import { spelled } from "./spelled";

describe("formatAccidental", () => {
  test("natural is empty", () => {
    expect(formatAccidental(0)).toBe("");
  });

  test("sharps and flats repeat", () => {
    expect(formatAccidental(1)).toBe("#");
    expect(formatAccidental(2)).toBe("##");
    expect(formatAccidental(-1)).toBe("b");
    expect(formatAccidental(-2)).toBe("bb");
  });

  test("doubleSharpX collapses pairs to x", () => {
    expect(formatAccidental(2, { doubleSharpX: true })).toBe("x");
    expect(formatAccidental(3, { doubleSharpX: true })).toBe("x#");
  });

  test("unicode accidentals", () => {
    expect(formatAccidental(1, { unicodeAccidentals: true })).toBe("♯");
    expect(formatAccidental(-1, { unicodeAccidentals: true })).toBe("♭");
  });
});

describe("formatNote", () => {
  test("renders letter, accidental, octave", () => {
    expect(formatNote(spelled(0, 0, 4))).toBe("C4");
    expect(formatNote(spelled(0, 1, 4))).toBe("C#4");
    expect(formatNote(spelled(2, -1, 3))).toBe("Eb3");
    expect(formatNote(spelled(3, 2, 5))).toBe("F##5");
  });

  test("octave can be omitted", () => {
    expect(formatNote(spelled(0, 1, 4), { octave: false })).toBe("C#");
  });

  test("round-trips parse -> format for canonical forms", () => {
    expect(formatNote(spelled(6, -1, 2))).toBe("Bb2");
  });
});
