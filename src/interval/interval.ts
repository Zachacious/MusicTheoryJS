/**
 * Intervals — the distance between two pitches, in both diatonic and chromatic
 * terms.
 *
 * A spelled interval carries two independent facts: how many *diatonic steps*
 * it spans (which letters it moves through) and how many *semitones* it spans
 * (how it sounds). Keeping both is what lets a diminished fourth (3 steps, 4
 * semitones) stay distinct from a major third (2 steps, 4 semitones) even
 * though they sound identical — the diatonic component drives correct spelling
 * when transposing.
 *
 * For microtonal work the semitone component generalises to cents at the
 * `PitchPoint`/tuning layer; this module handles the diatonic 12-TET grid.
 */

import { mod } from "../math/index";
import {
  STEP_SEMITONES,
  type SpelledPitch,
  type Step,
  chroma,
} from "../pitch/spelled";

/**
 * An interval between two spelled pitches.
 * @property steps - Diatonic distance: 0 = unison, 1 = second, 2 = third, …,
 *   7 = octave. Negative for descending intervals.
 * @property semitones - Chromatic distance in semitones, sign matching `steps`.
 */
export interface Interval {
  readonly steps: number;
  readonly semitones: number;
}

/** Interval quality. `A`/`d` may stack (e.g. doubly augmented) via a count. */
export type Quality = "P" | "M" | "m" | "A" | "d";

/** Semitones spanned by each simple natural interval (unison … seventh). */
const SIMPLE_SEMITONES: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

/** Simple interval numbers that take perfect/augmented/diminished (not major/minor). */
function isPerfectClass(simpleSteps: number): boolean {
  return simpleSteps === 0 || simpleSteps === 3 || simpleSteps === 4;
}

/**
 * Build an interval from a conventional number and quality, e.g.
 * `interval(5, "P")` (perfect fifth), `interval(3, "m")` (minor third),
 * `interval(4, "A")` (augmented fourth). Numbers above 8 are compound.
 * @param number - 1-based interval number (1 = unison, 8 = octave).
 * @param quality - Interval quality; `A`/`d` count via `alteration`.
 * @param alteration - Extra augmentation (`+`) or diminution (`-`) count for
 *   stacked qualities. Default 1 (single aug/dim).
 * @throws if the quality is invalid for the interval class (e.g. a "major fifth").
 */
export function interval(
  number: number,
  quality: Quality,
  alteration = 1
): Interval {
  if (!Number.isInteger(number) || number < 1) {
    throw new RangeError(
      `interval number must be a positive integer, got ${number}`
    );
  }
  const steps = number - 1;
  const simpleSteps = mod(steps, 7);
  const octaves = Math.floor(steps / 7);
  const base = (SIMPLE_SEMITONES[simpleSteps] as number) + 12 * octaves;

  const perfect = isPerfectClass(simpleSteps);
  let adjust: number;
  if (perfect) {
    switch (quality) {
      case "P":
        adjust = 0;
        break;
      case "A":
        adjust = alteration;
        break;
      case "d":
        adjust = -alteration;
        break;
      default:
        throw new RangeError(
          `quality "${quality}" is invalid for a perfect interval (number ${number})`
        );
    }
  } else {
    switch (quality) {
      case "M":
        adjust = 0;
        break;
      case "m":
        adjust = -1;
        break;
      case "A":
        adjust = alteration;
        break;
      case "d":
        adjust = -1 - alteration;
        break;
      default:
        throw new RangeError(
          `quality "${quality}" is invalid for a major/minor interval (number ${number})`
        );
    }
  }

  return { steps, semitones: base + adjust };
}

/** The conventional interval number (1 = unison, 8 = octave), always positive. */
export function intervalNumber(iv: Interval): number {
  return Math.abs(iv.steps) + 1;
}

/** Describe an interval's quality and any augmentation/diminution count. */
export function intervalQuality(iv: Interval): {
  quality: Quality;
  count: number;
} {
  const steps = Math.abs(iv.steps);
  // Measure the chromatic size in the same direction as the diatonic size, so
  // that heavily diminished/augmented intervals — where the two disagree in
  // sign (e.g. dd2 = {steps:1, semitones:-1}) — classify correctly. Abs'ing
  // each independently would misread such intervals.
  const semitones = iv.steps < 0 ? -iv.semitones : iv.semitones;
  const simpleSteps = mod(steps, 7);
  const octaves = Math.floor(steps / 7);
  const base = (SIMPLE_SEMITONES[simpleSteps] as number) + 12 * octaves;
  const diff = semitones - base;

  if (isPerfectClass(simpleSteps)) {
    if (diff === 0) return { quality: "P", count: 1 };
    if (diff > 0) return { quality: "A", count: diff };
    return { quality: "d", count: -diff };
  }
  if (diff === 0) return { quality: "M", count: 1 };
  if (diff === -1) return { quality: "m", count: 1 };
  if (diff > 0) return { quality: "A", count: diff };
  return { quality: "d", count: -diff - 1 };
}

/** Short interval name, e.g. `"P5"`, `"m3"`, `"A4"`, `"dd7"`. Descending prefixed with `-`. */
export function intervalName(iv: Interval): string {
  const { quality, count } = intervalQuality(iv);
  const symbol =
    quality === "A" || quality === "d" ? quality.repeat(count) : quality;
  // Direction is diatonic: descending intervals have negative steps. A unison
  // (steps 0) is never prefixed, even when diminished (e.g. "d1").
  const sign = iv.steps < 0 ? "-" : "";
  return `${sign}${symbol}${intervalNumber(iv)}`;
}

/** The interval from `a` up to `b`, preserving their spelling. */
export function intervalBetween(a: SpelledPitch, b: SpelledPitch): Interval {
  const steps = b.step - a.step + 7 * (b.octave - a.octave);
  const semitones = chroma(b) - chroma(a);
  return { steps, semitones };
}

/** Reverse an interval's direction. */
export function negateInterval(iv: Interval): Interval {
  return { steps: -iv.steps, semitones: -iv.semitones };
}

/** Add two intervals (diatonically and chromatically). */
export function addIntervals(a: Interval, b: Interval): Interval {
  return { steps: a.steps + b.steps, semitones: a.semitones + b.semitones };
}

/**
 * Transpose a spelled pitch by a spelled interval, keeping correct spelling.
 * The new letter comes from the diatonic step count; the alteration is whatever
 * makes the chromatic distance come out right. So transposing C4 up a
 * diminished fourth yields Fb4 (not E4), because the interval spans 3 letters.
 */
export function transpose(pitch: SpelledPitch, iv: Interval): SpelledPitch {
  const targetSteps = pitch.step + iv.steps;
  const newStep = mod(targetSteps, 7) as Step;
  const octaveCarry = Math.floor(targetSteps / 7);
  const newOctave = pitch.octave + octaveCarry;

  const naturalChroma = (STEP_SEMITONES[newStep] as number) + 12 * newOctave;
  const desiredChroma = chroma(pitch) + iv.semitones;
  const alteration = desiredChroma - naturalChroma;

  return { step: newStep, alteration, octave: newOctave };
}
