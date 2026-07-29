/** The public barrel: every Phase 3 module is reachable from the root. */

import { describe, expect, it } from "vitest";

import * as mt from "../src";

describe("public API barrel", () => {
  it("exposes the documented example surface", () => {
    expect(mt.noteName(mt.transpose("Eb4", "P5"))).toBe("Bb4");
    expect(mt.chord("Cm7b5").notes).toEqual(["C", "Eb", "Gb", "Bb"]);
    expect(mt.scale("F# dorian").notes).toEqual(["F#", "G#", "A", "B", "C#", "D#", "E"]);
    expect(mt.majorKey("Eb").secondaryDominants).toEqual(["", "C7", "D7", "Eb7", "F7", "G7", ""]);
    expect(mt.romanToChord("V7/V", "C major").symbol).toBe("D7");
    expect(mt.progressionChords("C major", ["ii7", "V7", "Imaj7"])).toEqual(["Dm7", "G7", "Cmaj7"]);
    expect(mt.detectChords(["C", "Eb", "G", "Bb"])[0].symbol).toBe("Cm7");
    expect(mt.VERSION).toBe("3.1.0");
  });
});
