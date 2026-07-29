/**
 * @module chord/chord
 * The rich, frozen `Chord` value and its creation/operation functions.
 * Symbols in, exactly spelled notes out: `chord("Cm7b5").notes` is
 * `["C", "Eb", "Gb", "Bb"]` — spelling comes from interval arithmetic on the
 * core, never from a sharp/flat preference table.
 */

import {
  Interval,
  MusicTheoryError,
  Pitch,
  interval,
  isPitch,
  note,
  noteName,
  pitch,
  transpose,
} from "../core";
import { ChordTypeData } from "../dict";
import { Chroma } from "../pcset";
import {
  chordDisplayAlias,
  resolveChordQuality,
  suggestChordQuality,
  tokenizeChordSymbol,
} from "./symbols";

/**
 * A chord as a value: root, dictionary type, exactly spelled pitch-class
 * notes, and the type's chroma (root at bit 0). Instances are frozen.
 * `notes` are always in root position; a slash bass is recorded in `bass`.
 */
export interface Chord {
  /** Normalized symbol, e.g. "Cm7b5", "F#7", "Am7/G". */
  readonly symbol: string;
  /** Root pitch-class name, e.g. "Eb". */
  readonly root: string;
  /** Slash-bass pitch-class name, only when one was given. */
  readonly bass?: string;
  /** Dictionary type name, e.g. "half-diminished" (may be ""). */
  readonly type: string;
  /** Quality as printed in the symbol, e.g. "m7b5" ("" for a major triad). */
  readonly quality: string;
  /** All dictionary aliases for the quality. */
  readonly aliases: readonly string[];
  /** Interval names from the root, e.g. ["P1", "m3", "d5", "m7"]. */
  readonly intervals: readonly string[];
  /** Spelled pitch-class names in root position. */
  readonly notes: readonly string[];
  /** The type's pitch-class set with the root at bit 0. */
  readonly chroma: Chroma;
}

/**
 * Structural type guard for `Chord`-shaped values.
 *
 * @example
 * ```ts
 * import { chord, isChord } from "musictheoryjs";
 *
 * isChord(chord("Cm7")); // => true
 * isChord("Cm7"); // => false
 * ```
 */
export function isChord(value: unknown): value is Chord {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.symbol === "string" &&
    typeof c.root === "string" &&
    typeof c.chroma === "number" &&
    Array.isArray(c.intervals) &&
    Array.isArray(c.notes)
  );
}

/** Strip octave and cents: chords are pitch-class-first. */
function toPitchClass(input: string | Pitch): Pitch {
  const p = note(input);
  return p.oct === undefined && p.cents === undefined
    ? p
    : pitch(p.step, p.alt);
}

function buildChord(
  rootInput: string | Pitch,
  type: ChordTypeData,
  bassInput?: string | Pitch
): Chord {
  const root = toPitchClass(rootInput);
  const rootName = noteName(root);
  const bassName = bassInput === undefined ? undefined : noteName(toPitchClass(bassInput));
  const quality = chordDisplayAlias(type);
  const notes = type.intervals.map((i) => noteName(transpose(root, i)));
  return Object.freeze({
    symbol: `${rootName}${quality}${bassName !== undefined ? `/${bassName}` : ""}`,
    root: rootName,
    ...(bassName !== undefined && { bass: bassName }),
    type: type.name,
    quality,
    aliases: type.aliases,
    intervals: type.intervals,
    notes: Object.freeze(notes),
    chroma: type.chroma,
  });
}

/**
 * Create a chord from a symbol (`chord("Cm7b5")`, `chord("Am7/G")`), from a
 * root and quality (`chord("C", "maj7")`), or normalize an existing `Chord`.
 * Returns `null` when the symbol or quality is unrecognized — never a
 * defaulted quality.
 *
 * @example
 * ```ts
 * import { tryChord } from "musictheoryjs";
 *
 * tryChord("Cm9").symbol; // => "Cm9"
 * tryChord("Cwat"); // => null
 * ```
 */
export function tryChord(
  input: string | Chord | Pitch,
  quality?: string
): Chord | null {
  try {
    return chord(input, quality);
  } catch {
    return null;
  }
}

/**
 * Create a chord from a symbol (`chord("Cm7b5")`, `chord("CΔ9")`,
 * `chord("Am7/G")`), from a root and quality (`chord("C", "maj7")`), or
 * normalize an existing `Chord` object. Throws `MusicTheoryError` with a
 * "did you mean" suggestion for unrecognized qualities; there is no silent
 * fallback quality.
 *
 * @example
 * ```ts
 * import { chord } from "musictheoryjs";
 *
 * chord("Cm").notes; // => ["C", "Eb", "G"]
 * chord("C13#11").notes; // => ["C", "E", "G", "Bb", "D", "F#", "A"]
 * chord("Cm(maj7)").symbol; // => "CmM7"
 * chord("C7alt").symbol; // => "C7#5#9"
 * chord("Am7/G").bass; // => "G"
 * chord("Cmj7"); // => throws "did you mean"
 * ```
 */
export function chord(input: string | Chord | Pitch, quality?: string): Chord {
  if (typeof input === "string" && quality === undefined) {
    // Parse-once: symbols are memoized (values are frozen, so sharing is safe).
    const cached = chordCache.get(input);
    if (cached !== undefined) return cached;
    const built = chordFromSymbol(input);
    if (chordCache.size > 10_000) chordCache.clear();
    chordCache.set(input, built);
    return built;
  }
  if (isChord(input)) {
    if (quality !== undefined) {
      throw new MusicTheoryError(
        "chord() takes a quality only with a root note, not with a Chord object."
      );
    }
    return chordFromParts(input.root, resolveRequired(input.quality, input.symbol), input.bass);
  }
  if (isPitch(input)) {
    return chordFromParts(
      input,
      resolveRequired(quality ?? "", `${noteName(input)}${quality ?? ""}`)
    );
  }
  if (typeof input !== "string") {
    throw new MusicTheoryError(
      `Invalid chord: ${JSON.stringify(input)}. Expected a symbol like "Cm7", a root plus quality like chord("C", "m7"), or a Chord object.`
    );
  }
  return chordFromParts(input, resolveRequired(quality ?? "", `${input}${quality ?? ""}`));
}

function chordFromSymbol(input: string): Chord {
  const tokens = tokenizeChordSymbol(input);
  if ("reason" in tokens) {
    switch (tokens.reason) {
      case "no-chord":
        throw new MusicTheoryError(
          `"${input.trim()}" is a no-chord marker, not a chord. parseProgression() accepts it as an empty slot.`
        );
      case "bad-root":
        throw new MusicTheoryError(
          `Invalid chord symbol ${JSON.stringify(input)}: expected a root note like "C", "F#", or "Bb", optionally followed by a quality ("m7", "maj7", …) and slash bass.`
        );
      case "bad-quality": {
        const suggestion = suggestChordQuality(tokens.quality);
        throw new MusicTheoryError(
          `Unknown chord quality ${JSON.stringify(tokens.quality)} in ${JSON.stringify(input)}` +
            (suggestion !== null ? ` — did you mean "${suggestion}"?` : ".")
        );
      }
    }
  }
  return buildChord(tokens.root, tokens.type, tokens.bass);
}

function resolveRequired(quality: string, context: string): ChordTypeData {
  const type = resolveChordQuality(quality);
  if (type === null) {
    const suggestion = suggestChordQuality(quality);
    throw new MusicTheoryError(
      `Unknown chord quality ${JSON.stringify(quality)} in ${JSON.stringify(context)}` +
        (suggestion !== null ? ` — did you mean "${suggestion}"?` : ".")
    );
  }
  return type;
}

function chordFromParts(
  root: string | Pitch,
  type: ChordTypeData,
  bass?: string | Pitch
): Chord {
  return buildChord(root, type, bass);
}

const chordCache = new Map<string, Chord>();

/**
 * Transpose a chord (root and any slash bass): `transposeChord("Cm7", "M2")`
 * → the Dm7 chord. Accepts a symbol or a `Chord`.
 *
 * @example
 * ```ts
 * import { transposeChord } from "musictheoryjs";
 *
 * transposeChord("Cm7", "M2").symbol; // => "Dm7"
 * transposeChord("Ebmaj7", "P5").notes; // => ["Bb", "D", "F", "A"]
 * transposeChord("Am7/G", "m3").symbol; // => "Cm7/Bb"
 * ```
 */
export function transposeChord(
  input: string | Chord,
  by: string | Interval
): Chord {
  const c = chord(input);
  const i = interval(by);
  const type = resolveRequired(c.quality, c.symbol);
  const root = transpose(c.root, i);
  const bass = c.bass === undefined ? undefined : transpose(c.bass, i);
  return buildChord(root, type, bass);
}

/**
 * Octave-realized chord tones, ascending from the root in the given octave:
 * `chordNotes("Cmaj9", 4)` → ["C4", "E4", "G4", "B4", "D5"]. Compound
 * intervals in the type (9ths, 11ths, 13ths) land in the upper octave.
 *
 * @example
 * ```ts
 * import { chordNotes } from "musictheoryjs";
 *
 * chordNotes("Cmaj9", 4); // => ["C4", "E4", "G4", "B4", "D5"]
 * chordNotes("C13#11", 3); // => ["C3", "E3", "G3", "Bb3", "D4", "F#4", "A4"]
 * ```
 */
export function chordNotes(input: string | Chord, octave: number = 4): string[] {
  const c = chord(input);
  const root = note(c.root);
  const anchored = pitch(root.step, root.alt, octave);
  return c.intervals.map((i) => noteName(transpose(anchored, i)));
}
