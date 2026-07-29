import { describe, expect, test } from "bun:test";
import { justIntonation } from "../tuning/historical";
import { pelog, slendro } from "../tuning/presets";
import { TET12, equalTemperament } from "../tuning/tuning";
import { parseMidi } from "./reader";
import { retuneMidi } from "./retune";
import type { MidiFile } from "./types";
import { writeMidi } from "./writer";

const note = (n: number, start = 0, channel = 0) => ({
  note: n,
  start,
  duration: 480,
  velocity: 96,
  channel,
});

const file = (...notes: ReturnType<typeof note>[]): MidiFile => ({
  format: 0,
  ppq: 480,
  tracks: [{ notes }],
});

describe("retuneMidi", () => {
  test("12-TET is a no-op in pitch", () => {
    const out = retuneMidi(file(note(60), note(64), note(67)), TET12);
    for (const n of out.tracks[0]?.notes ?? []) {
      expect(n.bend).toBeUndefined();
    }
    expect(out.tracks[0]?.notes.map((n) => n.note)).toEqual([60, 64, 67]);
  });

  test("just intonation bends the third flat and the fifth barely", () => {
    const out = retuneMidi(file(note(64), note(67)), justIntonation());
    const [third, fifth] = out.tracks[0]?.notes ?? [];
    expect((third?.bend ?? 0) * 100).toBeCloseTo(-13.69, 1);
    expect((fifth?.bend ?? 0) * 100).toBeCloseTo(1.96, 1);
    expect(third?.note).toBe(64);
  });

  test("non-12 tunings map keys to degrees linearly", () => {
    // Slendro: 5 keys above the root complete the period (an octave).
    const out = retuneMidi(file(note(61), note(65)), slendro());
    const [second, octave] = out.tracks[0]?.notes ?? [];
    expect(second?.note).toBe(62); // 231 cents -> nearest key 62, bend down
    expect((second?.bend ?? 0) * 100).toBeCloseTo(31, 0);
    expect(octave?.note).toBe(72);
    expect(octave?.bend).toBeUndefined();
  });

  test("a different root anchors degree 0 elsewhere", () => {
    const out = retuneMidi(file(note(69)), pelog(), { root: 69 });
    expect(out.tracks[0]?.notes[0]?.note).toBe(69);
    expect(out.tracks[0]?.notes[0]?.bend).toBeUndefined();
  });

  test("spreads channels by default, skipping the drum channel", () => {
    const chord = retuneMidi(
      file(note(60), note(64), note(67)),
      justIntonation()
    );
    const channels = chord.tracks[0]?.notes.map((n) => n.channel) ?? [];
    expect(new Set(channels).size).toBe(3);
    expect(channels).not.toContain(9);
  });

  test("drum-channel notes pass through untouched", () => {
    const out = retuneMidi(
      file(note(36, 0, 9), note(64, 0, 0)),
      justIntonation()
    );
    // The kick on channel 9 keeps its note number and channel; the pitched
    // note is still retuned.
    expect(out.tracks[0]?.notes[0]).toEqual({
      note: 36,
      start: 0,
      duration: 480,
      velocity: 96,
      channel: 9,
    });
    expect(out.tracks[0]?.notes[1]?.bend).toBeCloseTo(-0.1369, 3);
  });

  test("spreadChannels: false preserves channels", () => {
    const out = retuneMidi(file(note(64, 0, 3)), justIntonation(), {
      spreadChannels: false,
    });
    expect(out.tracks[0]?.notes[0]?.channel).toBe(3);
  });

  test("keeps other file fields", () => {
    const src: MidiFile = { ...file(note(64)), tempo: 400000 };
    expect(retuneMidi(src, justIntonation()).tempo).toBe(400000);
  });
});

describe("pitch bends in the byte codec", () => {
  test("bends round-trip through write and parse", () => {
    const src: MidiFile = {
      format: 0,
      ppq: 480,
      tracks: [
        {
          notes: [
            { ...note(64), bend: 0.5 },
            { ...note(67, 480), bend: -0.25 },
          ],
        },
      ],
    };
    const back = parseMidi(writeMidi(src));
    const notes = back.tracks[0]?.notes ?? [];
    expect(notes[0]?.bend).toBeCloseTo(0.5, 3);
    expect(notes[1]?.bend).toBeCloseTo(-0.25, 3);
  });

  test("a bent note followed by an unbent one resets the channel", () => {
    const src: MidiFile = {
      format: 0,
      ppq: 480,
      tracks: [{ notes: [{ ...note(64), bend: 0.5 }, note(64, 480)] }],
    };
    const back = parseMidi(writeMidi(src));
    const notes = back.tracks[0]?.notes ?? [];
    expect(notes[0]?.bend).toBeCloseTo(0.5, 3);
    expect(notes[1]?.bend).toBeUndefined();
  });

  test("a retuned file survives the full byte round-trip", () => {
    const tuned = retuneMidi(
      file(note(60), note(64, 480), note(67, 960)),
      justIntonation()
    );
    const back = parseMidi(writeMidi(tuned));
    const bends = back.tracks[0]?.notes
      .slice()
      .sort((a, b) => a.start - b.start)
      .map((n) => n.bend ?? 0);
    expect(bends?.[0]).toBe(0);
    expect((bends?.[1] ?? 0) * 100).toBeCloseTo(-13.69, 0);
    expect((bends?.[2] ?? 0) * 100).toBeCloseTo(1.96, 0);
  });

  test("31-EDO retune stays within a quarter-tone of the keys", () => {
    const out = retuneMidi(
      file(note(60), note(61), note(62), note(63)),
      equalTemperament(31)
    );
    for (const n of out.tracks[0]?.notes ?? []) {
      expect(Math.abs(n.bend ?? 0)).toBeLessThanOrEqual(0.5);
    }
  });
});
