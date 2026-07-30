/**
 * Twelve-tone rows: the serial classroom's operations.
 *
 * A row is the twelve pitch classes in a fixed order; its forty-eight forms
 * come from four transforms — prime (P), inversion (I), retrograde (R), and
 * retrograde inversion (RI) — each at twelve transpositions. Labels follow
 * the matrix convention: `Pn` and `In` begin on pitch class `n`, and `Rn`
 * and `RIn` are `Pn` and `In` read backwards.
 */

import { mod } from "../math/index";

/** A tone row: each pitch class 0–11 exactly once, in order. */
export type ToneRow = readonly number[];

/**
 * Validate and normalise a row: values wrap mod 12 and must cover all
 * twelve pitch classes exactly once.
 *
 * @example
 * ```ts
 * import { toneRow } from "musictheoryjs";
 * toneRow([4, 5, 7, 1, 6, 3, 8, 2, 11, 0, 9, 10])[0]; // => 4
 * toneRow([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])[0]; // => 0
 * toneRow([0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // => throws "exactly once"
 * ```
 */
export function toneRow(pitchClasses: Iterable<number>): number[] {
  const row = [...pitchClasses].map((pc) => mod(pc, 12));
  if (row.length !== 12 || new Set(row).size !== 12) {
    throw new RangeError(
      "a tone row needs each of the twelve pitch classes exactly once"
    );
  }
  return row;
}

/**
 * A form of a row: `"P4"`, `"I0"`, `"R4"`, `"RI7"` (case-insensitive).
 * P and I forms begin on the named pitch class; R and RI are their
 * reversals, keeping the label of the form they reverse.
 *
 * @example
 * ```ts
 * import { toneRow, rowTransform } from "musictheoryjs";
 * // Schoenberg's op. 25 row, as pitch classes from E.
 * const row = toneRow([4, 5, 7, 1, 6, 3, 8, 2, 11, 0, 9, 10]);
 * rowTransform(row, "P0"); // => [0, 1, 3, 9, 2, 11, 4, 10, 7, 8, 5, 6]
 * rowTransform(row, "I4"); // => [4, 3, 1, 7, 2, 5, 0, 6, 9, 8, 11, 10]
 * rowTransform(row, "R4")[0]; // => 10
 * rowTransform(row, "X3"); // => throws "invalid row form"
 * ```
 */
export function rowTransform(row: ToneRow, form: string): number[] {
  const match = /^(ri|r|i|p)\s*(\d+)$/i.exec(form.trim());
  if (!match) {
    throw new SyntaxError(
      `invalid row form "${form}"; use P, I, R, or RI plus a pitch class, like "P0" or "RI7"`
    );
  }
  const kind = (match[1] as string).toLowerCase();
  const n = mod(Number(match[2]), 12);
  const p = toneRow(row);
  const first = p[0] as number;
  const base =
    kind === "p" || kind === "r"
      ? p.map((pc) => mod(pc - first + n, 12))
      : p.map((pc) => mod(first - pc + n, 12));
  return kind === "r" || kind === "ri" ? base.reverse() : base;
}

/**
 * The twelve-by-twelve matrix: row `i` is the P form beginning on the
 * `i`-th pitch class of the inversion, so P forms read left to right, I
 * forms top to bottom, R and RI forms in reverse.
 *
 * @example
 * ```ts
 * import { toneRow, rowMatrix } from "musictheoryjs";
 * const m = rowMatrix(toneRow([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
 * m[0]; // => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
 * m[1]?.[0]; // => 11
 * m.length; // => 12
 * ```
 */
export function rowMatrix(row: ToneRow): number[][] {
  const p = toneRow(row);
  const first = p[0] as number;
  return p.map((pc) => rowTransform(p, `P${mod(first * 2 - pc, 12)}`));
}

/**
 * Which form of a row a passage is — `"P4"`, `"RI7"` — or `null` when it
 * is none of the forty-eight. The tail of an analysis: given the piece's
 * row, name what the passage states.
 *
 * @example
 * ```ts
 * import { toneRow, rowTransform, identifyRowForm } from "musictheoryjs";
 * const row = toneRow([4, 5, 7, 1, 6, 3, 8, 2, 11, 0, 9, 10]);
 * identifyRowForm(row, rowTransform(row, "RI7")); // => "RI7"
 * identifyRowForm(row, [0, 2, 4, 5, 7, 9, 11, 1, 3, 6, 8, 10]); // => null
 * ```
 */
export function identifyRowForm(
  row: ToneRow,
  candidate: Iterable<number>
): string | null {
  const target = [...candidate].map((pc) => mod(pc, 12));
  if (target.length !== 12) return null;
  const p = toneRow(row);
  for (const kind of ["P", "I", "R", "RI"]) {
    for (let n = 0; n < 12; n++) {
      const form = `${kind}${n}`;
      if (rowTransform(p, form).every((pc, i) => pc === target[i])) {
        return form;
      }
    }
  }
  return null;
}
