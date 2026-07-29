import { describe, expect, it } from "vitest";

import { MusicTheoryError, noteName } from "../../src/core";
import {
  analyzeCadences,
  borrowedFrom,
  chordScales,
  chromaticMediants,
  detectCadence,
  detectModulations,
  leadingToneExchange,
  negativeChord,
  negativeNote,
  neoRiemannian,
  parallel,
  relative,
} from "../../src/harmony";

describe("Neo-Riemannian P / L / R", () => {
  it("computes the classic transformations with exact spelling", () => {
    expect(parallel("C").symbol).toBe("Cm");
    expect(parallel("Cm").symbol).toBe("C");
    expect(relative("C").symbol).toBe("Am");
    expect(relative("Am").symbol).toBe("C");
    expect(leadingToneExchange("C").symbol).toBe("Em");
    expect(leadingToneExchange("Em").symbol).toBe("C");
    expect(relative("Eb").symbol).toBe("Cm");
    expect(leadingToneExchange("Ab").symbol).toBe("Cm");
  });

  it("each operation is an involution on every root and mode", () => {
    for (const root of ["C", "F#", "Bb", "Db", "G#", "Cb"]) {
      for (const quality of ["M", "m"]) {
        const c = `${root}${quality === "M" ? "" : "m"}`;
        for (const op of [parallel, relative, leadingToneExchange]) {
          expect(op(op(c)).symbol, `${op.name}(${c})`).toBe(
            root + (quality === "M" ? "" : "m")
          );
        }
      }
    }
  });

  it("composes operation words left-to-right (hexatonic pole = PLP)", () => {
    expect(neoRiemannian("C", "PLP").symbol).toBe("Abm");
    expect(neoRiemannian("C", "PL").symbol).toBe("Ab"); // P then L
    expect(neoRiemannian("C", "LP").symbol).toBe("E"); // L then P
    expect(neoRiemannian("C", "RP").symbol).toBe("A");
  });

  it("rejects non-triads and bad operation words", () => {
    expect(() => parallel("C7")).toThrow(MusicTheoryError);
    expect(() => neoRiemannian("C", "PLX")).toThrow(MusicTheoryError);
  });
});

describe("chromatic mediants", () => {
  it("returns the four same-mode mediants", () => {
    expect(chromaticMediants("C").map((c) => c.symbol)).toEqual(["E", "Eb", "A", "Ab"]);
    expect(chromaticMediants("Am").map((c) => c.symbol)).toEqual(["C#m", "Cm", "F#m", "Fm"]);
  });
});

describe("negative harmony", () => {
  it("reflects pitch classes across the tonic–dominant axis", () => {
    expect(noteName(negativeNote("C", "C major"))).toBe("G");
    expect(noteName(negativeNote("G", "C major"))).toBe("C");
    expect(noteName(negativeNote("E", "C major"))).toBe("Eb");
    expect(noteName(negativeNote("B", "C major"))).toBe("Ab");
    expect(noteName(negativeNote("D", "C major"))).toBe("F");
  });

  it("maps the classic chord pairs in C", () => {
    expect(negativeChord("G7", "C major").symbol).toBe("Fm6");
    expect(negativeChord("C", "C major").symbol).toBe("Cm");
    expect(negativeChord("Dm7", "C major").symbol).toBe("Bb6");
    expect(negativeChord("F", "C major").symbol).toBe("Gm");
  });

  it("reflecting twice returns the original pitch-class content", () => {
    expect(negativeChord(negativeChord("G7", "C major"), "C major").symbol).toBe("G7");
    expect(negativeChord(negativeChord("C", "C major"), "C major").symbol).toBe("C");
    // Dm7's double reflection is the same set, printed as its equal-priority
    // reading F6 (Dm7 and F6 share pitch classes).
    const back = negativeChord(negativeChord("Dm7", "C major"), "C major");
    expect(new Set(back.notes)).toEqual(new Set(["D", "F", "A", "C"]));
  });
});

describe("cadences", () => {
  it("classifies the standard cadences", () => {
    expect(detectCadence("C major", "ii7 V7 I")).toMatchObject({ type: "authentic", perfect: true });
    expect(detectCadence("C major", "I V65 I")).toMatchObject({ type: "authentic", perfect: false });
    expect(detectCadence("C major", "I IV I")).toMatchObject({ type: "plagal" });
    expect(detectCadence("C major", "I V vi")).toMatchObject({ type: "deceptive" });
    expect(detectCadence("C major", "I ii V")).toMatchObject({ type: "half" });
    expect(detectCadence("C major", "I V7 I6")).toMatchObject({ type: "evaded" });
    expect(detectCadence("c minor", "iiø7 V7 i")).toMatchObject({ type: "authentic" });
    expect(detectCadence("C major", "I ii iii")).toBeNull();
  });

  it("finds all cadence points; half only at the end", () => {
    const found = analyzeCadences("C major", "I IV V I vi ii V7 I");
    expect(found).toEqual([
      { type: "authentic", index: 3, perfect: true },
      { type: "authentic", index: 7, perfect: true },
    ]);
    expect(analyzeCadences("C major", "I IV V")[0]).toMatchObject({ type: "half", index: 2 });
  });
});

describe("borrowedFrom()", () => {
  it("identifies mode mixture and leaves the rest alone", () => {
    expect(borrowedFrom("Fm", "C major")).toBe("parallel minor");
    expect(borrowedFrom("Ab", "C major")).toBe("parallel minor");
    expect(borrowedFrom("Bb7", "C major")).toBe("parallel minor");
    expect(borrowedFrom("Dm7", "C major")).toBeNull(); // diatonic
    expect(borrowedFrom("D7", "C major")).toBeNull(); // applied, not borrowed
    expect(borrowedFrom("E", "a minor")).toBeNull(); // harmonic-minor diatonic
  });
});

describe("detectModulations()", () => {
  it("returns one segment for a stable key", () => {
    const segments = detectModulations(["C", "Am", "F", "G7", "C", "Dm7", "G7", "C"]);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ start: 0, end: 7, key: "C major" });
  });

  it("partitions a two-key progression at the pivot", () => {
    const segments = detectModulations([
      "C", "Am", "Dm7", "G7", "C",
      "A7", "D", "Bm", "Em7", "A7", "D",
    ]);
    expect(segments.map((s) => s.key)).toEqual(["C major", "D major"]);
    expect(segments[0].start).toBe(0);
    expect(segments[segments.length - 1].end).toBe(10);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].start).toBe(segments[i - 1].end + 1);
    }
  });
});

describe("chordScales()", () => {
  it("ranks avoid-free scales first", () => {
    expect(chordScales("Dm7")[0].name).toBe("D dorian");
    expect(chordScales("Cmaj7")[0].name).toBe("C lydian");
    expect(chordScales("C7alt")[0].name).toBe("C altered");
    expect(chordScales("Bm7b5")[0].type).toBe("locrian #2");
  });

  it("reports avoid notes (the m9-over-chord-tone rule) on any root", () => {
    const mixo = chordScales("G7", { maxResults: 10 }).find((m) => m.type === "mixolydian");
    expect(mixo).toBeDefined();
    expect(mixo!.avoidNotes).toEqual(["C"]); // the 4th over a dominant
    const dorian = chordScales("Dm7", { maxResults: 3 }).find((m) => m.type === "dorian");
    expect(dorian!.avoidNotes).toEqual([]);
  });

  it("only returns scales that contain the chord", () => {
    for (const match of chordScales("C13", { maxResults: 10 })) {
      const noteSet = new Set(match.notes);
      // Every chord tone appears in the scale (both spelled from C).
      for (const tone of ["C", "E", "Bb", "D", "A"]) {
        expect(noteSet.has(tone), `${match.name} must contain ${tone}`).toBe(true);
      }
    }
  });
});
