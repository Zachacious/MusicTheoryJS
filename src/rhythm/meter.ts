/**
 * Time signatures and meter.
 *
 * A {@link TimeSignature} is a plain `{ numerator, denominator }` object;
 * `"6/8"` strings and `[6, 8]` pairs are accepted anywhere one is expected.
 * Meters classify as simple, compound, or irregular; {@link beatGrouping}
 * gives the felt beats (6/8 is two groups of three eighths, 7/8 defaults to
 * 3+2+2), and {@link tickToPosition}/{@link positionToTick} convert between
 * absolute ticks and bar/beat positions using that grouping.
 */

import {
  type Duration,
  type DurationLike,
  duration,
  wholeNotes,
} from "./duration";

/** A time signature as a plain object: 6/8 is `{ numerator: 6, denominator: 8 }`. */
export interface TimeSignature {
  /** Beats-as-written per bar (the top number). */
  readonly numerator: number;
  /** The note value of one written beat (the bottom number, a power of two). */
  readonly denominator: number;
}

/** Anything the ergonomic layer accepts as a time signature: a
 * {@link TimeSignature}, a string like `"6/8"`, or a `[6, 8]` pair. */
export type TimeSignatureLike =
  | TimeSignature
  | string
  | readonly [number, number];

/** How a meter divides: `"simple"` beats split in two (4/4, 3/4), `"compound"`
 * beats split in three (6/8, 12/8), `"irregular"` beats are unequal (5/8, 7/8). */
export type MeterClass = "simple" | "compound" | "irregular";

/** A position within metered time: 1-based bar, 1-based beat within the bar
 * (beats follow {@link beatGrouping}), and ticks past the start of the beat. */
export interface MeterPosition {
  readonly bar: number;
  readonly beat: number;
  readonly offset: number;
}

/**
 * Build a {@link TimeSignature}.
 * @throws {RangeError} when the numerator is not a positive integer or the
 *   denominator is not a power of two from 1 to 128.
 *
 * @example
 * ```ts
 * import { timeSignature } from "musictheoryjs";
 * timeSignature(6, 8); // => { numerator: 6, denominator: 8 }
 * timeSignature(4, 6); // => throws "power of two"
 * ```
 */
export function timeSignature(
  numerator: number,
  denominator: number
): TimeSignature {
  if (!Number.isInteger(numerator) || numerator < 1) {
    throw new RangeError(
      `time signature numerator must be a positive integer, got ${numerator}`
    );
  }
  const power = Math.log2(denominator);
  if (!Number.isInteger(power) || denominator < 1 || denominator > 128) {
    throw new RangeError(
      `time signature denominator must be a power of two from 1 to 128, got ${denominator}`
    );
  }
  return { numerator, denominator };
}

const TS_PATTERN = /^\s*(\d+)\s*\/\s*(\d+)\s*$/;

/**
 * Parse a time signature string, or return `null` when it is not one.
 * `"C"`/`"common"` mean 4/4 and `"C|"`/`"cut"` mean 2/2.
 *
 * @example
 * ```ts
 * import { tryParseTimeSignature } from "musictheoryjs";
 * tryParseTimeSignature("7/8"); // => { numerator: 7, denominator: 8 }
 * tryParseTimeSignature("C"); // => { numerator: 4, denominator: 4 }
 * tryParseTimeSignature("4/6"); // => null
 * ```
 */
export function tryParseTimeSignature(text: string): TimeSignature | null {
  try {
    return parseTimeSignature(text);
  } catch {
    return null;
  }
}

/**
 * Parse a time signature string into a {@link TimeSignature}.
 * @throws {SyntaxError} when the string is malformed.
 * @throws {RangeError} when the denominator is not a power of two.
 *
 * @example
 * ```ts
 * import { parseTimeSignature } from "musictheoryjs";
 * parseTimeSignature("6/8"); // => { numerator: 6, denominator: 8 }
 * parseTimeSignature("cut"); // => { numerator: 2, denominator: 2 }
 * parseTimeSignature("waltz"); // => throws "invalid time signature"
 * ```
 */
export function parseTimeSignature(text: string): TimeSignature {
  const symbol = text.trim();
  if (symbol === "C" || symbol === "common")
    return { numerator: 4, denominator: 4 };
  if (symbol === "C|" || symbol === "cut")
    return { numerator: 2, denominator: 2 };
  const match = TS_PATTERN.exec(text);
  if (!match) {
    throw new SyntaxError(`invalid time signature: "${text}"`);
  }
  return timeSignature(Number(match[1]), Number(match[2]));
}

/**
 * Normalise any {@link TimeSignatureLike} to a {@link TimeSignature}: objects
 * pass through, strings are parsed, `[n, d]` pairs are validated.
 *
 * @example
 * ```ts
 * import { asTimeSignature } from "musictheoryjs";
 * asTimeSignature("3/4"); // => { numerator: 3, denominator: 4 }
 * asTimeSignature([12, 8]); // => { numerator: 12, denominator: 8 }
 * ```
 */
export function asTimeSignature(input: TimeSignatureLike): TimeSignature {
  if (typeof input === "string") return parseTimeSignature(input);
  if (Array.isArray(input)) {
    return timeSignature(input[0] as number, input[1] as number);
  }
  return input as TimeSignature;
}

/**
 * Format a time signature as `"n/d"`. Round-trips with
 * {@link parseTimeSignature}.
 *
 * @example
 * ```ts
 * import { formatTimeSignature } from "musictheoryjs";
 * formatTimeSignature({ numerator: 6, denominator: 8 }); // => "6/8"
 * formatTimeSignature([4, 4]); // => "4/4"
 * ```
 */
export function formatTimeSignature(input: TimeSignatureLike): string {
  const ts = asTimeSignature(input);
  return `${ts.numerator}/${ts.denominator}`;
}

/**
 * Classify a meter: `"simple"` (numerator up to 4 — each beat divides in
 * two), `"compound"` (numerator a multiple of 3 above 3 — each beat is a
 * dotted value dividing in three), or `"irregular"` (unequal beats: 5, 7,
 * 8, 11, …).
 *
 * @example
 * ```ts
 * import { meterClass } from "musictheoryjs";
 * meterClass("4/4"); // => "simple"
 * meterClass("3/4"); // => "simple"
 * meterClass("6/8"); // => "compound"
 * meterClass("7/8"); // => "irregular"
 * ```
 */
export function meterClass(input: TimeSignatureLike): MeterClass {
  const { numerator } = asTimeSignature(input);
  if (numerator <= 4) return "simple";
  if (numerator % 3 === 0) return "compound";
  return "irregular";
}

/**
 * The felt beats of a bar as groups of the written (denominator) unit.
 * Simple meters are all ones, compound meters all threes; irregular meters
 * default to threes first, then twos (7/8 → 3+2+2, 8/8 → 3+3+2). For a
 * different grouping, build your own array — everything that takes a
 * grouping is driven by this shape.
 *
 * @example
 * ```ts
 * import { beatGrouping } from "musictheoryjs";
 * beatGrouping("4/4"); // => [1, 1, 1, 1]
 * beatGrouping("12/8"); // => [3, 3, 3, 3]
 * beatGrouping("5/8"); // => [3, 2]
 * beatGrouping("8/8"); // => [3, 3, 2]
 * ```
 */
export function beatGrouping(input: TimeSignatureLike): number[] {
  const ts = asTimeSignature(input);
  const cls = meterClass(ts);
  if (cls === "simple") return Array(ts.numerator).fill(1);
  if (cls === "compound") return Array(ts.numerator / 3).fill(3);
  const groups: number[] = [];
  let rest = ts.numerator;
  while (rest > 4) {
    groups.push(3);
    rest -= 3;
  }
  if (rest === 4) groups.push(2, 2);
  else groups.push(rest);
  return groups;
}

/**
 * The number of felt beats in a bar: 4 in 4/4, 2 in 6/8, 3 in 7/8.
 *
 * @example
 * ```ts
 * import { beatsPerBar } from "musictheoryjs";
 * beatsPerBar("4/4"); // => 4
 * beatsPerBar("6/8"); // => 2
 * beatsPerBar("7/8"); // => 3
 * ```
 */
export function beatsPerBar(input: TimeSignatureLike): number {
  return beatGrouping(input).length;
}

/**
 * The duration of one felt beat: the denominator value in simple meters, its
 * dotted double in compound meters (6/8 → dotted quarter). Irregular meters
 * have unequal beats, so this returns the written (denominator) unit —
 * combine with {@link beatGrouping} for the real beat lengths.
 *
 * @example
 * ```ts
 * import { beatUnit } from "musictheoryjs";
 * beatUnit("4/4"); // => { value: 4, dots: 0 }
 * beatUnit("6/8"); // => { value: 4, dots: 1 }
 * beatUnit("7/8"); // => { value: 8, dots: 0 }
 * ```
 */
export function beatUnit(input: TimeSignatureLike): Duration {
  const ts = asTimeSignature(input);
  if (meterClass(ts) === "compound") {
    return duration(ts.denominator / 2, { dots: 1 });
  }
  return duration(ts.denominator);
}

/**
 * The length of one bar as a fraction of a whole note.
 *
 * @example
 * ```ts
 * import { barWholeNotes } from "musictheoryjs";
 * barWholeNotes("4/4"); // => 1
 * barWholeNotes("6/8"); // => 0.75
 * ```
 */
export function barWholeNotes(input: TimeSignatureLike): number {
  const ts = asTimeSignature(input);
  return ts.numerator / ts.denominator;
}

/**
 * The length of one bar in MIDI ticks at a given PPQ.
 *
 * @example
 * ```ts
 * import { barTicks } from "musictheoryjs";
 * barTicks("4/4"); // => 1920
 * barTicks("6/8", 96); // => 288
 * ```
 */
export function barTicks(input: TimeSignatureLike, ppq = 480): number {
  return Math.round(barWholeNotes(input) * 4 * ppq);
}

/**
 * The length of one bar in seconds at a given tempo. `bpm` counts quarter
 * notes unless a different `beat` unit is given.
 *
 * @example
 * ```ts
 * import { barSeconds } from "musictheoryjs";
 * barSeconds("4/4", 120); // => 2
 * barSeconds("6/8", 90, "q."); // => ~1.333
 * ```
 */
export function barSeconds(
  input: TimeSignatureLike,
  bpm: number,
  beat: DurationLike = 4
): number {
  return (barWholeNotes(input) / wholeNotes(beat)) * (60 / bpm);
}

/**
 * Locate an absolute tick within metered time: which bar (1-based), which
 * felt beat within the bar (1-based, following {@link beatGrouping} — so the
 * beats of 7/8 are 3+2+2 eighths long), and how many ticks past that beat.
 * @throws {RangeError} when `tick` is negative.
 *
 * @example
 * ```ts
 * import { tickToPosition } from "musictheoryjs";
 * tickToPosition(0, "4/4"); // => { bar: 1, beat: 1, offset: 0 }
 * tickToPosition(1230, "4/4"); // => { bar: 1, beat: 3, offset: 270 }
 * tickToPosition(1500, "6/8"); // => { bar: 2, beat: 1, offset: 60 }
 * tickToPosition(960, "7/8"); // => { bar: 1, beat: 2, offset: 240 }
 * ```
 */
export function tickToPosition(
  tick: number,
  ts: TimeSignatureLike,
  ppq = 480
): MeterPosition {
  if (tick < 0) {
    throw new RangeError(`tick must be non-negative, got ${tick}`);
  }
  const sig = asTimeSignature(ts);
  const unit = (4 * ppq) / sig.denominator;
  const bar = sig.numerator * unit;
  const barIndex = Math.floor(tick / bar);
  let within = tick - barIndex * bar;
  let beat = 1;
  for (const group of beatGrouping(sig)) {
    const span = group * unit;
    if (within < span) break;
    within -= span;
    beat++;
  }
  return { bar: barIndex + 1, beat, offset: within };
}

/**
 * The absolute tick of a bar/beat position — the inverse of
 * {@link tickToPosition}. `offset` (ticks past the beat) defaults to 0.
 * @throws {RangeError} when the bar or beat is out of range.
 *
 * @example
 * ```ts
 * import { positionToTick } from "musictheoryjs";
 * positionToTick({ bar: 1, beat: 3 }, "4/4"); // => 960
 * positionToTick({ bar: 2, beat: 2 }, "6/8"); // => 2160
 * positionToTick({ bar: 1, beat: 3, offset: 100 }, "7/8"); // => 1300
 * positionToTick({ bar: 1, beat: 4 }, "7/8"); // => throws "beat"
 * ```
 */
export function positionToTick(
  position: { bar: number; beat: number; offset?: number },
  ts: TimeSignatureLike,
  ppq = 480
): number {
  const sig = asTimeSignature(ts);
  const groups = beatGrouping(sig);
  const { bar, beat } = position;
  const offset = position.offset ?? 0;
  if (!Number.isInteger(bar) || bar < 1) {
    throw new RangeError(`bar must be a positive integer, got ${bar}`);
  }
  if (!Number.isInteger(beat) || beat < 1 || beat > groups.length) {
    throw new RangeError(
      `beat must be an integer from 1 to ${groups.length}, got ${beat}`
    );
  }
  const unit = (4 * ppq) / sig.denominator;
  let units = 0;
  for (let i = 0; i < beat - 1; i++) units += groups[i] as number;
  return (bar - 1) * sig.numerator * unit + units * unit + offset;
}

/**
 * Convert a time in seconds to beats at a given tempo.
 *
 * @example
 * ```ts
 * import { secondsToBeats } from "musictheoryjs";
 * secondsToBeats(1.5, 120); // => 3
 * ```
 */
export function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60;
}

/**
 * Convert a count of beats to seconds at a given tempo.
 *
 * @example
 * ```ts
 * import { beatsToSeconds } from "musictheoryjs";
 * beatsToSeconds(4, 90); // => ~2.667
 * ```
 */
export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}
