import { describe, expect, test } from "bun:test";
import { parseNote, tryParseNote } from "./parse";

describe("parseNote", () => {
  test("plain letter defaults to octave 4, natural", () => {
    expect(parseNote("C")).toEqual({ step: 0, alteration: 0, octave: 4 });
  });

  test("letter + octave", () => {
    expect(parseNote("A5")).toEqual({ step: 5, alteration: 0, octave: 5 });
  });

  test("sharps and flats", () => {
    expect(parseNote("C#4")).toEqual({ step: 0, alteration: 1, octave: 4 });
    expect(parseNote("Db3")).toEqual({ step: 1, alteration: -1, octave: 3 });
  });

  test("double accidentals via repetition and x", () => {
    expect(parseNote("F##5")).toEqual({ step: 3, alteration: 2, octave: 5 });
    expect(parseNote("Fx5")).toEqual({ step: 3, alteration: 2, octave: 5 });
    expect(parseNote("Bbb2")).toEqual({ step: 6, alteration: -2, octave: 2 });
  });

  test("lowercase letters and unicode accidentals", () => {
    expect(parseNote("e#4")).toEqual({ step: 2, alteration: 1, octave: 4 });
    expect(parseNote("E♭3")).toEqual({ step: 2, alteration: -1, octave: 3 });
  });

  test("negative octave", () => {
    expect(parseNote("C-1")).toEqual({ step: 0, alteration: 0, octave: -1 });
  });

  test("throws on garbage", () => {
    expect(() => parseNote("H4")).toThrow();
    expect(() => parseNote("")).toThrow();
    expect(() => parseNote("4C")).toThrow();
  });
});

describe("tryParseNote", () => {
  test("returns null instead of throwing", () => {
    expect(tryParseNote("nope")).toBeNull();
    expect(tryParseNote("G7")).toEqual({ step: 4, alteration: 0, octave: 7 });
  });
});
