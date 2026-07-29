/**
 * Detection-parity corpus: every dictionary entry is rendered as notes and
 * fed to both our detector and the reference implementation (dev-dependency
 * only). Coverage must be at least the reference's, and the reference's top
 * answer must appear in our ranking.
 */
import { describe, expect, it } from "vitest";
import { Chord as RefChord, ChordType as RefChordType, Scale as RefScale, ScaleType as RefScaleType } from "tonal";

import { noteName, transpose } from "../../src/core";
import { chord } from "../../src/chord";
import { chromaFromNotes } from "../../src/pcset";
import {
  CHORD_TYPES,
  SCALE_TYPES,
  detectChords,
  detectScales,
  getScaleType,
} from "../../src/dict";

function notesFromC(intervals: readonly string[]): string[] {
  return intervals.map((i) => noteName(transpose("C", i)));
}

describe("dictionary parity with the reference", () => {
  it("covers at least as many types as the reference", () => {
    expect(CHORD_TYPES.length).toBeGreaterThanOrEqual(RefChordType.all().length);
    expect(SCALE_TYPES.length).toBeGreaterThanOrEqual(RefScaleType.all().length);
  });

  it("detects every scale type exactly, agreeing with the reference", () => {
    const failures: string[] = [];
    for (const entry of SCALE_TYPES) {
      const notes = notesFromC(entry.intervals);
      const ours = detectScales(notes)[0];
      if (
        ours === undefined ||
        !ours.exact ||
        ours.tonic !== "C" ||
        getScaleType(ours.type)?.chroma !== entry.chroma
      ) {
        failures.push(`${entry.name}: ours=${JSON.stringify(ours)}`);
        continue;
      }
      const theirs = RefScale.detect(notes);
      if (
        !theirs.includes(`C ${ours.type}`) &&
        !theirs.includes(`C ${entry.name}`)
      ) {
        failures.push(`${entry.name}: ref=${JSON.stringify(theirs.slice(0, 3))}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("ranks the reference's top chord answer within our results", () => {
    // Symbols are print conventions ("CM" vs "C", "Cm/ma7" vs "CmM7"), so
    // each side is fingerprinted by its OWN parse (root + root-relative
    // pitch-class set). The reference even prints root-ambiguous symbols
    // ("Cb9sus" meaning C, not Cb), so its symbols must never be read by
    // our tokenizer.
    const fingerprint = (symbol: string): string => {
      const c = chord(symbol);
      return `${c.root}:${c.chroma}`;
    };
    const refFingerprint = (symbol: string): string => {
      const rc = RefChord.get(symbol);
      const chromaInt = [...rc.chroma].reduce(
        (acc, bit, i) => acc | (bit === "1" ? 1 << i : 0),
        0
      );
      return `${rc.tonic ?? ""}:${chromaInt}`;
    };
    const failures: string[] = [];
    let skipped = 0;
    let refSelfInconsistent = 0;
    for (const entry of CHORD_TYPES) {
      const notes = notesFromC(entry.intervals);
      const theirs = RefChord.detect(notes);
      if (theirs.length === 0) {
        skipped++;
        continue;
      }
      // Documented divergence: the reference sometimes prints a symbol its
      // own parser reads as a different chord ("Cb9sus" for a C-rooted
      // b9sus — Chord.get returns a Cb chord). Such answers carry no usable
      // meaning, so they are skipped and counted instead of compared.
      const refNotes = RefChord.get(theirs[0]).notes;
      if (chromaFromNotes(refNotes) !== chromaFromNotes(notes)) {
        refSelfInconsistent++;
        continue;
      }
      const ourSymbols = detectChords(notes, { maxResults: 8 }).map((m) => m.symbol);
      if (!ourSymbols.map(fingerprint).includes(refFingerprint(theirs[0]))) {
        failures.push(
          `${entry.aliases[0] ?? entry.name}: ref=${theirs[0]} ours=${ourSymbols.join(",")}`
        );
      }
    }
    expect(failures).toEqual([]);
    expect(skipped).toBe(0);
    expect(refSelfInconsistent).toBe(2); // the two b9sus-set entries
  });
});
