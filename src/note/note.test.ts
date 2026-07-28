import { describe, expect, test } from "bun:test";
import { interval } from "../interval/interval";
import { Note, note } from "./note";

describe("construction", () => {
  test("from string", () => {
    const n = new Note("C#4");
    expect(n.letter).toBe("C");
    expect(n.alteration).toBe(1);
    expect(n.octave).toBe(4);
    expect(n.toString()).toBe("C#4");
  });

  test("from parts with defaults", () => {
    expect(note({ step: 5 }).toString()).toBe("A4");
    expect(note({ step: 2, alteration: -1, octave: 3 }).toString()).toBe("Eb3");
  });

  test("Note.from passes Note through unchanged", () => {
    const n = new Note("G4");
    expect(Note.from(n)).toBe(n);
  });

  test("instances are frozen (immutable)", () => {
    const n = new Note("C4");
    expect(Object.isFrozen(n)).toBe(true);
  });
});

describe("derived values", () => {
  test("midi and pitch class", () => {
    expect(new Note("C4").midi).toBe(60);
    expect(new Note("A4").midi).toBe(69);
    expect(new Note("C#4").pitchClass).toBe(1);
    expect(new Note("Db4").pitchClass).toBe(1);
  });
});

describe("immutable operations", () => {
  test("transpose keeps spelling", () => {
    expect(new Note("C4").transpose(interval(5, "P")).toString()).toBe("G4");
    expect(new Note("C4").transpose(interval(4, "d")).toString()).toBe("Fb4");
  });

  test("sharpen and flatten keep the letter", () => {
    expect(new Note("C4").sharpen().toString()).toBe("C#4");
    expect(new Note("C4").flatten().toString()).toBe("Cb4");
    expect(new Note("C4").sharpen(2).toString()).toBe("C##4");
  });

  test("withOctave", () => {
    expect(new Note("C#4").withOctave(6).toString()).toBe("C#6");
  });

  test("original note is unchanged after operations", () => {
    const c = new Note("C4");
    c.sharpen();
    expect(c.toString()).toBe("C4");
  });
});

describe("enharmonic respelling", () => {
  test("E#4 respells to F4", () => {
    expect(new Note("E#4").enharmonic().toString()).toBe("F4");
  });

  test("Db4 respells to C#4 with sharp preference", () => {
    expect(new Note("Db4").enharmonic("sharp").toString()).toBe("C#4");
  });

  test("C#4 respells to Db4 with flat preference", () => {
    expect(new Note("C#4").enharmonic("flat").toString()).toBe("Db4");
  });

  test("B#4 respells to C5 (octave boundary preserved)", () => {
    const respelled = new Note("B#4").enharmonic();
    expect(respelled.toString()).toBe("C5");
    expect(respelled.midi).toBe(new Note("B#4").midi);
  });

  test("Cb4 respells to B3", () => {
    expect(new Note("Cb4").enharmonic().toString()).toBe("B3");
  });
});

describe("equality vs enharmonic equivalence", () => {
  test("E#4 is enharmonic to F4 but not equal", () => {
    const eSharp = new Note("E#4");
    expect(eSharp.isEnharmonic("F4")).toBe(true);
    expect(eSharp.equals("F4")).toBe(false);
  });

  test("equal spellings", () => {
    expect(new Note("C#4").equals("C#4")).toBe(true);
  });
});

describe("comparison and intervals", () => {
  test("compareTo orders by sounding pitch", () => {
    expect(new Note("C4").compareTo("D4")).toBeLessThan(0);
    expect(new Note("E#4").compareTo("F4")).toBe(0);
  });

  test("intervalTo names the interval", () => {
    const iv = new Note("C4").intervalTo("G4");
    expect(iv).toEqual({ steps: 4, semitones: 7 });
  });
});

describe("serialization", () => {
  test("toJSON emits notation", () => {
    expect(JSON.stringify({ n: new Note("Eb3") })).toBe('{"n":"Eb3"}');
  });
});
