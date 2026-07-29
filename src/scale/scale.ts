/**
 * @module scale/scale
 * The rich, frozen `Scale` value: tonic + dictionary type, with every degree
 * spelled by interval arithmetic (`scale("Cb major").notes` is
 * `["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"]`). Modes are one implementation
 * — chroma rotation over the parent's own notes — so every mode of every
 * scale works, on any tonic.
 */

import {
  MusicTheoryError,
  Pitch,
  chroma as chromaOf,
  distance,
  interval,
  intervalName,
  note,
  noteName,
  pitch,
  transpose,
} from "../core";
import { closestMatch } from "../core/util";
import {
  SCALE_TYPES,
  ScaleTypeData,
  getChordTypeByChroma,
  getScaleType,
  getScaleTypeByChroma,
} from "../dict";
import { Chroma, chromaFromNotes, rotateChroma } from "../pcset";
import { chordDisplayAlias } from "../chord";

/**
 * A scale as a value: tonic, dictionary type, exactly spelled degree notes,
 * and the type's chroma (tonic at bit 0). Instances are frozen. A `Scale`
 * produced by `mode()` may have an empty `type` when the rotation has no
 * dictionary name.
 */
export interface Scale {
  /** Full name, e.g. "C major", "F# dorian". */
  readonly name: string;
  /** Tonic pitch-class name, e.g. "Eb". */
  readonly tonic: string;
  /** Dictionary type name, e.g. "harmonic minor" ("" for unnamed modes). */
  readonly type: string;
  /** Alternative type names: major → ["ionian"]. */
  readonly aliases: readonly string[];
  /** Interval names from the tonic, e.g. ["P1", "M2", "m3", …]. */
  readonly intervals: readonly string[];
  /** Spelled pitch-class names, ascending from the tonic. */
  readonly notes: readonly string[];
  /** The scale's pitch-class set with the tonic at bit 0. */
  readonly chroma: Chroma;
}

/** Structural type guard for `Scale`-shaped values. */
export function isScale(value: unknown): value is Scale {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.name === "string" &&
    typeof s.tonic === "string" &&
    typeof s.chroma === "number" &&
    Array.isArray(s.intervals) &&
    Array.isArray(s.notes)
  );
}

/** Strip octave and cents: scales are pitch-class-first. */
function toPitchClass(input: string | Pitch): Pitch {
  const p = note(input);
  return p.oct === undefined && p.cents === undefined
    ? p
    : pitch(p.step, p.alt);
}

function freezeScale(
  tonic: Pitch,
  type: string,
  aliases: readonly string[],
  intervals: readonly string[],
  notes: readonly string[],
  chroma: Chroma
): Scale {
  const tonicName = noteName(tonic);
  return Object.freeze({
    name: type === "" ? tonicName : `${tonicName} ${type}`,
    tonic: tonicName,
    type,
    aliases,
    intervals,
    notes: Object.freeze([...notes]),
    chroma,
  });
}

function buildScale(tonicInput: string | Pitch, type: ScaleTypeData): Scale {
  const tonic = toPitchClass(tonicInput);
  const notes = type.intervals.map((i) => noteName(transpose(tonic, i)));
  return freezeScale(tonic, type.name, type.aliases, type.intervals, notes, type.chroma);
}

function scaleTypeError(name: string): MusicTheoryError {
  const suggestion = closestMatch(
    name,
    (function* () {
      for (const t of SCALE_TYPES) {
        yield t.name;
        yield* t.aliases;
      }
    })()
  );
  return new MusicTheoryError(
    `Unknown scale type ${JSON.stringify(name)}` +
      (suggestion !== null ? ` — did you mean "${suggestion}"?` : ".")
  );
}

/**
 * Create a scale from a name (`scale("C major")`, `scale("f# dorian")`), from
 * a tonic and type (`scale("Eb", "harmonic minor")`), or normalize an
 * existing `Scale`. Returns `null` on failure.
 */
export function tryScale(input: string | Scale, type?: string): Scale | null {
  try {
    return scale(input, type);
  } catch {
    return null;
  }
}

/**
 * Create a scale from a name (`scale("C major")`, `scale("bb melodic minor")`),
 * from a tonic and type (`scale("Eb", "dorian")`, tonic may be a `Pitch`), or
 * normalize an existing `Scale` object. Throws `MusicTheoryError` with a
 * suggestion for unknown types.
 */
export function scale(input: string | Scale | Pitch, type?: string): Scale {
  if (isScale(input)) {
    if (type !== undefined) {
      throw new MusicTheoryError(
        "scale() takes a type only with a tonic note, not with a Scale object."
      );
    }
    const entry = getScaleType(input.type);
    if (entry !== null) return buildScale(input.tonic, entry);
    // An unnamed mode: rebuild from its own notes to validate and re-freeze.
    return modeFromNotes(input.notes.map(note), 1);
  }
  if (type !== undefined) {
    const entry = getScaleType(type);
    if (entry === null) throw scaleTypeError(type);
    return buildScale(input as string | Pitch, entry);
  }
  if (typeof input !== "string") {
    throw new MusicTheoryError(
      `Invalid scale: ${JSON.stringify(input)}. Expected "<tonic> <type>" like "C major", or scale(tonic, type).`
    );
  }
  const trimmed = input.trim();
  const space = trimmed.indexOf(" ");
  if (space === -1) {
    throw new MusicTheoryError(
      `Invalid scale name ${JSON.stringify(input)}: expected "<tonic> <type>" like "C major" or "F# dorian".`
    );
  }
  const tonicToken = trimmed.slice(0, space);
  const typeToken = trimmed.slice(space + 1).trim();
  const entry = getScaleType(typeToken);
  if (entry === null) throw scaleTypeError(typeToken);
  return buildScale(tonicToken, entry);
}

/** Ascending pitch-class intervals from `notes[0]` to each note. */
function intervalsFromNotes(notes: readonly Pitch[]): string[] {
  return notes.map((n) => intervalName(distance(notes[0], n)));
}

function modeFromNotes(notes: readonly Pitch[], degree: number): Scale {
  const rotated = [...notes.slice(degree - 1), ...notes.slice(0, degree - 1)];
  const tonic = rotated[0];
  const chroma = chromaFromNotes(rotated);
  const entry = getScaleTypeByChroma(
    // Re-root the set on the new tonic: chromaFromNotes is absolute.
    rotateToTonic(chroma, tonic)
  );
  const intervals = intervalsFromNotes(rotated);
  const names = rotated.map(noteName);
  if (entry !== null) {
    return freezeScale(tonic, entry.name, entry.aliases, entry.intervals, names, entry.chroma);
  }
  return freezeScale(
    tonic,
    "",
    Object.freeze([]),
    Object.freeze(intervals),
    names,
    rotateToTonic(chroma, tonic)
  );
}

function rotateToTonic(absolute: Chroma, tonic: Pitch): Chroma {
  return rotateChroma(absolute, -chromaOf(tonic));
}

/**
 * The mode of a scale built on its `degree`-th note (1-based), reusing the
 * parent's spelled notes: `mode("C major", 2)` is D dorian with notes
 * D E F G A B C. When the rotation matches a dictionary type it is named
 * (type/aliases from the dictionary); otherwise `type` is `""`.
 */
export function mode(input: string | Scale, degree: number): Scale {
  const s = scale(input);
  if (!Number.isInteger(degree) || degree < 1 || degree > s.notes.length) {
    throw new MusicTheoryError(
      `Invalid mode degree ${degree}: must be an integer 1-${s.notes.length} for ${s.name}.`
    );
  }
  return modeFromNotes(s.notes.map(note), degree);
}

/** All modes of a scale, one per degree, in degree order. */
export function modes(input: string | Scale): Scale[] {
  const s = scale(input);
  return s.notes.map((_, i) => modeFromNotes(s.notes.map(note), i + 1));
}

/**
 * Octave-realized scale notes ascending from the tonic in the given octave:
 * `scaleNotes("C major", 4)` → ["C4", "D4", …, "B4"]. Without an octave,
 * returns the pitch-class names.
 */
export function scaleNotes(input: string | Scale, octave?: number): string[] {
  const s = scale(input);
  if (octave === undefined) return [...s.notes];
  const tonic = note(s.tonic);
  const anchored = pitch(tonic.step, tonic.alt, octave);
  return s.intervals.map((i) => noteName(transpose(anchored, i)));
}

/**
 * The chord built by stacking thirds on each degree (1-3-5 for `size` 3,
 * 1-3-5-7 for `size` 4), as chord symbols: `scaleChords("C major", 4)` →
 * ["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"]. Degrees whose stack
 * matches no dictionary chord type yield `""`.
 */
export function scaleChords(input: string | Scale, size: 3 | 4 = 3): string[] {
  const s = scale(input);
  const pitches = s.notes.map(note);
  const n = pitches.length;
  return pitches.map((root, i) => {
    const members = Array.from(
      { length: size },
      (_, k) => pitches[(i + 2 * k) % n]
    );
    const rooted = rotateToTonic(chromaFromNotes(members), root);
    const type = getChordTypeByChroma(rooted);
    return type === null ? "" : `${noteName(root)}${chordDisplayAlias(type)}`;
  });
}

/**
 * Brightness as a comparable number: the sum of semitone sizes of the scale's
 * intervals. Higher is brighter — lydian > major > mixolydian > dorian >
 * minor > phrygian > locrian.
 */
export function scaleBrightness(input: string | Scale): number {
  const s = scale(input);
  return s.intervals.reduce((sum, i) => sum + interval(i).semitones, 0);
}
