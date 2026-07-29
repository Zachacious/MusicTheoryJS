/**
 * @module micro/ji
 * Just intonation on the core: full-precision 5-limit ratios keyed by
 * spelled interval name (so A4 (45/32) and d5 (64/45) are distinct), and
 * ratio-based note creation with the deviation stored in `cents`.
 */

import {
  Interval,
  MusicTheoryError,
  Pitch,
  interval,
  intervalName,
  note,
  pitch,
  transpose,
  tryInterval,
} from "../core";
import { addCents, parseRatio, ratioToCents } from "./cents";

/**
 * 5-limit just ratios by spelled interval name. Values are exact fractions;
 * derive cents with `ratioToCents` (never pre-rounded — `ratioToCents(5/4)`
 * is 386.3137…, not 386).
 */
export const JUST_RATIOS: Readonly<Record<string, number>> = Object.freeze({
  P1: 1,
  A1: 25 / 24,
  d2: 128 / 125,
  m2: 16 / 15,
  M2: 9 / 8,
  A2: 75 / 64,
  d3: 144 / 125,
  m3: 6 / 5,
  M3: 5 / 4,
  d4: 32 / 25,
  P4: 4 / 3,
  A4: 45 / 32,
  d5: 64 / 45,
  P5: 3 / 2,
  A5: 25 / 16,
  m6: 8 / 5,
  M6: 5 / 3,
  d7: 128 / 75,
  m7: 16 / 9,
  M7: 15 / 8,
  P8: 2,
});

/**
 * The just ratio for a spelled interval, octave-extended: `justRatio("P5")`
 * is 1.5, `justRatio("M10")` is 2 × 5/4. Throws for intervals with no
 * defined 5-limit ratio (e.g. triple-augmented ones) — never a guess.
 */
export function justRatio(input: string | Interval): number {
  const i = interval(input);
  if (i.steps < 0 || i.semitones < 0) {
    return 1 / justRatio({ steps: -i.steps, semitones: -i.semitones });
  }
  const octaves = Math.floor(i.steps / 7);
  const simple = intervalName({
    steps: i.steps - 7 * octaves,
    semitones: i.semitones - 12 * octaves,
  });
  const ratio = JUST_RATIOS[simple];
  if (ratio === undefined) {
    throw new MusicTheoryError(
      `No just-intonation ratio defined for interval "${simple}".`
    );
  }
  return ratio * Math.pow(2, octaves);
}

/**
 * The note at a frequency ratio above a reference, spelled at the nearest
 * 12-TET pitch with the deviation in `cents`: `fromRatio("C4", "5/4")` is
 * E4 −13.69¢ (a pure major third). Accepts `"3/2"`, `1.5`, or an interval
 * name resolved through `JUST_RATIOS` (`fromRatio("C4", "M3")`).
 */
export function fromRatio(
  reference: string | Pitch,
  ratio: string | number,
  options?: { prefer?: "sharp" | "flat" }
): Pitch {
  const p = note(reference);
  let value: number;
  if (typeof ratio === "string" && JUST_RATIOS[ratio] !== undefined) {
    value = JUST_RATIOS[ratio];
  } else if (typeof ratio === "string" && tryInterval(ratio) !== null) {
    value = justRatio(ratio); // compound/descending names: "M10", "-P5"
  } else {
    value = parseRatio(ratio);
  }
  return addCents(p, ratioToCents(value), options);
}

/**
 * A spelled pitch tuned to its exact just ratio from a reference:
 * `justNote("C4", "M3")` is E4 −13.69¢ — the *spelling* comes from the
 * interval (transposition on the core), the `cents` from the ratio, so
 * `justNote("C4", "A4")` and `justNote("C4", "d5")` differ in both.
 */
export function justNote(
  reference: string | Pitch,
  intervalInput: string | Interval
): Pitch {
  const p = note(reference);
  const i = interval(intervalInput);
  const spelled = transpose(p, i); // carries the reference's own cents along
  const deviation = ratioToCents(justRatio(i)) - 100 * i.semitones;
  return pitch(spelled.step, spelled.alt, spelled.oct, (spelled.cents ?? 0) + deviation);
}
