/**
 * Cross-module property sweeps: invariants checked across the *entire*
 * dictionary and key space, not spot examples. These exist because a spot
 * corpus missed the Cb9sus display-alias collision (a generated symbol that
 * re-parsed as a different chord).
 */

import { describe, expect, it } from "vitest";

import { note, semitoneHeight } from "../src/core";
import { CHORD_TYPES, SCALE_TYPES, chordDisplayAlias } from "../src/dict";
import { chord, chordNotes, transposeChord } from "../src/chord";
import { modes, scale } from "../src/scale";
import { majorKey, minorKey } from "../src/key";
import { chordToRoman, romanToChord } from "../src/roman";
import { frequency, resolveTuning, tuningNames } from "../src/tuning";

const ROOTS = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "Bb", "B", "Cb", "B#"];

describe("chord dictionary sweeps", () => {
  it("every display symbol parses back to the same type on every root", () => {
    for (const type of CHORD_TYPES) {
      const alias = chordDisplayAlias(type);
      for (const root of ROOTS) {
        const c = chord(`${root}${alias}`);
        expect(c.chroma, `${root}${alias}`).toBe(type.chroma);
        expect(c.root, `${root}${alias}`).toBe(root);
        expect(chord(c.symbol).chroma, c.symbol).toBe(type.chroma);
      }
    }
  });

  it("chordNotes() is strictly ascending for every type", () => {
    for (const type of CHORD_TYPES) {
      const names = chordNotes(`C${chordDisplayAlias(type)}`, 4);
      const heights = names.map((n) => semitoneHeight(note(n)) as number);
      for (let i = 1; i < heights.length; i++) {
        expect(heights[i], names.join(" ")).toBeGreaterThan(heights[i - 1]);
      }
    }
  });

  it("transposeChord() up-then-down is the identity", () => {
    for (const symbol of ["Cm7b5", "F#13#11", "Ebdim7/Bbb", "Am7/G", "C7b9sus"]) {
      const there = transposeChord(symbol, "A4");
      expect(transposeChord(there, "-A4").symbol).toBe(chord(symbol).symbol);
    }
  });
});

describe("scale dictionary sweeps", () => {
  it("every mode of every scale type is the parent's rotation, on any tonic", () => {
    for (const type of SCALE_TYPES) {
      for (const tonic of ["C", "F#", "Cb"]) {
        const s = scale(tonic, type.name);
        const ms = modes(s);
        ms.forEach((m, i) => {
          const rotation = [...s.notes.slice(i), ...s.notes.slice(0, i)];
          expect(m.notes, `${s.name} mode ${i + 1}`).toEqual(rotation);
        });
      }
    }
  });
});

describe("roman round-trip sweeps", () => {
  const MAJOR_TONICS = ["C", "G", "D", "A", "E", "B", "F#", "Gb", "Db", "Ab", "Eb", "Bb", "F"];

  it("every diatonic triad/seventh and secondary dominant round-trips in every major key", () => {
    for (const tonic of MAJOR_TONICS) {
      const keyName = `${tonic} major`;
      const k = majorKey(tonic);
      for (const symbol of [...k.triads, ...k.chords]) {
        const r = chordToRoman(symbol, keyName);
        expect(romanToChord(r, keyName).symbol, `${symbol} in ${keyName}`).toBe(symbol);
      }
      for (const symbol of k.secondaryDominants) {
        if (symbol === "") continue;
        const r = chordToRoman(symbol, keyName);
        expect(r.secondary, `${symbol} in ${keyName} must be applied`).not.toBeNull();
        expect(romanToChord(r, keyName).symbol).toBe(symbol);
      }
    }
  });

  it("natural and harmonic minor chords round-trip in every minor key", () => {
    for (const tonic of ["A", "E", "B", "F#", "C#", "D", "G", "C", "F", "Bb"]) {
      const keyName = `${tonic} minor`;
      const k = minorKey(tonic);
      for (const symbol of [...k.natural.chords, ...k.harmonic.chords]) {
        const r = chordToRoman(symbol, keyName);
        expect(romanToChord(r, keyName).symbol, `${symbol} in ${keyName}`).toBe(symbol);
      }
    }
  });
});

describe("tuning sweeps", () => {
  it("A4 stays pinned to the stored reference and octaves double, in every registered tuning", () => {
    for (const name of tuningNames()) {
      const t = resolveTuning(name);
      expect(frequency("A4", t), name).toBeCloseTo(t.a4, 9);
      const c4 = frequency("C4", t);
      const c5 = frequency("C5", t);
      if (c4 !== null && c5 !== null) {
        expect(c5 / c4, name).toBeCloseTo(2, 12);
      }
    }
  });
});
