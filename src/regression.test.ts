/**
 * Regression tests for bugs found during the correctness audit.
 */
import { describe, expect, test } from "bun:test";
import { detectChord } from "./chord/analysis";
import { Chord } from "./chord/chord";
import {
  interval,
  intervalBetween,
  intervalName,
  negateInterval,
} from "./interval/interval";
import { Key } from "./key/key";
import { Note } from "./note/note";
import { detectScales } from "./scale/detection";
import { scalaTuning } from "./tuning/custom";

describe("interval naming: diminished/augmented sign mismatch", () => {
  test("doubly/triply diminished seconds are named, not sign-flipped", () => {
    expect(intervalName(interval(2, "d", 2))).toBe("dd2");
    expect(intervalName(interval(2, "d", 3))).toBe("ddd2");
  });

  test("diminished unison is d1, not -A1", () => {
    expect(intervalName(interval(1, "d"))).toBe("d1");
  });

  test("reachable via spelled notes: C## to Dbb is ddd2", () => {
    const iv = intervalBetween(new Note("C##4"), new Note("Dbb4"));
    expect(intervalName(iv)).toBe("ddd2");
  });

  test("ordinary ascending/descending intervals unchanged", () => {
    expect(intervalName(interval(5, "P"))).toBe("P5");
    expect(intervalName(negateInterval(interval(5, "P")))).toBe("-P5");
    expect(intervalName(negateInterval(interval(3, "M")))).toBe("-M3");
    expect(intervalName(interval(5, "A", 2))).toBe("AA5");
  });
});

describe("romanNumeral: case from actual triad, not a fixed table", () => {
  test("min6 / min9 chords are lowercase with a suffix", () => {
    const c = Key.major("C");
    expect(c.romanNumeral(Chord.of("A4", "min6"))).toBe("vi6");
    expect(c.romanNumeral(Chord.of("D4", "min6"))).toBe("ii6");
    expect(c.romanNumeral(Chord.of("D4", "min9"))).toBe("ii9");
  });

  test("major-family extensions stay uppercase", () => {
    const c = Key.major("C");
    expect(c.romanNumeral(Chord.of("C4", "maj6"))).toBe("I6");
    expect(c.romanNumeral(Chord.of("C4", "maj9"))).toBe("Imaj9");
  });

  test("an inverted chord (quality undefined) still gets the right case", () => {
    const c = Key.major("C");
    expect(c.romanNumeral(Chord.from("Dm").invert())).toBe("ii");
    expect(c.romanNumeral(Chord.from("C").invert())).toBe("I");
  });
});

describe("detectChord: prefers the lowest-sounding note as root", () => {
  test("symmetric augmented triad roots on the bass", () => {
    expect(detectChord(["G#4", "C4", "E4"])?.root.letter).toBe("C");
  });

  test("unsorted input still finds the bass root", () => {
    expect(detectChord(["G4", "C4", "E4"])?.toString()).toBe("C");
  });
});

describe("scalaTuning: empty description line does not shift parsing", () => {
  test("a spec-valid file with a blank description parses correctly", () => {
    const scl = ["! test.scl", "", "3", "100.", "200.", "1200."].join("\n");
    const t = scalaTuning(scl);
    expect(t.size).toBe(3);
    expect(t.period).toBeCloseTo(1200, 6);
    expect(t.centsForDegree(1)).toBeCloseTo(100, 6);
  });
});

describe("detectScales: no duplicate matches across octaves", () => {
  test("a repeated pitch class does not duplicate a scale match", () => {
    const withDup = detectScales([
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
      "C5",
    ]);
    const cMajor = withDup.filter(
      (m) => m.tonic.letter === "C" && m.name === "major"
    );
    expect(cMajor).toHaveLength(1);
  });
});
