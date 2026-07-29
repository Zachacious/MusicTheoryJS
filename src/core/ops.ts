/**
 * @module core/ops
 * Transposition and distance — the two operations everything else builds on.
 * Both are exact letter/semitone arithmetic on the spelled representation:
 * spelling of the result is *derived*, never guessed from a preference.
 *
 * `transpose(p, distance(p, q))` reproduces `q` exactly, spelling included.
 */

import { MusicTheoryError } from "./errors";
import { Interval, interval } from "./interval";
import { Pitch, STEP_SEMITONES, note, pitch } from "./pitch";
import { mod } from "./util";

/**
 * Transpose a note by an interval with exact spelling:
 * `transpose("Eb4", "P5")` → Bb4, `transpose("G#4", "M3")` → B#4.
 * Pitch classes transpose without octaves; `cents` is preserved.
 */
export function transpose(
  noteInput: string | Pitch,
  intervalInput: string | Interval
): Pitch {
  const p = note(noteInput);
  const i = interval(intervalInput);
  const total = p.step + i.steps;
  const step = mod(total, 7);
  const octCarry = Math.floor(total / 7);
  const naturalDistance =
    STEP_SEMITONES[step] + 12 * octCarry - STEP_SEMITONES[p.step];
  const alt = p.alt + i.semitones - naturalDistance;
  const oct = p.oct === undefined ? undefined : p.oct + octCarry;
  return pitch(step, alt, oct, p.cents);
}

/**
 * The spelled interval from one note to another (negative = descending).
 * Between two pitch classes, returns the ascending interval within one octave
 * (same-letter pairs compare alterations directly: C→C# is A1).
 * Mixing a pitch class with an octave-specific note throws.
 * `cents` values are ignored — distance is a spelled, 12-TET measure.
 */
export function distance(
  fromInput: string | Pitch,
  toInput: string | Pitch
): Interval {
  const a = note(fromInput);
  const b = note(toInput);
  if ((a.oct === undefined) !== (b.oct === undefined)) {
    throw new MusicTheoryError(
      "Cannot measure the distance between a pitch class and an octave-specific note; give both notes octaves, or neither."
    );
  }
  if (a.oct === undefined || b.oct === undefined) {
    const steps = mod(b.step - a.step, 7);
    const wrapped = b.step < a.step;
    const semitones =
      STEP_SEMITONES[b.step] -
      STEP_SEMITONES[a.step] +
      (wrapped ? 12 : 0) +
      (b.alt - a.alt);
    return interval({ steps, semitones });
  }
  const steps = 7 * b.oct + b.step - (7 * a.oct + a.step);
  const semitones =
    12 * b.oct + STEP_SEMITONES[b.step] + b.alt -
    (12 * a.oct + STEP_SEMITONES[a.step] + a.alt);
  return interval({ steps, semitones });
}
