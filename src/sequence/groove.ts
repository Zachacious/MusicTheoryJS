/**
 * Groove: what players do to a grid. Swing warps time within each beat
 * pair, accent shapes velocity to the meter, rampVelocity draws crescendos
 * and diminuendos, humanize adds controlled imperfection, gate turns note
 * length into articulation.
 *
 * All of these are pure functions from stream to stream, so they compose:
 * `humanize(accent(swing(part), "4/4"))`.
 */

import type { NoteStream, NoteStreamInput } from "../analysis/types";
import { type DurationLike, durationBeats } from "../rhythm/duration";
import {
  type TimeSignatureLike,
  asTimeSignature,
  barWholeNotes,
  beatGrouping,
} from "../rhythm/meter";
import { asNoteStream } from "./stream";

const EPS = 1e-9;

/** Velocity used as the base when an event carries none (matches the MIDI
 * writer's default). */
const BASE_VELOCITY = 80;

function clampVelocity(v: number): number {
  return Math.max(1, Math.min(127, Math.round(v)));
}

/**
 * Swing a stream: within each pair of `subdivision`s, the midpoint moves to
 * `ratio` of the pair — 0.5 is straight, 2/3 is triplet swing (the default),
 * 0.75 a hard shuffle. The warp is piecewise linear on both onsets and
 * releases, so notes lying inside the pair (sixteenths under swung eighths)
 * bend proportionally instead of landing off-grid.
 *
 * @example
 * ```ts
 * import { swing, melody } from "musictheoryjs";
 * const bar = melody(["C4", "D4", "E4", "F4"], "8");
 * swing(bar).map((e) => Math.round(e.start * 1000) / 1000); // => [0, 0.667, 1, 1.667]
 * swing(bar)[0]?.duration; // => ~0.667
 * swing(bar, { ratio: 0.5 }).map((e) => e.start); // => [0, 0.5, 1, 1.5]
 * ```
 */
export function swing(
  stream: NoteStreamInput,
  options: {
    /** Where the offbeat lands within the pair, 0–1 exclusive. Default 2/3. */
    ratio?: number;
    /** The subdivision being swung. Default an eighth note. */
    subdivision?: DurationLike;
  } = {}
): NoteStream {
  const ratio = options.ratio ?? 2 / 3;
  if (!(ratio > 0 && ratio < 1)) {
    throw new RangeError(`swing ratio must be between 0 and 1, got ${ratio}`);
  }
  const sub = durationBeats(options.subdivision ?? 8);
  const pair = sub * 2;
  const warp = (t: number): number => {
    const pairStart = Math.floor(t / pair + EPS) * pair;
    const offset = t - pairStart;
    const warped =
      offset <= sub
        ? (offset / sub) * (ratio * pair)
        : ratio * pair + ((offset - sub) / sub) * (pair - ratio * pair);
    return pairStart + warped;
  };
  return asNoteStream(stream).map((e) => {
    const start = warp(e.start);
    return { ...e, start, duration: warp(e.start + e.duration) - start };
  });
}

/**
 * Accent a stream to its meter: events on a bar's downbeat get the strongest
 * push, events on the other beats (following the meter's natural grouping —
 * 3+3 in 6/8, 3+2+2 in 7/8) a lighter one, offbeat events none. Velocities
 * start from each event's own (or 80) and stay within MIDI's 1–127.
 *
 * @example
 * ```ts
 * import { accent, melody } from "musictheoryjs";
 * const bar = melody(["C4", "D4", "E4", "F4"], "q");
 * accent(bar, "4/4").map((e) => e.velocity); // => [96, 86, 86, 86]
 * accent(melody(["C4", "C4"], "8"), "4/4").map((e) => e.velocity ?? null); // => [96, null]
 * accent(bar, "4/4", { downbeat: 20, beat: 0 })[0]?.velocity; // => 100
 * ```
 */
export function accent(
  stream: NoteStreamInput,
  timeSignature: TimeSignatureLike,
  options: {
    /** Velocity added on beat 1 of each bar (default 16). */
    downbeat?: number;
    /** Velocity added on the meter's other beats (default 6). */
    beat?: number;
  } = {}
): NoteStream {
  const ts = asTimeSignature(timeSignature);
  const unit = 4 / ts.denominator; // one denominator note, in beats
  const bar = barWholeNotes(ts) * 4;
  // Beat onsets within the bar, from the grouping: [3, 2, 2] in 7/8 puts
  // beats at eighths 0, 3, and 5.
  const onsets: number[] = [];
  let at = 0;
  for (const group of beatGrouping(ts)) {
    onsets.push(at * unit);
    at += group;
  }
  const downbeat = options.downbeat ?? 16;
  const beat = options.beat ?? 6;

  return asNoteStream(stream).map((e) => {
    const inBar = e.start - Math.floor(e.start / bar + EPS) * bar;
    const isDownbeat = Math.abs(inBar) < EPS;
    const isBeat = !isDownbeat && onsets.some((b) => Math.abs(inBar - b) < EPS);
    const bump = isDownbeat ? downbeat : isBeat ? beat : 0;
    return bump === 0
      ? e
      : { ...e, velocity: clampVelocity((e.velocity ?? BASE_VELOCITY) + bump) };
  });
}

/**
 * Humanize a stream: jitter each onset within ±`timing` beats and each
 * velocity within ±`velocity` steps. Pass `rng` — any function returning a
 * number in `[0, 1)` — to make the result reproducible. Onsets never move
 * before time zero; velocities stay within 1–127.
 *
 * @example
 * ```ts
 * import { humanize, melody } from "musictheoryjs";
 * const tight = melody(["C4", "D4"], "q", { velocity: 90 });
 * humanize(tight, { timing: 0.02, rng: () => 1 }).map((e) => Math.round(e.start * 100) / 100); // => [0.02, 1.02]
 * humanize(tight, { velocity: 10, timing: 0, rng: () => 0 }).map((e) => e.velocity); // => [80, 80]
 * humanize(tight, { timing: 0, velocity: 0 }).map((e) => e.start); // => [0, 1]
 * ```
 */
export function humanize(
  stream: NoteStreamInput,
  options: {
    /** Maximum onset shift in beats, each way (default 0.02). */
    timing?: number;
    /** Maximum velocity shift, each way (default 6). */
    velocity?: number;
    rng?: () => number;
  } = {}
): NoteStream {
  const timing = options.timing ?? 0.02;
  const velocity = options.velocity ?? 6;
  const rng = options.rng ?? Math.random;
  return asNoteStream(stream).map((e) => {
    const jitter = timing === 0 ? 0 : (rng() * 2 - 1) * timing;
    const push = velocity === 0 ? 0 : (rng() * 2 - 1) * velocity;
    return {
      ...e,
      start: Math.max(0, e.start + jitter),
      ...(velocity === 0 && e.velocity === undefined
        ? {}
        : {
            velocity: clampVelocity((e.velocity ?? BASE_VELOCITY) + push),
          }),
    };
  });
}

/**
 * A crescendo or diminuendo as numbers: each event's velocity is set by
 * linear interpolation on its onset, `from` at the span's start to `to` at
 * its end. The span defaults to first onset through last onset, so the
 * final note lands exactly on the target; events outside an explicit span
 * are left untouched, which lets a ramp shape one section of a longer
 * stream. Apply before {@link accent} so the meter's bumps ride on top of
 * the dynamic shape.
 *
 * @example
 * ```ts
 * import { rampVelocity, melody } from "musictheoryjs";
 * const line = melody(["C4", "D4", "E4", "F4", "G4"], "q");
 * rampVelocity(line, 40, 120).map((e) => e.velocity); // => [40, 60, 80, 100, 120]
 * rampVelocity(line, 120, 40, { start: 2 }).map((e) => e.velocity ?? null); // => [null, null, 120, 80, 40]
 * ```
 */
export function rampVelocity(
  stream: NoteStreamInput,
  from: number,
  to: number,
  options: {
    /** First beat of the ramp (default the stream's first onset). */
    start?: number;
    /** Last beat of the ramp (default the stream's last onset). */
    end?: number;
  } = {}
): NoteStream {
  const events = asNoteStream(stream);
  if (events.length === 0) return [];
  const start = options.start ?? Math.min(...events.map((e) => e.start));
  const end = options.end ?? Math.max(...events.map((e) => e.start));
  if (end < start) {
    throw new RangeError(
      `ramp end must not come before its start (${start}), got ${end}`
    );
  }
  return events.map((e) => {
    if (e.start < start - EPS || e.start > end + EPS) return e;
    const t = end - start < EPS ? 1 : (e.start - start) / (end - start);
    return { ...e, velocity: clampVelocity(from + (to - from) * t) };
  });
}

/**
 * Scale every duration — articulation as a number. Below 1 is staccato
 * territory, 1 leaves the stream alone, slightly above 1 overlaps into
 * legato.
 *
 * @example
 * ```ts
 * import { gate, melody } from "musictheoryjs";
 * gate(melody(["C4"], "q"), 0.5)[0]?.duration; // => 0.5
 * gate(melody(["C4"], "q"), 1.1)[0]?.duration; // => ~1.1
 * gate(melody(["C4"], "q"), 0); // => throws "positive"
 * ```
 */
export function gate(stream: NoteStreamInput, factor: number): NoteStream {
  if (!(factor > 0)) {
    throw new RangeError(`gate factor must be positive, got ${factor}`);
  }
  return asNoteStream(stream).map((e) => ({
    ...e,
    duration: e.duration * factor,
  }));
}
