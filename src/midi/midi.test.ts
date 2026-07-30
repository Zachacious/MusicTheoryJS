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

describe("time signatures", () => {
  test("write -> read round-trip", () => {
    const file: MidiFile = {
      ...sampleFile,
      timeSignature: { numerator: 6, denominator: 8 },
    };
    const back = parseMidi(writeMidi(file));
    expect(back.timeSignature).toEqual({ numerator: 6, denominator: 8 });
  });

  test("absent when the file sets none", () => {
    const back = parseMidi(writeMidi(sampleFile));
    expect(back.timeSignature).toBeUndefined();
  });

  test("first time signature wins (hand-assembled two-track file)", () => {
    const track = (nn: number, dd: number) => [
      ...[0x4d, 0x54, 0x72, 0x6b], // MTrk
      ...[0, 0, 0, 12], // length
      ...[0x00, 0xff, 0x58, 0x04, nn, dd, 0x18, 0x08], // FF 58
      ...[0x00, 0xff, 0x2f, 0x00], // end of track
    ];
    const bytes = [
      ...[0x4d, 0x54, 0x68, 0x64], // MThd
      ...[0, 0, 0, 6], // header length
      ...[0, 1], // format 1
      ...[0, 2], // two tracks
      ...[0x01, 0xe0], // 480 PPQ
      ...track(3, 2), // 3/4
      ...track(7, 3), // 7/8
    ];
    expect(parseMidi(bytes).timeSignature).toEqual({
      numerator: 3,
      denominator: 4,
    });
  });

  test("writer emits a spec-shaped FF 58 event", () => {
    const bytes = writeMidi({
      format: 0,
      ppq: 480,
      timeSignature: { numerator: 6, denominator: 8 },
      tracks: [{ notes: [] }],
    });
    const hex = [...bytes];
    const at = hex.findIndex(
      (b, i) => b === 0xff && hex[i + 1] === 0x58 && hex[i + 2] === 0x04
    );
    expect(at).toBeGreaterThan(-1);
    // nn dd cc bb: 6, 2^3 = 8, dotted-quarter click = 36 clocks, 8 32nds.
    expect(hex.slice(at + 3, at + 7)).toEqual([6, 3, 36, 8]);
  });

  test("writer rejects a non-power-of-two denominator", () => {
    expect(() =>
      writeMidi({
        format: 0,
        ppq: 480,
        timeSignature: { numerator: 4, denominator: 6 },
        tracks: [{ notes: [] }],
      })
    ).toThrow(RangeError);
  });

  test("noteStreamToMidi stamps a time signature from any accepted shape", () => {
    const file = noteStreamToMidi([], { timeSignature: "3/4" });
    expect(file.timeSignature).toEqual({ numerator: 3, denominator: 4 });
    expect(noteStreamToMidi([]).timeSignature).toBeUndefined();
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

  test("a tempo map survives the byte round trip in tick order", () => {
    const file: MidiFile = {
      format: 0,
      ppq: 480,
      tempo: 500000,
      tempoMap: [
        { tick: 0, tempo: 500000 },
        { tick: 960, tempo: 1000000 },
      ],
      tracks: [
        {
          notes: [
            { note: 60, start: 0, duration: 480, velocity: 80, channel: 0 },
          ],
        },
      ],
    };
    const back = parseMidi(writeMidi(file));
    expect(back.tempoMap).toEqual([
      { tick: 0, tempo: 500000 },
      { tick: 960, tempo: 1000000 },
    ]);
    expect(back.tempo).toBe(500000);
  });

  test("midiToNoteStream integrates seconds across tempo changes", () => {
    // 120 BPM for two beats, then 60: a note at beat 3 starts at
    // 2 x 0.5s + 1 x 1s = 2s and lasts 1s.
    const file: MidiFile = {
      format: 0,
      ppq: 480,
      tempo: 500000,
      tempoMap: [
        { tick: 0, tempo: 500000 },
        { tick: 960, tempo: 1000000 },
      ],
      tracks: [
        {
          notes: [
            { note: 60, start: 1440, duration: 480, velocity: 80, channel: 0 },
          ],
        },
      ],
    };
    const stream = midiToNoteStream(file);
    expect(stream[0]?.start).toBeCloseTo(2, 9);
    expect(stream[0]?.duration).toBeCloseTo(1, 9);
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
