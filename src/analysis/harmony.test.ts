import { describe, expect, test } from "bun:test";
import { Chord } from "../chord/chord";
import { Key } from "../key/key";
import { Note } from "../note/note";
import {
  analyzeHarmony,
  detectCadences,
  harmonicRhythm,
  romanProgression,
} from "./harmony";
import type { NoteStream } from "./types";

const cMajor = Key.major("C");

describe("romanProgression", () => {
  test("labels a I-V-vi-IV in C", () => {
    const chords = ["C", "G", "Am", "F"].map((s) => Chord.from(s));
    expect(romanProgression(chords, cMajor)).toEqual(["I", "V", "vi", "IV"]);
  });

  test("preserves nulls", () => {
    expect(romanProgression([Chord.from("C"), null], cMajor)).toEqual([
      "I",
      null,
    ]);
  });
});

describe("detectCadences", () => {
  test("authentic V-I", () => {
    const chords = ["C", "F", "G", "C"].map((s) => Chord.from(s));
    expect(detectCadences(chords, cMajor)).toContainEqual({
      type: "authentic",
      index: 2,
    });
  });

  test("plagal IV-I", () => {
    const chords = ["C", "F", "C"].map((s) => Chord.from(s));
    expect(detectCadences(chords, cMajor)).toContainEqual({
      type: "plagal",
      index: 1,
    });
  });

  test("deceptive V-vi", () => {
    const chords = ["C", "G", "Am"].map((s) => Chord.from(s));
    expect(detectCadences(chords, cMajor)).toContainEqual({
      type: "deceptive",
      index: 1,
    });
  });

  test("half cadence ending on V", () => {
    const chords = ["C", "Am", "F", "G"].map((s) => Chord.from(s));
    expect(detectCadences(chords, cMajor)).toContainEqual({
      type: "half",
      index: 3,
    });
  });
});

describe("harmonicRhythm", () => {
  test("durations and mean", () => {
    const r = harmonicRhythm([
      { start: 0, end: 2, chord: null },
      { start: 2, end: 6, chord: null },
    ]);
    expect(r.durations).toEqual([2, 4]);
    expect(r.mean).toBe(3);
  });
});

describe("analyzeHarmony end-to-end", () => {
  const stream: NoteStream = [
    { pitch: new Note("C4"), start: 0, duration: 2 },
    { pitch: new Note("E4"), start: 0, duration: 2 },
    { pitch: new Note("G4"), start: 0, duration: 2 },
    { pitch: new Note("G4"), start: 2, duration: 2 },
    { pitch: new Note("B4"), start: 2, duration: 2 },
    { pitch: new Note("D5"), start: 2, duration: 2 },
    { pitch: new Note("C4"), start: 4, duration: 2 },
    { pitch: new Note("E4"), start: 4, duration: 2 },
    { pitch: new Note("G4"), start: 4, duration: 2 },
  ];

  test("detects key, labels romans, and finds the authentic cadence", () => {
    const result = analyzeHarmony(stream, { key: cMajor });
    expect(result.timeline.map((s) => s.roman)).toEqual(["I", "V", "I"]);
    expect(result.cadences).toContainEqual({ type: "authentic", index: 1 });
  });

  test("auto-detects the key when none is given", () => {
    // Tonic-emphasised so key detection is unambiguous (long C chords).
    const cHeavy: NoteStream = [
      { pitch: new Note("C4"), start: 0, duration: 8 },
      { pitch: new Note("E4"), start: 0, duration: 8 },
      { pitch: new Note("G4"), start: 0, duration: 8 },
      { pitch: new Note("F4"), start: 8, duration: 2 },
      { pitch: new Note("A4"), start: 8, duration: 2 },
      { pitch: new Note("C5"), start: 8, duration: 2 },
      { pitch: new Note("C4"), start: 10, duration: 8 },
      { pitch: new Note("E4"), start: 10, duration: 8 },
      { pitch: new Note("G4"), start: 10, duration: 8 },
    ];
    const result = analyzeHarmony(cHeavy);
    expect(result.key.toString()).toBe("C major");
    expect(result.timeline.length).toBeGreaterThan(0);
  });
});
