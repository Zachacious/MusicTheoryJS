/**
 * The Forte catalog: a name for every set class.
 *
 * Allen Forte's *The Structure of Atonal Music* numbers the 224 set classes
 * — `3-11` is the consonant triad, `7-35` the diatonic set — and the names
 * stuck. Lookups here go through {@link pcsetPrimeForm}, so any
 * transposition or inversion of a set finds its class, and prime forms
 * follow Rahn's convention (the one modern references use) while the names
 * stay Forte's.
 *
 * Only cardinalities 0–6 are stored; Forte gave complementary classes the
 * same ordinal (`7-35` is the complement of `5-35`), so the larger half of
 * the catalog is derived by complement.
 */

import {
  pcsetComplement,
  pcsetIntervalVector,
  pcsetMask,
  pcsetPrimeForm,
  pcsetSize,
} from "../pitch/pcset";

/** Set classes of cardinality 0–6 in Forte's numbering, ordinal by
 * position. Representatives are Forte's published prime forms — any member
 * of each class would do, since the index is keyed on computed prime
 * forms. */
const SMALL: ReadonlyArray<ReadonlyArray<readonly number[]>> = [
  // cardinality 0 and 1
  [[]],
  [[0]],
  // dyads 2-1 … 2-6
  [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [0, 6],
  ],
  // trichords 3-1 … 3-12
  [
    [0, 1, 2],
    [0, 1, 3],
    [0, 1, 4],
    [0, 1, 5],
    [0, 1, 6],
    [0, 2, 4],
    [0, 2, 5],
    [0, 2, 6],
    [0, 2, 7],
    [0, 3, 6],
    [0, 3, 7],
    [0, 4, 8],
  ],
  // tetrachords 4-1 … 4-z29 (z: 15, 29)
  [
    [0, 1, 2, 3],
    [0, 1, 2, 4],
    [0, 1, 3, 4],
    [0, 1, 2, 5],
    [0, 1, 2, 6],
    [0, 1, 2, 7],
    [0, 1, 4, 5],
    [0, 1, 5, 6],
    [0, 1, 6, 7],
    [0, 2, 3, 5],
    [0, 1, 3, 5],
    [0, 2, 3, 6],
    [0, 1, 3, 6],
    [0, 2, 3, 7],
    [0, 1, 4, 6],
    [0, 1, 5, 7],
    [0, 3, 4, 7],
    [0, 1, 4, 7],
    [0, 1, 4, 8],
    [0, 1, 5, 8],
    [0, 2, 4, 6],
    [0, 2, 4, 7],
    [0, 2, 5, 7],
    [0, 2, 4, 8],
    [0, 2, 6, 8],
    [0, 3, 5, 8],
    [0, 2, 5, 8],
    [0, 3, 6, 9],
    [0, 1, 3, 7],
  ],
  // pentachords 5-1 … 5-z38 (z: 12, 17, 18, 36, 37, 38)
  [
    [0, 1, 2, 3, 4],
    [0, 1, 2, 3, 5],
    [0, 1, 2, 4, 5],
    [0, 1, 2, 3, 6],
    [0, 1, 2, 3, 7],
    [0, 1, 2, 5, 6],
    [0, 1, 2, 6, 7],
    [0, 2, 3, 4, 6],
    [0, 1, 2, 4, 6],
    [0, 1, 3, 4, 6],
    [0, 2, 3, 4, 7],
    [0, 1, 3, 5, 6],
    [0, 1, 2, 4, 8],
    [0, 1, 2, 5, 7],
    [0, 1, 2, 6, 8],
    [0, 1, 3, 4, 7],
    [0, 1, 3, 4, 8],
    [0, 1, 4, 5, 7],
    [0, 1, 3, 6, 7],
    [0, 1, 5, 6, 8],
    [0, 1, 4, 5, 8],
    [0, 1, 4, 7, 8],
    [0, 2, 3, 5, 7],
    [0, 1, 3, 5, 7],
    [0, 2, 3, 5, 8],
    [0, 2, 4, 5, 8],
    [0, 1, 3, 5, 8],
    [0, 2, 3, 6, 8],
    [0, 1, 3, 6, 8],
    [0, 1, 4, 6, 8],
    [0, 1, 3, 6, 9],
    [0, 1, 4, 6, 9],
    [0, 2, 4, 6, 8],
    [0, 2, 4, 6, 9],
    [0, 2, 4, 7, 9],
    [0, 1, 2, 4, 7],
    [0, 3, 4, 5, 8],
    [0, 1, 2, 5, 8],
  ],
  // hexachords 6-1 … 6-z50 (z: 3, 4, 6, 10–13, 17, 19, 23–26, 28, 29, 36–50)
  [
    [0, 1, 2, 3, 4, 5],
    [0, 1, 2, 3, 4, 6],
    [0, 1, 2, 3, 5, 6],
    [0, 1, 2, 4, 5, 6],
    [0, 1, 2, 3, 6, 7],
    [0, 1, 2, 5, 6, 7],
    [0, 1, 2, 6, 7, 8],
    [0, 2, 3, 4, 5, 7],
    [0, 1, 2, 3, 5, 7],
    [0, 1, 3, 4, 5, 7],
    [0, 1, 2, 4, 5, 7],
    [0, 1, 2, 4, 6, 7],
    [0, 1, 3, 4, 6, 7],
    [0, 1, 3, 4, 5, 8],
    [0, 1, 2, 4, 5, 8],
    [0, 1, 4, 5, 6, 8],
    [0, 1, 2, 4, 7, 8],
    [0, 1, 2, 5, 7, 8],
    [0, 1, 3, 4, 7, 8],
    [0, 1, 4, 5, 8, 9],
    [0, 2, 3, 4, 6, 8],
    [0, 1, 2, 4, 6, 8],
    [0, 2, 3, 5, 6, 8],
    [0, 1, 3, 4, 6, 8],
    [0, 1, 3, 5, 6, 8],
    [0, 1, 3, 5, 7, 8],
    [0, 1, 3, 4, 6, 9],
    [0, 1, 3, 5, 6, 9],
    [0, 2, 3, 6, 7, 9],
    [0, 1, 3, 6, 7, 9],
    [0, 1, 3, 5, 8, 9],
    [0, 2, 4, 5, 7, 9],
    [0, 2, 3, 5, 7, 9],
    [0, 1, 3, 5, 7, 9],
    [0, 2, 4, 6, 8, 10],
    [0, 1, 2, 3, 4, 7],
    [0, 1, 2, 3, 4, 8],
    [0, 1, 2, 3, 7, 8],
    [0, 2, 3, 4, 5, 8],
    [0, 1, 2, 3, 5, 8],
    [0, 1, 2, 3, 6, 8],
    [0, 1, 2, 3, 6, 9],
    [0, 1, 2, 5, 6, 8],
    [0, 1, 2, 5, 6, 9],
    [0, 2, 3, 4, 6, 9],
    [0, 1, 2, 4, 6, 9],
    [0, 1, 2, 4, 7, 9],
    [0, 1, 2, 5, 7, 9],
    [0, 1, 3, 4, 7, 9],
    [0, 1, 4, 6, 7, 9],
  ],
];

/** Ordinals carrying Forte's `z` mark, by cardinality (4 through 6). */
const Z_ORDINALS: Readonly<Record<number, readonly number[]>> = {
  4: [15, 29],
  5: [12, 17, 18, 36, 37, 38],
  6: [
    3, 4, 6, 10, 11, 12, 13, 17, 19, 23, 24, 25, 26, 28, 29, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
  ],
};

function className(cardinality: number, ordinal: number): string {
  // The z mark survives complementation, so 7–12 read from their mirrors.
  const zSource = cardinality > 6 ? 12 - cardinality : cardinality;
  const z = (Z_ORDINALS[zSource] ?? []).includes(ordinal) ? "z" : "";
  return `${cardinality}-${z}${ordinal}`;
}

/** name (lowercased) → prime-form mask, and prime-form mask → name. */
const BY_NAME = new Map<string, number>();
const BY_PRIME = new Map<number, string>();

function register(cardinality: number, ordinal: number, mask: number): void {
  const prime = pcsetMask(pcsetPrimeForm(mask));
  const name = className(cardinality, ordinal);
  BY_NAME.set(name.toLowerCase(), prime);
  BY_PRIME.set(prime, name);
}

SMALL.forEach((classes, cardinality) => {
  classes.forEach((pcs, i) => {
    register(cardinality, i + 1, pcsetMask(pcs));
    // Forte gave a class and its complement the same ordinal — including
    // the z mark — so cardinalities 7–12 derive from 5–0.
    if (cardinality < 6) {
      register(12 - cardinality, i + 1, pcsetComplement(pcsetMask(pcs)));
    }
  });
});

/**
 * The Forte name of a set's class. Any member of the class — transposed,
 * inverted, or both — reports the same name.
 *
 * @example
 * ```ts
 * import { forteName, pcsetMask } from "musictheoryjs";
 * forteName(pcsetMask([0, 4, 7])); // => "3-11"
 * forteName(pcsetMask([2, 6, 9])); // => "3-11"
 * forteName(pcsetMask([2, 4, 6, 7, 9, 11, 1])); // => "7-35"
 * forteName(pcsetMask([0, 1, 4, 6])); // => "4-z15"
 * ```
 */
export function forteName(mask: number): string {
  const prime = pcsetMask(pcsetPrimeForm(mask));
  // The catalog covers every set class, so a miss cannot happen.
  return BY_PRIME.get(prime) as string;
}

/**
 * The prime form of a named set class, as pitch classes from 0 (Rahn's
 * convention). Case and the `z` mark are accepted loosely: `"4-Z15"`,
 * `"4-z15"`, and `"4-15"` all name the same class.
 *
 * @example
 * ```ts
 * import { fortePrimeForm } from "musictheoryjs";
 * fortePrimeForm("3-11"); // => [0, 3, 7]
 * fortePrimeForm("5-35"); // => [0, 2, 4, 7, 9]
 * fortePrimeForm("6-Z25"); // => [0, 1, 3, 5, 6, 8]
 * fortePrimeForm("3-99"); // => throws "unknown set class"
 * ```
 */
export function fortePrimeForm(name: string): number[] {
  const match = /^(\d+)-z?(\d+)$/.exec(name.trim().toLowerCase());
  const mask =
    match === null
      ? undefined
      : (BY_NAME.get(`${match[1]}-${match[2]}`) ??
        BY_NAME.get(`${match[1]}-z${match[2]}`));
  if (mask === undefined) {
    throw new RangeError(`unknown set class: "${name}"`);
  }
  return pcsetPrimeForm(mask);
}

/**
 * The z-mate of a set class: the other class with the same interval-class
 * vector, or `null` when the class has none. Z-related pairs sound made of
 * the same intervals while sharing no transposition or inversion.
 *
 * @example
 * ```ts
 * import { forteZMate } from "musictheoryjs";
 * forteZMate("4-z15"); // => "4-z29"
 * forteZMate("4-z29"); // => "4-z15"
 * forteZMate("3-11"); // => null
 * ```
 */
export function forteZMate(name: string): string | null {
  const prime = pcsetMask(fortePrimeForm(name));
  const vector = pcsetIntervalVector(prime).join(",");
  const size = pcsetSize(prime);
  for (const [otherPrime, otherName] of BY_PRIME) {
    if (otherPrime === prime || pcsetSize(otherPrime) !== size) continue;
    if (pcsetIntervalVector(otherPrime).join(",") === vector) return otherName;
  }
  return null;
}
