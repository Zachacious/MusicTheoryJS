import { describe, expect, test } from "bun:test";
import { Chord } from "./chord";
import { CHORD_TEMPLATES, type ChordQuality } from "./templates";

describe("chord template coverage", () => {
  test("every quality round-trips symbol -> parse -> quality", () => {
    for (const quality of Object.keys(CHORD_TEMPLATES) as ChordQuality[]) {
      const symbol = Chord.of("C4", quality).toString();
      const reparsed = Chord.from(symbol);
      expect(reparsed.quality).toBe(quality);
    }
  });

  test("every quality builds spelled notes without throwing, root included", () => {
    for (const quality of Object.keys(CHORD_TEMPLATES) as ChordQuality[]) {
      const notes = Chord.of("C4", quality).noteNames();
      expect(notes[0]).toBe("C4");
      expect(notes.length).toBe(CHORD_TEMPLATES[quality].length);
    }
  });

  test("spot-check extended/altered chord spellings", () => {
    expect(Chord.of("C4", "dom13").noteNames()).toEqual([
      "C4",
      "E4",
      "G4",
      "Bb4",
      "D5",
      "A5",
    ]);
    expect(Chord.of("C4", "dom7b9").noteNames()).toEqual([
      "C4",
      "E4",
      "G4",
      "Bb4",
      "Db5",
    ]);
    expect(Chord.of("C4", "power").noteNames()).toEqual(["C4", "G4"]);
    expect(Chord.of("C4", "maj69").noteNames()).toEqual([
      "C4",
      "E4",
      "G4",
      "A4",
      "D5",
    ]);
  });
});
