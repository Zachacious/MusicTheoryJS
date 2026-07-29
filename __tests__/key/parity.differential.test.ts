/**
 * Key-module parity against the reference implementation (dev-dependency
 * only). Symbols are compared by *content* (parsed root + pitch-class set)
 * because print conventions differ (we print "CmM7" / "Ebmaj7#5" / "Bdim7"
 * where the reference prints "CmMaj7" / "Eb+maj7" / "Bo7" — same chords).
 *
 * Documented divergence: the reference harmonizes the melodic-minor tonic as
 * m6 (1-3-5-6); we use the strict tertian stack (mM7). Both are standard;
 * ours follows the "stack thirds" rule uniformly.
 */

import { describe, expect, it } from "vitest";
import { Key as RefKey } from "tonal";

import { chord } from "../../src/chord";
import { majorKey, minorKey } from "../../src/key";

const MAJOR_TONICS = ["C", "G", "D", "A", "E", "B", "F#", "Gb", "Db", "Ab", "Eb", "Bb", "F"];
const MINOR_TONICS = ["A", "E", "B", "F#", "C#", "G#", "D", "G", "C", "F", "Bb", "Eb"];

/** Root + chroma fingerprint of a chord symbol; "" stays "". */
function content(symbol: string): string {
  if (symbol === "") return "";
  const c = chord(symbol);
  return `${c.root}:${c.chroma}`;
}

const contentOf = (symbols: readonly string[]): string[] => symbols.map(content);

/** Uppercase, marker-stripped grade for cross-style comparison. */
const gradeOf = (g: string): string => g.replace(/[°ø+]/g, "").toUpperCase();

describe("major key parity", () => {
  for (const tonic of MAJOR_TONICS) {
    it(`${tonic} major matches the reference`, () => {
      const ours = majorKey(tonic);
      const ref = RefKey.majorKey(tonic);
      expect(ours.scale).toEqual([...ref.scale]);
      expect(ours.alteration).toBe(ref.alteration);
      expect(ours.keySignature).toBe(ref.keySignature);
      expect(ours.minorRelative).toBe(ref.minorRelative);
      expect(ours.grades.map(gradeOf)).toEqual(ref.grades.map(gradeOf));
      expect(contentOf(ours.triads)).toEqual(contentOf([...ref.triads]));
      expect(contentOf(ours.chords)).toEqual(contentOf([...ref.chords]));
      expect(ours.chordsHarmonicFunction).toEqual([...ref.chordsHarmonicFunction]);
      expect(ours.chordScales).toEqual([...ref.chordScales]);
      expect(contentOf(ours.secondaryDominants)).toEqual(contentOf([...ref.secondaryDominants]));
      expect(contentOf(ours.secondaryDominantSupertonics)).toEqual(
        contentOf([...ref.secondaryDominantSupertonics])
      );
      expect(contentOf(ours.substituteDominants)).toEqual(contentOf([...ref.substituteDominants]));
      expect(contentOf(ours.substituteDominantSupertonics)).toEqual(
        contentOf([...ref.substituteDominantSupertonics])
      );
    });
  }
});

describe("minor key parity", () => {
  for (const tonic of MINOR_TONICS) {
    it(`${tonic} minor matches the reference`, () => {
      const ours = minorKey(tonic);
      const ref = RefKey.minorKey(tonic);
      expect(ours.alteration).toBe(ref.alteration);
      expect(ours.keySignature).toBe(ref.keySignature);
      expect(ours.relativeMajor).toBe(ref.relativeMajor);
      for (const variant of ["natural", "harmonic", "melodic"] as const) {
        const o = ours[variant];
        const r = ref[variant];
        expect(o.scale, `${variant} scale`).toEqual([...r.scale]);
        expect(o.grades.map(gradeOf), `${variant} grades`).toEqual(
          [...r.grades].map(gradeOf)
        );
        expect(contentOf(o.triads), `${variant} triads`).toEqual(contentOf([...r.triads]));
        const ourChords = contentOf(o.chords);
        const refChords = contentOf([...r.chords]);
        if (variant === "melodic") {
          // Documented divergence on the tonic chord (mM7 vs m6).
          expect(ourChords.slice(1), "melodic chords 2-7").toEqual(refChords.slice(1));
          expect(o.chords[0]).toBe(`${o.tonic}mM7`);
        } else {
          expect(ourChords, `${variant} chords`).toEqual(refChords);
        }
        expect(
          contentOf(o.secondaryDominants),
          `${variant} secondary dominants`
        ).toEqual(contentOf([...r.secondaryDominants]));
        expect(
          contentOf(o.substituteDominants),
          `${variant} substitute dominants`
        ).toEqual(contentOf([...r.substituteDominants]));
      }
    });
  }
});
