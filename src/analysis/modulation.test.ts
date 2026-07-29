import { describe, expect, test } from "bun:test";
import { detectModulations } from "./modulation";
import type { NoteEventInput } from "./types";

/** One note per unit of time from `at`. */
function bar(names: readonly string[], at: number): NoteEventInput[] {
  return names.map((pitch, i) => ({ pitch, start: at + i, duration: 1 }));
}

const C_MAJOR = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"] as const;
const G_MAJOR = ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"] as const;
const EB_MAJOR = ["Eb4", "F4", "G4", "Ab4", "Bb4", "C5", "D5", "Eb5"] as const;

describe("detectModulations", () => {
  test("a single-key stream yields one segment covering the span", () => {
    const segments = detectModulations(bar(C_MAJOR, 0));
    expect(segments.length).toBe(1);
    expect(segments[0]?.key.toString()).toBe("C major");
    expect(segments[0]?.start).toBe(0);
    expect(segments[0]?.end).toBe(8);
    expect(segments[0]?.score).toBeGreaterThan(0.7);
  });

  test("a two-key stream splits at the modulation", () => {
    const stream = [...bar(C_MAJOR, 0), ...bar(G_MAJOR, 8)];
    const segments = detectModulations(stream, {
      windowSize: 8,
      hopSize: 8,
    });
    expect(segments.map((s) => s.key.toString())).toEqual([
      "C major",
      "G major",
    ]);
    expect(segments[0]?.start).toBe(0);
    expect(segments[1]?.start).toBe(8);
    expect(segments[1]?.end).toBe(16);
  });

  test("defaults handle sparse monophonic streams without flicker", () => {
    const stream = [...bar(C_MAJOR, 0), ...bar(EB_MAJOR, 8)];
    const segments = detectModulations(stream);
    expect(segments.map((s) => s.key.toString())).toEqual([
      "C major",
      "Eb major",
    ]);
  });

  test("three keys in sequence", () => {
    const stream = [
      ...bar(C_MAJOR, 0),
      ...bar(C_MAJOR, 8),
      ...bar(G_MAJOR, 16),
      ...bar(G_MAJOR, 24),
      ...bar(EB_MAJOR, 32),
      ...bar(EB_MAJOR, 40),
    ];
    const segments = detectModulations(stream, {
      windowSize: 8,
      hopSize: 8,
    });
    expect(segments.map((s) => s.key.toString())).toEqual([
      "C major",
      "G major",
      "Eb major",
    ]);
  });

  test("segments abut without gaps or overlap", () => {
    const stream = [...bar(C_MAJOR, 0), ...bar(EB_MAJOR, 8)];
    const segments = detectModulations(stream);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i]?.start).toBe(segments[i - 1]?.end as number);
    }
  });

  test("empty stream yields no segments", () => {
    expect(detectModulations([])).toEqual([]);
  });

  test("zero-duration events spread over a span terminate with no segments", () => {
    const stream = [
      { pitch: "C4", start: 0, duration: 0 },
      { pitch: "E4", start: 10, duration: 0 },
    ];
    expect(detectModulations(stream)).toEqual([]);
  });

  test("a zero-duration chord produces no segments", () => {
    const chord = ["C4", "E4", "G4"].map((pitch) => ({
      pitch,
      start: 0,
      duration: 0,
    }));
    const segments = detectModulations(chord, { windowSize: 1 });
    expect(segments.length).toBe(0);
  });

  test("rejects non-positive windows", () => {
    expect(() => detectModulations(bar(C_MAJOR, 0), { windowSize: 0 })).toThrow(
      RangeError
    );
    expect(() => detectModulations(bar(C_MAJOR, 0), { hopSize: -1 })).toThrow(
      RangeError
    );
  });
});
