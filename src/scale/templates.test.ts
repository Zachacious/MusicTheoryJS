import { describe, expect, test } from "bun:test";
import { Scale } from "./scale";
import { SCALE_TEMPLATES, type ScaleName, scaleTemplate } from "./templates";

describe("scale template coverage", () => {
  test("every scale builds correctly-lettered notes rooted on its tonic", () => {
    for (const name of Object.keys(SCALE_TEMPLATES) as ScaleName[]) {
      const scale = Scale.from("C4", name);
      const notes = scale.notes;
      expect(notes[0]?.toString()).toBe("C4");
      expect(notes.length).toBe(scaleTemplate(name).length);
      // Notes ascend in pitch within the octave.
      for (let i = 1; i < notes.length; i++) {
        expect((notes[i] as { chroma: number }).chroma).toBeGreaterThan(
          (notes[i - 1] as { chroma: number }).chroma
        );
      }
    }
  });

  test("spot-check world/exotic scale spellings", () => {
    expect(Scale.from("D4", "hirajoshi").noteNames()).toEqual([
      "D4",
      "E4",
      "F4",
      "A4",
      "Bb4",
    ]);
    expect(Scale.from("C4", "acoustic").noteNames()).toEqual([
      "C4",
      "D4",
      "E4",
      "F#4",
      "G4",
      "A4",
      "Bb4",
    ]);
    expect(Scale.from("E4", "phrygianDominant").noteNames()).toEqual([
      "E4",
      "F4",
      "G#4",
      "A4",
      "B4",
      "C5",
      "D5",
    ]);
  });
});
