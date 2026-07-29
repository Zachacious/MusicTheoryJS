/**
 * @module core/util
 * Internal helpers shared by the core modules. Not part of the public API.
 */

/** Floored modulo: always returns a value in [0, m). */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function editDistance(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * The candidate closest to `target` within edit distance 2
 * (case-insensitive), for "did you mean" error messages; `null` when nothing
 * is close. Empty candidates are skipped; an early exit takes the first
 * distance-1 hit.
 */
export function closestMatch(
  target: string,
  candidates: Iterable<string>
): string | null {
  const needle = target.toLowerCase();
  let best: string | null = null;
  let bestDistance = 3;
  let bestCased = Infinity;
  for (const candidate of candidates) {
    if (candidate === "") continue;
    const d = editDistance(needle, candidate.toLowerCase(), 2);
    if (d > 2) continue;
    // Ties break toward the candidate closest in the original casing, so
    // "m7b5x" suggests "m7b5" rather than "M7b5".
    const cased = editDistance(target, candidate, 3);
    if (d < bestDistance || (d === bestDistance && cased < bestCased)) {
      bestDistance = d;
      bestCased = cased;
      best = candidate;
    }
  }
  return best;
}
