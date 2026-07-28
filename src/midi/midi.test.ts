import { describe, expect, test } from "bun:test";
import type { NoteStream } from "../analysis/types";
import { Note } from "../note/note";
import {
  bpmToTempo,
  midiToNoteStream,
  noteStreamToMidi,
  secondsPerTick,
  tempoToBpm,
} from "./convert";
import { parseMidi } from "./reader";
import type { MidiFile } from "./types";
import { writeMidi } from "./writer";

const sampleFile: MidiFile = {
  format: 1,
  ppq: 480,
  tempo: 500000,
  tracks: [
    {
      name: "Lead",
      notes: [
        { note: 60, start: 0, duration: 480, velocity: 100, channel: 0 },
        { note: 64, start: 480, duration: 480, velocity: 90, channel: 0 },
        { note: 67, start: 960, duration: 960, velocity: 80, channel: 0 },
        // Overlapping / chord notes at the same tick
        { note: 72, start: 960, duration: 960, velocity: 70, channel: 0 },
      ],
    },
  ],
};

describe("write -> read round-trip", () => {
  test("notes survive a serialise/parse cycle", () => {
    const bytes = writeMidi(sampleFile);
    const parsed = parseMidi(bytes);
    expect(parsed.ppq).toBe(480);
    expect(parsed.tempo).toBe(500000);
    expect(parsed.tracks[0]?.name).toBe("Lead");

    const got = [...(parsed.tracks[0]?.notes ?? [])].sort(
      (a, b) => a.start - b.start || a.note - b.note
    );
    const want = [...(sampleFile.tracks[0]?.notes ?? [])].sort(
      (a, b) => a.start - b.start || a.note - b.note
    );
    expect(got).toEqual(want);
  });

  test("output begins with a valid MThd header", () => {
    const bytes = writeMidi(sampleFile);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe("MThd");
  });

  test("handles large delta times (multi-byte varlen)", () => {
    const file: MidiFile = {
      format: 0,
      ppq: 480,
      tracks: [
        {
          notes: [
            {
              note: 60,
              start: 100000,
              duration: 500,
              velocity: 64,
              channel: 0,
            },
          ],
        },
      ],
    };
    const back = parseMidi(writeMidi(file));
    expect(back.tracks[0]?.notes[0]?.start).toBe(100000);
  });

  test("rejects non-MIDI input", () => {
    expect(() => parseMidi([1, 2, 3, 4, 5, 6, 7, 8])).toThrow();
  });
});

describe("tempo helpers", () => {
  test("bpm <-> tempo", () => {
    expect(bpmToTempo(120)).toBe(500000);
    expect(tempoToBpm(500000)).toBeCloseTo(120, 6);
    expect(bpmToTempo(60)).toBe(1000000);
  });

  test("secondsPerTick at 120 BPM, 480 PPQ", () => {
    // one quarter note = 0.5s, 480 ticks -> 0.5/480 s per tick
    expect(secondsPerTick(480, 500000)).toBeCloseTo(0.5 / 480, 9);
  });
});

describe("NoteStream <-> MIDI", () => {
  test("midiToNoteStream converts ticks to seconds and spells notes", () => {
    const stream = midiToNoteStream(sampleFile);
    expect(stream[0]?.pitch.toString()).toBe("C4");
    expect(stream[0]?.start).toBeCloseTo(0, 9);
    // note at tick 480 -> one quarter -> 0.5s
    expect(stream[1]?.start).toBeCloseTo(0.5, 9);
    expect(stream[1]?.pitch.toString()).toBe("E4");
  });

  test("noteStreamToMidi round-trips a stream (within quantisation)", () => {
    const stream: NoteStream = [
      { pitch: new Note("C4"), start: 0, duration: 0.5, velocity: 100 },
      { pitch: new Note("G4"), start: 0.5, duration: 0.5, velocity: 90 },
    ];
    const file = noteStreamToMidi(stream, { tempo: bpmToTempo(120) });
    const back = midiToNoteStream(file);
    expect(back.map((e) => e.pitch.toString())).toEqual(["C4", "G4"]);
    expect(back[1]?.start).toBeCloseTo(0.5, 3);
    expect(back[0]?.duration).toBeCloseTo(0.5, 3);
  });
});
