/**
 * @module core/util
 * Internal helpers shared by the core modules. Not part of the public API.
 */

/** Floored modulo: always returns a value in [0, m). */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
