/**
 * `Key` — a tonic and a mode (major or natural minor), with the harmony that
 * follows from it: a key signature, diatonic chords, and Roman-numeral analysis.
 *
 * Because keys are built on the correctly-spelled {@link Scale}, everything
 * downstream spells correctly too — G major's signature is one sharp (F#), and
 * the ii chord in C major is `Dm`, not `Ebbm`.
 */

import { detectQuality } from "../chord/analysis";
import { Chord } from "../chord/chord";
import type { ChordQuality } from "../chord/templates";
import { type Interval, intervalBetween } from "../interval/interval";
import { Note, type NoteLike } from "../note/note";
import { Scale } from "../scale/scale";

export type Mode = "major" | "minor";

/** The accidentals that make up a key signature. */
export interface KeySignature {
  /** Net accidental count: positive = sharps, negative = flats, 0 = none. */
  readonly count: number;
  /** The altered notes, in scale order. */
  readonly accidentals: ReadonlyArray<{ letter: string; alteration: number }>;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

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
  romanNumeral(chord: Chord): string {
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

  toString(): string {
    return `${this.tonic.toString({ octave: false })} ${this.mode}`;
  }
}

interface ParsedRoman {
  degree: number;
  alteration: number;
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
