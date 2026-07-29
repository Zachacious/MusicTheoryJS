/**
 * `Key` — a tonic and a mode (major or natural minor), with the harmony that
 * follows from it: a key signature, diatonic chords, and Roman-numeral analysis.
 *
 * Because keys are built on the correctly-spelled {@link Scale}, everything
 * downstream spells correctly too — G major's signature is one sharp (F#), and
 * the ii chord in C major is `Dm`, not `Ebbm`.
 */

import { detectQuality } from "../chord/analysis";
import { Chord, type ChordLike } from "../chord/chord";
import type { ChordQuality } from "../chord/templates";
import {
  type Interval,
  interval,
  intervalBetween,
  transpose,
} from "../interval/interval";
import { type IntervalLike, asInterval } from "../interval/parse";
import { mod } from "../math/index";
import { Note, type NoteLike } from "../note/note";
import { tryParseNote } from "../pitch/parse";
import { chroma } from "../pitch/spelled";
import { Scale } from "../scale/scale";

export type Mode = "major" | "minor";

/** A key described as plain data. `mode` defaults to major. */
export interface KeySpec {
  readonly tonic: Note | NoteLike | string;
  readonly mode?: Mode;
}

/** Anything the ergonomic layer accepts as a key: a {@link Key}, a string
 * like `"C major"`, `"f# minor"`, or `"Eb"` (major), or a {@link KeySpec}. */
export type KeyLike = Key | string | KeySpec;

function keyFromString(input: string): Key {
  const parts = input.trim().split(/\s+/);
  const [tonicRaw = "", modeRaw] = parts;
  const tonic = tryParseNote(tonicRaw);
  const mode =
    modeRaw === undefined || modeRaw === "major"
      ? "major"
      : modeRaw === "minor"
        ? "minor"
        : null;
  if (!tonic || mode === null || parts.length > 2) {
    throw new SyntaxError(
      `invalid key: "${input}" (expected "<tonic>", "<tonic> major", or "<tonic> minor")`
    );
  }
  return new Key(Note.of(tonic), mode);
}

/** The accidentals that make up a key signature. */
export interface KeySignature {
  /** Net accidental count: positive = sharps, negative = flats, 0 = none. */
  readonly count: number;
  /** The altered notes, in scale order. */
  readonly accidentals: ReadonlyArray<{ letter: string; alteration: number }>;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

/**
 * How each pitch class relative to the tonic is spelled: the harmonic
 * chromatic scale of the key. Diatonic degrees come out exactly as the scale
 * spells them, in both modes. Chromatic degrees follow the standard
 * convention — in major: ♭2, ♭3, ♯4, ♭6, ♭7; in minor the same intervals
 * read as ♭2, raised 3rd, ♯4, raised 6th, raised 7th.
 */
const HARMONIC_CHROMATIC: readonly Interval[] = [
  interval(1, "P"),
  interval(2, "m"),
  interval(2, "M"),
  interval(3, "m"),
  interval(3, "M"),
  interval(4, "P"),
  interval(4, "A"),
  interval(5, "P"),
  interval(6, "m"),
  interval(6, "M"),
  interval(7, "m"),
  interval(7, "M"),
];

/**
 * The suffix a quality contributes to a Roman numeral. The numeral's *case*
 * (major vs minor) is derived separately from the chord's actual triad, so
 * qualities not listed here still get the right case.
 */
function romanSuffix(quality: ChordQuality | undefined): string {
  switch (quality) {
    case "dim":
      return "°";
    case "aug":
      return "+";
    case "dom7":
    case "min7":
      return "7";
    case "maj7":
    case "minMaj7":
      return "maj7";
    case "dim7":
      return "°7";
    case "min7b5":
      return "ø7";
    case "aug7":
      return "7#5";
    case "maj6":
    case "min6":
      return "6";
    case "dom9":
    case "min9":
      return "9";
    case "maj9":
      return "maj9";
    case "add9":
      return "add9";
    case "sus2":
      return "sus2";
    case "sus4":
      return "sus4";
    default:
      return "";
  }
}

export class Key {
  readonly tonic: Note;
  readonly mode: Mode;
  readonly scale: Scale;

  constructor(tonic: Note | NoteLike | string, mode: Mode = "major") {
    this.tonic = Note.from(tonic);
    this.mode = mode;
    this.scale = Scale.from(this.tonic, mode);
  }

  static major(tonic: Note | NoteLike | string): Key {
    return new Key(tonic, "major");
  }

  static minor(tonic: Note | NoteLike | string): Key {
    return new Key(tonic, "minor");
  }

  /** Build a key from any {@link KeyLike}: an existing key, a string like
   * `"C major"` / `"F#"` (major implied), or a `{tonic, mode}` object. */
  static from(input: KeyLike): Key {
    if (input instanceof Key) return input;
    if (typeof input === "string") return keyFromString(input);
    return new Key(input.tonic, input.mode ?? "major");
  }

  /** The seven diatonic notes, correctly spelled. */
  get notes(): Note[] {
    return this.scale.notes;
  }

  /** The key signature derived from the scale's accidentals. */
  get signature(): KeySignature {
    const accidentals = this.scale.notes
      .filter((n) => n.alteration !== 0)
      .map((n) => ({ letter: n.letter, alteration: n.alteration }));
    const count = accidentals.reduce((sum, a) => sum + a.alteration, 0);
    return { count, accidentals };
  }

  /** The note at a (1-based) scale degree. */
  degree(n: number): Note {
    return this.scale.degree(n);
  }

  /**
   * Respell a note the way this key would write it, preserving the sounding
   * pitch. Diatonic notes take their scale spelling (F# stays F# in G major,
   * never Gb); chromatic notes follow the key's harmonic chromatic scale
   * (in C major, G# respells to Ab; in A minor, the leading tone stays G#).
   */
  respell(note: Note | NoteLike | string): Note {
    const n = Note.from(note);
    const relativePc = mod(n.pitchClass - this.tonic.pitchClass, 12);
    const spelled = transpose(
      this.tonic,
      HARMONIC_CHROMATIC[relativePc] as Interval
    );
    // Same pitch class, so the chroma difference is a whole octave count.
    const octaveShift = (chroma(n) - chroma(spelled)) / 12;
    return Note.of({
      step: spelled.step,
      alteration: spelled.alteration,
      octave: spelled.octave + octaveShift,
    });
  }

  /**
   * The diatonic chord rooted on scale degree `n` (1-based), built by stacking
   * thirds from within the key. Pass `seventh: true` for a four-note seventh
   * chord.
   */
  chord(n: number, options: { seventh?: boolean } = {}): Chord {
    const root = this.scale.degree(n);
    const degrees = options.seventh
      ? [n, n + 2, n + 4, n + 6]
      : [n, n + 2, n + 4];
    const tones = degrees.map((d) => this.scale.degree(d));
    const intervals: Interval[] = tones.map((t) => intervalBetween(root, t));
    const quality = detectQuality(intervals.map((iv) => iv.semitones));
    return new Chord(root, intervals, quality);
  }

  /** The Roman numeral for a chord in this key (e.g. `"ii"`, `"V7"`, `"bVII"`). */
  romanNumeral(input: ChordLike): string {
    const chord = Chord.from(input);
    const root = chord.root;
    const idx = this.scale.notes.findIndex((n) => n.letter === root.letter);
    if (idx === -1) {
      throw new Error(
        `chord root ${root.toString()} has no diatonic letter in ${this.toString()}`
      );
    }
    const scaleAlt = (this.scale.notes[idx] as Note).alteration;
    const diff = root.alteration - scaleAlt;
    const prefix =
      diff > 0 ? "#".repeat(diff) : diff < 0 ? "b".repeat(-diff) : "";

    // Case comes from the chord's actual triad: minor/diminished chords are
    // lowercase, major/augmented uppercase. This works even for qualities
    // (min6, min9, …) or an undefined quality (from an inversion) that a fixed
    // quality→case table would miss.
    const minorish = chord.isMinor() || chord.isDiminished();
    const base = ROMAN[idx] as string;
    const numeral = minorish ? base.toLowerCase() : base;
    return `${prefix}${numeral}${romanSuffix(chord.quality)}`;
  }

  /** The chord denoted by a Roman numeral in this key (e.g. `chordFromRoman("V7")`). */
  chordFromRoman(roman: string): Chord {
    const parsed = parseRoman(roman);
    let root = this.scale.degree(parsed.degree);
    if (parsed.alteration !== 0) {
      root = root.sharpen(parsed.alteration);
    }
    return Chord.of(root, parsed.quality);
  }

  /**
   * Parse a Roman-numeral progression (space/dash/comma separated) into chords,
   * e.g. `progression("I V vi IV")` or `"ii7-V7-Imaj7"`.
   */
  progression(input: string): Chord[] {
    return input
      .split(/[\s,|-]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => this.chordFromRoman(t));
  }

  /** The relative key (same signature, other mode). */
  relative(): Key {
    if (this.mode === "major") {
      return new Key(this.scale.degree(6), "minor");
    }
    return new Key(this.scale.degree(3), "major");
  }

  /** The parallel key (same tonic, other mode). */
  parallel(): Key {
    return new Key(this.tonic, this.mode === "major" ? "minor" : "major");
  }

  /** The same key on a transposed tonic. Accepts a spelled interval, an
   * interval name (`"P4"`), or a semitone count. */
  transpose(iv: IntervalLike): Key {
    return new Key(this.tonic.transpose(asInterval(iv)), this.mode);
  }

  toString(): string {
    return `${this.tonic.toString({ octave: false })} ${this.mode}`;
  }

  /** Plain-data form: tonic notation and mode. Round-trips through
   * {@link Key.fromJSON}. */
  toJSON(): { tonic: string; mode: Mode } {
    return { tonic: this.tonic.toString(), mode: this.mode };
  }

  /** Rebuild a key from its {@link toJSON} form (object or JSON string). */
  static fromJSON(json: string | KeySpec): Key {
    const spec: KeySpec = typeof json === "string" ? JSON.parse(json) : json;
    return new Key(spec.tonic, spec.mode ?? "major");
  }
}

/**
 * Functional shorthand for {@link Key.from}.
 *
 * @example
 * ```ts
 * import { key } from "musictheoryjs";
 * key("Eb").signature.count; // => -3
 * key("f# minor").toString(); // => "F# minor"
 * ```
 */
export function key(input: KeyLike): Key {
  return Key.from(input);
}

/**
 * The diatonic chord on degree `n` of any {@link KeyLike} —
 * see {@link Key.chord}.
 *
 * @example
 * ```ts
 * import { keyChord } from "musictheoryjs";
 * keyChord("C major", 5, { seventh: true }).toString(); // => "G7"
 * ```
 */
export function keyChord(
  k: KeyLike,
  n: number,
  options: { seventh?: boolean } = {}
): Chord {
  return Key.from(k).chord(n, options);
}

/**
 * All seven diatonic chords of a key, in degree order. Pass `seventh: true`
 * for seventh chords.
 *
 * @example
 * ```ts
 * import { diatonicChords } from "musictheoryjs";
 * diatonicChords("C major").map(String); // => ["C","Dm","Em","F","G","Am","Bdim"]
 * diatonicChords("A minor")[4].toString(); // => "Em"
 * ```
 */
export function diatonicChords(
  k: KeyLike,
  options: { seventh?: boolean } = {}
): Chord[] {
  const theKey = Key.from(k);
  return Array.from({ length: theKey.scale.size }, (_, i) =>
    theKey.chord(i + 1, options)
  );
}

/**
 * The key signature of any {@link KeyLike}.
 *
 * @example
 * ```ts
 * import { keySignatureOf } from "musictheoryjs";
 * keySignatureOf("D major").count; // => 2
 * ```
 */
export function keySignatureOf(k: KeyLike): KeySignature {
  return Key.from(k).signature;
}

/**
 * The Roman numeral of a chord in any {@link KeyLike} —
 * see {@link Key.romanNumeral}.
 *
 * @example
 * ```ts
 * import { keyRomanNumeral } from "musictheoryjs";
 * keyRomanNumeral("C major", "G7"); // => "V7"
 * keyRomanNumeral("C major", "Dm"); // => "ii"
 * ```
 */
export function keyRomanNumeral(k: KeyLike, chord: ChordLike): string {
  return Key.from(k).romanNumeral(chord);
}

/**
 * The chord a Roman numeral denotes in any {@link KeyLike}.
 *
 * @example
 * ```ts
 * import { keyChordFromRoman } from "musictheoryjs";
 * keyChordFromRoman("C major", "vi").toString(); // => "Am"
 * ```
 */
export function keyChordFromRoman(k: KeyLike, roman: string): Chord {
  return Key.from(k).chordFromRoman(roman);
}

/**
 * Parse a Roman-numeral progression in any {@link KeyLike} —
 * see {@link Key.progression}.
 *
 * @example
 * ```ts
 * import { keyProgression } from "musictheoryjs";
 * keyProgression("C major", "I V vi IV").map(String); // => ["C","G","Am","F"]
 * ```
 */
export function keyProgression(k: KeyLike, input: string): Chord[] {
  return Key.from(k).progression(input);
}

/**
 * Respell a note (or several) the way a key would write it, preserving the
 * sounding pitch — see {@link Key.respell}. The plain enharmonic simplifier
 * on `Note` only knows "prefer sharps" or "prefer flats"; this uses the key's
 * scale for diatonic notes and its harmonic chromatic scale for the rest.
 *
 * @example
 * ```ts
 * import { respellInKey } from "musictheoryjs";
 * respellInKey("Gb4", "G major").toString(); // => "F#4"
 * respellInKey("G#4", "C major").toString(); // => "Ab4"
 * respellInKey("G#4", "A minor").toString(); // => "G#4"
 * respellInKey("D#4", "c minor").toString(); // => "Eb4"
 * respellInKey("A#3", "F major").toString(); // => "Bb3"
 * ```
 */
export function respellInKey(note: Note | NoteLike | string, k: KeyLike): Note {
  return Key.from(k).respell(note);
}

/**
 * The relative key of any {@link KeyLike}.
 *
 * @example
 * ```ts
 * import { relativeKey } from "musictheoryjs";
 * relativeKey("C major").toString(); // => "A minor"
 * ```
 */
export function relativeKey(k: KeyLike): Key {
  return Key.from(k).relative();
}

/**
 * The parallel key of any {@link KeyLike}.
 *
 * @example
 * ```ts
 * import { parallelKey } from "musictheoryjs";
 * parallelKey("C major").toString(); // => "C minor"
 * ```
 */
export function parallelKey(k: KeyLike): Key {
  return Key.from(k).parallel();
}

/** A Roman numeral broken into its scale degree, accidental, and chord quality. */
export interface ParsedRoman {
  /** 1-based scale degree (I = 1 … VII = 7). */
  degree: number;
  /** Accidental applied to the degree: positive = sharps, negative = flats. */
  alteration: number;
  /** The chord quality implied by the numeral's case and suffix. */
  quality: ChordQuality;
}

/** Parse a Roman numeral into a scale degree, accidental, and chord quality. */
export function parseRoman(roman: string): ParsedRoman {
  const match = /^([#b♯♭]*)([ivxIVX]+)(.*)$/.exec(roman.trim());
  if (!match) {
    throw new SyntaxError(`invalid Roman numeral: "${roman}"`);
  }
  const [, accidentals = "", numeralRaw = "", suffixRaw = ""] = match;

  const alteration = [...accidentals].reduce(
    (sum, ch) => sum + (ch === "#" || ch === "♯" ? 1 : -1),
    0
  );

  const degree = ROMAN.indexOf(
    numeralRaw.toUpperCase() as (typeof ROMAN)[number]
  );
  if (degree === -1) {
    throw new SyntaxError(`invalid Roman numeral: "${roman}"`);
  }
  const upper = numeralRaw === numeralRaw.toUpperCase();
  const suffix = suffixRaw.trim();

  return {
    degree: degree + 1,
    alteration,
    quality: romanQuality(upper, suffix),
  };
}

/** Determine chord quality from a Roman numeral's case and suffix. */
function romanQuality(upper: boolean, suffix: string): ChordQuality {
  if (suffix.includes("°7") || suffix === "o7") return "dim7";
  if (suffix.includes("ø")) return "min7b5";
  if (suffix.startsWith("°") || suffix === "o") return "dim";
  if (
    suffix.includes("maj7") ||
    suffix.includes("M7") ||
    suffix.includes("Δ")
  ) {
    return upper ? "maj7" : "minMaj7";
  }
  if (suffix.includes("+") || suffix.includes("#5")) {
    return suffix.includes("7") ? "aug7" : "aug";
  }
  if (suffix.includes("7")) return upper ? "dom7" : "min7";
  return upper ? "maj" : "min";
}
