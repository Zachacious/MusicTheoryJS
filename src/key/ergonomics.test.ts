/**
 * Phase 1 ergonomics on keys: KeyLike inputs, transposition, JSON
 * round-trips, and the free-function mirror of the class API.
 */
import { describe, expect, test } from "bun:test";
import {
  Key,
  diatonicChords,
  key,
  keyChord,
  keyChordFromRoman,
  keyProgression,
  keyRomanNumeral,
  keySignatureOf,
  parallelKey,
  relativeKey,
} from "./key";

describe("Key.from widened inputs", () => {
  test("parses strings, with major implied", () => {
    expect(Key.from("C major").toString()).toBe("C major");
    expect(Key.from("f# minor").toString()).toBe("F# minor");
    expect(Key.from("Eb").toString()).toBe("Eb major");
  });

  test("accepts a spec object", () => {
    expect(Key.from({ tonic: "A4", mode: "minor" }).toString()).toBe("A minor");
    expect(Key.from({ tonic: "G4" }).mode).toBe("major");
  });

  test("passes an existing Key through unchanged", () => {
    const k = Key.major("D");
    expect(Key.from(k)).toBe(k);
  });

  test("rejects malformed strings", () => {
    expect(() => Key.from("C dorian")).toThrow(SyntaxError);
    expect(() => Key.from("X major")).toThrow(SyntaxError);
  });
});

describe("Key.transpose", () => {
  test("moves the tonic and keeps the mode", () => {
    expect(Key.from("C major").transpose("P5").toString()).toBe("G major");
    expect(Key.from("A minor").transpose(-2).toString()).toBe("G minor");
  });
});

describe("Key JSON round-trip", () => {
  test("revives tonic and mode", () => {
    const original = Key.minor("F#4");
    const revived = Key.fromJSON(JSON.stringify(original));
    expect(revived.toString()).toBe(original.toString());
    expect(revived.tonic.equals(original.tonic)).toBe(true);
  });
});

describe("free functions", () => {
  test("mirror the class methods over KeyLike", () => {
    expect(keyChord("C major", 2).toString()).toBe("Dm");
    expect(keySignatureOf("G major").count).toBe(1);
    expect(keyRomanNumeral("C major", "G7")).toBe("V7");
    expect(keyRomanNumeral("C major", { root: "D4", quality: "min" })).toBe(
      "ii"
    );
    expect(keyChordFromRoman("C major", "vi").toString()).toBe("Am");
    expect(
      keyProgression("C major", "I V vi IV").map((c) => c.toString())
    ).toEqual(["C", "G", "Am", "F"]);
    expect(relativeKey("C major").toString()).toBe("A minor");
    expect(parallelKey("C major").toString()).toBe("C minor");
    expect(key("Bb").signature.count).toBe(-2);
  });

  test("diatonicChords returns all seven, in order", () => {
    const triads = diatonicChords("C major").map((c) => c.toString());
    expect(triads).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    const sevenths = diatonicChords("C major", { seventh: true }).map((c) =>
      c.toString()
    );
    expect(sevenths[0]).toBe("Cmaj7");
    expect(sevenths[6]).toBe("Bm7b5");
  });
});
