/**
 * `PitchPoint` — a tuning-agnostic exact pitch.
 *
 * Where {@link SpelledPitch} is the Western *notation* of a pitch, a
 * `PitchPoint` is its *exact position* on a continuous log-frequency axis,
 * measured in **cents above C0**. It carries no assumption of 12 equal
 * divisions, which is what makes microtonal and non-Western pitches
 * first-class: a quarter-tone, a maqam degree, or a just major third are all
 * ordinary `PitchPoint`s, not deviations bolted onto a Western note.
 *
 * Turning a `PitchPoint` into a frequency requires only a {@link PitchReference}
 * (which anchors one known pitch to one known frequency). Turning a
 * {@link SpelledPitch} into a `PitchPoint` requires a *tuning*, which lives in
 * the `tuning` module.
 */

import { CENTS_PER_OCTAVE } from "../math/index";

/** An exact pitch as cents above C0 (C0 = 0). */
export interface PitchPoint {
  readonly cents: number;
}

/**
 * Anchors the cents axis to real frequencies: the pitch at `cents` above C0
 * sounds at `frequency` Hz. The default is the ISO standard A4 = 440 Hz.
 */
export interface PitchReference {
  /** Position of the reference pitch, in cents above C0. */
  readonly cents: number;
  /** Frequency of the reference pitch, in Hz. */
  readonly frequency: number;
}

/** A4 in cents above C0 (9 semitones + 4 octaves = 5700 cents). */
export const A4_CENTS = 5700;

/** The standard reference: A4 = 440 Hz. */
export const A4_440: PitchReference = { cents: A4_CENTS, frequency: 440 };

/** Build a `PitchPoint` from cents above C0. */
export function point(cents: number): PitchPoint {
  return { cents };
}

/** Convert a `PitchPoint` to a frequency in Hz under the given reference. */
export function toFrequency(
  p: PitchPoint,
  reference: PitchReference = A4_440
): number {
  return (
    reference.frequency * 2 ** ((p.cents - reference.cents) / CENTS_PER_OCTAVE)
  );
}

/** Build a `PitchPoint` from a frequency in Hz under the given reference. */
export function fromFrequency(
  frequency: number,
  reference: PitchReference = A4_440
): PitchPoint {
  if (!(frequency > 0) || !Number.isFinite(frequency)) {
    throw new RangeError(
      `frequency must be a positive finite number, got ${frequency}`
    );
  }
  return {
    cents:
      reference.cents +
      CENTS_PER_OCTAVE * Math.log2(frequency / reference.frequency),
  };
}

/** Signed cents from `a` to `b` (positive when `b` is higher). */
export function centsBetween(a: PitchPoint, b: PitchPoint): number {
  return b.cents - a.cents;
}

/** Transpose a `PitchPoint` by a number of cents. */
export function transposeCents(p: PitchPoint, cents: number): PitchPoint {
  return { cents: p.cents + cents };
}
