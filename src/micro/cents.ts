/**
 * @module micro/cents
 * Cents arithmetic on the spelled-pitch core. A pitch's `cents` field is its
 * deviation from the spelled 12-TET pitch; these helpers move pitches by
 * cents (normalizing whole semitones into the spelling, remainder into
 * `cents`), measure cent distances, and convert cents ↔ frequency ratios.
 * This is the salvaged v3 normalization math, rebuilt on `Pitch`.
 */

import {
  MusicTheoryError,
  Pitch,
  chroma,
  note,
  noteName,
  pitch,
  semitoneHeight,
  spellChroma,
} from "../core";
import { mod } from "../core/util";

/** One octave in cents. */
export const CENTS_PER_OCTAVE = 1200;

export interface CentsOptions {
  /** Spelling preference when normalization has to respell: default "sharp". */
  readonly prefer?: "sharp" | "flat";
}

function assertFiniteCents(cents: number): void {
  if (!Number.isFinite(cents)) {
    throw new MusicTheoryError(`Invalid cents ${cents}: must be a finite number.`);
  }
}

/**
 * Move a pitch by a number of cents, normalizing so the result's `cents`
 * deviation stays within (-50, 50]: whole semitones are folded into the
 * spelling (respelled with the given preference), the remainder becomes the
 * `cents` field. `addCents("C4", 250)` is D4 +50¢; `addCents("A4", -19)` is
 * A4 −19¢. Works on pitch classes too (the octave stays absent).
 *
 * @example
 * ```ts
 * import { addCents, microtonalName, noteName } from "musictheoryjs";
 *
 * microtonalName(addCents("C4", 50)); // => "C4+50c"
 * microtonalName(addCents("C4", 250)); // => "D4+50c"
 * noteName(addCents("C4", 100, { prefer: "flat" })); // => "Db4"
 * ```
 */
export function addCents(
  input: string | Pitch,
  cents: number,
  options?: CentsOptions
): Pitch {
  const p = note(input);
  assertFiniteCents(cents);
  const total = (p.cents ?? 0) + cents;
  let whole = Math.round(total / 100);
  let remainder = total - whole * 100;
  // Round-half toward keeping +50 rather than -50: (-50, 50].
  if (remainder === -50) {
    whole -= 1;
    remainder = 50;
  }
  if (whole === 0) {
    return pitch(p.step, p.alt, p.oct, remainder);
  }
  if (p.oct === undefined) {
    const pc = spellChroma(mod(chroma(p) + whole, 12), options);
    return pitch(pc.step, pc.alt, undefined, remainder);
  }
  const height = (semitoneHeight(p) as number) + whole;
  const pc = spellChroma(mod(height, 12), options);
  return pitch(pc.step, pc.alt, Math.floor(height / 12) - 1, remainder);
}

/**
 * Signed distance in cents from one pitch to another, including each pitch's
 * own `cents` deviation. Between pitch classes the ascending distance within
 * one octave is returned; mixing a pitch class with an octave-specific note
 * throws (as with `distance`).
 *
 * @example
 * ```ts
 * import { centsBetween, addCents } from "musictheoryjs";
 *
 * centsBetween("C4", "G4"); // => 700
 * centsBetween("A4", addCents("A4", 19)); // => 19
 * centsBetween("G", "C"); // => 500
 * centsBetween("C", "E4"); // => throws "pitch class"
 * ```
 */
export function centsBetween(
  fromInput: string | Pitch,
  toInput: string | Pitch
): number {
  const a = note(fromInput);
  const b = note(toInput);
  if ((a.oct === undefined) !== (b.oct === undefined)) {
    throw new MusicTheoryError(
      "Cannot measure cents between a pitch class and an octave-specific note; give both notes octaves, or neither."
    );
  }
  if (a.oct === undefined || b.oct === undefined) {
    return mod(
      chroma(b) * 100 + (b.cents ?? 0) - (chroma(a) * 100 + (a.cents ?? 0)),
      CENTS_PER_OCTAVE
    );
  }
  return (
    (semitoneHeight(b) as number) * 100 +
    (b.cents ?? 0) -
    ((semitoneHeight(a) as number) * 100 + (a.cents ?? 0))
  );
}

/**
 * Frequency ratio → cents: `ratioToCents(2)` is 1200, `ratioToCents(3/2)` ≈ 701.955.
 *
 * @example
 * ```ts
 * import { ratioToCents } from "musictheoryjs";
 *
 * ratioToCents(2); // => 1200
 * ratioToCents(3 / 2); // => ~701.955
 * ratioToCents(5 / 4); // => ~386.31
 * ```
 */
export function ratioToCents(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new MusicTheoryError(`Invalid ratio ${ratio}: must be a positive finite number.`);
  }
  return CENTS_PER_OCTAVE * Math.log2(ratio);
}

/**
 * Cents → frequency ratio: `centsToRatio(1200)` is 2.
 *
 * @example
 * ```ts
 * import { centsToRatio } from "musictheoryjs";
 *
 * centsToRatio(1200); // => 2
 * centsToRatio(701.955); // => ~1.5
 * centsToRatio(700); // => ~1.4983
 * ```
 */
export function centsToRatio(cents: number): number {
  assertFiniteCents(cents);
  return Math.pow(2, cents / CENTS_PER_OCTAVE);
}

/**
 * Parse a frequency ratio given as a number (`1.5`), a fraction string
 * (`"3/2"`), or a decimal string (`"1.25"`). Throws unless the result is a
 * positive finite number. (The salvaged just-intonation ratio parsing.)
 *
 * @example
 * ```ts
 * import { parseRatio } from "musictheoryjs";
 *
 * parseRatio("3/2"); // => 1.5
 * parseRatio(1.25); // => 1.25
 * parseRatio("0"); // => throws "positive"
 * ```
 */
export function parseRatio(input: string | number): number {
  let value: number;
  if (typeof input === "number") {
    value = input;
  } else if (typeof input === "string") {
    const trimmed = input.trim();
    const parts = trimmed.split("/");
    if (parts.length === 2) {
      value = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else {
      value = parseFloat(trimmed);
    }
  } else {
    throw new MusicTheoryError(
      `Invalid ratio: ${JSON.stringify(input)}. Expected a number, "n/d" fraction, or numeric string.`
    );
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new MusicTheoryError(
      `Invalid ratio ${JSON.stringify(input)}: must resolve to a positive finite number.`
    );
  }
  return value;
}

/**
 * Format a pitch including its cents deviation, which `noteName` drops:
 * `microtonalName(addCents("A4", 19.561))` is `"A4+19.56c"`. Deviations
 * under 0.005¢ are omitted.
 *
 * @example
 * ```ts
 * import { microtonalName, addCents, fromRatio } from "musictheoryjs";
 *
 * microtonalName(addCents("A4", -19)); // => "A4-19c"
 * microtonalName(fromRatio("C4", "5/4")); // => "E4-13.69c"
 * microtonalName("A4"); // => "A4"
 * ```
 */
export function microtonalName(input: string | Pitch): string {
  const p = note(input);
  const cents = p.cents ?? 0;
  const base = noteName(p);
  if (Math.abs(cents) < 0.005) return base;
  const rounded = cents.toFixed(2).replace(/\.?0+$/, "");
  return `${base}${cents > 0 ? "+" : ""}${rounded}c`;
}
