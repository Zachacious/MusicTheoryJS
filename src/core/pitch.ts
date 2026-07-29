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

const hasOwn = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Structural type guard for `Pitch`-shaped values. Only own properties are
 * consulted, so values remain deterministic under prototype pollution.
 *
 * @example
 * ```ts
 * import { isPitch, note } from "musictheoryjs";
 *
 * isPitch(note("Eb4")); // => true
 * isPitch({ step: 4, alt: 1 }); // => true
 * isPitch("Eb4"); // => false
 * ```
 */
export function isPitch(value: unknown): value is Pitch {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    hasOwn(p, "step") &&
    typeof p.step === "number" &&
    hasOwn(p, "alt") &&
    typeof p.alt === "number" &&
    (!hasOwn(p, "oct") || p.oct === undefined || typeof p.oct === "number") &&
    (!hasOwn(p, "cents") || p.cents === undefined || typeof p.cents === "number")
  );
}

/**
 * Create a validated, frozen `Pitch` from parts.
 * A `cents` of 0 is normalized to "absent".
 *
 * @example
 * ```ts
 * import { pitch, noteName } from "musictheoryjs";
 *
 * noteName(pitch(2, -1, 4)); // => "Eb4"
 * noteName(pitch(4, 1)); // => "G#"
 * pitch(7, 0); // => throws "Invalid step"
 * ```
 */
export function pitch(
  step: number,
  alt: number = 0,
  oct?: number,
  cents?: number
): Pitch {
  if (!Number.isSafeInteger(step) || step < 0 || step > 6) {
    throw new MusicTheoryError(
      `Invalid step ${step}: must be an integer 0-6 (C=0 … B=6).`
    );
  }
  if (!Number.isSafeInteger(alt)) {
    throw new MusicTheoryError(
      `Invalid alteration ${alt}: must be a safe integer (positive = sharps, negative = flats).`
    );
  }
  if (oct !== undefined && !Number.isSafeInteger(oct)) {
    throw new MusicTheoryError(`Invalid octave ${oct}: must be a safe integer.`);
  }
  if (cents !== undefined && !Number.isFinite(cents)) {
    throw new MusicTheoryError(`Invalid cents ${cents}: must be a finite number.`);
  }
  // Normalize -0 so fields are stable under Object.is / structured clone.
  return Object.freeze({
    step: (step === 0 ? 0 : step) as Step,
    alt: alt === 0 ? 0 : alt,
    ...(oct !== undefined && { oct: oct === 0 ? 0 : oct }),
    ...(cents !== undefined && cents !== 0 && { cents }),
  });
}

const NOTE_REGEX = /^([A-Ga-g])(#+|b+|x+)?(-?\d+)?$/;
const noteCache = new Map<string, Pitch>();

/**
 * Parse a note name or normalize a `Pitch` object; returns `null` on failure.
 * Accepts `"C4"`, `"eb"`, `"F##3"`, `"Bx2"` (x = double sharp), `"C-1"`.
 * The letter is case-insensitive; accidentals are not (`b` is flat).
 *
 * @example
 * ```ts
 * import { tryNote, noteName } from "musictheoryjs";
 *
 * tryNote("Eb4").alt; // => -1
 * noteName(tryNote("Bx2")); // => "B##2"
 * tryNote("H2"); // => null
 * ```
 */
export function tryNote(input: string | Pitch): Pitch | null {
  if (isPitch(input)) {
    // Fast path: frozen, field-valid pitches (every Pitch this library makes)
    // pass through untouched — the object path allocates nothing. A plain
    // `input.oct === undefined` read guards inherited values too: if a
    // polluted prototype supplies one, we fall through to the copying path.
    if (
      Object.isFrozen(input) &&
      Number.isSafeInteger(input.step) &&
      input.step >= 0 &&
      input.step <= 6 &&
      Number.isSafeInteger(input.alt) &&
      (input.oct === undefined || (hasOwn(input, "oct") && Number.isSafeInteger(input.oct))) &&
      (input.cents === undefined ||
        (hasOwn(input, "cents") && Number.isFinite(input.cents)))
    ) {
      return input;
    }
    try {
      // Read own properties only — inherited oct/cents must not leak in.
      return pitch(
        input.step,
        input.alt,
        hasOwn(input, "oct") ? input.oct : undefined,
        hasOwn(input, "cents") ? input.cents : undefined
      );
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
  let parsed: Pitch;
  try {
    parsed = pitch(step, alt, oct); // e.g. an octave beyond safe-integer range
  } catch {
    return null;
  }
  if (noteCache.size > 10_000) noteCache.clear();
  noteCache.set(input, parsed);
  return parsed;
}

/**
 * Parse a note name or normalize a `Pitch` object; throws on failure.
 *
 * @example
 * ```ts
 * import { note, noteName } from "musictheoryjs";
 *
 * note("eb").alt; // => -1
 * note("C4").oct; // => 4
 * noteName(note("c#4")); // => "C#4"
 * note("H2"); // => throws "Invalid note"
 * ```
 */
export function note(input: string | Pitch): Pitch {
  const p = tryNote(input);
  if (p === null) {
    throw new MusicTheoryError(
      `Invalid note: ${JSON.stringify(input)}. Expected a name like "C4", "Eb", "F##3", or a Pitch object.`
    );
  }
  return p;
}

/**
 * Format a pitch as a name: `noteName("Eb4") === "Eb4"`, pitch classes omit
 * the octave. Names do not encode `cents` — formatting a microtonal pitch is
 * lossy; keep the `Pitch` object when the deviation matters.
 *
 * @example
 * ```ts
 * import { noteName, transpose } from "musictheoryjs";
 *
 * noteName(transpose("Eb4", "P5")); // => "Bb4"
 * noteName("f##3"); // => "F##3"
 * noteName({ step: 0, alt: 0 }); // => "C"
 * ```
 */
export function noteName(input: string | Pitch): string {
  const p = note(input);
  const cached = nameCache.get(p);
  if (cached !== undefined) return cached;
  const acc = p.alt > 0 ? "#".repeat(p.alt) : "b".repeat(-p.alt);
  const name = `${LETTERS[p.step]}${acc}${p.oct ?? ""}`;
  nameCache.set(p, name);
  return name;
}

/** Formatted names, keyed on the (frozen, shared) pitch identity. */
const nameCache = new WeakMap<Pitch, string>();

/**
 * Chromatic pitch class 0-11 (C=0). `chroma("B#") === 0`.
 *
 * @example
 * ```ts
 * import { chroma } from "musictheoryjs";
 *
 * chroma("Eb"); // => 3
 * chroma("C4"); // => 0
 * chroma("B#"); // => 0
 * ```
 */
export function chroma(input: string | Pitch): number {
  const p = note(input);
  return mod(STEP_SEMITONES[p.step] + p.alt, 12);
}

/**
 * Absolute semitone height on the MIDI scale (C4 = 60), from the *spelling* —
 * so `semitoneHeight("B#3") === 60`. Unbounded; `null` for pitch classes.
 *
 * @example
 * ```ts
 * import { semitoneHeight } from "musictheoryjs";
 *
 * semitoneHeight("C4"); // => 60
 * semitoneHeight("B#3"); // => 60
 * semitoneHeight("Eb"); // => null
 * ```
 */
export function semitoneHeight(input: string | Pitch): number | null {
  const p = note(input);
  if (p.oct === undefined) return null;
  return 12 * (p.oct + 1) + STEP_SEMITONES[p.step] + p.alt;
}

/**
 * MIDI note number, or `null` for pitch classes and heights outside 0-127.
 *
 * @example
 * ```ts
 * import { midi } from "musictheoryjs";
 *
 * midi("A4"); // => 69
 * // Pitch classes and out-of-range heights have no MIDI number:
 * midi("Eb"); // => null
 * midi("C-2"); // => null
 * ```
 */
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
 *
 * @example
 * ```ts
 * import { freq } from "musictheoryjs";
 *
 * freq("A4"); // => 440
 * freq("C4"); // => ~261.63
 * freq("A4", { a4: 432 }); // => 432
 * freq("A"); // => null
 * ```
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

/** Position of each natural letter on the chain of fifths from C. */
const FIFTHS_OF_STEP: readonly number[] = [0, 2, 4, -1, 1, 3, 5];

/**
 * Position of a spelled pitch class on the chain of fifths from C: C = 0,
 * G = 1, F = −1, G# = +8, Ab = −4. Enharmonic spellings land on different
 * chain positions, which is what makes spelled temperaments and key-signature
 * arithmetic possible (`fifthsIndex(tonic)` is the major-key alteration).
 *
 * @example
 * ```ts
 * import { fifthsIndex } from "musictheoryjs";
 *
 * fifthsIndex("C"); // => 0
 * // F# major has 6 sharps:
 * fifthsIndex("F#"); // => 6
 * // Enharmonic spellings land on different chain positions:
 * fifthsIndex("G#"); // => 8
 * fifthsIndex("Ab"); // => -4
 * ```
 */
export function fifthsIndex(input: string | Pitch): number {
  const p = note(input);
  return FIFTHS_OF_STEP[p.step] + 7 * p.alt;
}

/**
 * Spell a chromatic pitch class 0-11 as a `Pitch` (octave-free). Defaults to
 * sharp spellings: `spellChroma(8)` is G#, `spellChroma(8, { prefer: "flat" })`
 * is Ab.
 *
 * @example
 * ```ts
 * import { spellChroma, noteName } from "musictheoryjs";
 *
 * noteName(spellChroma(8)); // => "G#"
 * noteName(spellChroma(8, { prefer: "flat" })); // => "Ab"
 * ```
 */
export function spellChroma(
  chromaValue: number,
  options?: { prefer?: "sharp" | "flat" }
): Pitch {
  if (!Number.isInteger(chromaValue) || chromaValue < 0 || chromaValue > 11) {
    throw new MusicTheoryError(
      `Invalid chroma ${chromaValue}: must be an integer 0-11.`
    );
  }
  const table = options?.prefer === "flat" ? FLAT_SPELLINGS : SHARP_SPELLINGS;
  const [step, alt] = table[chromaValue];
  return pitch(step, alt);
}

/**
 * Spell a MIDI note number (0-127). Defaults to sharp spellings.
 *
 * @example
 * ```ts
 * import { fromMidi, noteName } from "musictheoryjs";
 *
 * noteName(fromMidi(60)); // => "C4"
 * noteName(fromMidi(63)); // => "D#4"
 * noteName(fromMidi(63, { prefer: "flat" })); // => "Eb4"
 * ```
 */
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
 *
 * @example
 * ```ts
 * import { fromFreq, noteName } from "musictheoryjs";
 *
 * noteName(fromFreq(440)); // => "A4"
 * noteName(fromFreq(445)); // => "A4"
 * fromFreq(445).cents; // => ~19.56
 * ```
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

/**
 * True if both values have the identical spelling, octave, and cents.
 *
 * @example
 * ```ts
 * import { sameSpelling } from "musictheoryjs";
 *
 * sameSpelling("Eb4", "eb4"); // => true
 * sameSpelling("Eb4", "D#4"); // => false
 * ```
 */
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
 *
 * @example
 * ```ts
 * import { samePitch } from "musictheoryjs";
 *
 * samePitch("Eb4", "D#4"); // => true
 * samePitch("B#", "C"); // => true
 * samePitch("C4", "C5"); // => false
 * ```
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
