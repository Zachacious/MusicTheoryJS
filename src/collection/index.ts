/**
 * The collection module: the small array operations that show up constantly in
 * music code — rotating a pattern, generating a numeric run, enumerating
 * orderings, shuffling a set of pitches.
 *
 * These are deliberately generic (they work on any array, not just notes), so
 * that rhythm patterns, pitch-class sets, and note lists can all share them.
 * Nothing here mutates its input.
 */

/**
 * The integers from `from` to `to`, inclusive. Descends when `to` is below
 * `from`, so the direction is implied rather than configured.
 *
 * @example
 * ```ts
 * import { range } from "musictheoryjs";
 * range(1, 4); // => [1, 2, 3, 4]
 * range(4, 1); // => [4, 3, 2, 1]
 * range(3, 3); // => [3]
 * ```
 */
export function range(from: number, to: number): number[] {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    throw new RangeError(
      `range bounds must be integers, got ${from} and ${to}`
    );
  }
  const step = from <= to ? 1 : -1;
  const out: number[] = [];
  for (let n = from; step > 0 ? n <= to : n >= to; n += step) out.push(n);
  return out;
}

/**
 * Rotate an array left by `times` positions; negative rotates right. The
 * rotation wraps, so any count is valid.
 *
 * @example
 * ```ts
 * import { rotate } from "musictheoryjs";
 * rotate(1, ["a", "b", "c"]); // => ["b", "c", "a"]
 * rotate(-1, ["a", "b", "c"]); // => ["c", "a", "b"]
 * rotate(3, ["a", "b", "c"]); // => ["a", "b", "c"]
 * ```
 */
export function rotate<T>(times: number, items: readonly T[]): T[] {
  const len = items.length;
  if (len === 0) return [];
  // `%` then `+ len` so negative counts wrap to the right rather than
  // producing a negative slice index.
  const start = (((times % len) + len) % len) as number;
  return [...items.slice(start), ...items.slice(0, start)];
}

/**
 * Drop the values that carry no musical information — `null`, `undefined`, and
 * `NaN` — while keeping falsy-but-real values like `0` and `""`.
 *
 * @example
 * ```ts
 * import { compact } from "musictheoryjs";
 * compact(["a", 1, 0, null, undefined, Number.NaN]); // => ["a", 1, 0]
 * ```
 */
export function compact<T>(items: readonly (T | null | undefined)[]): T[] {
  return items.filter(
    (x): x is T =>
      x !== null &&
      x !== undefined &&
      !(typeof x === "number" && Number.isNaN(x))
  );
}

/**
 * Every ordering of the input, as a new array of arrays. The count grows as
 * `n!`, so this is for short collections — a chord's voices, a motif's pitches
 * — not for scales of arbitrary length.
 *
 * @example
 * ```ts
 * import { permutations } from "musictheoryjs";
 * permutations(["a", "b"]); // => [["a", "b"], ["b", "a"]]
 * permutations(["a", "b", "c"]).length; // => 6
 * permutations([]); // => [[]]
 * ```
 */
export function permutations<T>(items: readonly T[]): T[][] {
  if (items.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) {
      out.push([items[i] as T, ...tail]);
    }
  }
  return out;
}

/**
 * A shuffled copy of the input (Fisher–Yates). Pass `rng` — any function
 * returning a number in `[0, 1)` — to make the result reproducible; it
 * defaults to `Math.random`.
 *
 * @example
 * ```ts
 * import { shuffle } from "musictheoryjs";
 * // A fixed generator makes the shuffle deterministic.
 * shuffle(["a", "b", "c"], () => 0); // => ["b", "c", "a"]
 * shuffle(["a", "b", "c"]).length; // => 3
 * ```
 */
export function shuffle<T>(
  items: readonly T[],
  rng: () => number = Math.random
): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}
