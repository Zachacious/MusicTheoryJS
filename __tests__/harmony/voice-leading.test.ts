import { describe, expect, it } from "vitest";

import { MusicTheoryError, note, semitoneHeight } from "../../src/core";
import { majorKey, minorKey } from "../../src/key";
import { progressionChords } from "../../src/progression";
import {
  findParallels,
  nextVoicing,
  voiceChord,
  voiceLeadingCost,
  voiceProgression,
} from "../../src/harmony";

const heights = (voicing: readonly string[]): number[] =>
  voicing.map((n) => semitoneHeight(note(n)) as number);

describe("voiceChord()", () => {
  it("builds an in-order, in-range voicing with the bass on the chord bass", () => {
    const v = voiceChord("Cmaj7");
    expect(v).toHaveLength(4);
    const h = heights(v);
    for (let i = 1; i < h.length; i++) expect(h[i]).toBeGreaterThan(h[i - 1]);
    expect(v[0].startsWith("C")).toBe(true);
    const slash = voiceChord("C/E");
    expect(slash[0].startsWith("E")).toBe(true);
  });

  it("covers all chord tones of a seventh chord", () => {
    const pcs = new Set(voiceChord("G7").map((n) => n.replace(/\d+$/, "")));
    expect(pcs).toEqual(new Set(["G", "B", "D", "F"]));
  });

  it("respects voice count and validates options", () => {
    expect(voiceChord("C", { voices: 3 })).toHaveLength(3);
    expect(voiceChord("C13", { voices: 6 })).toHaveLength(6);
    expect(() => voiceChord("C", { voices: 1 })).toThrow(MusicTheoryError);
    expect(() => voiceChord("C", { range: ["C4", "C3"] })).toThrow(MusicTheoryError);
  });
});

describe("nextVoicing()", () => {
  it("moves minimally and covers the target chord", () => {
    const from = voiceChord("C");
    const to = nextVoicing(from, "F");
    expect(voiceLeadingCost(from, to)).toBeLessThanOrEqual(16);
    const pcs = new Set(to.map((n) => n.replace(/\d+$/, "")));
    expect(pcs).toEqual(new Set(["F", "A", "C"]));
    expect(to[0].startsWith("F")).toBe(true);
  });

  it("static voices stay put when the chord repeats", () => {
    const from = voiceChord("Am7");
    expect(nextVoicing(from, "Am7")).toEqual(from);
  });
});

describe("findParallels()", () => {
  it("flags parallel fifths and octaves, spelled", () => {
    expect(findParallels(["C3", "G3"], ["D3", "A3"])).toEqual([
      { voices: [0, 1], type: "P5" },
    ]);
    expect(findParallels(["C3", "C4"], ["D3", "D4"])).toEqual([
      { voices: [0, 1], type: "P8" },
    ]);
    // Compound fifths count; d5 → P5 does not.
    expect(findParallels(["C3", "G4"], ["D3", "A4"])[0]?.type).toBe("P5");
    expect(findParallels(["B2", "F3"], ["C3", "G3"])).toEqual([]);
  });

  it("ignores pairs where a voice holds still", () => {
    expect(findParallels(["C3", "G3"], ["C3", "G3"])).toEqual([]);
    expect(findParallels(["C3", "G3", "E4"], ["C3", "G3", "F4"])).toEqual([]);
  });
});

describe("voiceProgression() — Phase 5 acceptance property", () => {
  it("never emits parallel fifths or octaves in default mode", () => {
    const progressions: string[][] = [];
    for (const tonic of ["C", "G", "D", "A", "E", "F", "Bb", "Eb", "Ab", "F#"]) {
      const k = majorKey(tonic);
      progressions.push([k.triads[0], k.triads[3], k.chords[4], k.triads[5], k.triads[0]]);
      progressions.push(progressionChords(`${tonic} major`, ["I", "vi", "ii7", "V7", "I"]));
      progressions.push(progressionChords(`${tonic} major`, ["I", "IV", "V", "I"]));
    }
    for (const tonic of ["A", "E", "D", "G", "C"]) {
      const k = minorKey(tonic);
      progressions.push([
        k.natural.triads[0], k.natural.triads[3], k.harmonic.chords[4], k.natural.triads[0],
      ]);
    }
    for (const chords of progressions) {
      const voicings = voiceProgression(chords);
      for (let i = 1; i < voicings.length; i++) {
        expect(
          findParallels(voicings[i - 1], voicings[i]),
          `${chords.join(" ")} @ ${i}`
        ).toEqual([]);
        const h = heights(voicings[i]);
        // Voices never cross; adjacent unisons are legal.
        for (let v = 1; v < h.length; v++) expect(h[v]).toBeGreaterThanOrEqual(h[v - 1]);
      }
    }
  });

  it("can be told to allow parallels", () => {
    // I → bVII in parallel motion is only reachable when allowed.
    const from = ["C3", "G3", "E4", "C5"];
    const strict = nextVoicing(from, "Bb");
    expect(findParallels(from, strict)).toEqual([]);
    const loose = nextVoicing(from, "Bb", { allowParallels: true });
    expect(voiceLeadingCost(from, loose)).toBeLessThanOrEqual(voiceLeadingCost(from, strict));
  });

  it("throws when constraints are unsatisfiable", () => {
    expect(() =>
      nextVoicing(["C3", "E3", "G3", "C4"], "F#", { maxLeap: 2, range: ["C3", "C4"] })
    ).toThrow(MusicTheoryError);
  });
});
