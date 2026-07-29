/**
 * Tunings — the bridge from a pitch's *identity* to its *frequency*.
 *
 * A {@link Tuning} answers one question: for a given scale degree, how many
 * cents above the tonic does it sit? Everything else (frequency, mapping a
 * Western spelled note, wrapping across octaves) is derived generically from
 * that. This is deliberately open: 12-TET is just one tuning among many, so
 * n-EDO, Pythagorean, meantone, Just Intonation, a maqam cents table, or a
 * gamelan scale are all ordinary `Tuning` values — none is privileged, and
 * users can supply their own without touching the library.
 *
 * Two ways to address a pitch:
 * - **By degree** — an integer index into the tuning's period. Works for *any*
 *   tuning (5-EDO, 24-EDO, a 7-note maqam, …). See {@link frequencyOfDegree}.
 * - **By spelled note** — a Western {@link SpelledPitch}. Only meaningful for
 *   12-note-per-octave tunings, where each pitch class is one degree. See
 *   {@link frequencyOfNote}.
 */

import { CENTS_PER_OCTAVE, mod } from "../math/index";
import { type SpelledPitch, chroma } from "../pitch/spelled";
// The registry imports this module for its built-ins, so this is a cycle.
// It is safe because `asTuning` is only ever called from a function body, by
// which time both modules have finished evaluating.
import { type TuningLike, asTuning } from "./registry";

/**
 * A tuning system. A tuning divides a repeating *period* (an octave, 1200
 * cents, unless stated otherwise) into `size` degrees and places each degree at
 * some number of cents above the tonic.
 */
export interface Tuning {
  /** Human-readable name, e.g. `"12-TET"`, `"24-EDO"`, `"Pythagorean"`. */
  readonly name: string;
  /** Number of degrees in one period. */
  readonly size: number;
  /** Size of the repeating period in cents (1200 for octave-repeating tunings). */
  readonly period: number;
  /**
   * Cents above the tonic for degree `index`, where `0 <= index < size`.
   * Implementations may assume the index is already in range;
   * {@link degreeCents} handles wrapping.
   */
  centsForDegree(index: number): number;
}

/** How a tonic is anchored to an absolute frequency. */
export interface TuningAnchor {
  /** Frequency of the tonic degree, in Hz. Default 440. */
  readonly frequency?: number;
}

/** Reference note used when anchoring spelled-note frequencies: A4. */
const A4: SpelledPitch = { step: 5, alteration: 0, octave: 4 };
const A4_DEFAULT_HZ = 440;

/**
 * Total cents above the tonic (degree 0 of period 0) for any integer degree,
 * wrapping across periods. `degreeCents(t, t.size)` is one full period up.
 */
export function degreeCents(tuning: TuningLike, degree: number): number {
  const t = asTuning(tuning);
  const periods = Math.floor(degree / t.size);
  const index = mod(degree, t.size);
  return periods * t.period + t.centsForDegree(index);
}

/**
 * Frequency of a degree, anchoring degree 0 to `anchor.frequency` (default
 * 440 Hz). Use this for any tuning addressed by scale degree — EDOs, maqamat,
 * custom cents tables.
 */
export function frequencyOfDegree(
  tuning: TuningLike,
  degree: number,
  anchor: TuningAnchor = {}
): number {
  const rootHz = anchor.frequency ?? A4_DEFAULT_HZ;
  return rootHz * 2 ** (degreeCents(tuning, degree) / CENTS_PER_OCTAVE);
}

/**
 * Total cents above C0 for a Western spelled note under a 12-note tuning. The
 * note's pitch class selects the degree; its octave selects the period.
 */
export function noteCents(tuning: TuningLike, pitch: SpelledPitch): number {
  const t = asTuning(tuning);
  const c = chroma(pitch);
  const octave = Math.floor(c / t.size);
  return octave * t.period + t.centsForDegree(mod(c, t.size));
}

/**
 * Frequency in Hz of a Western spelled note under a 12-note tuning, anchored so
 * that A4 sounds at `anchor.frequency` (default 440 Hz). With the default
 * {@link TET12} tuning this gives standard equal-tempered frequencies.
 */
export function frequencyOfNote(
  pitch: SpelledPitch,
  tuning: TuningLike = TET12,
  anchor: TuningAnchor = {}
): number {
  const anchorHz = anchor.frequency ?? A4_DEFAULT_HZ;
  const t = asTuning(tuning);
  const diff = noteCents(t, pitch) - noteCents(t, A4);
  return anchorHz * 2 ** (diff / CENTS_PER_OCTAVE);
}

/**
 * Build an equal-tempered tuning with `divisions` equal steps per octave.
 * `equalTemperament(12)` is standard Western tuning; `equalTemperament(24)` is
 * quarter-tones; `equalTemperament(31)`, `19`, etc. are valid too.
 * @throws if `divisions` is not a positive integer.
 */
export function equalTemperament(divisions: number): Tuning {
  if (!Number.isInteger(divisions) || divisions <= 0) {
    throw new RangeError(
      `divisions must be a positive integer, got ${divisions}`
    );
  }
  const step = CENTS_PER_OCTAVE / divisions;
  return {
    name: divisions === 12 ? "12-TET" : `${divisions}-EDO`,
    size: divisions,
    period: CENTS_PER_OCTAVE,
    centsForDegree: (index) => index * step,
  };
}

/** Alias for {@link equalTemperament}: n equal divisions of the octave. */
export const edo = equalTemperament;

/**
 * True when a value is a usable {@link Tuning}: a positive number of degrees, a
 * positive period, and a `centsForDegree` function. Useful at the boundary
 * where a tuning arrives from user code, JSON, or a plugin.
 *
 * @example
 * ```ts
 * import { isTuning, equalTemperament } from "musictheoryjs";
 * isTuning(equalTemperament(19)); // => true
 * isTuning({ name: "broken", size: 0, period: 1200, centsForDegree: () => 0 }); // => false
 * isTuning(null); // => false
 * ```
 */
export function isTuning(value: unknown): value is Tuning {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Partial<Tuning>;
  return (
    typeof t.name === "string" &&
    Number.isInteger(t.size) &&
    (t.size as number) > 0 &&
    Number.isFinite(t.period) &&
    (t.period as number) > 0 &&
    typeof t.centsForDegree === "function"
  );
}

/** Standard 12-tone equal temperament — the default tuning. */
export const TET12: Tuning = equalTemperament(12);
