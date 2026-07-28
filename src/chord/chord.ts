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
  intervalNumber,
  transpose,
} from "../interval/interval";
import { Note, type NoteLike } from "../note/note";
import { parseChordSymbol } from "./parse";
import { CHORD_TEMPLATES, type ChordQuality } from "./templates";

/** Display suffix for each canonical chord quality. */
const QUALITY_SUFFIX: Readonly<Record<ChordQuality, string>> = {
  maj: "",
  min: "m",
  dim: "dim",
  aug: "aug",
  sus2: "sus2",
  sus4: "sus4",
  maj6: "6",
  min6: "m6",
  dom7: "7",
  maj7: "maj7",
  min7: "m7",
  minMaj7: "mMaj7",
  dim7: "dim7",
  min7b5: "m7b5",
  aug7: "aug7",
  dom9: "9",
  maj9: "maj9",
  min9: "m9",
  add9: "add9",
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

  /** Parse a chord symbol such as `"Cmaj7"`, `"F#m"`, `"Bb7"` (root octave defaults to 4). */
  static from(symbol: string): Chord {
    const { root, quality } = parseChordSymbol(symbol);
    return new Chord(Note.of(root), CHORD_TEMPLATES[quality], quality);
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
}

/** Functional shorthand: parse a chord symbol into a {@link Chord}. */
export function chord(symbol: string): Chord {
  return Chord.from(symbol);
}
