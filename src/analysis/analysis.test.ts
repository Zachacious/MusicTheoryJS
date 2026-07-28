import { describe, expect, test } from "bun:test";
import { Note } from "../note/note";
import { detectChordAt, onsetTimes, segmentChords } from "./chords";
import { detectKey, pitchClassWeightsFromStream } from "./key";
import { intervalClassVector, pitchClasses } from "./pcset";
import type { NoteStream } from "./types";

describe("pitch-class set analysis", () => {
  test("pitchClasses is a sorted unique set", () => {
    expect(pitchClasses(["C4", "E4", "G4", "C5"])).toEqual([0, 4, 7]);
  });

  test("interval-class vector of a major triad", () => {
    // C E G -> ic3, ic4, ic5 each once
    expect(intervalClassVector(["C4", "E4", "G4"])).toEqual([0, 0, 1, 1, 1, 0]);
  });

  test("interval-class vector is invariant under transposition", () => {
    expect(intervalClassVector(["D4", "F#4", "A4"])).toEqual(
      intervalClassVector(["C4", "E4", "G4"])
    );
  });

  test("the diminished 7th is all-tritone/minor-third", () => {
    // C Eb Gb A -> ic3 x4, ic6 x2
    expect(intervalClassVector(["C4", "Eb4", "Gb4", "A4"])).toEqual([
      0, 0, 4, 0, 0, 2,
    ]);
  });
});

describe("key detection (Krumhansl-Schmuckler)", () => {
  test("a C major triad reads as C major", () => {
    const [best] = detectKey(["C4", "E4", "G4"]);
    expect(best?.mode).toBe("major");
    expect(best?.tonic).toBe(0);
    expect(best?.key.toString()).toBe("C major");
  });

  test("an A minor triad reads as A minor", () => {
    const [best] = detectKey(["A4", "C5", "E5"]);
    expect(best?.mode).toBe("minor");
    expect(best?.tonic).toBe(9);
  });

  test("a G-major triad detects G major and spells the tonic without accidentals", () => {
    const [best] = detectKey(["G4", "B4", "D5"]);
    expect(best?.mode).toBe("major");
    expect(best?.tonic).toBe(7);
    // Tonic is spelled G (natural), not an enharmonic with extra accidentals.
    expect(best?.key.toString()).toBe("G major");
  });

  test("accepts a raw 12-bin histogram", () => {
    const weights = new Array(12).fill(0);
    weights[0] = 3; // C
    weights[4] = 2; // E
    weights[7] = 2; // G
    expect(detectKey(weights)[0]?.tonic).toBe(0);
  });

  test("returns all 24 keys ranked", () => {
    expect(detectKey(["C4", "E4", "G4"])).toHaveLength(24);
  });
});

describe("harmonic analysis over time", () => {
  // A ii-V-I in C, each chord a whole note (4 time units).
  const stream: NoteStream = [
    { pitch: new Note("D4"), start: 0, duration: 4 },
    { pitch: new Note("F4"), start: 0, duration: 4 },
    { pitch: new Note("A4"), start: 0, duration: 4 },
    { pitch: new Note("G4"), start: 4, duration: 4 },
    { pitch: new Note("B4"), start: 4, duration: 4 },
    { pitch: new Note("D5"), start: 4, duration: 4 },
    { pitch: new Note("C4"), start: 8, duration: 4 },
    { pitch: new Note("E4"), start: 8, duration: 4 },
    { pitch: new Note("G4"), start: 8, duration: 4 },
  ];

  test("detectChordAt finds the sounding chord", () => {
    expect(detectChordAt(stream, 1)?.toString()).toBe("Dm");
    expect(detectChordAt(stream, 5)?.toString()).toBe("G");
    expect(detectChordAt(stream, 9)?.toString()).toBe("C");
  });

  test("onsetTimes finds distinct onsets", () => {
    expect(onsetTimes(stream)).toEqual([0, 4, 8]);
  });

  test("segmentChords produces a chord timeline", () => {
    const spans = segmentChords(stream, [0, 4, 8, 12]);
    expect(spans.map((s) => s.chord?.toString())).toEqual(["Dm", "G", "C"]);
  });

  test("empty span yields a null chord", () => {
    expect(detectChordAt(stream, 100)).toBeNull();
  });

  test("duration weighting feeds key detection", () => {
    // A tonic-emphasised C-major stream (long C chords bracketing an F chord).
    const cStream: NoteStream = [
      { pitch: new Note("C4"), start: 0, duration: 8 },
      { pitch: new Note("E4"), start: 0, duration: 8 },
      { pitch: new Note("G4"), start: 0, duration: 8 },
      { pitch: new Note("F4"), start: 8, duration: 4 },
      { pitch: new Note("A4"), start: 8, duration: 4 },
      { pitch: new Note("C5"), start: 8, duration: 4 },
      { pitch: new Note("C4"), start: 12, duration: 8 },
      { pitch: new Note("E4"), start: 12, duration: 8 },
      { pitch: new Note("G4"), start: 12, duration: 8 },
    ];
    const w = pitchClassWeightsFromStream(cStream);
    expect(detectKey(w)[0]?.key.toString()).toBe("C major");
  });
});
