import { describe, expect, test } from "bun:test";
import type { MidiFile } from "../midi/types";
import {
  quantizeMidi,
  quantizeSeconds,
  quantizeStream,
  quantizeTick,
} from "./quantize";

describe("quantizeTick", () => {
  test("snaps to the nearest grid line", () => {
    expect(quantizeTick(0, "16")).toBe(0);
    expect(quantizeTick(59, "16")).toBe(0);
    expect(quantizeTick(61, "16")).toBe(120);
    expect(quantizeTick(933, "16")).toBe(960);
    expect(quantizeTick(70, "4", 96)).toBe(96);
  });

  test("triplet grids", () => {
    expect(quantizeTick(150, "8t")).toBe(160);
    expect(quantizeTick(500, "8t")).toBe(480);
    expect(quantizeTick(81, "8t")).toBe(160);
  });
});

describe("quantizeSeconds", () => {
  test("snaps at the given tempo", () => {
    expect(quantizeSeconds(0.26, "16", 120)).toBe(0.25);
    expect(quantizeSeconds(1.13, "4", 60)).toBe(1);
    expect(quantizeSeconds(0, "8", 120)).toBe(0);
  });
});

describe("quantizeStream", () => {
  const played = [
    { pitch: "C4", start: 0.03, duration: 0.61, velocity: 90 },
    { pitch: "E4", start: 0.52, duration: 0.24 },
    { pitch: "G4", start: 1.02, duration: 0.05 },
  ];

  test("snaps starts, preserves everything else", () => {
    const q = quantizeStream(played, "8", 120);
    expect(q.map((e) => e.start)).toEqual([0, 0.5, 1]);
    expect(q.map((e) => e.duration)).toEqual([0.61, 0.24, 0.05]);
    expect(q[0]?.pitch).toBe("C4");
    expect(q[0]?.velocity).toBe(90);
    // Input untouched.
    expect(played[0]?.start).toBe(0.03);
  });

  test("durations snap with a one-grid floor", () => {
    const q = quantizeStream(played, "8", 120, { durations: true });
    expect(q.map((e) => e.duration)).toEqual([0.5, 0.25, 0.25]);
  });
});

describe("quantizeMidi", () => {
  const file: MidiFile = {
    format: 1,
    ppq: 480,
    tempo: 500000,
    timeSignature: { numerator: 4, denominator: 4 },
    tracks: [
      {
        name: "Keys",
        notes: [
          { note: 60, start: 37, duration: 431, velocity: 96, channel: 0 },
          { note: 64, start: 501, duration: 97, velocity: 80, channel: 0 },
        ],
      },
    ],
  };

  test("snaps starts, keeps file fields and durations", () => {
    const q = quantizeMidi(file, "8");
    expect(q.tracks[0]?.notes.map((n) => n.start)).toEqual([0, 480]);
    expect(q.tracks[0]?.notes.map((n) => n.duration)).toEqual([431, 97]);
    expect(q.tempo).toBe(500000);
    expect(q.timeSignature).toEqual({ numerator: 4, denominator: 4 });
    expect(q.tracks[0]?.name).toBe("Keys");
    // Input untouched.
    expect(file.tracks[0]?.notes[0]?.start).toBe(37);
  });

  test("duration snapping never reaches zero", () => {
    const q = quantizeMidi(file, "8", { durations: true });
    expect(q.tracks[0]?.notes.map((n) => n.duration)).toEqual([480, 240]);
  });

  test("ticks stay integers on non-divisible grids", () => {
    const odd: MidiFile = {
      format: 0,
      ppq: 100, // 8t grid = 100*4*2/(8*3) = 33.33... ticks
      tracks: [
        {
          notes: [
            { note: 60, start: 65, duration: 40, velocity: 64, channel: 0 },
          ],
        },
      ],
    };
    const q = quantizeMidi(odd, "8t", { durations: true });
    const n = q.tracks[0]?.notes[0];
    expect(Number.isInteger(n?.start)).toBe(true);
    expect(Number.isInteger(n?.duration)).toBe(true);
    expect(n?.start).toBe(67);
    expect(n?.duration).toBe(33);
  });
});
