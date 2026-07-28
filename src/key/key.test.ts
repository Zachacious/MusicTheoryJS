import { describe, expect, test } from "bun:test";
import { Chord } from "../chord/chord";
import { Key, parseRoman } from "./key";

describe("key signatures", () => {
  test("C major has no accidentals", () => {
    expect(Key.major("C").signature.count).toBe(0);
  });

  test("G major has one sharp (F#)", () => {
    const sig = Key.major("G").signature;
    expect(sig.count).toBe(1);
    expect(sig.accidentals).toEqual([{ letter: "F", alteration: 1 }]);
  });

  test("F major has one flat (Bb)", () => {
    const sig = Key.major("F").signature;
    expect(sig.count).toBe(-1);
    expect(sig.accidentals[0]).toEqual({ letter: "B", alteration: -1 });
  });

  test("A minor has no accidentals", () => {
    expect(Key.minor("A").signature.count).toBe(0);
  });

  test("C# major has seven sharps", () => {
    expect(Key.major("C#").signature.count).toBe(7);
  });
});

describe("diatonic chords", () => {
  test("triads of C major", () => {
    const c = Key.major("C");
    expect(c.chord(1).toString()).toBe("C");
    expect(c.chord(2).toString()).toBe("Dm");
    expect(c.chord(5).toString()).toBe("G");
    expect(c.chord(7).toString()).toBe("Bdim");
  });

  test("seventh chords of C major", () => {
    const c = Key.major("C");
    expect(c.chord(1, { seventh: true }).toString()).toBe("Cmaj7");
    expect(c.chord(2, { seventh: true }).toString()).toBe("Dm7");
    expect(c.chord(5, { seventh: true }).toString()).toBe("G7");
    expect(c.chord(7, { seventh: true }).toString()).toBe("Bm7b5");
  });

  test("chord tones spell correctly", () => {
    expect(Key.major("C").chord(2).noteNames()).toEqual(["D4", "F4", "A4"]);
  });
});

describe("Roman numerals", () => {
  test("names diatonic chords in C major", () => {
    const c = Key.major("C");
    expect(c.romanNumeral(Chord.from("C"))).toBe("I");
    expect(c.romanNumeral(Chord.from("Dm"))).toBe("ii");
    expect(c.romanNumeral(Chord.from("G7"))).toBe("V7");
    expect(c.romanNumeral(Chord.from("Bdim"))).toBe("vii°");
  });

  test("chromatic roots get accidental prefixes", () => {
    const c = Key.major("C");
    expect(c.romanNumeral(Chord.from("Bb"))).toBe("bVII");
    expect(c.romanNumeral(Chord.from("Eb"))).toBe("bIII");
  });

  test("minor key numerals", () => {
    const a = Key.minor("A");
    expect(a.romanNumeral(Chord.from("Am"))).toBe("i");
    expect(a.romanNumeral(Chord.from("C"))).toBe("III");
    expect(a.romanNumeral(Chord.from("Dm"))).toBe("iv");
  });

  test("chordFromRoman is the inverse", () => {
    const c = Key.major("C");
    expect(c.chordFromRoman("ii").toString()).toBe("Dm");
    expect(c.chordFromRoman("V7").toString()).toBe("G7");
    expect(c.chordFromRoman("bVII").toString()).toBe("Bb");
    expect(c.chordFromRoman("vii°").toString()).toBe("Bdim");
  });
});

describe("progressions", () => {
  test("parses a I-V-vi-IV progression", () => {
    const c = Key.major("C");
    expect(c.progression("I V vi IV").map((ch) => ch.toString())).toEqual([
      "C",
      "G",
      "Am",
      "F",
    ]);
  });

  test("handles dashes and seventh chords", () => {
    const c = Key.major("C");
    expect(c.progression("ii7-V7-Imaj7").map((ch) => ch.toString())).toEqual([
      "Dm7",
      "G7",
      "Cmaj7",
    ]);
  });
});

describe("relative and parallel keys", () => {
  test("relative of C major is A minor", () => {
    expect(Key.major("C").relative().toString()).toBe("A minor");
  });

  test("relative of A minor is C major", () => {
    expect(Key.minor("A").relative().toString()).toBe("C major");
  });

  test("parallel of C major is C minor", () => {
    expect(Key.major("C").parallel().toString()).toBe("C minor");
  });
});

describe("parseRoman", () => {
  test("splits accidental, degree, and quality", () => {
    expect(parseRoman("bVII")).toEqual({
      degree: 7,
      alteration: -1,
      quality: "maj",
    });
    expect(parseRoman("ii7")).toEqual({
      degree: 2,
      alteration: 0,
      quality: "min7",
    });
    expect(parseRoman("vii°7")).toEqual({
      degree: 7,
      alteration: 0,
      quality: "dim7",
    });
  });
});
