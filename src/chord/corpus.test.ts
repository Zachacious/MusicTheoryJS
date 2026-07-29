/**
 * The chord dictionary tested against a corpus of real-world chord symbols.
 *
 * Two layers:
 * 1. A curated corpus of symbols as they appear on charts and lead sheets —
 *    every one must parse, and spot checks pin the notes.
 * 2. An exhaustive differential sweep: every suffix the dictionary accepts is
 *    applied to several roots and, where the reference implementation
 *    (dev-dependency only) understands the same symbol, the resulting
 *    pitch spellings must agree exactly.
 */
import { describe, expect, test } from "bun:test";
import { Chord as RefChord } from "tonal";
import { detectQuality } from "./analysis";
import { Chord } from "./chord";
import { normalizeChordQuality, tryParseChordSymbol } from "./parse";
import { CHORD_DEFINITIONS } from "./templates";

/** Symbols pulled from the wild: jazz charts, pop/rock tabs, hymnals. */
const CORPUS: readonly string[] = [
  // Plain triads and power chords
  "C",
  "F#",
  "Bb",
  "Ebm",
  "G#m",
  "Ddim",
  "Faug",
  "A5",
  "E5",
  // Suspensions
  "Dsus4",
  "Asus2",
  "Gsus",
  "C7sus4",
  "G9sus4",
  "D13sus4",
  "E7sus",
  "F#7susb9",
  "Bb9sus",
  "Cmaj7sus4",
  // Sixths
  "C6",
  "Am6",
  "F6/9",
  "Bbm6/9",
  "G69",
  "Db6add9",
  "E6#11",
  // Sevenths
  "G7",
  "Cmaj7",
  "Am7",
  "Bm7b5",
  "C#dim7",
  "FmMaj7",
  "Baug7",
  "Eb7b5",
  "AbmM7",
  "DΔ",
  "EΔ7",
  "F#ø",
  "Gø7",
  "Ch7",
  "D-7",
  "F^7",
  "B^",
  // Ninths
  "C9",
  "Fmaj9",
  "Dm9",
  "Eadd9",
  "Gadd2",
  "A2",
  "Bbmadd9",
  "EbM9",
  "F#m9",
  "Ab^9",
  "Dmaj9#11",
  // Elevenths and thirteenths
  "C11",
  "Gm11",
  "Fmaj11",
  "D13",
  "Abmaj13",
  "Em13",
  "Bb13sus4",
  "Cmaj13#11",
  "G13#11",
  "F-11",
  "A-13",
  // Altered dominants
  "G7b9",
  "C7#9",
  "E7#9",
  "F7#11",
  "B7b13",
  "D7b5",
  "Ab7#5",
  "C7+",
  "G7alt",
  "Dalt7",
  "F13b9",
  "A13#9",
  "E7b9b13",
  "Bb7#5#9",
  "D7#5b9",
  "G7b9#11",
  "C9b5",
  "F9#5",
  "Baug9",
  "E9#11",
  "A9b13",
  "C13b5",
  "G7#9b13",
  "D7b9#9",
  // Unicode accidentals in the suffix
  "C7♭9",
  "G7♯11",
  "Fmaj7♯5",
  // add / no-five / quartal colours
  "Cmadd4",
  "Gm7add11",
  "F+add9",
  "D+add#9",
  "E7no5",
  "A9no5",
  "C13no5",
  "Gquartal",
  "D4",
  // Minor-major and darker colours
  "CmMaj9",
  "FmMaj11",
  "BbmMaj13",
  "Am#5",
  "Emb6M7",
  "Dmb6b9",
  "GdimMaj7",
  "Co7M7",
  "Fm9b5",
  "Cm7#5",
  "Gm9#5",
  "AmMaj7b6",
  "EmMaj9b6",
] as const;

describe("real-world chord symbol corpus", () => {
  test("every corpus symbol parses", () => {
    const failures = CORPUS.filter((s) => tryParseChordSymbol(s) === null);
    expect(failures).toEqual([]);
  });

  test("spot-check corpus spellings", () => {
    const names = (symbol: string) =>
      Chord.from(symbol).notes.map((n) => n.toString({ octave: false }));
    expect(names("C11")).toEqual(["C", "G", "Bb", "D", "F"]);
    expect(names("G7alt")).toEqual(["G", "B", "D#", "F", "A#"]);
    expect(names("F#ø")).toEqual(["F#", "A", "C", "E"]);
    expect(names("Bb13sus4")).toEqual(["Bb", "Eb", "F", "Ab", "C", "G"]);
    expect(names("D+add#9")).toEqual(["D", "F#", "A#", "E#"]);
    expect(names("Emb6M7")).toEqual(["E", "G", "C", "D#"]);
    expect(names("C7♭9")).toEqual(["C", "E", "G", "Bb", "Db"]);
  });
});

describe("chord dictionary invariants", () => {
  test("the dictionary holds 108 qualities", () => {
    expect(CHORD_DEFINITIONS.length).toBe(108);
  });

  test("canonical names are unique", () => {
    const names = CHORD_DEFINITIONS.map((def) => def.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test("every template starts on the root and ascends strictly", () => {
    for (const def of CHORD_DEFINITIONS) {
      const semitones = def.intervals.map((iv) => iv.semitones);
      expect(semitones[0]).toBe(0);
      for (let i = 1; i < semitones.length; i++) {
        expect(semitones[i]).toBeGreaterThan(semitones[i - 1] as number);
      }
    }
  });

  test("qualities sharing a pitch-class set resolve to the earlier entry", () => {
    // These pairs are deliberate homophones; detection reports the
    // first-listed (long-established or more idiomatic) quality.
    expect(detectQuality([0, 4, 8, 10])).toBe("aug7"); // not dom7b13
    expect(detectQuality([0, 4, 8, 11])).toBe("maj7s5"); // not maj7b6
    expect(detectQuality([0, 2, 4, 7, 9, 11])).toBe("maj13"); // not maj7add13
    expect(detectQuality([0, 2, 5, 7, 10])).toBe("dom11"); // not dom9sus4
    expect(detectQuality([0, 2, 4, 8, 10])).toBe("dom9s5"); // not dom9b13
    expect(detectQuality([0, 1, 5, 7, 10])).toBe("dom7sus4b9"); // not dom11b9
  });
});

/** Sorted, octave-free spellings of a chord's tones. */
function ourNoteSet(symbol: string): string[] {
  return Chord.from(symbol)
    .notes.map((n) => n.toString({ octave: false }))
    .sort();
}

describe("differential sweep: every accepted suffix vs the reference", () => {
  const ROOTS = ["C", "F#", "Bb"] as const;
  /** Deliberate divergences from the reference, with reasons. */
  const SKIP = new Set<string>([]);

  for (const def of CHORD_DEFINITIONS) {
    const suffixes = new Set([def.name, def.suffix, ...def.aliases]);
    for (const suffix of suffixes) {
      test(`${def.name} via "${suffix}"`, () => {
        // A leading-"b" alias (e.g. "b9sus") is swallowed by the root's
        // greedy accidental parsing in a full symbol — as any reader would:
        // "Bb9sus" is Bb9sus4. Such aliases work as quality names only.
        if (suffix.startsWith("b")) {
          expect(normalizeChordQuality(suffix)).toBe(def.name);
          return;
        }
        for (const root of ROOTS) {
          const symbol = `${root}${suffix}`;
          if (SKIP.has(symbol)) continue;
          const ours = tryParseChordSymbol(symbol);
          expect(ours?.quality).toBe(def.name);
          const ref = RefChord.get(symbol);
          if (ref.empty || ref.notes.length === 0) continue;
          expect(ourNoteSet(symbol)).toEqual([...ref.notes].sort());
        }
      });
    }
  }
});
