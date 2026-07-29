/**
 * Tuning presets for widely played non-Western systems: Arabic maqamat,
 * Hindustani ragas (by thaat), and Javanese gamelan slendro/pelog.
 *
 * These are *representative* tables, not the last word — maqam intonation
 * varies by region and performer (the values here are the theoretical
 * quarter-tone approximations), raga intonation by gharana (given here as
 * 5-limit just ratios), and every gamelan is tuned to its own ensemble (the
 * values here are averages of published measurements). Each preset is an
 * ordinary {@link Tuning}; pass your own cents to {@link centsTuning} when
 * you have the real instrument's numbers.
 */

import { centsTuning, ratioTuning } from "./custom";
import type { Tuning } from "./tuning";

/** Quarter-tone (24-EDO) approximations of common maqam scales, in cents. */
const MAQAMAT: Record<string, readonly number[]> = {
  rast: [0, 200, 350, 500, 700, 900, 1050],
  bayati: [0, 150, 300, 500, 700, 800, 1000],
  hijaz: [0, 100, 400, 500, 700, 800, 1000],
  saba: [0, 150, 300, 400, 700, 800, 1000],
  kurd: [0, 100, 300, 500, 700, 800, 1000],
  nahawand: [0, 200, 300, 500, 700, 800, 1000],
  ajam: [0, 200, 400, 500, 700, 900, 1100],
};

/** A maqam name with a preset — see {@link maqamTuning}. */
export type MaqamName =
  | "rast"
  | "bayati"
  | "hijaz"
  | "saba"
  | "kurd"
  | "nahawand"
  | "ajam";

/** The available {@link maqamTuning} preset names. */
export const MAQAM_NAMES: readonly MaqamName[] = Object.keys(
  MAQAMAT
) as MaqamName[];

/**
 * A common maqam as a 7-degree tuning (theoretical quarter-tone cents —
 * regional intonation differs). Combine with {@link scaleFromTuning} or
 * {@link frequencyOfDegree} to get real pitches.
 * @throws {RangeError} for a name with no preset.
 *
 * @example
 * ```ts
 * import { maqamTuning, frequencyOfDegree } from "musictheoryjs";
 * maqamTuning("rast").centsForDegree(2); // => 350
 * maqamTuning("hijaz").size; // => 7
 * Math.round(frequencyOfDegree(maqamTuning("rast"), 4, { frequency: 220 })); // => 330
 * maqamTuning("phrygian"); // => throws "unknown maqam"
 * ```
 */
export function maqamTuning(name: MaqamName): Tuning {
  const cents = MAQAMAT[name];
  if (cents === undefined) {
    throw new RangeError(
      `unknown maqam: "${name}" (have ${MAQAM_NAMES.join(", ")})`
    );
  }
  return centsTuning(cents, {
    name: `Maqam ${name[0]?.toUpperCase()}${name.slice(1)}`,
  });
}

/** 5-limit just ratios for the ten Hindustani thaats. */
const RAGAS: Record<string, readonly (number | string)[]> = {
  bilawal: ["1/1", "9/8", "5/4", "4/3", "3/2", "5/3", "15/8"],
  khamaj: ["1/1", "9/8", "5/4", "4/3", "3/2", "5/3", "16/9"],
  kafi: ["1/1", "9/8", "6/5", "4/3", "3/2", "5/3", "16/9"],
  asavari: ["1/1", "9/8", "6/5", "4/3", "3/2", "8/5", "16/9"],
  bhairavi: ["1/1", "16/15", "6/5", "4/3", "3/2", "8/5", "16/9"],
  bhairav: ["1/1", "16/15", "5/4", "4/3", "3/2", "8/5", "15/8"],
  kalyan: ["1/1", "9/8", "5/4", "45/32", "3/2", "27/16", "15/8"],
  marwa: ["1/1", "16/15", "5/4", "45/32", "3/2", "27/16", "15/8"],
  purvi: ["1/1", "16/15", "5/4", "45/32", "3/2", "8/5", "15/8"],
  todi: ["1/1", "16/15", "6/5", "45/32", "3/2", "8/5", "15/8"],
};

/** A thaat name with a preset — see {@link ragaTuning}. */
export type RagaName =
  | "bilawal"
  | "khamaj"
  | "kafi"
  | "asavari"
  | "bhairavi"
  | "bhairav"
  | "kalyan"
  | "marwa"
  | "purvi"
  | "todi";

/** The available {@link ragaTuning} preset names. */
export const RAGA_NAMES: readonly RagaName[] = Object.keys(RAGAS) as RagaName[];

/**
 * A Hindustani thaat (parent scale) as a 7-degree just-intonation tuning
 * (5-limit ratios — gharana intonation differs).
 * @throws {RangeError} for a name with no preset.
 *
 * @example
 * ```ts
 * import { ragaTuning } from "musictheoryjs";
 * Math.round(ragaTuning("bhairav").centsForDegree(1)); // => 112
 * ragaTuning("kalyan").name; // => "Raga Kalyan"
 * ragaTuning("nope"); // => throws "unknown raga"
 * ```
 */
export function ragaTuning(name: RagaName): Tuning {
  const ratios = RAGAS[name];
  if (ratios === undefined) {
    throw new RangeError(
      `unknown raga: "${name}" (have ${RAGA_NAMES.join(", ")})`
    );
  }
  return ratioTuning(ratios, {
    name: `Raga ${name[0]?.toUpperCase()}${name.slice(1)}`,
  });
}

/**
 * A representative gamelan slendro: five near-equal steps (average of
 * published Javanese measurements — every ensemble differs).
 *
 * @example
 * ```ts
 * import { slendro } from "musictheoryjs";
 * slendro().size; // => 5
 * slendro().centsForDegree(1); // => 231
 * ```
 */
export function slendro(): Tuning {
  return centsTuning([0, 231, 474, 717, 955], { name: "Slendro" });
}

/**
 * A representative gamelan pelog: seven unequal steps (average of published
 * Javanese measurements — every ensemble differs).
 *
 * @example
 * ```ts
 * import { pelog } from "musictheoryjs";
 * pelog().size; // => 7
 * pelog().centsForDegree(3); // => 540
 * ```
 */
export function pelog(): Tuning {
  return centsTuning([0, 120, 270, 540, 670, 785, 950], { name: "Pelog" });
}
