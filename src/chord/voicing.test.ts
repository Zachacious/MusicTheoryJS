import { describe, expect, test } from "bun:test";
import { Chord } from "./chord";
import { closeVoicing, drop2, drop3, spread } from "./voicing";

const cmaj7 = Chord.from("Cmaj7"); // C4 E4 G4 B4

describe("voicings re-octave without changing chord tones", () => {
  test("close voicing is the plain ascending chord", () => {
    expect(closeVoicing(cmaj7).map((n) => n.toString())).toEqual([
      "C4",
      "E4",
      "G4",
      "B4",
    ]);
  });

  test("drop2 drops the second voice from the top an octave", () => {
    // From C4 E4 G4 B4, drop G4 -> G3; re-sorted
    expect(drop2(cmaj7).map((n) => n.toString())).toEqual([
      "G3",
      "C4",
      "E4",
      "B4",
    ]);
  });

  test("drop3 drops the third voice from the top an octave", () => {
    expect(drop3(cmaj7).map((n) => n.toString())).toEqual([
      "E3",
      "C4",
      "G4",
      "B4",
    ]);
  });

  test("spread widens across octaves", () => {
    expect(spread(Chord.from("C")).map((n) => n.toString())).toEqual([
      "C4",
      "E5",
      "G6",
    ]);
  });

  test("all voicings preserve the set of pitch classes", () => {
    const pcs = (ns: { pitchClass: number }[]) =>
      new Set(ns.map((n) => n.pitchClass));
    expect(pcs(drop2(cmaj7))).toEqual(pcs(closeVoicing(cmaj7)));
    expect(pcs(drop3(cmaj7))).toEqual(pcs(closeVoicing(cmaj7)));
  });
});
