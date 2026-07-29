/**
 * Comparing tunings degree by degree — most usefully, a temperament against
 * Just Intonation, to see exactly what the temperament traded away.
 */

import { justIntonation } from "./historical";
import { TET12, type Tuning } from "./tuning";

/** One degree of a tuning comparison, all values in cents. */
export interface DegreeComparison {
  /** Degree index within the period. */
  readonly degree: number;
  /** Cents above the tonic in the tuning under test. */
  readonly cents: number;
  /** Cents above the tonic in the reference tuning. */
  readonly referenceCents: number;
  /** `cents − referenceCents`: positive = the tuning runs sharp of the
   * reference at this degree. */
  readonly difference: number;
}

/**
 * Compare two same-sized tunings degree by degree, in cents.
 * @throws {RangeError} when the tunings have different sizes.
 *
 * @example
 * ```ts
 * import { compareTunings, pythagorean, justIntonation } from "musictheoryjs";
 * const thirds = compareTunings(pythagorean(), justIntonation())[4];
 * thirds.difference; // => ~21.5
 * compareTunings(pythagorean(), justIntonation()).length; // => 12
 * ```
 */
export function compareTunings(
  tuning: Tuning,
  reference: Tuning
): DegreeComparison[] {
  if (tuning.size !== reference.size) {
    throw new RangeError(
      `cannot compare a ${tuning.size}-degree tuning with a ${reference.size}-degree reference`
    );
  }
  const out: DegreeComparison[] = [];
  for (let degree = 0; degree < tuning.size; degree++) {
    const cents = tuning.centsForDegree(degree);
    const referenceCents = reference.centsForDegree(degree);
    out.push({
      degree,
      cents,
      referenceCents,
      difference: cents - referenceCents,
    });
  }
  return out;
}

/**
 * How far each degree of a 12-note tuning sits from 5-limit Just Intonation,
 * in cents. With the default 12-TET this is the classic table of what equal
 * temperament costs: the major third ~14 cents sharp, the fifth ~2 flat.
 *
 * @example
 * ```ts
 * import { justDeviations, quarterCommaMeantone } from "musictheoryjs";
 * justDeviations()[4].difference; // => ~13.7
 * justDeviations()[7].difference; // => ~-2.0
 * justDeviations(quarterCommaMeantone())[4].difference; // => ~0.0
 * ```
 */
export function justDeviations(tuning: Tuning = TET12): DegreeComparison[] {
  return compareTunings(tuning, justIntonation());
}
