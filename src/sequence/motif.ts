/**
 * Motif transforms: the operations counterpoint and development are built
 * from. Retrograde reverses time, inversion mirrors pitch (chromatically
 * around an axis, or diatonically within a scale), augmentation stretches or
 * compresses the clock, and the classical sequence restates a figure up or
 * down the scale.
 *
 * Pitch operations stay in the spelled world: chromatic inversion inverts
 * the spelled interval from the axis, so the mirror of a major third above
 * is a major third below (Ab under C, not G#).
 */

import type { NoteStream, NoteStreamInput } from "../analysis/types";
import { intervalBetween } from "../interval/interval";
import { Note } from "../note/note";
import { Scale, type ScaleLike } from "../scale/scale";
import type { PitchInput } from "./stream";
import { asNoteStream, concatStreams, streamDuration } from "./stream";

/**
 * Reverse a stream in time: the last note comes first, durations kept, the
 * total length unchanged. Chords (events sharing a start) stay together.
 *
 * @example
 * ```ts
 * import { retrograde, melody } from "musictheoryjs";
 * const m = melody(["C4", "D4", "E4"], ["q", "q", "h"]);
 * retrograde(m).map((e) => e.pitch.toString()); // => ["E4", "D4", "C4"]
 * retrograde(m).map((e) => e.start); // => [0, 2, 3]
 * retrograde(retrograde(m)).map((e) => e.start); // => [0, 1, 2]
 * ```
 */
export function retrograde(stream: NoteStreamInput): NoteStream {
  const total = streamDuration(stream);
  return asNoteStream(stream)
    .map((e) => ({ ...e, start: total - (e.start + e.duration) }))
    .sort((a, b) => a.start - b.start);
}

/**
 * Mirror a stream's pitches around `axis`. Without a scale the inversion is
 * chromatic and spelled — each note's interval from the axis is negated.
 * With a scale it is tonal: each in-scale note reflects by scale degrees
 * (so contour inverts but everything stays diatonic), and any note outside
 * the scale falls back to the chromatic mirror.
 *
 * @example
 * ```ts
 * import { invertMelody, melody } from "musictheoryjs";
 * const m = melody(["C4", "E4", "G4"], "q");
 * invertMelody(m, "C4").map((e) => e.pitch.toString()); // => ["C4", "Ab3", "F3"]
 * invertMelody(m, "C4", "C4 major").map((e) => e.pitch.toString()); // => ["C4", "A3", "F3"]
 * invertMelody(melody(["D4"], "q"), "D4", "C4 major")[0]?.pitch.toString(); // => "D4"
 * ```
 */
export function invertMelody(
  stream: NoteStreamInput,
  axis: PitchInput,
  scale?: ScaleLike
): NoteStream {
  const center = Note.from(axis);
  const chromatic = (pitch: Note): Note =>
    // axis + (axis - pitch) = the mirror image, spelled by interval math.
    center.transpose(intervalBetween(pitch, center));
  if (scale === undefined) {
    return asNoteStream(stream).map((e) => ({
      ...e,
      pitch: chromatic(e.pitch),
    }));
  }
  const s = Scale.from(scale);
  if (s.degreeOf(center) === null) {
    throw new RangeError(
      `axis ${center.toString()} is not in the scale; tonal inversion needs an in-scale axis`
    );
  }
  return asNoteStream(stream).map((e) => {
    if (s.degreeOf(e.pitch) === null) {
      return { ...e, pitch: chromatic(e.pitch) };
    }
    // Count scale steps from the axis to the note, then reflect them.
    const steps = stepsFrom(s, center, e.pitch);
    return { ...e, pitch: s.step(center, -steps) };
  });
}

/** Signed scale steps from `from` to `to`, both known to be in the scale. */
function stepsFrom(s: Scale, from: Note, to: Note): number {
  const direction = to.midi >= from.midi ? 1 : -1;
  let steps = 0;
  let at = from;
  // Bounded walk: a scale has at most 12 degrees per octave and MIDI spans
  // ~11 octaves, so 160 steps covers any real melody.
  while (at.midi !== to.midi && Math.abs(steps) < 160) {
    steps += direction;
    at = s.step(from, steps);
  }
  if (at.midi !== to.midi) {
    throw new RangeError(
      `could not relate ${to.toString()} to ${from.toString()} within the scale`
    );
  }
  return steps;
}

/**
 * Stretch (or compress) a stream's clock by `factor`: onsets and durations
 * both scale, so the figure keeps its shape at the new speed. Factor 2 is
 * classical augmentation; 0.5 is diminution.
 *
 * @example
 * ```ts
 * import { augment, melody } from "musictheoryjs";
 * const m = melody(["C4", "D4"], "q");
 * augment(m, 2).map((e) => e.start); // => [0, 2]
 * augment(m, 2)[0]?.duration; // => 2
 * augment(m, 0.5).map((e) => e.start); // => [0, 0.5]
 * ```
 */
export function augment(stream: NoteStreamInput, factor: number): NoteStream {
  if (!(factor > 0)) {
    throw new RangeError(`augmentation factor must be positive, got ${factor}`);
  }
  return asNoteStream(stream).map((e) => ({
    ...e,
    start: e.start * factor,
    duration: e.duration * factor,
  }));
}

/**
 * The classical sequence: state a motif, then restate it shifted by `steps`
 * scale degrees, `times` statements in total, back to back. In-scale notes
 * move diatonically; notes outside the scale move by the same number of
 * semitones as the nearest in-scale note below them, keeping chromatic
 * neighbours attached to the line they decorate.
 *
 * @example
 * ```ts
 * import { diatonicSequence, melody } from "musictheoryjs";
 * const m = melody(["C4", "E4", "D4"], "8");
 * const seq = diatonicSequence(m, "C4 major", -1, { times: 3 });
 * seq.length; // => 9
 * seq.slice(3, 6).map((e) => e.pitch.toString()); // => ["B3", "D4", "C4"]
 * seq.slice(6, 9).map((e) => e.pitch.toString()); // => ["A3", "C4", "B3"]
 * ```
 */
export function diatonicSequence(
  stream: NoteStreamInput,
  scale: ScaleLike,
  steps: number,
  options: {
    /** Total statements, the original included (default 3). */
    times?: number;
    /** The repeat period in beats (default the motif's length). */
    length?: number;
  } = {}
): NoteStream {
  const times = options.times ?? 3;
  if (!Number.isInteger(times) || times < 1) {
    throw new RangeError(`times must be a positive integer, got ${times}`);
  }
  if (!Number.isInteger(steps)) {
    throw new RangeError(`steps must be an integer, got ${steps}`);
  }
  const s = Scale.from(scale);
  const base = asNoteStream(stream);

  const shiftPitch = (pitch: Note, by: number): Note => {
    if (s.degreeOf(pitch) !== null) return s.step(pitch, by);
    // Chromatic note: ride along with the nearest scale tone below.
    for (let down = 1; down <= 11; down++) {
      const anchor = Note.fromMidi(pitch.midi - down, "flat");
      if (s.degreeOf(anchor) !== null) {
        const moved = s.step(anchor, by);
        return Note.fromMidi(moved.midi + down, "sharp");
      }
    }
    throw new RangeError(
      `${pitch.toString()} has no scale tone within an octave below it`
    );
  };

  const statements: NoteStream[] = [];
  for (let i = 0; i < times; i++) {
    statements.push(
      i === 0
        ? base
        : base.map((e) => ({ ...e, pitch: shiftPitch(e.pitch, i * steps) }))
    );
  }
  if (options.length === undefined) return concatStreams(...statements);
  const period = options.length;
  return statements.flatMap((st, i) =>
    st.map((e) => ({ ...e, start: e.start + i * period }))
  );
}
