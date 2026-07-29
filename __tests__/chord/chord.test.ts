import { describe, expect, it } from "vitest";

import { MusicTheoryError, note } from "../../src/core";
import {
  chord,
  chordNotes,
  isChord,
  resolveChordQuality,
  suggestChordQuality,
  tokenizeChordSymbol,
  transposeChord,
  tryChord,
} from "../../src/chord";

describe("chord()", () => {
  it("builds a rich frozen value from a symbol", () => {
    const c = chord("Cm7b5");
    expect(c.symbol).toBe("Cm7b5");
    expect(c.root).toBe("C");
    expect(c.type).toBe("half-diminished");
    expect(c.quality).toBe("m7b5");
    expect(c.notes).toEqual(["C", "Eb", "Gb", "Bb"]);
    expect(c.intervals).toEqual(["P1", "m3", "d5", "m7"]);
    expect(Object.isFrozen(c)).toBe(true);
    expect(Object.isFrozen(c.notes)).toBe(true);
  });

  it("accepts root + quality, including Pitch roots", () => {
    expect(chord("C", "maj7").symbol).toBe("Cmaj7");
    expect(chord(note("Eb"), "m7").notes).toEqual(["Eb", "Gb", "Bb", "Db"]);
    expect(chord(note("D4"), "m").notes).toEqual(["D", "F", "A"]);
  });

  it("normalizes symbols (case, synonyms, glyphs)", () => {
    expect(chord("cmaj7").symbol).toBe("Cmaj7");
    expect(chord("CΔ").symbol).toBe("Cmaj7");
    expect(chord("Cmin6").symbol).toBe("Cm6");
    expect(chord("Cdom7").symbol).toBe("C7");
    expect(chord("Cmaj").symbol).toBe("C");
  });

  it("keeps slash basses and reports them", () => {
    const c = chord("Am7/G");
    expect(c.bass).toBe("G");
    expect(c.symbol).toBe("Am7/G");
    expect(c.notes).toEqual(["A", "C", "E", "G"]);
    expect(chord("C/E").bass).toBe("E");
  });

  it("prefers slash-containing aliases over slash basses", () => {
    expect(chord("C6/9").bass).toBeUndefined();
    expect(chord("Cm/maj7").bass).toBeUndefined();
  });

  it("round-trips through its own symbol and object", () => {
    for (const symbol of ["Cm7b5", "F#7#9", "Bbmaj13#11", "Am7/G", "Ebdim7"]) {
      const c = chord(symbol);
      expect(chord(c.symbol).symbol).toBe(c.symbol);
      expect(chord(c).symbol).toBe(c.symbol);
    }
  });

  it("normalizes an octave-bearing root to a pitch class", () => {
    expect(chord("C4", "maj7").root).toBe("C");
    expect(chord(note("C4"), "maj7").root).toBe("C");
  });

  it("throws with suggestions on unknown qualities", () => {
    expect(() => chord("Cmaj7b")).toThrow(MusicTheoryError);
    expect(() => chord("Cmaj7x")).toThrow('did you mean "maj7"?');
    expect(tryChord("Cmaj7x")).toBeNull();
  });

  it("isChord() guards", () => {
    expect(isChord(chord("C7"))).toBe(true);
    expect(isChord({})).toBe(false);
    expect(isChord("C7")).toBe(false);
  });
});

describe("transposeChord()", () => {
  it("transposes root and bass with exact spelling", () => {
    expect(transposeChord("Cm7", "M2").symbol).toBe("Dm7");
    expect(transposeChord("Cm7/Bb", "M2").symbol).toBe("Dm7/C");
    expect(transposeChord("Ebmaj7", "P5").symbol).toBe("Bbmaj7");
    expect(transposeChord("G#m", "M3").symbol).toBe("B#m");
  });
});

describe("chordNotes()", () => {
  it("realizes ascending voicings from the given octave", () => {
    expect(chordNotes("Cmaj9", 4)).toEqual(["C4", "E4", "G4", "B4", "D5"]);
    expect(chordNotes("Bm7", 3)).toEqual(["B3", "D4", "F#4", "A4"]);
    expect(chordNotes("C13", 4)).toEqual(["C4", "E4", "G4", "Bb4", "D5", "A5"]);
  });
});

describe("quality resolution helpers", () => {
  it("resolveChordQuality() finds aliases through normalization", () => {
    expect(resolveChordQuality("maj7")?.name).toBe("major seventh");
    expect(resolveChordQuality("MAJ7")?.name).toBe("major seventh");
    expect(resolveChordQuality("m(maj7)")?.name).toBe("minor/major seventh");
    expect(resolveChordQuality("min6")?.name).toBe("minor sixth");
    expect(resolveChordQuality("dom7")?.name).toBe("dominant seventh");
    expect(resolveChordQuality("")?.name).toBe("major");
    expect(resolveChordQuality("nope")).toBeNull();
  });

  it("never resolves ambiguous case variants", () => {
    // "M7" (major seventh) and "m7" (minor seventh) collide in lowercase;
    // both resolve case-sensitively, and neither hijacks the other.
    expect(resolveChordQuality("M7")?.name).toBe("major seventh");
    expect(resolveChordQuality("m7")?.name).toBe("minor seventh");
  });

  it("suggestChordQuality() proposes near misses", () => {
    expect(suggestChordQuality("maj7x")).toBe("maj7");
    expect(suggestChordQuality("zzzzzz")).toBeNull();
  });

  it("tokenizeChordSymbol() splits root/quality/bass", () => {
    expect(tokenizeChordSymbol("F#m7/E")).toEqual({
      root: "F#",
      type: expect.objectContaining({ name: "minor seventh" }),
      bass: "E",
    });
    expect(tokenizeChordSymbol("N.C.")).toEqual({ reason: "no-chord" });
    expect(tokenizeChordSymbol("?x")).toEqual({ reason: "bad-root" });
    expect(tokenizeChordSymbol("Cwat")).toEqual({
      reason: "bad-quality",
      quality: "wat",
    });
  });
});
