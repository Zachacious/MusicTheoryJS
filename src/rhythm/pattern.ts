/**
 * Rhythm patterns: onset grids, and the ways musicians generate them.
 *
 * A pattern is a flat array of 1s (a note starts here) and 0s (it does not),
 * one slot per step of an even grid. That representation is deliberately dumb —
 * it carries no tempo, meter, or duration — which is what lets the same array
 * drive a drum machine, a MIDI track, or a `Meter` from this module.
 *
 * The generators here are the classic ones: Euclidean distribution (spread `k`
 * onsets as evenly as possible over `n` steps, which produces a startling
 * number of real-world world-music rhythms), inter-onset intervals, hex
 * shorthand, and weighted randomness.
 */

import { rotate } from "../collection/index";

/** One step of a pattern: an onset (1) or a rest (0). */
export type RhythmStep = 0 | 1;

/** An onset grid: one {@link Step} per division of an even grid. */
export type RhythmPattern = RhythmStep[];

function assertLength(steps: number): void {
  if (!Number.isInteger(steps) || steps < 0) {
    throw new RangeError(
      `pattern length must be a non-negative integer, got ${steps}`
    );
  }
}

/**
 * Distribute `pulses` onsets as evenly as possible across `steps` slots — the
 * Euclidean rhythm. E(3,8) is the tresillo heard across Latin and West African
 * music; E(5,8) is the cinquillo; E(5,16) the Bossa Nova clave.
 *
 * More pulses than steps saturates the grid; zero pulses gives silence.
 *
 * @example
 * ```ts
 * import { euclideanRhythm } from "musictheoryjs";
 * euclideanRhythm(8, 3); // => [1, 0, 0, 1, 0, 0, 1, 0]
 * euclideanRhythm(4, 4); // => [1, 1, 1, 1]
 * euclideanRhythm(4, 0); // => [0, 0, 0, 0]
 * euclideanRhythm(8, 5); // => [1, 0, 1, 0, 1, 1, 0, 1]
 * ```
 */
export function euclideanRhythm(steps: number, pulses: number): RhythmPattern {
  assertLength(steps);
  if (!Number.isInteger(pulses) || pulses < 0) {
    throw new RangeError(
      `pulse count must be a non-negative integer, got ${pulses}`
    );
  }
  if (pulses === 0) return new Array(steps).fill(0) as RhythmPattern;
  if (pulses >= steps) return new Array(steps).fill(1) as RhythmPattern;
  // Bresenham's line drawing, which yields exactly the Bjorklund distribution:
  // a slot is an onset when advancing by `pulses` wraps past a multiple of
  // `steps`. Cheaper and clearer than the recursive string-folding original.
  const out: RhythmPattern = [];
  for (let i = 0; i < steps; i++) {
    out.push((i * pulses) % steps < pulses ? 1 : 0);
  }
  return out;
}

/**
 * Build a pattern from loose values, normalising anything truthy to an onset.
 * Useful for hand-written grids where `1`/`0` and `true`/`false` get mixed.
 *
 * @example
 * ```ts
 * import { rhythmPattern } from "musictheoryjs";
 * rhythmPattern(1, 0, 1, 1); // => [1, 0, 1, 1]
 * rhythmPattern(true, false, true); // => [1, 0, 1]
 * ```
 */
export function rhythmPattern(
  ...values: ReadonlyArray<number | boolean>
): RhythmPattern {
  return values.map((v) => (v ? 1 : 0));
}

/**
 * Rotate a pattern left by `times` steps; negative rotates right. Rotating a
 * Euclidean rhythm is how its named variants relate — the son and rumba claves
 * are rotations of one another.
 *
 * @example
 * ```ts
 * import { rotateRhythm } from "musictheoryjs";
 * rotateRhythm([1, 0, 0, 1], 1); // => [0, 0, 1, 1]
 * rotateRhythm([1, 0, 0, 1], -1); // => [1, 1, 0, 0]
 * ```
 */
export function rotateRhythm(
  pattern: readonly RhythmStep[],
  times: number
): RhythmPattern {
  return rotate(times, pattern);
}

/**
 * Build a pattern from inter-onset intervals: how many steps each note lasts
 * before the next begins. `(1, 2, 1)` means an onset, then one lasting two
 * steps, then another — seven slots in total once the final gap is counted.
 *
 * @example
 * ```ts
 * import { rhythmFromOnsets } from "musictheoryjs";
 * rhythmFromOnsets(1, 2, 1); // => [1, 0, 1, 0, 0, 1, 0]
 * rhythmFromOnsets(2, 2); // => [1, 0, 0, 1, 0, 0]
 * ```
 */
export function rhythmFromOnsets(...gaps: readonly number[]): RhythmPattern {
  const out: RhythmPattern = [];
  for (const gap of gaps) {
    if (!Number.isInteger(gap) || gap < 0) {
      throw new RangeError(
        `onset gaps must be non-negative integers, got ${gap}`
      );
    }
    out.push(1);
    for (let i = 0; i < gap; i++) out.push(0);
  }
  return out;
}

/**
 * The step indices where a pattern has onsets — the inverse view of the grid,
 * and the form most sequencers want.
 *
 * @example
 * ```ts
 * import { rhythmToOnsets, euclideanRhythm } from "musictheoryjs";
 * rhythmToOnsets([1, 0, 0, 1, 0]); // => [0, 3]
 * rhythmToOnsets(euclideanRhythm(8, 3)); // => [0, 3, 6]
 * ```
 */
export function rhythmToOnsets(pattern: readonly RhythmStep[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i]) out.push(i);
  }
  return out;
}

/**
 * Decode the hex shorthand used by drum-machine patch formats: each hex digit
 * is four steps, most significant bit first. `"8f"` is one onset then a full
 * group of four.
 *
 * @example
 * ```ts
 * import { rhythmFromHex } from "musictheoryjs";
 * rhythmFromHex("8f"); // => [1, 0, 0, 0, 1, 1, 1, 1]
 * rhythmFromHex("a"); // => [1, 0, 1, 0]
 * ```
 */
export function rhythmFromHex(hex: string): RhythmPattern {
  const out: RhythmPattern = [];
  for (const digit of hex.trim()) {
    const value = Number.parseInt(digit, 16);
    if (Number.isNaN(value)) {
      throw new SyntaxError(`invalid hex digit in rhythm pattern: "${digit}"`);
    }
    for (let bit = 3; bit >= 0; bit--) out.push((value >> bit) & 1 ? 1 : 0);
  }
  return out;
}

/**
 * Encode a pattern as hex shorthand. The grid is padded with rests to a
 * multiple of four steps, since each hex digit covers four.
 *
 * @example
 * ```ts
 * import { rhythmToHex, rhythmFromHex } from "musictheoryjs";
 * rhythmToHex([1, 0, 0, 0, 1, 1, 1, 1]); // => "8f"
 * rhythmToHex(rhythmFromHex("a4")); // => "a4"
 * ```
 */
export function rhythmToHex(pattern: readonly RhythmStep[]): string {
  let out = "";
  for (let i = 0; i < pattern.length; i += 4) {
    let nibble = 0;
    for (let bit = 0; bit < 4; bit++) {
      if (pattern[i + bit]) nibble |= 1 << (3 - bit);
    }
    out += nibble.toString(16);
  }
  return out;
}

/**
 * A pattern of `length` steps where each slot becomes an onset with the given
 * `density` (0 = silence, 1 = every step). Pass `rng` — any function returning
 * a number in `[0, 1)` — to make the result reproducible.
 *
 * @example
 * ```ts
 * import { randomRhythm } from "musictheoryjs";
 * randomRhythm(4, 1); // => [1, 1, 1, 1]
 * randomRhythm(4, 0); // => [0, 0, 0, 0]
 * // A fixed generator makes the pattern deterministic.
 * randomRhythm(4, 0.5, () => 0.4); // => [1, 1, 1, 1]
 * ```
 */
export function randomRhythm(
  length: number,
  density = 0.5,
  rng: () => number = Math.random
): RhythmPattern {
  assertLength(length);
  const out: RhythmPattern = [];
  for (let i = 0; i < length; i++) out.push(rng() < density ? 1 : 0);
  return out;
}

/**
 * A pattern from per-step probabilities: each weight is that slot's chance of
 * sounding. Weights of exactly 1 and 0 are certainties, so a partly-fixed grid
 * can be filled in randomly around them.
 *
 * @example
 * ```ts
 * import { weightedRhythm } from "musictheoryjs";
 * weightedRhythm([1, 0, 1, 0]); // => [1, 0, 1, 0]
 * // A fixed generator makes the pattern deterministic.
 * weightedRhythm([1, 0, 0.5, 1], () => 0.4); // => [1, 0, 1, 1]
 * ```
 */
export function weightedRhythm(
  weights: readonly number[],
  rng: () => number = Math.random
): RhythmPattern {
  return weights.map((w) => (rng() < w ? 1 : 0));
}
