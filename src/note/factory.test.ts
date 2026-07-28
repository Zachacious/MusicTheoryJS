import { describe, expect, test } from "bun:test";
import { Note } from "./note";

describe("Note.fromMidi", () => {
  test("maps MIDI numbers to notes", () => {
    expect(Note.fromMidi(60).toString()).toBe("C4");
    expect(Note.fromMidi(69).toString()).toBe("A4");
    expect(Note.fromMidi(61).toString()).toBe("C#4");
    expect(Note.fromMidi(61, "flat").toString()).toBe("Db4");
  });

  test("round-trips with .midi", () => {
    for (let m = 21; m <= 108; m++) {
      expect(Note.fromMidi(m).midi).toBe(m);
    }
  });

  test("rounds non-integer input", () => {
    expect(Note.fromMidi(60.4).toString()).toBe("C4");
  });
});

describe("Note.fromFrequency", () => {
  test("snaps to the nearest 12-TET note", () => {
    expect(Note.fromFrequency(440).toString()).toBe("A4");
    expect(Note.fromFrequency(261.63).toString()).toBe("C4");
    expect(Note.fromFrequency(445).toString()).toBe("A4"); // slightly sharp A
    expect(Note.fromFrequency(466.16, { prefer: "flat" }).toString()).toBe(
      "Bb4"
    );
  });

  test("honours a custom reference", () => {
    const ref = { cents: 5700, frequency: 432 };
    expect(Note.fromFrequency(432, { reference: ref }).toString()).toBe("A4");
  });
});
