/**
 * @module pcset/popcount
 * Internal 12-bit popcount lookup table shared by the pcset API and the
 * dictionary detection loops (which take it straight, skipping per-call chroma
 * validation on values that are valid by construction). Not part of the
 * public API.
 */

/** popcount12(c) = number of set bits in a 12-bit chroma. */
export const POPCOUNT12: Uint8Array = (() => {
  const table = new Uint8Array(4096);
  for (let i = 1; i < 4096; i++) table[i] = table[i >> 1] + (i & 1);
  return table;
})();
