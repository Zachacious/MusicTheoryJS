/**
 * Differential test against the reference implementation (dev-dependency
 * only, never shipped): for every corpus symbol both libraries parse, the
 * spelled notes must agree exactly. Divergences must be either our bug (fix)
 * or a documented improvement (listed in SKIP with the reason).
 */

import { describe, expect, it } from "vitest";
import { Chord as RefChord } from "tonal";

import { chord, tryChord } from "../../src/chord";

const SYMBOLS = [
  "C", "Cm", "Cdim", "Caug", "Csus2", "Csus4", "C5", "C6", "Cm6", "C69",
  "C7", "Cmaj7", "Cm7", "Cm7b5", "Cdim7", "CmM7", "C7b5", "C7#5",
  "C9", "Cmaj9", "Cm9", "C11", "Cm11", "C13", "Cmaj13", "Cm13",
  "C7b9", "C7#9", "C7#11", "C13#11", "Cmaj7#11", "C9sus4", "Cadd9",
  "F#m7", "Bbmaj7", "Eb7", "Abm7b5", "Dbmaj7", "G#m", "Cb7",
  "Bm7b5", "E7#9", "A13", "Ddim7", "Gm69",
];

// Known, deliberate divergences (none currently).
const SKIP = new Set<string>([]);

describe("chord parity vs reference", () => {
  for (const symbol of SYMBOLS) {
    if (SKIP.has(symbol)) continue;
    it(`agrees on ${symbol}`, () => {
      const ref = RefChord.get(symbol);
      if (ref.empty || ref.notes.length === 0) return; // reference can't parse
      const ours = tryChord(symbol);
      expect(ours, `we must parse ${symbol}`).not.toBeNull();
      expect(ours!.notes).toEqual(ref.notes);
    });
  }

  it("parses symbols the reference rejects (our reject-list wins)", () => {
    // These are real-world spellings the reference's tokenizer misses but
    // ours resolves via normalization.
    for (const symbol of ["Cm(maj7)", "Cdom7", "CMAJ7"]) {
      expect(tryChord(symbol), symbol).not.toBeNull();
    }
  });

  it("spells identically on double-accidental territory", () => {
    expect(chord("Dbdim7").notes).toEqual(["Db", "Fb", "Abb", "Cbb"]);
    expect(chord("F#7#9").notes).toEqual(["F#", "A#", "C#", "E", "G##"]);
  });
});
