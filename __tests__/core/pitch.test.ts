import { describe, expect, it } from "vitest";

import {
  MusicTheoryError,
  chroma,
  freq,
  fromFreq,
  fromMidi,
  isPitch,
  midi,
  note,
  noteName,
  pitch,
  samePitch,
  sameSpelling,
  semitoneHeight,
  tryNote,
} from "../../src/core";

describe("core/pitch", () => {
  describe("note (parsing)", () => {
    it("parses natural, sharp, flat, and double-accidental names", () => {
      expect(note("C4")).toEqual({ step: 0, alt: 0, oct: 4 });
      expect(note("Eb4")).toEqual({ step: 2, alt: -1, oct: 4 });
      expect(note("F##3")).toEqual({ step: 3, alt: 2, oct: 3 });
      expect(note("Gbbb1")).toEqual({ step: 4, alt: -3, oct: 1 });
      expect(note("B#3")).toEqual({ step: 6, alt: 1, oct: 3 });
    });

    it("parses 'x' as a double sharp", () => {
      expect(note("Fx3")).toEqual({ step: 3, alt: 2, oct: 3 });
      expect(note("Cxx4")).toEqual({ step: 0, alt: 4, oct: 4 });
    });

    it("parses pitch classes (no octave)", () => {
      expect(note("Eb")).toEqual({ step: 2, alt: -1 });
      expect(note("C").oct).toBeUndefined();
    });

    it("parses negative octaves and is case-insensitive on the letter only", () => {
      expect(note("C-1")).toEqual({ step: 0, alt: 0, oct: -1 });
      expect(note("c#4")).toEqual({ step: 0, alt: 1, oct: 4 });
      expect(tryNote("CB4")).toBeNull(); // uppercase B is not a flat
    });

    it("accepts and normalizes Pitch objects", () => {
      expect(note(note("C4"))).toEqual({ step: 0, alt: 0, oct: 4 });
      expect(note({ step: 2, alt: -1, oct: 4 })).toEqual(note("Eb4"));
    });

    it("returns frozen values and caches repeated parses", () => {
      expect(Object.isFrozen(note("C4"))).toBe(true);
      expect(note("C4")).toBe(note("C4")); // same object from cache
    });

    it("survives cache overflow", () => {
      for (let i = 0; i <= 10_050; i++) tryNote(`C${i}`);
      expect(noteName(note("C4"))).toBe("C4");
    });

    it("rejects invalid input", () => {
      expect(tryNote("H4")).toBeNull();
      expect(tryNote("C#b4")).toBeNull();
      expect(tryNote("C4.5")).toBeNull();
      expect(tryNote("")).toBeNull();
      expect(tryNote(42 as unknown as string)).toBeNull();
      expect(tryNote({ step: 9, alt: 0 } as never)).toBeNull();
      expect(() => note("H4")).toThrow(MusicTheoryError);
    });
  });

  describe("pitch (factory)", () => {
    it("validates its parts", () => {
      expect(() => pitch(7)).toThrow(MusicTheoryError);
      expect(() => pitch(-1)).toThrow(MusicTheoryError);
      expect(() => pitch(0, 1.5)).toThrow(MusicTheoryError);
      expect(() => pitch(0, 0, 4.5)).toThrow(MusicTheoryError);
      expect(() => pitch(0, 0, 4, NaN)).toThrow(MusicTheoryError);
    });

    it("normalizes zero cents to absent", () => {
      expect(pitch(0, 0, 4, 0).cents).toBeUndefined();
      expect(pitch(0, 0, 4, 25).cents).toBe(25);
    });
  });

  describe("isPitch", () => {
    it("guards structurally", () => {
      expect(isPitch(note("C4"))).toBe(true);
      expect(isPitch({ step: 0, alt: 0 })).toBe(true);
      expect(isPitch(null)).toBe(false);
      expect(isPitch("C4")).toBe(false);
      expect(isPitch({ step: "C", alt: 0 })).toBe(false);
    });
  });

  describe("noteName", () => {
    it("round-trips names", () => {
      for (const n of ["C4", "Eb", "F##3", "Bbb2", "C-1", "G9"]) {
        expect(noteName(n)).toBe(n);
      }
    });

    it("formats double sharps as ##", () => {
      expect(noteName("Fx3")).toBe("F##3");
    });
  });

  describe("chroma / semitoneHeight / midi", () => {
    it("computes chroma from the spelling", () => {
      expect(chroma("C")).toBe(0);
      expect(chroma("B#")).toBe(0);
      expect(chroma("Cb")).toBe(11);
      expect(chroma("Dbb")).toBe(0);
      expect(chroma("B#3")).toBe(0);
      expect(chroma("F#4")).toBe(6);
    });

    it("computes spelled height (enharmonics agree)", () => {
      expect(semitoneHeight("C4")).toBe(60);
      expect(semitoneHeight("B#3")).toBe(60);
      expect(semitoneHeight("Cb4")).toBe(59);
      expect(semitoneHeight("Eb")).toBeNull();
    });

    it("returns midi only within 0-127", () => {
      expect(midi("C4")).toBe(60);
      expect(midi("G9")).toBe(127);
      expect(midi("A9")).toBeNull();
      expect(midi("C-2")).toBeNull();
      expect(midi("C")).toBeNull();
    });
  });

  describe("freq", () => {
    it("computes 12-TET frequencies from A4=440 by default", () => {
      expect(freq("A4")).toBe(440);
      expect(freq("C4")).toBeCloseTo(261.6256, 3);
      expect(freq("A5")).toBe(880);
    });

    it("honors a configurable A4 reference", () => {
      expect(freq("A4", { a4: 432 })).toBe(432);
      expect(freq("C4", { a4: 432 })).toBeCloseTo((432 / 440) * 261.6256, 2);
    });

    it("includes cents deviations", () => {
      const sharpA4 = pitch(5, 0, 4, 50);
      expect(freq(sharpA4)).toBeCloseTo(440 * Math.pow(2, 50 / 1200), 6);
    });

    it("returns null for pitch classes and validates the reference", () => {
      expect(freq("A")).toBeNull();
      expect(() => freq("A4", { a4: 0 })).toThrow(MusicTheoryError);
      expect(() => freq("A4", { a4: -440 })).toThrow(MusicTheoryError);
    });
  });

  describe("fromMidi", () => {
    it("spells with sharps by default and flats on request", () => {
      expect(noteName(fromMidi(60))).toBe("C4");
      expect(noteName(fromMidi(61))).toBe("C#4");
      expect(noteName(fromMidi(61, { prefer: "flat" }))).toBe("Db4");
      expect(noteName(fromMidi(70, { prefer: "flat" }))).toBe("Bb4");
      expect(noteName(fromMidi(0))).toBe("C-1");
      expect(noteName(fromMidi(127))).toBe("G9");
    });

    it("carries an optional cents deviation", () => {
      expect(fromMidi(69, { cents: 12 }).cents).toBe(12);
    });

    it("rejects out-of-range or fractional values", () => {
      expect(() => fromMidi(-1)).toThrow(MusicTheoryError);
      expect(() => fromMidi(128)).toThrow(MusicTheoryError);
      expect(() => fromMidi(60.5)).toThrow(MusicTheoryError);
    });
  });

  describe("fromFreq", () => {
    it("finds the nearest pitch and keeps the deviation in cents", () => {
      expect(sameSpelling(fromFreq(440), "A4")).toBe(true);
      expect(fromFreq(440).cents).toBeUndefined();
      const a4Sharp = fromFreq(445);
      expect(noteName(a4Sharp)).toBe("A4");
      expect(a4Sharp.cents).toBeCloseTo(19.56, 1);
      expect(noteName(fromFreq(261.6256))).toBe("C4");
    });

    it("honors A4 reference and spelling preference", () => {
      expect(sameSpelling(fromFreq(432, { a4: 432 }), "A4")).toBe(true);
      expect(noteName(fromFreq(277.18, { prefer: "flat" }))).toBe("Db4");
    });

    it("rejects non-positive or out-of-range frequencies", () => {
      expect(() => fromFreq(0)).toThrow(MusicTheoryError);
      expect(() => fromFreq(-5)).toThrow(MusicTheoryError);
      expect(() => fromFreq(NaN)).toThrow(MusicTheoryError);
      expect(() => fromFreq(4)).toThrow(MusicTheoryError); // below MIDI range
    });
  });

  describe("sameSpelling / samePitch", () => {
    it("sameSpelling requires identical spelling, octave, and cents", () => {
      expect(sameSpelling("C4", "C4")).toBe(true);
      expect(sameSpelling("C4", "B#3")).toBe(false);
      expect(sameSpelling("C", "C4")).toBe(false);
      expect(sameSpelling(pitch(0, 0, 4, 10), pitch(0, 0, 4, 10))).toBe(true);
      expect(sameSpelling(pitch(0, 0, 4, 10), "C4")).toBe(false);
    });

    it("samePitch accepts enharmonic equivalents", () => {
      expect(samePitch("C4", "B#3")).toBe(true);
      expect(samePitch("Cb", "B")).toBe(true);
      expect(samePitch("C4", "Db4")).toBe(false);
      expect(samePitch("C", "C4")).toBe(false);
      expect(samePitch(pitch(0, 0, 4, 10), "C4")).toBe(false);
    });
  });
});
