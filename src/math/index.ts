/**
 * Small, dependency-free math helpers shared across the library.
 *
 * These are deliberately generic (no musical meaning) so they can be reasoned
 * about and tested in isolation. Musical constants live in the `pitch` module.
 */

/**
 * Floored modulo. Unlike JavaScript's `%`, the result always has the same sign
 * as `m`, so `mod(-1, 12) === 11`. This is the correct operation for wrapping
 * pitch classes and scale degrees.
 */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Clamp `x` to the inclusive range `[min, max]`. */
export function clamp(x: number, min: number, max: number): number {
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

/** Greatest common divisor of two non-negative integers (0 for gcd(0, 0)). */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

/** The number of cents in one octave. */
export const CENTS_PER_OCTAVE = 1200;

/**
 * Convert a frequency ratio to its size in cents.
 * `ratioToCents(2)` is one octave (1200), `ratioToCents(3 / 2)` ≈ 701.955.
 * @throws if `ratio` is not a positive finite number.
 */
export function ratioToCents(ratio: number): number {
  if (!(ratio > 0) || !Number.isFinite(ratio)) {
    throw new RangeError(
      `ratio must be a positive finite number, got ${ratio}`
    );
  }
  return CENTS_PER_OCTAVE * Math.log2(ratio);
}

/** Convert an interval size in cents to a frequency ratio. Inverse of `ratioToCents`. */
export function centsToRatio(cents: number): number {
  return 2 ** (cents / CENTS_PER_OCTAVE);
}

/** Parse a ratio expressed as a fraction string (`"3/2"`), a plain number
 * string (`"1.5"`), or a number. Returns a positive finite ratio.
 * @throws if the input cannot be parsed into a positive finite number. */
export function parseRatio(ratio: string | number): number {
  if (typeof ratio === "number") {
    if (!(ratio > 0) || !Number.isFinite(ratio)) {
      throw new RangeError(
        `ratio must be a positive finite number, got ${ratio}`
      );
    }
    return ratio;
  }
  const trimmed = ratio.trim();
  const slash = trimmed.indexOf("/");
  if (slash !== -1) {
    const num = Number(trimmed.slice(0, slash));
    const den = Number(trimmed.slice(slash + 1));
    const value = num / den;
    if (!(value > 0) || !Number.isFinite(value)) {
      throw new RangeError(`invalid ratio fraction: "${ratio}"`);
    }
    return value;
  }
  const value = Number(trimmed);
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new RangeError(`invalid ratio: "${ratio}"`);
  }
  return value;
}
