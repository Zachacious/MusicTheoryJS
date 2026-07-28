/**
 * Historical Western 12-note tunings: Pythagorean, quarter-comma meantone, and
 * 5-limit Just Intonation. Each is a size-12, octave-repeating {@link Tuning},
 * so it works with spelled notes via {@link frequencyOfNote}.
 *
 * Cents tables are computed from first principles (stacked pure fifths for
 * Pythagorean, a narrowed fifth for meantone, integer ratios for JI) rather
 * than hard-coded, so the derivations are auditable.
 */

import { mod, ratioToCents } from "../math/index";
import type { Tuning } from "./tuning";

// The chromatic degrees, expressed as counts of fifths from C, using the
// common sharp-based layout (F is -1 fifth from C):
//   C=0, C#=+7, D=+2, D#=+9, E=+4, F=-1, F#=+6, G=+1, G#=+8, A=+3, A#=+10, B=+5
const FIFTHS_FROM_C: readonly number[] = [0, 7, 2, 9, 4, -1, 6, 1, 8, 3, 10, 5];

/** Reduce a raw cents value into one octave [0, 1200). */
function reduceToOctave(cents: number): number {
  return mod(cents, 1200);
}

/**
 * Build a 12-note tuning by stacking a fifth of `fifthCents` and reducing each
 * degree into the octave. Pythagorean and meantone differ only in the size of
 * that fifth.
 */
function fifthStackTuning(name: string, fifthCents: number): Tuning {
  const table = FIFTHS_FROM_C.map((n) => reduceToOctave(n * fifthCents));
  return {
    name,
    size: 12,
    period: 1200,
    centsForDegree: (index) => table[mod(index, 12)] as number,
  };
}

/** Pythagorean tuning: stacked pure perfect fifths (3/2). */
export function pythagorean(): Tuning {
  return fifthStackTuning("Pythagorean", ratioToCents(3 / 2));
}

/**
 * Quarter-comma meantone: the fifth is narrowed so four of them make a pure
 * major third (5/4). The meantone fifth is the fourth root of 5.
 */
export function quarterCommaMeantone(): Tuning {
  return fifthStackTuning("Quarter-comma meantone", ratioToCents(5 ** 0.25));
}

/** A common 5-limit Just Intonation chromatic scale (ratios relative to the tonic). */
export const JUST_5_LIMIT_RATIOS: readonly number[] = [
  1, // C   1/1
  16 / 15, // C#
  9 / 8, // D
  6 / 5, // Eb
  5 / 4, // E
  4 / 3, // F
  45 / 32, // F#
  3 / 2, // G
  8 / 5, // Ab
  5 / 3, // A
  9 / 5, // Bb
  15 / 8, // B
];

/**
 * 5-limit Just Intonation as a 12-note tuning. Pure integer-ratio intervals;
 * note that JI is inherently key-dependent — this table is the common C-rooted
 * chromatic set. Pass your own 12 ratios for a different derivation.
 * @throws if `ratios` does not contain exactly 12 entries.
 */
export function justIntonation(
  ratios: readonly number[] = JUST_5_LIMIT_RATIOS
): Tuning {
  if (ratios.length !== 12) {
    throw new RangeError(
      `justIntonation expects 12 ratios, got ${ratios.length}`
    );
  }
  const table = ratios.map((r) => ratioToCents(r));
  return {
    name: "Just Intonation (5-limit)",
    size: 12,
    period: 1200,
    centsForDegree: (index) => table[mod(index, 12)] as number,
  };
}
