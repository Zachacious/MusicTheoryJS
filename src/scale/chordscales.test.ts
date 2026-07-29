import { describe, expect, test } from "bun:test";
import { Chord } from "../chord/chord";
import { pcsetIsSubset, pcsetMask, pcsetTranspose } from "../pitch/pcset";
import { chordScales } from "./chordscales";

describe("chordScales", () => {
  test("classic jazz answers lead the ranking", () => {
    expect(chordScales("Dm7")[0]?.scale.name).toBe("dorian");
    expect(chordScales("Cmaj7")[0]?.scale.name).toBe("lydian");
    expect(chordScales("G7")[0]?.scale.name).toBe("lydianDominant");
    expect(chordScales("Bm7b5")[0]?.scale.name).toBe("halfDiminished");
    expect(chordScales("Calt7")[0]?.scale.name).toBe("altered");
  });

  test("avoid notes are spelled scale tones a half step above chord tones", () => {
    const major = chordScales("Cmaj7", { maxResults: 30 }).find(
      (m) => m.scale.name === "major"
    );
    expect(major?.avoidNotes.map((n) => n.toString({ octave: false }))).toEqual(
      ["F"]
    );
    const aeolian = chordScales("Dm7", { maxResults: 30 }).find(
      (m) => m.scale.name === "minor"
    );
    expect(
      aeolian?.avoidNotes.map((n) => n.toString({ octave: false }))
    ).toEqual(["Bb"]);
    const dorian = chordScales("Dm7")[0];
    expect(dorian?.avoidNotes).toEqual([]);
  });

  test("scales are rooted on the chord root with its spelling", () => {
    const matches = chordScales("F#m7");
    for (const m of matches) {
      expect(m.scale.tonic.toString()).toBe("F#4");
    }
  });

  test("every match really contains the chord", () => {
    for (const symbol of ["C", "G7", "Dm7b5", "Abmaj7", "E7#9", "Bm7"]) {
      const chord = Chord.from(symbol);
      const chordMask = pcsetMask(chord.intervals.map((iv) => iv.semitones));
      const rooted = pcsetTranspose(chordMask, chord.root.pitchClass);
      for (const m of chordScales(symbol, { maxResults: 50 })) {
        const scaleMask = pcsetMask(m.scale.notes.map((n) => n.pitchClass));
        expect(pcsetIsSubset(rooted, scaleMask)).toBe(true);
      }
    }
  });

  test("scores descend and respect maxResults", () => {
    const matches = chordScales("G7", { maxResults: 8 });
    expect(matches.length).toBeLessThanOrEqual(8);
    for (let i = 1; i < matches.length; i++) {
      expect((matches[i - 1]?.score ?? 0) >= (matches[i]?.score ?? 0)).toBe(
        true
      );
    }
    expect(() => chordScales("C", { maxResults: -1 })).toThrow(RangeError);
    expect(chordScales("C", { maxResults: 0 })).toEqual([]);
  });
});
