/**
 * @module micro/edo
 * Equal divisions of the octave as a generalization of the core arithmetic:
 * 12-EDO is just the default. Steps convert to exact cents and move pitches
 * through the same normalization as any other cents motion (24-EDO steps are
 * quarter-tones: `edoTranspose("C4", 3, 24)` is C#4 +50¢).
 */

import { MusicTheoryError, Pitch, note } from "../core";
import { CENTS_PER_OCTAVE, CentsOptions, addCents } from "./cents";

function assertDivisions(divisions: number): void {
  if (!Number.isInteger(divisions) || divisions <= 0) {
    throw new MusicTheoryError(
      `Invalid EDO divisions ${divisions}: must be a positive integer.`
    );
  }
}

/**
 * Exact size of `steps` steps of n-EDO in cents: `edoStepCents(1, 24)` is 50.
 *
 * @example
 * ```ts
 * import { edoStepCents } from "musictheoryjs";
 *
 * edoStepCents(1, 24); // => 50
 * edoStepCents(7, 19); // => ~442.11
 * edoStepCents(1, 0); // => throws "positive integer"
 * ```
 */
export function edoStepCents(steps: number, divisions: number): number {
  assertDivisions(divisions);
  if (!Number.isFinite(steps)) {
    throw new MusicTheoryError(`Invalid steps ${steps}: must be a finite number.`);
  }
  return (steps * CENTS_PER_OCTAVE) / divisions;
}

/**
 * Transpose a pitch by n-EDO steps: `edoTranspose("C4", 7, 19)` moves up
 * seven 19-EDO steps (442.1¢). Negative steps descend.
 *
 * @example
 * ```ts
 * import { edoTranspose, microtonalName } from "musictheoryjs";
 *
 * microtonalName(edoTranspose("C4", 1, 24)); // => "C4+50c"
 * microtonalName(edoTranspose("C4", 3, 24)); // => "C#4+50c"
 * microtonalName(edoTranspose("C4", 7, 19)); // => "E4+42.11c"
 * ```
 */
export function edoTranspose(
  input: string | Pitch,
  steps: number,
  divisions: number,
  options?: CentsOptions
): Pitch {
  return addCents(input, edoStepCents(steps, divisions), options);
}

/**
 * One octave of an n-EDO scale from a reference pitch, inclusive of the
 * octave: `edoScale("C4", 24)` is 25 quarter-tone pitches from C4 to C5.
 *
 * @example
 * ```ts
 * import { edoScale, microtonalName, noteName } from "musictheoryjs";
 *
 * const quarterTones = edoScale("C4", 24);
 * quarterTones.length; // => 25
 * microtonalName(quarterTones[1]); // => "C4+50c"
 * noteName(quarterTones[24]); // => "C5"
 * ```
 */
export function edoScale(
  reference: string | Pitch,
  divisions: number,
  options?: CentsOptions
): Pitch[] {
  assertDivisions(divisions);
  const p = note(reference);
  return Array.from({ length: divisions + 1 }, (_, i) =>
    edoTranspose(p, i, divisions, options)
  );
}
