/**
 * `Chord` — a root plus a set of spelled intervals, yielding correctly spelled
 * chord tones.
 *
 * Chords can be built from a symbol (`Chord.from("Cmaj7")`), from a root and a
 * quality (`Chord.of("C4", "min7")`), or from arbitrary intervals. Instances
 * are immutable; inversions and quality changes return new chords.
 */

import { PERFECT_OCTAVE } from "../interval/constants";
import {
  type Interval,
  addIntervals,
  intervalName,
  intervalNumber,
  transpose,
} from "../interval/interval";
import {
  type IntervalLike,
  asInterval,
  intervalFromSemitones,
} from "../interval/parse";
import { type EnharmonicPreference, Note, type NoteLike } from "../note/note";
import { detectQuality } from "./analysis";
import { normalizeChordQuality, parseChordSymbol } from "./parse";
import { CHORD_TEMPLATES, type ChordQuality } from "./templates";

/** A chord described as plain data: a root plus a canonical quality and/or
 * explicit intervals (spelled or named). */
export interface ChordSpec {
  readonly root: Note | NoteLike | string;
  readonly quality?: string;
  readonly intervals?: ReadonlyArray<Interval | string>;
}

/** Anything the ergonomic layer accepts as a chord: a {@link Chord}, a symbol
 * string like `"Cmaj7"`, or a {@link ChordSpec} object. */
export type ChordLike = Chord | string | ChordSpec;

function chordFromSpec(spec: ChordSpec): Chord {
  // Accept canonical names and symbol-suffix aliases ("min7" and "m7") alike.
  const quality =
    spec.quality !== undefined
      ? (normalizeChordQuality(spec.quality) ?? undefined)
      : undefined;
  if (spec.intervals !== undefined) {
    return new Chord(spec.root, spec.intervals.map(asInterval), quality);
  }
  if (quality !== undefined) {
    return new Chord(spec.root, CHORD_TEMPLATES[quality], quality);
  }
  throw new RangeError(
    `chord spec needs intervals or a known quality, got "${spec.quality}"`
  );
}

/** Display suffix for each canonical chord quality. */
const QUALITY_SUFFIX: Readonly<Record<ChordQuality, string>> = {
  maj: "",
  min: "m",
  dim: "dim",
  aug: "aug",
  sus2: "sus2",
  sus4: "sus4",
  power: "5",
  maj6: "6",
  min6: "m6",
  maj69: "6/9",
  min69: "m6/9",
  dom7: "7",
  maj7: "maj7",
  min7: "m7",
  minMaj7: "mMaj7",
  dim7: "dim7",
  min7b5: "m7b5",
  aug7: "aug7",
  dom7b5: "7b5",
  dom7b9: "7b9",
  dom7s9: "7#9",
  dom7s11: "7#11",
  dom9: "9",
  maj9: "maj9",
  min9: "m9",
  add9: "add9",
  dom11: "11",
  maj11: "maj11",
  min11: "m11",
  dom13: "13",
  maj13: "maj13",
  min13: "m13",
};

function sameIntervals(
  a: readonly Interval[],
  b: readonly Interval[]
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (iv, i) =>
        iv.steps === (b[i] as Interval).steps &&
        iv.semitones === (b[i] as Interval).semitones
    )
  );
}

export class Chord {
  readonly root: Note;
  readonly intervals: readonly Interval[];
  /** Canonical quality when the chord was built from one; `undefined` for inversions/custom voicings. */
  readonly quality: ChordQuality | undefined;

  constructor(
    root: Note | NoteLike | string,
    intervals: readonly Interval[],
    quality?: ChordQuality
  ) {
    this.root = Note.from(root);
    this.intervals = intervals;
    this.quality = quality;
  }

  /** Build a chord from a root and a canonical quality, e.g. `Chord.of("C4", "min7")`. */
  static of(root: Note | NoteLike | string, quality: ChordQuality): Chord {
    return new Chord(root, CHORD_TEMPLATES[quality], quality);
  }

  /**
   * Build a chord from any {@link ChordLike}: a symbol such as `"Cmaj7"`,
   * `"F#m"`, `"Bb7"` (root octave defaults to 4), an existing chord, or a
   * `{root, quality}` / `{root, intervals}` object.
   */
  static from(input: ChordLike): Chord {
    if (input instanceof Chord) return input;
    if (typeof input === "string") {
      const { root, quality } = parseChordSymbol(input);
      return new Chord(Note.of(root), CHORD_TEMPLATES[quality], quality);
    }
    return chordFromSpec(input);
  }

  /**
   * Build a chord from a root and semitone offsets, e.g.
   * `Chord.fromSemitones("C4", [0, 4, 7])`. When the offsets match a known
   * quality the chord takes that quality's canonical spelled intervals (so
   * `[0, 3, 6, 9]` really is a dim7 with a diminished seventh, not a sixth);
   * otherwise each offset is spelled conventionally.
   */
  static fromSemitones(
    root: Note | NoteLike | string,
    semitones: readonly number[],
    options: { prefer?: EnharmonicPreference } = {}
  ): Chord {
    // Only adopt a detected quality when it accounts for every offset —
    // [0,4,7,12] must stay four tones, not collapse to a triad.
    const quality = detectQuality(semitones);
    if (
      quality !== undefined &&
      CHORD_TEMPLATES[quality].length === semitones.length
    ) {
      return Chord.of(root, quality);
    }
    const intervals = semitones.map((s) =>
      intervalFromSemitones(s, options.prefer)
    );
    return new Chord(root, intervals);
  }

  /** The chord tones, correctly spelled. */
  get notes(): Note[] {
    return this.intervals.map((iv) => Note.of(transpose(this.root, iv)));
  }

  /** Note names of the chord tones. */
  noteNames(): string[] {
    return this.notes.map((n) => n.toString());
  }

  /** Number of chord tones. */
  get size(): number {
    return this.intervals.length;
  }

  private nth(number: number): Interval | undefined {
    return this.intervals.find((iv) => intervalNumber(iv) === number);
  }

  /** True if the chord has a major third. */
  isMajor(): boolean {
    const third = this.nth(3);
    return third?.semitones === 4;
  }

  /** True if the chord has a minor third. */
  isMinor(): boolean {
    const third = this.nth(3);
    return third?.semitones === 3;
  }

  /** True if the chord has a minor third and diminished fifth. */
  isDiminished(): boolean {
    return this.nth(3)?.semitones === 3 && this.nth(5)?.semitones === 6;
  }

  /** True if the chord has a major third and augmented fifth. */
  isAugmented(): boolean {
    return this.nth(3)?.semitones === 4 && this.nth(5)?.semitones === 8;
  }

  /**
   * Invert the chord: move the lowest tone up an octave to the top. Returns a
   * new chord; the canonical quality is cleared since the voicing has changed.
   */
  invert(): Chord {
    if (this.intervals.length < 2) return this;
    const [first, ...rest] = this.intervals;
    const raised = addIntervals(first as Interval, PERFECT_OCTAVE);
    return new Chord(this.root, [...rest, raised]);
  }

  /** True if `other` has the same root spelling and the same intervals. */
  equals(other: Chord): boolean {
    return (
      this.root.equals(other.root) &&
      sameIntervals(this.intervals, other.intervals)
    );
  }

  /** The same chord on a transposed root. Accepts a spelled interval, an
   * interval name (`"P4"`), or a semitone count. */
  transpose(iv: IntervalLike): Chord {
    return new Chord(
      this.root.transpose(asInterval(iv)),
      this.intervals,
      this.quality
    );
  }

  /**
   * A chord symbol when the voicing matches a known quality
   * (`"Cmaj7"`), otherwise the comma-joined chord-tone names.
   */
  toString(): string {
    if (this.quality !== undefined) {
      return `${this.root.toString({ octave: false })}${QUALITY_SUFFIX[this.quality]}`;
    }
    return this.noteNames().join(",");
  }

  /** Plain-data form: root notation, interval names, and the canonical
   * quality when there is one. Round-trips through {@link Chord.fromJSON}. */
  toJSON(): { root: string; intervals: string[]; quality?: ChordQuality } {
    const data: { root: string; intervals: string[]; quality?: ChordQuality } =
      {
        root: this.root.toString(),
        intervals: this.intervals.map((iv) => intervalName(iv)),
      };
    if (this.quality !== undefined) data.quality = this.quality;
    return data;
  }

  /** Rebuild a chord from its {@link toJSON} form (object or JSON string). */
  static fromJSON(json: string | ChordSpec): Chord {
    const spec: ChordSpec = typeof json === "string" ? JSON.parse(json) : json;
    return chordFromSpec(spec);
  }
}

/**
 * Functional shorthand for {@link Chord.from}.
 *
 * @example
 * ```ts
 * import { chord } from "musictheoryjs";
 * chord("F#m7").noteNames(); // => ["F#4","A4","C#5","E5"]
 * chord({ root: "C4", quality: "min" }).toString(); // => "Cm"
 * ```
 */
export function chord(input: ChordLike): Chord {
  return Chord.from(input);
}

/**
 * The tones of any {@link ChordLike}, correctly spelled.
 *
 * @example
 * ```ts
 * import { chordNotes } from "musictheoryjs";
 * chordNotes("Bb7").map(String); // => ["Bb4","D5","F5","Ab5"]
 * ```
 */
export function chordNotes(c: ChordLike): Note[] {
  return Chord.from(c).notes;
}

/**
 * The tone names of any {@link ChordLike}.
 *
 * @example
 * ```ts
 * import { chordNoteNames } from "musictheoryjs";
 * chordNoteNames({ root: "G4", quality: "dom7" }); // => ["G4","B4","D5","F5"]
 * ```
 */
export function chordNoteNames(c: ChordLike): string[] {
  return Chord.from(c).noteNames();
}

/**
 * Invert any {@link ChordLike} `times` times (default 1).
 *
 * @example
 * ```ts
 * import { invertChord } from "musictheoryjs";
 * invertChord("C").noteNames(); // => ["E4","G4","C5"]
 * invertChord("C", 2).noteNames(); // => ["G4","C5","E5"]
 * ```
 */
export function invertChord(c: ChordLike, times = 1): Chord {
  let result = Chord.from(c);
  for (let i = 0; i < times; i++) result = result.invert();
  return result;
}
