import { describe, expect, test } from "bun:test";
import { mode, modes } from "./modes";
import { Scale } from "./scale";

describe("modes", () => {
  test("2nd mode of C major is D dorian", () => {
    const dorian = mode(Scale.from("C4", "major"), 2);
    expect(dorian.tonic.toString()).toBe("D4");
    expect(dorian.noteNames()).toEqual([
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
      "C5",
    ]);
  });

  test("6th mode of C major is A aeolian (natural minor)", () => {
    const aeolian = mode(Scale.from("C4", "major"), 6);
    expect(aeolian.tonic.toString()).toBe("A4");
    expect(aeolian.noteNames()).toEqual([
      "A4",
      "B4",
      "C5",
      "D5",
      "E5",
      "F5",
      "G5",
    ]);
  });

  test("modes() returns all seven rotations", () => {
    const all = modes(Scale.from("C4", "major"));
    expect(all).toHaveLength(7);
    expect(all.map((m) => m.tonic.letter)).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
  });
});
