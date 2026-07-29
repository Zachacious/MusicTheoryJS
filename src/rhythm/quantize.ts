/**
 * Grid quantization for the MIDI (ticks) and analysis (seconds) layers.
 *
 * The grid is any {@link DurationLike} — `"16"` snaps to sixteenths, `"8t"`
 * to eighth-note triplets. Starts snap to the nearest grid line; durations
 * are left alone unless asked for, and never quantize to nothing.
 */

import type { NoteEventInput } from "../analysis/types";
import type { MidiFile, MidiNote, MidiTrack } from "../midi/types";
import { type DurationLike, durationSeconds, wholeNotes } from "./duration";

/** Snap to the nearest multiple of `grid`; durations get a one-grid floor. */
function snap(value: number, grid: number, min = false): number {
  const snapped = Math.round(value / grid) * grid;
  return min ? Math.max(grid, snapped) : snapped;
}

/** The exact (possibly fractional) tick length of a grid duration — kept
 * unrounded so grid lines never drift on non-divisible PPQs. */
function gridTicks(grid: DurationLike, ppq: number): number {
  return wholeNotes(grid) * 4 * ppq;
}

/**
 * Snap a tick to the nearest grid line, as a whole tick.
 *
 * @example
 * ```ts
 * import { quantizeTick } from "musictheoryjs";
 * quantizeTick(933, "16"); // => 960
 * quantizeTick(500, "8t"); // => 480
 * quantizeTick(70, "4", 96); // => 96
 * ```
 */
export function quantizeTick(
  tick: number,
  grid: DurationLike,
  ppq = 480
): number {
  return Math.round(snap(tick, gridTicks(grid, ppq)));
}

/**
 * Snap a time in seconds to the nearest grid line at a given tempo (`bpm`
 * counts quarter notes).
 *
 * @example
 * ```ts
 * import { quantizeSeconds } from "musictheoryjs";
 * quantizeSeconds(0.26, "16", 120); // => 0.25
 * quantizeSeconds(1.13, "4", 60); // => 1
 * ```
 */
export function quantizeSeconds(
  time: number,
  grid: DurationLike,
  bpm: number
): number {
  return snap(time, durationSeconds(grid, bpm));
}

/**
 * Quantize a note stream (seconds, as the analysis layer uses) to a grid.
 * Starts snap to the nearest grid line; pass `durations: true` to also snap
 * durations (to the nearest grid multiple, never below one grid). Events are
 * otherwise returned unchanged.
 *
 * @example
 * ```ts
 * import { quantizeStream } from "musictheoryjs";
 * const played = [
 *   { pitch: "C4", start: 0.03, duration: 0.61 },
 *   { pitch: "E4", start: 0.52, duration: 0.24 },
 * ];
 * quantizeStream(played, "8", 120).map((e) => e.start); // => [0, 0.5]
 * quantizeStream(played, "8", 120)[0].duration; // => 0.61
 * quantizeStream(played, "8", 120, { durations: true })[0].duration; // => 0.5
 * ```
 */
export function quantizeStream<T extends NoteEventInput>(
  stream: readonly T[],
  grid: DurationLike,
  bpm: number,
  options: { durations?: boolean } = {}
): T[] {
  const step = durationSeconds(grid, bpm);
  return stream.map((event) => ({
    ...event,
    start: snap(event.start, step),
    duration: options.durations
      ? snap(event.duration, step, true)
      : event.duration,
  }));
}

/**
 * Quantize every note of a MIDI file to a grid, in ticks at the file's PPQ.
 * Starts snap to the nearest grid line; pass `durations: true` to also snap
 * durations (never below one grid). Tracks, tempo, and other file fields are
 * preserved.
 *
 * @example
 * ```ts
 * import { quantizeMidi } from "musictheoryjs";
 * const file = {
 *   format: 0,
 *   ppq: 480,
 *   tracks: [
 *     { notes: [{ note: 60, start: 37, duration: 431, velocity: 96, channel: 0 }] },
 *   ],
 * };
 * quantizeMidi(file, "8").tracks[0].notes[0].start; // => 0
 * quantizeMidi(file, "8").tracks[0].notes[0].duration; // => 431
 * quantizeMidi(file, "8", { durations: true }).tracks[0].notes[0].duration; // => 480
 * ```
 */
export function quantizeMidi(
  file: MidiFile,
  grid: DurationLike,
  options: { durations?: boolean } = {}
): MidiFile {
  const step = gridTicks(grid, file.ppq);
  const tracks: MidiTrack[] = file.tracks.map((track) => ({
    ...track,
    notes: track.notes.map(
      (n): MidiNote => ({
        ...n,
        start: Math.round(snap(n.start, step)),
        duration: options.durations
          ? Math.round(snap(n.duration, step, true))
          : n.duration,
      })
    ),
  }));
  return { ...file, tracks };
}
