/**
 * The timeline core of the sequence module: build {@link NoteStream}s from
 * pitches and durations, and combine them in time.
 *
 * Time here is measured in quarter-note beats — beat 1.0 is one quarter note
 * after beat 0 — because that is the unit composition thinks in. The
 * conversions in `sequence/convert` take a beat-timed stream to MIDI ticks
 * (exactly — ticks are defined per quarter), to a notation {@link Score}, or
 * back. A {@link NoteEvent} itself is unit-agnostic, so everything in the
 * analysis layer accepts these streams unchanged.
 */

import type { NoteEvent, NoteStream, NoteStreamInput } from "../analysis/types";
import { type IntervalLike, asInterval } from "../interval/parse";
import { Note, type NoteLike } from "../note/note";
import { type DurationLike, durationBeats } from "../rhythm/duration";
import type { RhythmStep } from "../rhythm/pattern";

/** Anything a sequence function accepts as one pitch. */
export type PitchInput = Note | NoteLike | string;

const EPS = 1e-9;

/**
 * Normalise a {@link NoteStreamInput} to concrete events, sorted by start:
 * pitches given as strings or plain objects become {@link Note}s.
 *
 * @example
 * ```ts
 * import { asNoteStream } from "musictheoryjs";
 * const s = asNoteStream([{ pitch: "E4", start: 1, duration: 1 }, { pitch: "C4", start: 0, duration: 1 }]);
 * s.map((e) => e.pitch.toString()); // => ["C4", "E4"]
 * s.map((e) => e.start); // => [0, 1]
 * ```
 */
export function asNoteStream(input: NoteStreamInput): NoteStream {
  return input
    .map((e) => ({ ...e, pitch: Note.from(e.pitch) }))
    .sort((a, b) => a.start - b.start);
}

/**
 * A melody as a stream: each pitch in turn, each lasting its duration. A
 * single duration applies to every note; an array is used per note and
 * cycles when shorter than the melody. `null` pitches are rests — they take
 * their duration's time and sound nothing.
 *
 * @example
 * ```ts
 * import { melody } from "musictheoryjs";
 * melody(["C4", "E4", "G4"], "8").map((e) => e.start); // => [0, 0.5, 1]
 * melody(["C4", null, "G4"], "q").map((e) => e.start); // => [0, 2]
 * melody(["C4", "D4"], ["q.", "8"])[1]?.start; // => 1.5
 * ```
 */
export function melody(
  pitches: ReadonlyArray<PitchInput | null>,
  durations: DurationLike | readonly DurationLike[] = 4,
  options: { start?: number; velocity?: number } = {}
): NoteStream {
  const perNote = Array.isArray(durations)
    ? (durations as readonly DurationLike[])
    : [durations as DurationLike];
  if (perNote.length === 0) {
    throw new RangeError("melody needs at least one duration");
  }
  const events: NoteEvent[] = [];
  let at = options.start ?? 0;
  pitches.forEach((pitch, i) => {
    const beats = durationBeats(perNote[i % perNote.length] as DurationLike);
    if (pitch !== null) {
      events.push({
        pitch: Note.from(pitch),
        start: at,
        duration: beats,
        ...(options.velocity !== undefined
          ? { velocity: options.velocity }
          : {}),
      });
    }
    at += beats;
  });
  return events;
}

/**
 * Place pitches on the onsets of a rhythm pattern — the drum-machine view of
 * a melody. Each onset takes the next pitch (cycling when the pattern has
 * more onsets than there are pitches) and sounds for one grid step scaled by
 * `gate`.
 *
 * @example
 * ```ts
 * import { patternMelody, euclideanRhythm } from "musictheoryjs";
 * const line = patternMelody(["C4", "E4", "G4"], euclideanRhythm(8, 3));
 * line.map((e) => e.start); // => [0, 1.5, 3]
 * line.map((e) => e.pitch.toString()); // => ["C4", "E4", "G4"]
 * patternMelody(["C4"], [1, 1], { step: "16" }).map((e) => e.start); // => [0, 0.25]
 * ```
 */
export function patternMelody(
  pitches: readonly PitchInput[],
  pattern: readonly RhythmStep[],
  options: {
    /** Grid step duration. Default an eighth note. */
    step?: DurationLike;
    /** Fraction of the step each note sounds (default 1). */
    gate?: number;
    start?: number;
    velocity?: number;
  } = {}
): NoteStream {
  if (pitches.length === 0) {
    throw new RangeError("patternMelody needs at least one pitch");
  }
  const step = durationBeats(options.step ?? 8);
  const gate = options.gate ?? 1;
  if (!(gate > 0)) {
    throw new RangeError(`gate must be positive, got ${gate}`);
  }
  const events: NoteEvent[] = [];
  let voice = 0;
  pattern.forEach((slot, i) => {
    if (!slot) return;
    events.push({
      pitch: Note.from(pitches[voice % pitches.length] as PitchInput),
      start: (options.start ?? 0) + i * step,
      duration: step * gate,
      ...(options.velocity !== undefined ? { velocity: options.velocity } : {}),
    });
    voice++;
  });
  return events;
}

/**
 * The length of a stream in beats: the end of its last-ending event. An
 * empty stream has length 0. This is what the combining functions use as a
 * stream's extent, so a part that should ring into silence can be padded by
 * passing an explicit length to them instead.
 *
 * @example
 * ```ts
 * import { streamDuration, melody } from "musictheoryjs";
 * streamDuration(melody(["C4", "E4"], "q")); // => 2
 * streamDuration([]); // => 0
 * ```
 */
export function streamDuration(stream: NoteStreamInput): number {
  let end = 0;
  for (const e of stream) end = Math.max(end, e.start + e.duration);
  return end;
}

/**
 * Shift every event later by `beats` (earlier when negative). Shifting any
 * event before time zero throws, since no downstream form can express it.
 *
 * @example
 * ```ts
 * import { shiftStream, melody } from "musictheoryjs";
 * shiftStream(melody(["C4"], "q"), 4)[0]?.start; // => 4
 * shiftStream(melody(["C4"], "q"), -1); // => throws "before time zero"
 * ```
 */
export function shiftStream(
  stream: NoteStreamInput,
  beats: number
): NoteStream {
  const shifted = asNoteStream(stream).map((e) => ({
    ...e,
    start: e.start + beats,
  }));
  const first = shifted[0];
  if (first !== undefined && first.start < -EPS) {
    throw new RangeError(
      `shift places an event before time zero (start ${first.start})`
    );
  }
  return shifted;
}

/**
 * A time window cut from a stream — bars 5–8 of a song, the beats under one
 * chord. Events wholly inside the window come through unchanged, events
 * crossing an edge are truncated at it, and events entirely outside are
 * dropped. The result is shifted to start at beat 0, so it loops and
 * concatenates like any stream built from scratch; pass
 * `keepPosition: true` to leave events at their original beats instead.
 * `to` defaults to the end of the stream.
 *
 * @example
 * ```ts
 * import { sliceStream, melody } from "musictheoryjs";
 * const line = melody(["C4", "D4", "E4", "F4"], "q");
 * sliceStream(line, 1, 3).map((e) => e.pitch.toString()); // => ["D4", "E4"]
 * sliceStream(line, 1, 3).map((e) => e.start); // => [0, 1]
 * sliceStream(line, 0.5, 1.5).map((e) => e.duration); // => [0.5, 0.5]
 * sliceStream(line, 2).map((e) => e.pitch.toString()); // => ["E4", "F4"]
 * sliceStream(line, 1, 3, { keepPosition: true })[0]?.start; // => 1
 * ```
 */
export function sliceStream(
  stream: NoteStreamInput,
  from: number,
  to = Number.POSITIVE_INFINITY,
  options: { keepPosition?: boolean } = {}
): NoteStream {
  if (!(from >= 0)) {
    throw new RangeError(`slice start must be non-negative, got ${from}`);
  }
  if (!(to > from)) {
    throw new RangeError(
      `slice end must come after its start (${from}), got ${to}`
    );
  }
  const events: NoteEvent[] = [];
  for (const e of asNoteStream(stream)) {
    const start = Math.max(e.start, from);
    const end = Math.min(e.start + e.duration, to);
    if (end - start < EPS) continue;
    events.push({
      ...e,
      start: options.keepPosition ? start : start - from,
      duration: end - start,
    });
  }
  return events;
}

/**
 * Streams one after another: each begins where the previous ends (its
 * {@link streamDuration}). Internal gaps and leading rests are preserved.
 *
 * @example
 * ```ts
 * import { concatStreams, melody } from "musictheoryjs";
 * const ab = concatStreams(melody(["C4", "D4"], "q"), melody(["E4"], "h"));
 * ab.map((e) => e.start); // => [0, 1, 2]
 * streamDuration(ab); // => 4
 * ```
 */
export function concatStreams(...streams: NoteStreamInput[]): NoteStream {
  const events: NoteEvent[] = [];
  let at = 0;
  for (const stream of streams) {
    for (const e of asNoteStream(stream)) {
      events.push({ ...e, start: e.start + at });
    }
    at += streamDuration(stream);
  }
  return events;
}

/**
 * Streams sounding together, overlaid from beat 0 and sorted by start — a
 * bass line under a comp under a melody.
 *
 * @example
 * ```ts
 * import { mergeStreams, melody } from "musictheoryjs";
 * const two = mergeStreams(melody(["C2"], "w"), melody(["E4", "G4"], "h"));
 * two.map((e) => e.pitch.toString()); // => ["C2", "E4", "G4"]
 * two.map((e) => e.start); // => [0, 0, 2]
 * ```
 */
export function mergeStreams(...streams: NoteStreamInput[]): NoteStream {
  return streams
    .flatMap((s) => asNoteStream(s))
    .sort((a, b) => a.start - b.start);
}

/**
 * A stream repeated back to back. `length` fixes the repeat period in beats
 * when the musical loop is longer than its last note — a one-bar figure that
 * ends in a rest loops on the bar, not on the note.
 *
 * @example
 * ```ts
 * import { loopStream, melody } from "musictheoryjs";
 * loopStream(melody(["C4"], "q"), 3).map((e) => e.start); // => [0, 1, 2]
 * loopStream(melody(["C4"], "q"), 2, { length: 4 }).map((e) => e.start); // => [0, 4]
 * ```
 */
export function loopStream(
  stream: NoteStreamInput,
  times: number,
  options: { length?: number } = {}
): NoteStream {
  if (!Number.isInteger(times) || times < 0) {
    throw new RangeError(`times must be a non-negative integer, got ${times}`);
  }
  const period = options.length ?? streamDuration(stream);
  const base = asNoteStream(stream);
  const events: NoteEvent[] = [];
  for (let i = 0; i < times; i++) {
    for (const e of base) events.push({ ...e, start: e.start + i * period });
  }
  return events;
}

/**
 * Transpose every pitch in a stream by an interval (spelled interval,
 * interval name, or semitone count), leaving time untouched.
 *
 * @example
 * ```ts
 * import { transposeStream, melody } from "musictheoryjs";
 * transposeStream(melody(["C4", "E4"], "q"), "P5").map((e) => e.pitch.toString()); // => ["G4", "B4"]
 * transposeStream(melody(["C4"], "q"), -12)[0]?.pitch.toString(); // => "C3"
 * ```
 */
export function transposeStream(
  stream: NoteStreamInput,
  iv: IntervalLike
): NoteStream {
  const interval = asInterval(iv);
  return asNoteStream(stream).map((e) => ({
    ...e,
    pitch: e.pitch.transpose(interval),
  }));
}
