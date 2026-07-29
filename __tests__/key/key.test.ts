import { describe, expect, it } from "vitest";

import { MusicTheoryError } from "../../src/core";
import { key, majorKey, minorKey, tryKey } from "../../src/key";

describe("majorKey()", () => {
  const c = majorKey("C");

  it("carries the full diatonic harmony", () => {
    expect(c.scale).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(c.grades).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
    expect(c.triads).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    expect(c.chords).toEqual(["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"]);
    expect(c.chordsHarmonicFunction).toEqual(["T", "SD", "T", "SD", "D", "T", "D"]);
    expect(c.chordScales).toEqual([
      "C major", "D dorian", "E phrygian", "F lydian",
      "G mixolydian", "A minor", "B locrian",
    ]);
    expect(c.minorRelative).toBe("A");
  });

  it("computes secondary and substitute dominants with supertonics", () => {
    expect(c.secondaryDominants).toEqual(["", "A7", "B7", "C7", "D7", "E7", ""]);
    expect(c.secondaryDominantSupertonics).toEqual(["", "Em7", "F#m7", "Gm7b5", "Am7b5", "Bm7", ""]);
    expect(c.substituteDominants).toEqual(["", "Eb7", "F7", "Gb7", "Ab7", "Bb7", ""]);
    expect(c.substituteDominantSupertonics).toEqual(["", "Bbm7", "Cm7", "Dbm7b5", "Ebm7b5", "Fm7", ""]);
  });

  it("computes signatures across the circle of fifths", () => {
    const expected: ReadonlyArray<readonly [string, number]> = [
      ["C", 0], ["G", 1], ["D", 2], ["A", 3], ["E", 4], ["B", 5],
      ["F#", 6], ["C#", 7], ["F", -1], ["Bb", -2], ["Eb", -3],
      ["Ab", -4], ["Db", -5], ["Gb", -6], ["Cb", -7],
    ];
    for (const [tonic, alteration] of expected) {
      const k = majorKey(tonic);
      expect(k.alteration, `${tonic} major`).toBe(alteration);
      expect(k.keySignature).toBe(
        alteration >= 0 ? "#".repeat(alteration) : "b".repeat(-alteration)
      );
    }
    // Theoretical keys work too, via unbounded alterations.
    expect(majorKey("G#").alteration).toBe(8);
    expect(majorKey("G#").scale).toEqual(["G#", "A#", "B#", "C#", "D#", "E#", "F##"]);
  });
});

describe("minorKey()", () => {
  const cm = minorKey("C");

  it("has natural / harmonic / melodic harmonizations", () => {
    expect(cm.natural.scale).toEqual(["C", "D", "Eb", "F", "G", "Ab", "Bb"]);
    expect(cm.harmonic.scale).toEqual(["C", "D", "Eb", "F", "G", "Ab", "B"]);
    expect(cm.melodic.scale).toEqual(["C", "D", "Eb", "F", "G", "A", "B"]);
    expect(cm.natural.grades).toEqual(["i", "ii°", "bIII", "iv", "v", "bVI", "bVII"]);
    expect(cm.harmonic.grades).toEqual(["i", "ii°", "bIII+", "iv", "V", "bVI", "vii°"]);
    expect(cm.natural.chords).toEqual(["Cm7", "Dm7b5", "Ebmaj7", "Fm7", "Gm7", "Abmaj7", "Bb7"]);
    expect(cm.harmonic.chords).toEqual(["CmM7", "Dm7b5", "Ebmaj7#5", "Fm7", "G7", "Abmaj7", "Bdim7"]);
    expect(cm.melodic.chords).toEqual(["CmM7", "Dm7", "Ebmaj7#5", "F7", "G7", "Am7b5", "Bm7b5"]);
  });

  it("computes signature from the natural form", () => {
    expect(cm.alteration).toBe(-3);
    expect(cm.keySignature).toBe("bbb");
    expect(cm.relativeMajor).toBe("Eb");
    expect(minorKey("f#").alteration).toBe(3);
  });

  it("omits secondary dominants that are diatonic or target unstable triads", () => {
    // V7/i (G7) is diatonic to harmonic minor → omitted there, kept in natural.
    expect(cm.natural.secondaryDominants[0]).toBe("G7");
    expect(cm.harmonic.secondaryDominants[0]).toBe("");
    // ii° cannot be tonicized.
    expect(cm.natural.secondaryDominants[1]).toBe("");
  });
});

describe("key()", () => {
  it("parses names and shorthands", () => {
    expect(key("C major").type).toBe("major");
    expect(key("c minor").type).toBe("minor");
    expect(key("eb MAJOR").type).toBe("major");
    expect(key("F#m").type).toBe("minor");
    expect(key("Bb").type).toBe("major");
    expect(key("A min").type).toBe("minor");
  });

  it("round-trips Key objects and rejects junk", () => {
    expect(key(key("Eb major")).type).toBe("major");
    expect(() => key("H major")).toThrow(MusicTheoryError);
    expect(() => key("C dorian")).toThrow(MusicTheoryError);
    expect(tryKey("nope")).toBeNull();
  });
});
