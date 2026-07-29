/**
 * @module core/pitch
 * The spelled-pitch representation at the heart of the library.
 *
 * A `Pitch` stores its *spelling* — letter step, alteration, optional octave —
 * not a chromatic pitch number, so `Cb`, `B#`, `F##`, and `Ebb` are all
 * distinct, representable values. Enharmonic spelling everywhere else in the
 * library falls out of arithmetic on this type; nothing ever guesses a
 * spelling from a preference table.
 *
 * All functions accept either a name string (`"Eb4"`, `"c#"`, `"F##3"`) or a
 * `Pitch` object. Objects pass through with no string parsing.
 */

import { MusicTheoryError } from "./errors";
import { mod } from "./util";

/** Letter index: C=0, D=1, E=2, F=3, G=4, A=5, B=6. */
export type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * A spelled pitch (with `oct`) or pitch class (without).
 * `alt` counts sharps (+) or flats (−) and is unbounded.
 * `cents` is an optional microtonal deviation from the spelled 12-TET pitch.
 * Instances are frozen; operations return new values.
 */
export interface Pitch {
  readonly step: Step;
  readonly alt: number;
  readonly oct?: number;
  readonly cents?: number;
}

const LETTERS = "CDEFGAB";

/** Semitone offset of each natural letter from C: [C, D, E, F, G, A, B]. */
export const STEP_SEMITONES: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

/** [step, alt] spelling for each chroma 0-11, sharp preference. */
const SHARP_SPELLINGS: ReadonlyArray<readonly [Step, number]> = [
  [0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0],
  [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0],
];

/** [step, alt] spelling for each chroma 0-11, flat preference. */
const FLAT_SPELLINGS: ReadonlyArray<readonly [Step, number]> = [
  [0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0],
  [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0],
];

/** Structural type guard for `Pitch`-shaped values. */
export function isPitch(value: unknown): value is Pitch {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.step === "number" &&
    typeof p.alt === "number" &&
    (p.oct === undefined || typeof p.oct === "number") &&
    (p.cents === undefined || typeof p.cents === "number")
  );
}

/**
 * Create a validated, frozen `Pitch` from parts.
 * A `cents` of 0 is normalized to "absent".
 */
export function pitch(
  step: number,
  alt: number = 0,
  oct?: number,
  cents?: number
): Pitch {
  if (!Number.isInteger(step) || step < 0 || step > 6) {
    throw new MusicTheoryError(
      `Invalid step ${step}: must be an integer 0-6 (C=0 … B=6).`
    );
  }
  if (!Number.isInteger(alt)) {
    throw new MusicTheoryError(
      `Invalid alteration ${alt}: must be an integer (positive = sharps, negative = flats).`
    );
  }
  if (oct !== undefined && !Number.isInteger(oct)) {
    throw new MusicTheoryError(`Invalid octave ${oct}: must be an integer.`);
  }
  if (cents !== undefined && !Number.isFinite(cents)) {
    throw new MusicTheoryError(`Invalid cents ${cents}: must be a finite number.`);
  }
  return Object.freeze({
    step: step as Step,
    alt,
    ...(oct !== undefined && { oct }),
    ...(cents !== undefined && cents !== 0 && { cents }),
  });
}

const NOTE_REGEX = /^([A-Ga-g])(#+|b+|x+)?(-?\d+)?$/;
const noteCache = new Map<string, Pitch>();

/**
 * Parse a note name or normalize a `Pitch` object; returns `null` on failure.
 * Accepts `"C4"`, `"eb"`, `"F##3"`, `"Bx2"` (x = double sharp), `"C-1"`.
 * The letter is case-insensitive; accidentals are not (`b` is flat).
 */
export function tryNote(input: string | Pitch): Pitch | null {
  if (isPitch(input)) {
    try {
      return pitch(input.step, input.alt, input.oct, input.cents);
    } catch {
      return null;
    }
  }
  if (typeof input !== "string") return null;
  const cached = noteCache.get(input);
  if (cached !== undefined) return cached;
  const m = NOTE_REGEX.exec(input);
  if (m === null) return null;
  const step = LETTERS.indexOf(m[1].toUpperCase());
  const acc = m[2] ?? "";
  const alt =
    acc === "" ? 0
    : acc.startsWith("#") ? acc.length
    : acc.startsWith("x") ? acc.length * 2
    : -acc.length;
  const oct = m[3] === undefined ? undefined : parseInt(m[3], 10);
  const parsed = pitch(step, alt, oct);
  if (noteCache.size > 10_000) noteCache.clear();
  noteCache.set(input, parsed);
  return parsed;
}

/** Parse a note name or normalize a `Pitch` object; throws on failure. */
export function note(input: string | Pitch): Pitch {
  const p = tryNote(input);
  if (p === null) {
    throw new MusicTheoryError(
      `Invalid note: ${JSON.stringify(input)}. Expected a name like "C4", "Eb", "F##3", or a Pitch object.`
    );
  }
  return p;
}

/** Format a pitch as a name: `noteName("Eb4") === "Eb4"`, pitch classes omit the octave. */
export function noteName(input: string | Pitch): string {
  const p = note(input);
  const acc = p.alt > 0 ? "#".repeat(p.alt) : "b".repeat(-p.alt);
  return `${LETTERS[p.step]}${acc}${p.oct ?? ""}`;
}

/** Chromatic pitch class 0-11 (C=0). `chroma("B#") === 0`. */
export function chroma(input: string | Pitch): number {
  const p = note(input);
  return mod(STEP_SEMITONES[p.step] + p.alt, 12);
}

/**
 * Absolute semitone height on the MIDI scale (C4 = 60), from the *spelling* —
 * so `semitoneHeight("B#3") === 60`. Unbounded; `null` for pitch classes.
 */
export function semitoneHeight(input: string | Pitch): number | null {
  const p = note(input);
  if (p.oct === undefined) return null;
  return 12 * (p.oct + 1) + STEP_SEMITONES[p.step] + p.alt;
}

/** MIDI note number, or `null` for pitch classes and heights outside 0-127. */
export function midi(input: string | Pitch): number | null {
  const h = semitoneHeight(input);
  return h !== null && h >= 0 && h <= 127 ? h : null;
}

function referenceA4(options?: { a4?: number }): number {
  const a4 = options?.a4 ?? 440;
  if (!Number.isFinite(a4) || a4 <= 0) {
    throw new MusicTheoryError(`Invalid A4 reference ${a4}: must be a positive number of Hz.`);
  }
  return a4;
}

/**
 * Frequency in Hz (12-TET, including any `cents` deviation), or `null` for
 * pitch classes. The A4 reference is configurable: `freq("A4", { a4: 432 })`.
 */
export function freq(
  input: string | Pitch,
  options?: { a4?: number }
): number | null {
  const p = note(input);
  const h = semitoneHeight(p);
  if (h === null) return null;
  const a4 = referenceA4(options);
  return a4 * Math.pow(2, (h - 69 + (p.cents ?? 0) / 100) / 12);
}

/** Spell a MIDI note number (0-127). Defaults to sharp spellings. */
export function fromMidi(
  midiValue: number,
  options?: { prefer?: "sharp" | "flat"; cents?: number }
): Pitch {
  if (!Number.isInteger(midiValue) || midiValue < 0 || midiValue > 127) {
    throw new MusicTheoryError(
      `Invalid MIDI number ${midiValue}: must be an integer 0-127.`
    );
  }
  const table = options?.prefer === "flat" ? FLAT_SPELLINGS : SHARP_SPELLINGS;
  const [step, alt] = table[mod(midiValue, 12)];
  return pitch(step, alt, Math.floor(midiValue / 12) - 1, options?.cents);
}

/**
 * Nearest pitch for a frequency, with the remaining deviation stored in
 * `cents`. `fromFreq(445)` → A4 +19.56¢.
 */
export function fromFreq(
  hz: number,
  options?: { a4?: number; prefer?: "sharp" | "flat" }
): Pitch {
  if (!Number.isFinite(hz) || hz <= 0) {
    throw new MusicTheoryError(`Invalid frequency ${hz}: must be a positive number of Hz.`);
  }
  const a4 = referenceA4(options);
  const exact = 69 + 12 * Math.log2(hz / a4);
  const nearest = Math.round(exact);
  if (nearest < 0 || nearest > 127) {
    throw new MusicTheoryError(`Frequency ${hz} Hz is outside the MIDI note range.`);
  }
  const cents = (exact - nearest) * 100;
  return fromMidi(nearest, {
    prefer: options?.prefer,
    cents: Math.abs(cents) < 1e-9 ? 0 : cents,
  });
}

const CENTS_EPSILON = 1e-9;

/** True if both values have the identical spelling, octave, and cents. */
export function sameSpelling(a: string | Pitch, b: string | Pitch): boolean {
  const pa = note(a);
  const pb = note(b);
  return (
    pa.step === pb.step &&
    pa.alt === pb.alt &&
    pa.oct === pb.oct &&
    Math.abs((pa.cents ?? 0) - (pb.cents ?? 0)) < CENTS_EPSILON
  );
}

/**
 * True if both values sound the same pitch (enharmonic equivalence).
 * Two pitch classes compare by chroma; two octave-specific pitches compare by
 * height; a pitch class never equals an octave-specific pitch.
 */
export function samePitch(a: string | Pitch, b: string | Pitch): boolean {
  const pa = note(a);
  const pb = note(b);
  const centsEqual = Math.abs((pa.cents ?? 0) - (pb.cents ?? 0)) < CENTS_EPSILON;
  const ha = semitoneHeight(pa);
  const hb = semitoneHeight(pb);
  if (ha === null && hb === null) return chroma(pa) === chroma(pb) && centsEqual;
  if (ha === null || hb === null) return false;
  return ha === hb && centsEqual;
}
