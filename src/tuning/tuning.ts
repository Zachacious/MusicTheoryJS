/**
 * @module tuning/tuning
 * A single, unified tuning-system model (the audit's two incompatible
 * `TUNING_SYSTEMS` collapse into this). A `Tuning` stores its reference
 * pitch (`a4`, in Hz — defect #10's missing stored reference) and maps
 * *spelled* pitch classes to cents deviations from 12-TET, so temperaments
 * finally distinguish G# from Ab.
 *
 * Fifth-generated temperaments (Pythagorean, meantone, any EDO) derive the
 * offset from the pitch's position on the chain of fifths: with a fifth of
 * size s, a pitch f fifths from A deviates by f × (s − 700) cents. In
 * quarter-comma meantone G# (+8 fifths from C) and Ab (−4) differ by the
 * great diesis, ~41.06¢; in Pythagorean tuning by the Pythagorean comma,
 * ~23.46¢; in 12-EDO (s = 700) by nothing — 12-EDO is just the default.
 */

import {
  MusicTheoryError,
  Pitch,
  distance,
  fifthsIndex,
  note,
  noteName,
  pitch,
} from "../core";
import { justRatio, ratioToCents } from "../micro";

/** An immutable tuning system. Offsets are normalized so `offset(A) === 0`. */
export interface Tuning {
  readonly name: string;
  readonly description: string;
  /** Frequency of A4 in Hz — the stored reference pitch. */
  readonly a4: number;
  /**
   * Cents deviation from 12-TET for a *spelled* pitch class (octave-free;
   * any octave or cents on the input is ignored). May throw for spellings
   * the system does not define (e.g. just intonation on remote intervals).
   */
  readonly offset: (pitchClass: string | Pitch) => number;
}

/**
 * Structural type guard for `Tuning`-shaped values.
 *
 * @example
 * ```ts
 * import { isTuning, meantoneTuning } from "musictheoryjs";
 *
 * isTuning(meantoneTuning()); // => true
 * isTuning("meantone"); // => false
 * ```
 */
export function isTuning(value: unknown): value is Tuning {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.name === "string" &&
    typeof t.a4 === "number" &&
    typeof t.offset === "function"
  );
}

export { fifthsIndex } from "../core";

/** 3:2 in cents: 701.955… */
export const PURE_FIFTH_CENTS = ratioToCents(3 / 2);

/** The syntonic comma 81:80 in cents: 21.5063… */
export const SYNTONIC_COMMA_CENTS = ratioToCents(81 / 80);

const A_FIFTHS = 3; // fifthsIndex("A")

function referenceA4(a4: number | undefined): number {
  const value = a4 ?? 440;
  if (!Number.isFinite(value) || value <= 0) {
    throw new MusicTheoryError(
      `Invalid A4 reference ${value}: must be a positive number of Hz.`
    );
  }
  return value;
}

function toPitchClass(input: string | Pitch): Pitch {
  const p = note(input);
  return p.oct === undefined && p.cents === undefined ? p : pitch(p.step, p.alt);
}

function fifthGenerated(
  name: string,
  description: string,
  fifthCents: number,
  a4: number | undefined
): Tuning {
  const perFifth = fifthCents - 700;
  return Object.freeze({
    name,
    description,
    a4: referenceA4(a4),
    offset: (input: string | Pitch): number => {
      const value = (fifthsIndex(toPitchClass(input)) - A_FIFTHS) * perFifth;
      return value === 0 ? 0 : value; // normalize -0
    },
  });
}

export interface TuningOptions {
  /** Frequency of A4 in Hz (default 440). Stored on the tuning. */
  readonly a4?: number;
}

/**
 * Standard 12-tone equal temperament: every offset is 0.
 *
 * @example
 * ```ts
 * import { equalTemperament, frequency } from "musictheoryjs";
 *
 * equalTemperament().offset("G#"); // => 0
 * equalTemperament().offset("Ab"); // => 0
 * frequency("C4", equalTemperament({ a4: 432 })); // => ~256.87
 * ```
 */
export function equalTemperament(options?: TuningOptions): Tuning {
  return fifthGenerated(
    "equal",
    "12-tone equal temperament",
    700,
    options?.a4
  );
}

/**
 * Pythagorean tuning: pure 3:2 fifths; G# and Ab differ by ~23.46¢.
 *
 * @example
 * ```ts
 * import { pythagoreanTuning } from "musictheoryjs";
 *
 * const pyth = pythagoreanTuning();
 * pyth.offset("G#"); // => ~9.775
 * pyth.offset("Ab"); // => ~-13.685
 * pyth.offset("G#") - pyth.offset("Ab"); // => ~23.46
 * ```
 */
export function pythagoreanTuning(options?: TuningOptions): Tuning {
  return fifthGenerated(
    "pythagorean",
    "pure 3:2 fifths (spelled; G# ≠ Ab by the Pythagorean comma)",
    PURE_FIFTH_CENTS,
    options?.a4
  );
}

export interface MeantoneOptions extends TuningOptions {
  /** Fraction of the syntonic comma each fifth is narrowed by (default 1/4). */
  readonly commaFraction?: number;
}

/**
 * Meantone temperament: fifths narrowed by a fraction of the syntonic comma
 * (default quarter-comma, which makes major thirds pure 5:4 and separates
 * G# from Ab by the great diesis, ~41.06¢).
 *
 * @example
 * ```ts
 * import { meantoneTuning } from "musictheoryjs";
 *
 * const mt = meantoneTuning();
 * mt.offset("G#"); // => ~-17.11
 * mt.offset("Ab"); // => ~23.95
 * mt.offset("E") - mt.offset("C"); // => ~-13.69
 * ```
 */
export function meantoneTuning(options?: MeantoneOptions): Tuning {
  const fraction = options?.commaFraction ?? 1 / 4;
  if (!Number.isFinite(fraction)) {
    throw new MusicTheoryError(
      `Invalid comma fraction ${fraction}: must be a finite number.`
    );
  }
  return fifthGenerated(
    fraction === 1 / 4 ? "meantone" : `${fraction}-comma meantone`,
    `fifths narrowed by ${fraction} of the syntonic comma`,
    PURE_FIFTH_CENTS - fraction * SYNTONIC_COMMA_CENTS,
    options?.a4
  );
}

/**
 * n-EDO as a tuning of spelled pitches: the fifth is the closest n-EDO
 * approximation of 3:2, and every spelled pitch follows the chain of fifths.
 * `edoTuning(12)` is equal temperament; in `edoTuning(19)` and
 * `edoTuning(31)` sharp and flat spellings are genuinely different steps.
 *
 * @example
 * ```ts
 * import { edoTuning } from "musictheoryjs";
 *
 * edoTuning(19).name; // => "19-EDO"
 * edoTuning(12).offset("G#"); // => 0
 * edoTuning(19).offset("Ab") - edoTuning(19).offset("G#"); // => ~63.16
 * ```
 */
export function edoTuning(divisions: number, options?: TuningOptions): Tuning {
  if (!Number.isInteger(divisions) || divisions <= 0) {
    throw new MusicTheoryError(
      `Invalid EDO divisions ${divisions}: must be a positive integer.`
    );
  }
  const fifthSteps = Math.round(divisions * Math.log2(3 / 2));
  return fifthGenerated(
    `${divisions}-EDO`,
    `${divisions} equal divisions of the octave (fifth = ${fifthSteps} steps)`,
    (fifthSteps * 1200) / divisions,
    options?.a4
  );
}

export interface JustTuningOptions extends TuningOptions {
  /** The tonic the ratios are measured from (default "C"). */
  readonly tonic?: string | Pitch;
}

/**
 * 5-limit just intonation from a tonic: each spelled pitch class is tuned to
 * its exact `JUST_RATIOS` ratio above the tonic (full precision — E above C
 * is −13.686¢, not −14). Throws for spellings whose interval from the tonic
 * has no defined ratio.
 *
 * @example
 * ```ts
 * import { justTuning, frequency } from "musictheoryjs";
 *
 * const just = justTuning();
 * frequency("E4", just) / frequency("C4", just); // => ~1.25
 * justTuning({ tonic: "D" }).description; // => "5-limit just intonation on D"
 * just.offset("B#"); // => throws "No just-intonation ratio"
 * ```
 */
export function justTuning(options?: JustTuningOptions): Tuning {
  const tonic = toPitchClass(options?.tonic ?? "C");
  const rawOffset = (input: string | Pitch): number => {
    const i = distance(tonic, toPitchClass(input));
    return ratioToCents(justRatio(i)) - 100 * i.semitones;
  };
  const aOffset = rawOffset(pitch(5, 0)); // normalize so offset(A) === 0
  return Object.freeze({
    name: "just",
    description: `5-limit just intonation on ${noteName(tonic)}`,
    a4: referenceA4(options?.a4),
    offset: (input: string | Pitch): number => rawOffset(input) - aOffset,
  });
}
