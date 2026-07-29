/**
 * @module core/interval
 * Spelled intervals: `steps` is the letter distance (0 = unison, 1 = second,
 * …), `semitones` the chromatic distance; both negative for descending
 * intervals. The pair distinguishes what a bare semitone count cannot —
 * `m3` (2, 3) is not `A2` (1, 3) — which is what makes exact enharmonic
 * spelling possible everywhere else.
 *
 * Quality and number are *derived* from the pair, never stored. Parsing
 * accepts both orders (`"m3"` / `"3m"`, `"P5"` / `"5P"`) and a leading `-`
 * for descending; formatting emits `"m3"` style.
 */

import { MusicTheoryError } from "./errors";
import { STEP_SEMITONES } from "./pitch";
import { mod } from "./util";

/** A spelled interval. Instances are frozen; operations return new values. */
export interface Interval {
  readonly steps: number;
  readonly semitones: number;
}

/** Simple steps whose basic size is "perfect" (unison/octave, fourth, fifth). */
const PERFECT_CLASS = new Set([0, 3, 4]);

/**
 * Structural type guard for `Interval`-shaped values. Only own properties are
 * consulted, so values remain deterministic under prototype pollution.
 *
 * @example
 * ```ts
 * import { isInterval, interval } from "musictheoryjs";
 *
 * isInterval(interval("m3")); // => true
 * isInterval({ steps: 2, semitones: 3 }); // => true
 * isInterval("m3"); // => false
 * ```
 */
export function isInterval(value: unknown): value is Interval {
  if (typeof value !== "object" || value === null) return false;
  const i = value as Record<string, unknown>;
  const own = (key: string): boolean =>
    Object.prototype.hasOwnProperty.call(i, key);
  return (
    own("steps") &&
    typeof i.steps === "number" &&
    own("semitones") &&
    typeof i.semitones === "number"
  );
}

function make(steps: number, semitones: number): Interval {
  if (!Number.isSafeInteger(steps) || !Number.isSafeInteger(semitones)) {
    throw new MusicTheoryError(
      `Invalid interval (steps: ${steps}, semitones: ${semitones}): both must be safe integers.`
    );
  }
  return Object.freeze({
    steps: steps === 0 ? 0 : steps,
    semitones: semitones === 0 ? 0 : semitones,
  });
}

// A/d runs are unbounded so that every name intervalName() can emit parses
// back — interval(intervalName(x)) round-trips for any Interval.
const INTERVAL_REGEX = /^([-+])?(?:(A+|P|M|m|d+)(\d+)|(\d+)(A+|P|M|m|d+))$/;
const intervalCache = new Map<string, Interval>();

/**
 * Parse an interval name or normalize an `Interval` object; returns `null` on
 * failure (including theory violations like `"P3"` or `"M5"`).
 *
 * @example
 * ```ts
 * import { tryInterval } from "musictheoryjs";
 *
 * tryInterval("m3").semitones; // => 3
 * tryInterval("5P").steps; // => 4
 * // Thirds are major or minor, never perfect:
 * tryInterval("P3"); // => null
 * ```
 */
export function tryInterval(input: string | Interval): Interval | null {
  if (isInterval(input)) {
    // Fast path: frozen, field-valid intervals pass through untouched.
    if (
      Object.isFrozen(input) &&
      Number.isSafeInteger(input.steps) &&
      Number.isSafeInteger(input.semitones)
    ) {
      return input;
    }
    try {
      return make(input.steps, input.semitones);
    } catch {
      return null;
    }
  }
  if (typeof input !== "string") return null;
  const cached = intervalCache.get(input);
  if (cached !== undefined) return cached;
  const m = INTERVAL_REGEX.exec(input);
  if (m === null) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const q = m[2] ?? m[5];
  const num = parseInt(m[3] ?? m[4], 10);
  if (num < 1) return null;
  const absSteps = num - 1;
  const simple = mod(absSteps, 7);
  const natural = STEP_SEMITONES[simple] + 12 * Math.floor(absSteps / 7);
  const perfect = PERFECT_CLASS.has(simple);
  let delta: number;
  if (q === "P") {
    if (!perfect) return null;
    delta = 0;
  } else if (q === "M") {
    if (perfect) return null;
    delta = 0;
  } else if (q === "m") {
    if (perfect) return null;
    delta = -1;
  } else if (q.startsWith("A")) {
    delta = q.length;
  } else {
    delta = perfect ? -q.length : -q.length - 1;
  }
  const parsed = make(sign * absSteps, sign * (natural + delta));
  if (intervalCache.size > 10_000) intervalCache.clear();
  intervalCache.set(input, parsed);
  return parsed;
}

/**
 * Parse an interval name or normalize an `Interval` object; throws on failure.
 *
 * @example
 * ```ts
 * import { interval } from "musictheoryjs";
 *
 * interval("P5").semitones; // => 7
 * interval("-M6").steps; // => -5
 * interval("M5"); // => throws "Invalid interval"
 * ```
 */
export function interval(input: string | Interval): Interval {
  const i = tryInterval(input);
  if (i === null) {
    throw new MusicTheoryError(
      `Invalid interval: ${JSON.stringify(input)}. Expected a name like "m3", "P5", "A4", "-M6", or an Interval object.`
    );
  }
  return i;
}

/** Decomposed view of an interval used by the derivation functions. */
interface IntervalParts {
  direction: 1 | -1;
  absSteps: number;
  absSemitones: number;
  simple: number;
  delta: number;
  perfect: boolean;
}

function decompose(input: string | Interval): IntervalParts {
  const i = interval(input);
  const direction: 1 | -1 =
    i.steps < 0 || (i.steps === 0 && i.semitones < 0) ? -1 : 1;
  const absSteps = Math.abs(i.steps);
  const absSemitones = direction * i.semitones;
  const simple = mod(absSteps, 7);
  const natural = STEP_SEMITONES[simple] + 12 * Math.floor(absSteps / 7);
  return {
    direction,
    absSteps,
    absSemitones,
    simple,
    delta: absSemitones - natural,
    perfect: PERFECT_CLASS.has(simple),
  };
}

function qualityString(parts: IntervalParts): string {
  const { delta, perfect } = parts;
  if (delta === 0) return perfect ? "P" : "M";
  if (delta > 0) return "A".repeat(delta);
  if (!perfect && delta === -1) return "m";
  return "d".repeat(perfect ? -delta : -delta - 1);
}

/**
 * Canonical name: `intervalName({steps: 2, semitones: 3}) === "m3"`, descending
 * prefixed `-`. Unisons are named by semitone sign — `(0, -1)` is `"-A1"`;
 * `"d1"` and `"-P1"` parse as aliases that normalize to canonical form.
 *
 * @example
 * ```ts
 * import { intervalName } from "musictheoryjs";
 *
 * intervalName({ steps: 2, semitones: 3 }); // => "m3"
 * intervalName({ steps: 1, semitones: 3 }); // => "A2"
 * intervalName("d1"); // => "-A1"
 * ```
 */
export function intervalName(input: string | Interval): string {
  const parts = decompose(input);
  const sign = parts.direction === -1 ? "-" : "";
  return `${sign}${qualityString(parts)}${parts.absSteps + 1}`;
}

/**
 * Quality string alone: `"P"`, `"M"`, `"m"`, `"A"`, `"dd"`, …
 *
 * @example
 * ```ts
 * import { intervalQuality } from "musictheoryjs";
 *
 * intervalQuality("P5"); // => "P"
 * intervalQuality("m7"); // => "m"
 * intervalQuality({ steps: 3, semitones: 4 }); // => "d"
 * ```
 */
export function intervalQuality(input: string | Interval): string {
  return qualityString(decompose(input));
}

/**
 * Generic interval number (always positive): `intervalNumber("-m10") === 10`.
 *
 * @example
 * ```ts
 * import { intervalNumber } from "musictheoryjs";
 *
 * intervalNumber("P5"); // => 5
 * intervalNumber("-m10"); // => 10
 * ```
 */
export function intervalNumber(input: string | Interval): number {
  return decompose(input).absSteps + 1;
}

/**
 * 1 for ascending (and unison), -1 for descending.
 *
 * @example
 * ```ts
 * import { intervalDirection } from "musictheoryjs";
 *
 * intervalDirection("M3"); // => 1
 * intervalDirection("-M3"); // => -1
 * intervalDirection("P1"); // => 1
 * ```
 */
export function intervalDirection(input: string | Interval): 1 | -1 {
  return decompose(input).direction;
}

/**
 * Sum of two intervals: `add("M3", "m3")` = P5. Pure vector addition.
 *
 * @example
 * ```ts
 * import { add, intervalName } from "musictheoryjs";
 *
 * intervalName(add("M3", "m3")); // => "P5"
 * // Two major thirds make an augmented fifth, not a minor sixth:
 * intervalName(add("M3", "M3")); // => "A5"
 * ```
 */
export function add(
  a: string | Interval,
  b: string | Interval
): Interval {
  const x = interval(a);
  const y = interval(b);
  return make(x.steps + y.steps, x.semitones + y.semitones);
}

/**
 * Difference of two intervals: `subtract("P5", "M3")` = m3.
 *
 * @example
 * ```ts
 * import { subtract, intervalName } from "musictheoryjs";
 *
 * intervalName(subtract("P5", "M3")); // => "m3"
 * intervalName(subtract("M3", "P5")); // => "-m3"
 * ```
 */
export function subtract(
  a: string | Interval,
  b: string | Interval
): Interval {
  const x = interval(a);
  const y = interval(b);
  return make(x.steps - y.steps, x.semitones - y.semitones);
}

/**
 * Reduce a compound interval to its simple equivalent, preserving direction.
 * Exact octave multiples reduce to the octave, not unison: `simplify("P15")` = P8.
 *
 * @example
 * ```ts
 * import { simplify, intervalName } from "musictheoryjs";
 *
 * intervalName(simplify("m10")); // => "m3"
 * intervalName(simplify("P15")); // => "P8"
 * intervalName(simplify("-M9")); // => "-M2"
 * ```
 */
export function simplify(input: string | Interval): Interval {
  const i = interval(input);
  const parts = decompose(i);
  if (parts.absSteps <= 7) return make(i.steps, i.semitones);
  const octaves = Math.floor(parts.absSteps / 7);
  const removed = parts.absSteps % 7 === 0 ? octaves - 1 : octaves;
  const steps = parts.absSteps - 7 * removed;
  const semitones = parts.absSemitones - 12 * removed;
  return make(parts.direction * steps, parts.direction * semitones);
}

/**
 * Standard inversion of the (simplified) interval, preserving direction:
 * m3→M6, A4→d5, P1→P8, P8→P1.
 *
 * @example
 * ```ts
 * import { invert, intervalName } from "musictheoryjs";
 *
 * intervalName(invert("m3")); // => "M6"
 * intervalName(invert("A4")); // => "d5"
 * intervalName(invert("P1")); // => "P8"
 * ```
 */
export function invert(input: string | Interval): Interval {
  const parts = decompose(simplify(input));
  const steps = 7 - parts.absSteps;
  const semitones = 12 - parts.absSemitones;
  return make(parts.direction * steps, parts.direction * semitones);
}
