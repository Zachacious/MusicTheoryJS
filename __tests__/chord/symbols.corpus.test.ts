/**
 * The chord-symbol corpus: ≥150 real-world symbols either parse to exactly
 * the right notes or throw a helpful error. Includes every symbol the v3
 * audit found rejected or silently mis-parsed (REDESIGN.md defect #5) —
 * most importantly, nothing ever silently falls back to a major triad.
 */

import { describe, expect, it } from "vitest";

import { MusicTheoryError } from "../../src/core";
import { getChordType } from "../../src/dict";
import { chord, tryChord } from "../../src/chord";

const MAJOR_TRIAD_CHROMA = getChordType("major")!.chroma;

/** [symbol, expected notes] — spelling must be exact. */
const EXACT: ReadonlyArray<readonly [string, string]> = [
  // — the audit's reject list (defect #5): all must parse —
  ["Cm6", "C Eb G A"],
  ["Cmin6", "C Eb G A"],
  ["Caug7", "C E G# Bb"],
  ["Cdom7", "C E G Bb"],
  ["CMaj7", "C E G B"],
  ["C5", "C G"],
  ["C7sus", "C F G Bb"],
  ["Cadd2", "C E G D"],
  // — the audit's silent-major defect: C+7 is an augmented seventh —
  ["C+7", "C E G# Bb"],
  // — plain and case variants —
  ["C", "C E G"],
  ["CM", "C E G"],
  ["Cmaj", "C E G"],
  ["cmaj7", "C E G B"],
  ["CMAJ7", "C E G B"],
  ["Cmin", "C Eb G"],
  ["Cmin7", "C Eb G Bb"],
  ["Cmin9", "C Eb G Bb D"],
  ["Cdom9", "C E G Bb D"],
  // — triads and sixths —
  ["Cm", "C Eb G"],
  ["C-", "C Eb G"],
  ["Cdim", "C Eb Gb"],
  ["Co", "C Eb Gb"],
  ["C°", "C Eb Gb"],
  ["Caug", "C E G#"],
  ["C+", "C E G#"],
  ["Csus2", "C D G"],
  ["Csus4", "C F G"],
  ["Csus", "C F G"],
  ["C6", "C E G A"],
  ["C69", "C E G A D"],
  ["C6/9", "C E G A D"],
  ["Cm69", "C Eb G A D"],
  ["Cadd9", "C E G D"],
  ["Cmadd9", "C Eb G D"],
  // — sevenths —
  ["C7", "C E G Bb"],
  ["Cmaj7", "C E G B"],
  ["CΔ", "C E G B"],
  ["C^7", "C E G B"],
  ["Cm7", "C Eb G Bb"],
  ["C-7", "C Eb G Bb"],
  ["Cm7b5", "C Eb Gb Bb"],
  ["Cø", "C Eb Gb Bb"],
  ["Cdim7", "C Eb Gb Bbb"],
  ["C°7", "C Eb Gb Bbb"],
  ["Co7", "C Eb Gb Bbb"],
  ["CmM7", "C Eb G B"],
  ["Cm(maj7)", "C Eb G B"],
  ["CmMaj7", "C Eb G B"],
  ["Cm/maj7", "C Eb G B"],
  ["C7b5", "C E Gb Bb"],
  ["C7#5", "C E G# Bb"],
  ["Cmaj7#5", "C E G# B"],
  ["CM7b5", "C E Gb B"],
  ["C7no5", "C E Bb"],
  // — ninths and beyond —
  ["C9", "C E G Bb D"],
  ["Cmaj9", "C E G B D"],
  ["CΔ9", "C E G B D"],
  ["Cm9", "C Eb G Bb D"],
  ["CmM9", "C Eb G B D"],
  ["C11", "C G Bb D F"],
  ["Cm11", "C Eb G Bb D F"],
  ["C13", "C E G Bb D A"],
  ["Cmaj13", "C E G B D A"],
  ["Cm13", "C Eb G Bb D A"],
  ["C9sus4", "C F G Bb D"],
  ["C13sus", "C F G Bb D A"],
  // — altered dominants (the jazz corpus) —
  ["C7b9", "C E G Bb Db"],
  ["C7#9", "C E G Bb D#"],
  ["C7#11", "C E G Bb F#"],
  ["C7b13", "C E Bb Ab"],
  ["C7alt", "C E G# Bb D#"],
  ["C7#5b9", "C E G# Bb Db"],
  ["C7b9b13", "C E G Bb Db Ab"],
  ["C7b9#11", "C E G Bb Db F#"],
  ["C7#9#11", "C E G Bb D# F#"],
  ["C13b9", "C E G Bb Db A"],
  ["C13#11", "C E G Bb D F# A"],
  ["C13#9", "C E G Bb D# A"],
  ["C7b9sus", "C F G Bb Db"],
  ["Cmaj7#11", "C E G B F#"],
  ["Cmaj9#11", "C E G B D F#"],
  // — spelling stress tests on other roots —
  ["F#m7b5", "F# A C E"],
  ["Bbm7", "Bb Db F Ab"],
  ["Ebmaj7", "Eb G Bb D"],
  ["Abm(maj7)", "Ab Cb Eb G"],
  ["G#7", "G# B# D# F#"],
  ["Dbdim7", "Db Fb Abb Cbb"],
  ["F#7#9", "F# A# C# E G##"],
  ["Cb6", "Cb Eb Gb Ab"],
  ["B#dim", "B# D# F#"],
  // — slash basses and inversions —
  ["Am7/G", "A C E G"],
  ["C/E", "C E G"],
  ["C/G", "C E G"],
  ["G7/B", "G B D F"],
  ["Dm7/C", "D F A C"],
  ["Fmaj7/E", "F A C E"],
];

/** Broad real-world sweep: root × quality, verified against the dictionary. */
const SWEEP_ROOTS = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SWEEP_QUALITIES = ["m", "7", "maj7", "m7", "dim", "aug", "sus4", "6", "m6", "9", "m9", "m7b5", "dim7", "13", "7b9"];

/** [bad symbol, expected message fragment] */
const THROWS: ReadonlyArray<readonly [string, string]> = [
  ["Cmaj7x", 'did you mean "maj7"?'],
  ["Cmick", "Unknown chord quality"],
  ["H7", "Invalid chord symbol"],
  ["", "Invalid chord symbol"],
  ["N.C.", "no-chord marker"],
  ["nc", "no-chord marker"],
  ["Cm7b5x", 'did you mean "m7b5"?'],
];

describe("chord symbol corpus", () => {
  it("covers at least 150 symbols", () => {
    expect(EXACT.length + SWEEP_ROOTS.length * SWEEP_QUALITIES.length).toBeGreaterThanOrEqual(150);
  });

  describe("exact spellings", () => {
    for (const [symbol, notes] of EXACT) {
      it(`${symbol} → ${notes}`, () => {
        expect(chord(symbol).notes.join(" ")).toBe(notes);
      });
    }
  });

  describe("root × quality sweep", () => {
    for (const root of SWEEP_ROOTS) {
      for (const quality of SWEEP_QUALITIES) {
        const symbol = `${root}${quality}`;
        it(`${symbol} parses to the ${quality} dictionary type`, () => {
          const c = chord(symbol);
          expect(c.root).toBe(root);
          expect(c.chroma).toBe(getChordType(quality)!.chroma);
        });
      }
    }
  });

  describe("zero silent-major fallbacks", () => {
    // The only symbols in the corpus that legitimately mean a major triad.
    const MAJOR_OK = new Set(["C", "CM", "Cmaj", "C/E", "C/G"]);

    it("no non-major symbol in the corpus yields a major triad", () => {
      for (const [symbol] of EXACT) {
        if (MAJOR_OK.has(symbol)) continue;
        expect(
          chord(symbol).chroma,
          `${symbol} must not be a bare major triad`
        ).not.toBe(MAJOR_TRIAD_CHROMA);
      }
    });

    it("unknown qualities throw instead of defaulting", () => {
      expect(tryChord("C+7x9")).toBeNull();
      expect(() => chord("Cmick")).toThrow(MusicTheoryError);
    });
  });

  describe("helpful errors", () => {
    for (const [symbol, fragment] of THROWS) {
      it(`${JSON.stringify(symbol)} throws mentioning ${JSON.stringify(fragment)}`, () => {
        expect(() => chord(symbol)).toThrow(MusicTheoryError);
        expect(() => chord(symbol)).toThrow(fragment);
      });
    }
  });
});
