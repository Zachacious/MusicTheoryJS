/**
 * Note-value durations: whole notes to hundred-twenty-eighths, dots, and
 * tuplets.
 *
 * A {@link Duration} is a plain object: a base value named by its denominator
 * (4 = quarter, 8 = eighth — the way musicians say "an eighth"), a dot count,
 * and an optional tuplet ratio. Shorthand strings round-trip with
 * {@link formatDuration}: `"q."` is a dotted quarter, `"8t"` an eighth-note
 * triplet, `"16[5:4]"` a sixteenth quintuplet. Convert to whole notes, beats,
 * MIDI ticks, or seconds; every converter takes a {@link DurationLike}, so a
 * bare `"q."` or `8` works anywhere a duration is expected.
 */

/** A tuplet ratio: `actual` notes in the time `normal` of them usually take.
 * A triplet is `{ actual: 3, normal: 2 }`. */
export interface Tuplet {
  readonly actual: number;
  readonly normal: number;
}

/** A note-value duration as a plain object. */
export interface Duration {
  /** Base value as a denominator: 1 = whole, 2 = half, 4 = quarter, 8 =
   * eighth, … up to 128; 0.5 is a double whole (breve). */
  readonly value: number;
  /** Number of augmentation dots (each adds half the previous value). */
  readonly dots: number;
  /** Tuplet ratio, when the value is part of one. */
  readonly tuplet?: Tuplet;
}

/** Anything the ergonomic layer accepts as a duration: a {@link Duration},
 * shorthand like `"q."` or `"8t"`, or a bare denominator number (4 = quarter). */
export type DurationLike = Duration | string | number;

/** A note-value name accepted by {@link duration} and {@link parseDuration}. */
export type NoteValueName =
  | "double-whole"
  | "breve"
  | "whole"
  | "half"
  | "quarter"
  | "eighth"
  | "sixteenth"
  | "thirty-second"
  | "sixty-fourth"
  | "hundred-twenty-eighth";

/** Valid base values: powers of two from a double whole down to a 128th. */
const VALUES: ReadonlySet<number> = new Set([0.5, 1, 2, 4, 8, 16, 32, 64, 128]);

const NAME_VALUES: Record<string, number> = {
  "double-whole": 0.5,
  breve: 0.5,
  whole: 1,
  w: 1,
  half: 2,
  h: 2,
  quarter: 4,
  q: 4,
  eighth: 8,
  e: 8,
  sixteenth: 16,
  s: 16,
  "thirty-second": 32,
  "sixty-fourth": 64,
  "hundred-twenty-eighth": 128,
};

const BASE_NAMES: Record<number, string> = {
  0.5: "double whole",
  1: "whole",
  2: "half",
  4: "quarter",
  8: "eighth",
  16: "sixteenth",
  32: "thirty-second",
  64: "sixty-fourth",
  128: "hundred-twenty-eighth",
};

const TUPLET_NAMES: Record<number, string> = {
  2: "duplet",
  3: "triplet",
  4: "quadruplet",
  5: "quintuplet",
  6: "sextuplet",
  7: "septuplet",
  9: "nonuplet",
};

/**
 * Build a {@link Tuplet}. When `normal` is omitted it defaults to the largest
 * power of two below `actual` (3 → 2, 5 → 4, 7 → 4, 9 → 8); 2 and 4 default
 * to 3, their compound-meter reading (a duplet is 2 in the time of 3).
 * @throws {RangeError} when `actual` is not an integer ≥ 2 or `normal` is not
 *   a positive integer.
 *
 * @example
 * ```ts
 * import { tuplet } from "musictheoryjs";
 * tuplet(3); // => { actual: 3, normal: 2 }
 * tuplet(5); // => { actual: 5, normal: 4 }
 * tuplet(2); // => { actual: 2, normal: 3 }
 * tuplet(7, 8); // => { actual: 7, normal: 8 }
 * ```
 */
export function tuplet(actual: number, normal?: number): Tuplet {
  if (!Number.isInteger(actual) || actual < 2) {
    throw new RangeError(`tuplet count must be an integer >= 2, got ${actual}`);
  }
  const n =
    normal ??
    (actual === 2 || actual === 4 ? 3 : 2 ** Math.floor(Math.log2(actual - 1)));
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(
      `tuplet "normal" must be a positive integer, got ${n}`
    );
  }
  return { actual, normal: n };
}

/**
 * Build a {@link Duration} from a value (denominator number or name), with
 * optional dots and a tuplet.
 * @throws {RangeError} when the value is not a note value, dots is not a
 *   non-negative integer, or the tuplet ratio is invalid.
 *
 * @example
 * ```ts
 * import { duration, tuplet } from "musictheoryjs";
 * duration(4); // => { value: 4, dots: 0 }
 * duration("quarter", { dots: 1 }); // => { value: 4, dots: 1 }
 * duration(8, { tuplet: tuplet(3) }); // => { value: 8, dots: 0, tuplet: { actual: 3, normal: 2 } }
 * duration(5); // => throws "not a note value"
 * ```
 */
export function duration(
  value: number | NoteValueName,
  options: { dots?: number; tuplet?: Tuplet } = {}
): Duration {
  const v = typeof value === "string" ? NAME_VALUES[value] : value;
  if (v === undefined || !VALUES.has(v)) {
    throw new RangeError(`not a note value: ${value}`);
  }
  const dots = options.dots ?? 0;
  if (!Number.isInteger(dots) || dots < 0) {
    throw new RangeError(`dots must be a non-negative integer, got ${dots}`);
  }
  const t = options.tuplet;
  if (t !== undefined) {
    // Re-validate through the factory so hand-built ratios are checked too.
    return { value: v, dots, tuplet: tuplet(t.actual, t.normal) };
  }
  return { value: v, dots };
}

// Full names before single letters so "quarter" never parses as "q";
// explicit alternatives so the "t" of "st" stays the triplet suffix.
const PATTERN =
  /^\s*(double-whole|breve|whole|half|quarter|eighth|sixteenth|thirty-second|sixty-fourth|hundred-twenty-eighth|[whqes]|\d+)(\.*)(?:(t)|\[(\d+):(\d+)\])?\s*$/;

/** Build the parsed duration from a {@link PATTERN} match.
 * @throws {RangeError} on an invalid base value or tuplet ratio. */
function fromMatch(match: RegExpExecArray): Duration {
  const [, base = "", dotsRaw = "", triplet, actualRaw, normalRaw] = match;
  const value = /^\d+$/.test(base) ? Number(base) : NAME_VALUES[base];
  if (value === undefined) {
    throw new RangeError(`not a note value: ${base}`);
  }
  const t = triplet
    ? { actual: 3, normal: 2 }
    : actualRaw !== undefined
      ? { actual: Number(actualRaw), normal: Number(normalRaw) }
      : undefined;
  return duration(
    value,
    t === undefined
      ? { dots: dotsRaw.length }
      : { dots: dotsRaw.length, tuplet: t }
  );
}

/**
 * Parse duration shorthand, or return `null` when the string is not a valid
 * duration. The base is a denominator number (`"4"`, `"8"`), a name
 * (`"quarter"`, `"breve"`), or a letter (`w h q e s`); trailing dots add
 * augmentation dots; a `t` suffix means triplet and `[a:n]` any tuplet ratio.
 *
 * @example
 * ```ts
 * import { tryParseDuration } from "musictheoryjs";
 * tryParseDuration("q."); // => { value: 4, dots: 1 }
 * tryParseDuration("8t"); // => { value: 8, dots: 0, tuplet: { actual: 3, normal: 2 } }
 * tryParseDuration("3"); // => null
 * ```
 */
export function tryParseDuration(text: string): Duration | null {
  const match = PATTERN.exec(text);
  if (!match) return null;
  try {
    return fromMatch(match);
  } catch {
    // Well-formed but impossible, e.g. "3" or "8[1:2]".
    return null;
  }
}

/**
 * Parse duration shorthand into a {@link Duration}.
 * @throws {SyntaxError} when the string is malformed.
 * @throws {RangeError} when the base or tuplet ratio is invalid (e.g. `"3"` —
 *   there is no third note).
 *
 * @example
 * ```ts
 * import { parseDuration } from "musictheoryjs";
 * parseDuration("h.."); // => { value: 2, dots: 2 }
 * parseDuration("sixteenth"); // => { value: 16, dots: 0 }
 * parseDuration("16[5:4]"); // => { value: 16, dots: 0, tuplet: { actual: 5, normal: 4 } }
 * parseDuration("3"); // => throws "not a note value"
 * ```
 */
export function parseDuration(text: string): Duration {
  const match = PATTERN.exec(text);
  if (!match) {
    throw new SyntaxError(`invalid duration: "${text}"`);
  }
  return fromMatch(match);
}

/**
 * Normalise any {@link DurationLike} to a {@link Duration}: durations pass
 * through, strings are parsed, numbers are read as denominators.
 *
 * @example
 * ```ts
 * import { asDuration } from "musictheoryjs";
 * asDuration(8); // => { value: 8, dots: 0 }
 * asDuration("q."); // => { value: 4, dots: 1 }
 * ```
 */
export function asDuration(input: DurationLike): Duration {
  if (typeof input === "string") return parseDuration(input);
  if (typeof input === "number") return duration(input);
  return input;
}

/**
 * Format a duration as shorthand that round-trips through
 * {@link parseDuration}: the denominator number (`"breve"` for a double
 * whole), dots as trailing dots, a 3:2 tuplet as `t`, any other ratio as
 * `[a:n]`.
 *
 * @example
 * ```ts
 * import { formatDuration, duration, tuplet, parseDuration } from "musictheoryjs";
 * formatDuration(duration(4, { dots: 1 })); // => "4."
 * formatDuration(duration(8, { tuplet: tuplet(3) })); // => "8t"
 * formatDuration(duration(16, { tuplet: tuplet(5) })); // => "16[5:4]"
 * parseDuration(formatDuration(duration(2, { dots: 2 }))); // => { value: 2, dots: 2 }
 * ```
 */
export function formatDuration(input: DurationLike): string {
  const d = asDuration(input);
  const base = d.value === 0.5 ? "breve" : String(d.value);
  const t = d.tuplet;
  const suffix =
    t === undefined
      ? ""
      : t.actual === 3 && t.normal === 2
        ? "t"
        : `[${t.actual}:${t.normal}]`;
  return base + ".".repeat(d.dots) + suffix;
}

/**
 * The spoken name of a duration: `"dotted quarter"`, `"eighth triplet"`,
 * `"double-dotted half"`.
 *
 * @example
 * ```ts
 * import { durationName } from "musictheoryjs";
 * durationName("q."); // => "dotted quarter"
 * durationName("8t"); // => "eighth triplet"
 * durationName("16[5:4]"); // => "sixteenth quintuplet"
 * durationName("h.."); // => "double-dotted half"
 * ```
 */
export function durationName(input: DurationLike): string {
  const d = asDuration(input);
  const dots =
    d.dots === 0
      ? ""
      : d.dots === 1
        ? "dotted "
        : d.dots === 2
          ? "double-dotted "
          : d.dots === 3
            ? "triple-dotted "
            : `${d.dots}-dotted `;
  const t = d.tuplet;
  const suffix =
    t === undefined
      ? ""
      : ` ${TUPLET_NAMES[t.actual] ?? `${t.actual}:${t.normal} tuplet`}`;
  return dots + (BASE_NAMES[d.value] as string) + suffix;
}

/**
 * The length of a duration as a fraction of a whole note. Each dot adds half
 * the previous value; a tuplet scales by `normal/actual`.
 *
 * @example
 * ```ts
 * import { wholeNotes } from "musictheoryjs";
 * wholeNotes("q"); // => 0.25
 * wholeNotes("q."); // => 0.375
 * wholeNotes("8t"); // => ~0.0833
 * wholeNotes("breve"); // => 2
 * ```
 */
export function wholeNotes(input: DurationLike): number {
  const d = asDuration(input);
  const t = d.tuplet;
  return (
    ((2 - 2 ** -d.dots) / d.value) * (t === undefined ? 1 : t.normal / t.actual)
  );
}

/**
 * The length of a duration in beats. The beat is a quarter note unless a
 * different `beat` unit is given.
 *
 * @example
 * ```ts
 * import { durationBeats } from "musictheoryjs";
 * durationBeats("h"); // => 2
 * durationBeats("q."); // => 1.5
 * durationBeats("q.", "q."); // => 1
 * durationBeats("8", "q."); // => ~0.333
 * ```
 */
export function durationBeats(
  input: DurationLike,
  beat: DurationLike = 4
): number {
  return wholeNotes(input) / wholeNotes(beat);
}

/**
 * The length of a duration in MIDI ticks at a given PPQ (ticks per quarter
 * note), rounded to the nearest tick.
 *
 * @example
 * ```ts
 * import { durationTicks } from "musictheoryjs";
 * durationTicks("q"); // => 480
 * durationTicks("8t"); // => 160
 * durationTicks("q.", 96); // => 144
 * ```
 */
export function durationTicks(input: DurationLike, ppq = 480): number {
  const d = asDuration(input);
  const t = d.tuplet;
  // Rational form so exact grids (e.g. triplets at divisible PPQs) stay exact.
  const num =
    4 * ppq * (2 ** (d.dots + 1) - 1) * (t === undefined ? 1 : t.normal);
  const den = d.value * 2 ** d.dots * (t === undefined ? 1 : t.actual);
  return Math.round(num / den);
}

/**
 * The length of a duration in seconds at a given tempo. `bpm` counts quarter
 * notes unless a different `beat` unit is given (90 dotted-quarter beats per
 * minute in 6/8: `durationSeconds("8", 90, "q.")`).
 *
 * @example
 * ```ts
 * import { durationSeconds } from "musictheoryjs";
 * durationSeconds("q", 120); // => 0.5
 * durationSeconds("h.", 60); // => 3
 * durationSeconds("8", 90, "q."); // => ~0.222
 * ```
 */
export function durationSeconds(
  input: DurationLike,
  bpm: number,
  beat: DurationLike = 4
): number {
  return durationBeats(input, beat) * (60 / bpm);
}
