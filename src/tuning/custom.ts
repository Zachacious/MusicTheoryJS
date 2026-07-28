/**
 * User-defined tunings: from an explicit list of cents, from ratios, or from a
 * Scala `.scl` file. This is the door to non-Western systems — maqam cents
 * tables, gamelan slendro/pelog, xenharmonic scales — as first-class tunings.
 */

import { mod, parseRatio, ratioToCents } from "../math/index";
import type { Tuning } from "./tuning";

export interface CustomTuningOptions {
  /** Tuning name. */
  name?: string;
  /** Period size in cents. Default 1200 (octave). */
  period?: number;
}

/**
 * A tuning from explicit cents-above-tonic for each degree. The array is the
 * degrees in order starting at the tonic (which should be 0). `size` is the
 * array length.
 *
 * @example
 * // Rast-like maqam (approximate cents), octave-repeating
 * centsTuning([0, 204, 355, 498, 702, 906, 1057], { name: "Rast" });
 */
export function centsTuning(
  degreeCents: readonly number[],
  options: CustomTuningOptions = {}
): Tuning {
  if (degreeCents.length === 0) {
    throw new RangeError("centsTuning requires at least one degree");
  }
  const period = options.period ?? 1200;
  const table = degreeCents.map((c) => mod(c, period));
  return {
    name: options.name ?? "Custom (cents)",
    size: table.length,
    period,
    centsForDegree: (index) => table[mod(index, table.length)] as number,
  };
}

/**
 * A tuning from frequency ratios relative to the tonic, one per degree
 * (starting at `1` / `"1/1"`). Ratios may be numbers or fraction strings.
 *
 * @example
 * // 5-limit major scale as a 7-note tuning
 * ratioTuning(["1/1", "9/8", "5/4", "4/3", "3/2", "5/3", "15/8"]);
 */
export function ratioTuning(
  ratios: ReadonlyArray<number | string>,
  options: CustomTuningOptions = {}
): Tuning {
  const cents = ratios.map((r) => ratioToCents(parseRatio(r)));
  return centsTuning(cents, { name: "Custom (ratios)", ...options });
}

/** One parsed pitch from a Scala file, as cents above the tonic. */
function parseScalaPitch(line: string): number {
  const token = line.trim().split(/\s+/)[0] ?? "";
  // A '.' anywhere marks a cents value; otherwise it is a ratio.
  if (token.includes(".")) {
    const cents = Number(token);
    if (!Number.isFinite(cents)) {
      throw new SyntaxError(`invalid Scala cents value: "${token}"`);
    }
    return cents;
  }
  return ratioToCents(parseRatio(token));
}

/**
 * Parse a Scala `.scl` tuning file into a {@link Tuning}.
 *
 * Scala format: `!`-comment lines are ignored; the first content line is a
 * description, the second is the note count, and the remaining lines are
 * pitches (ratios like `3/2`, integers like `2`, or cents like `701.955`). The
 * tonic (`1/1`, degree 0) is implied, and the final listed pitch is the period.
 */
export function scalaTuning(text: string): Tuning {
  // Comment lines (leading '!') are dropped, but blank lines are kept for now:
  // per the Scala spec the description line is the first non-comment line and
  // may legitimately be empty. We must not let a blank description shift the
  // note count and pitches up by one.
  const lines = text
    .split(/\r?\n/)
    .filter((l) => !l.trimStart().startsWith("!"));

  if (lines.length < 1) {
    throw new SyntaxError(
      "Scala file must have a description and a note count"
    );
  }
  const description = (lines[0] as string).trim();

  // After the description, the count and pitches are all non-blank; drop any
  // stray blank lines only here so a blank description can't corrupt parsing.
  const body = lines
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (body.length < 1) {
    throw new SyntaxError("Scala file must have a note count");
  }

  const count = Number(body[0]);
  if (!Number.isInteger(count) || count <= 0) {
    throw new SyntaxError(`invalid Scala note count: "${body[0]}"`);
  }

  const pitchLines = body.slice(1, 1 + count);
  if (pitchLines.length !== count) {
    throw new SyntaxError(
      `Scala file declares ${count} notes but lists ${pitchLines.length}`
    );
  }

  const pitches = pitchLines.map(parseScalaPitch);
  const period = pitches[pitches.length - 1] as number;
  // Degree 0 is the implied tonic; the last pitch is the period, not a degree.
  const degreeCents = [0, ...pitches.slice(0, -1)];

  return centsTuning(degreeCents, {
    name: description || "Scala tuning",
    period,
  });
}
