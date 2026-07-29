/**
 * Phase 1: the analysis and MIDI layers accept plain note objects and
 * strings — no Note construction required at the boundary.
 */
import { describe, expect, test } from "bun:test";
import { noteStreamToMidi } from "../midi/convert";
import { detectChordAt, notesSoundingAt, segmentChords } from "./chords";
import { analyzeHarmony } from "./harmony";
import { pitchClassWeightsFromStream } from "./key";
import type { NoteStreamInput } from "./types";

const plainStream: NoteStreamInput = [
  { pitch: "C4", start: 0, duration: 1 },
  { pitch: { step: 2 }, start: 0, duration: 1 }, // E4 as a bare POJO
  { pitch: "G4", start: 0, duration: 1 },
  { pitch: "G3", start: 1, duration: 1 },
  { pitch: "B3", start: 1, duration: 1 },
  { pitch: "D4", start: 1, duration: 1 },
];

describe("analysis over plain-data streams", () => {
  test("notesSoundingAt normalises pitches", () => {
    expect(notesSoundingAt(plainStream, 0.5).map(String)).toEqual([
      "C4",
      "E4",
      "G4",
    ]);
  });

  test("detectChordAt identifies chords from strings and POJOs", () => {
    expect(detectChordAt(plainStream, 0)?.toString()).toBe("C");
    expect(detectChordAt(plainStream, 1)?.toString()).toBe("G");
  });

  test("segmentChords works end to end", () => {
    const spans = segmentChords(plainStream, [0, 1, 2]);
    expect(spans.map((s) => s.chord?.toString())).toEqual(["C", "G"]);
  });

  test("pitchClassWeightsFromStream counts durations", () => {
    const w = pitchClassWeightsFromStream(plainStream);
    expect(w[0]).toBe(1); // C
    expect(w[7]).toBe(2); // G in both events
  });

  test("analyzeHarmony accepts a KeyLike option", () => {
    const result = analyzeHarmony(plainStream, { key: "C major" });
    expect(result.key.toString()).toBe("C major");
    expect(result.timeline[0]?.roman).toBe("I");
  });
});

describe("midi over plain-data streams", () => {
  test("noteStreamToMidi normalises pitches", () => {
    const file = noteStreamToMidi([
      { pitch: "A4", start: 0, duration: 0.5 },
      { pitch: { step: 0, octave: 5 }, start: 0.5, duration: 0.5 },
    ]);
    expect(file.tracks[0]?.notes.map((n) => n.note)).toEqual([69, 72]);
  });
});
