/**
 * Interval names and numeric intervals — the other two ways in.
 *
 * Interval names round-trip with {@link intervalName}: `"P5"`, `"m3"`, `"A4"`,
 * `"dd7"`, and descending forms like `"-M2"` all parse back to the interval
 * that produced them. Bare semitone counts map to conventional spellings
 * (7 → P5, 3 → m3), so callers who think chromatically never have to name a
 * quality; only the tritone is ambiguous, settled by a sharp/flat preference.
 */

import { type Interval, type Quality, interval } from "./interval";

/** Anything the ergonomic layer accepts as an interval: a spelled
 * {@link Interval}, a name like `"P5"`, or a bare semitone count. */
export type IntervalLike = Interval | string | number;

const NAME_PATTERN = /^\s*(-)?(P|M|m|A+|d+)(\d+)\s*$/;

/**
 * Parse an interval name (`"P5"`, `"m3"`, `"-M2"`, `"AA4"`, `"dd7"`), or
 * return `null` when the string is not a valid interval. Stacked `A`/`d`
 * letters mean doubly (triply, …) augmented or diminished.
 *
 * @example
 * ```ts
 * import { tryParseInterval } from "musictheoryjs";
 * tryParseInterval("P5"); // => { steps: 4, semitones: 7 }
 * tryParseInterval("M5"); // => null
 * ```
 */
export function tryParseInterval(name: string): Interval | null {
  const match = NAME_PATTERN.exec(name);
  if (!match) return null;
  const [, sign, qualityRaw = "", numberRaw = ""] = match;
  const quality = qualityRaw[0] as Quality;
  const count = qualityRaw.length;
  try {
    const iv = interval(Number(numberRaw), quality, count);
    // `|| 0` keeps a negated unison at 0, never -0.
    return sign ? { steps: -iv.steps || 0, semitones: -iv.semitones || 0 } : iv;
  } catch {
    // Well-formed but impossible, e.g. "M5": no major fifth exists.
    return null;
  }
}

/**
 * Parse an interval name into an {@link Interval}.
 * @throws {SyntaxError} when the string is malformed.
 * @throws {RangeError} when the quality is invalid for the interval number
 *   (e.g. `"M5"` — there is no major fifth).
 *
 * @example
 * ```ts
 * import { parseInterval, intervalName } from "musictheoryjs";
 * parseInterval("m3"); // => { steps: 2, semitones: 3 }
 * parseInterval("-M2"); // => { steps: -1, semitones: -2 }
 * intervalName(parseInterval("dd7")); // => "dd7"
 * parseInterval("M5"); // => throws "invalid for a perfect interval"
 * ```
 */
export function parseInterval(name: string): Interval {
  const match = NAME_PATTERN.exec(name);
  if (!match) {
    throw new SyntaxError(`invalid interval name: "${name}"`);
  }
  const [, sign, qualityRaw = "", numberRaw = ""] = match;
  const iv = interval(
    Number(numberRaw),
    qualityRaw[0] as Quality,
    qualityRaw.length
  );
  return sign ? { steps: -iv.steps || 0, semitones: -iv.semitones || 0 } : iv;
}

/** Diatonic steps for each pitch class under the conventional spelling. Only
 * the tritone (6 semitones) differs between the two preferences. */
const SHARP_STEPS: readonly number[] = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
const FLAT_STEPS: readonly number[] = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];

/**
 * The conventionally spelled interval for a semitone count: 0 → P1, 3 → m3,
 * 7 → P5, 12 → P8, 14 → M9, negative counts descend. Six semitones is the one
 * genuine ambiguity: `"sharp"` (the default) reads it as A4, `"flat"` as d5.
 * @throws {RangeError} when `semitones` is not an integer.
 *
 * @example
 * ```ts
 * import { intervalFromSemitones, intervalName } from "musictheoryjs";
 * intervalName(intervalFromSemitones(7)); // => "P5"
 * intervalName(intervalFromSemitones(6)); // => "A4"
 * intervalName(intervalFromSemitones(6, "flat")); // => "d5"
 * intervalName(intervalFromSemitones(-3)); // => "-m3"
 * ```
 */
export function intervalFromSemitones(
  semitones: number,
  prefer: "sharp" | "flat" = "sharp"
): Interval {
  if (!Number.isInteger(semitones)) {
    throw new RangeError(`semitone count must be an integer, got ${semitones}`);
  }
  const magnitude = Math.abs(semitones);
  const octaves = Math.floor(magnitude / 12);
  const pc = magnitude % 12;
  const table = prefer === "flat" ? FLAT_STEPS : SHARP_STEPS;
  const steps = (table[pc] as number) + 7 * octaves;
  // Rebuild from the magnitude so an input of -0 yields plain zeros.
  return semitones < 0
    ? { steps: -steps, semitones: -magnitude }
    : { steps, semitones: magnitude };
}

/**
 * Normalise any {@link IntervalLike} to an {@link Interval}: intervals pass
 * through, names are parsed, numbers are read as semitone counts.
 *
 * @example
 * ```ts
 * import { asInterval } from "musictheoryjs";
 * asInterval("P4"); // => { steps: 3, semitones: 5 }
 * asInterval(5); // => { steps: 3, semitones: 5 }
 * ```
 */
export function asInterval(input: IntervalLike): Interval {
  if (typeof input === "string") return parseInterval(input);
  if (typeof input === "number") return intervalFromSemitones(input);
  return input;
}
