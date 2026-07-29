/**
 * `Note` — the ergonomic, immutable Western note.
 *
 * `Note` is a thin, fluent wrapper over the pure {@link SpelledPitch} core. It
 * exists for convenience (method chaining, `toString`, comparisons); all the
 * actual pitch logic lives in the `pitch` and `interval` modules, so the
 * numeric core stays testable and tree-shakable on its own.
 *
 * Instances are frozen. Every operation returns a new `Note` — nothing mutates,
 * and no derived value (midi, frequency, name) is cached on the object; those
 * are computed on demand by the underlying pure functions.
 */

import {
  type Interval,
  intervalBetween,
  intervalFifths,
  transpose,
} from "../interval/interval";
import { type IntervalLike, asInterval } from "../interval/parse";
import { mod } from "../math/index";
import { type FormatOptions, formatNote } from "../pitch/format";
import { parseNote } from "../pitch/parse";
import {
  type PitchPoint,
  type PitchReference,
  point,
  fromFrequency as pointFromFrequency,
  toFrequency as pointToFrequency,
} from "../pitch/point";
import {
  type Letter,
  STEP_SEMITONES,
  type SpelledPitch,
  type Step,
  chroma,
  letterOf,
  midi as midiOf,
  pitchClass as pitchClassOf,
  isEnharmonic as pitchesEnharmonic,
  spelledEquals,
} from "../pitch/spelled";

/** How a note can be described when constructing one without a string. */
export interface NoteLike {
  readonly step: Step;
  readonly alteration?: number;
  readonly octave?: number;
}

/** Preferred accidental direction when respelling enharmonically. */
export type EnharmonicPreference = "sharp" | "flat";

// Pitch-class -> (step, alteration) for the two default spellings.
const SHARP_SPELLING: ReadonlyArray<readonly [Step, number]> = [
  [0, 0], // C
  [0, 1], // C#
  [1, 0], // D
  [1, 1], // D#
  [2, 0], // E
  [3, 0], // F
  [3, 1], // F#
  [4, 0], // G
  [4, 1], // G#
  [5, 0], // A
  [5, 1], // A#
  [6, 0], // B
];

const FLAT_SPELLING: ReadonlyArray<readonly [Step, number]> = [
  [0, 0], // C
  [1, -1], // Db
  [1, 0], // D
  [2, -1], // Eb
  [2, 0], // E
  [3, 0], // F
  [4, -1], // Gb
  [4, 0], // G
  [5, -1], // Ab
  [5, 0], // A
  [6, -1], // Bb
  [6, 0], // B
];

/**
 * Spell an absolute chromatic position (semitones above C0) as a note, using
 * the sharp or flat default for the black keys. Shared by `fromMidi` and
 * `enharmonic`.
 */
function spellChroma(
  chromaValue: number,
  prefer: EnharmonicPreference
): NoteLike {
  const pc = mod(chromaValue, 12);
  const table = prefer === "flat" ? FLAT_SPELLING : SHARP_SPELLING;
  const [step, alteration] = table[pc] as readonly [Step, number];
  const octave =
    (chromaValue - (STEP_SEMITONES[step] as number) - alteration) / 12;
  return { step, alteration, octave };
}

export class Note implements SpelledPitch {
  readonly step: Step;
  readonly alteration: number;
  readonly octave: number;

  constructor(input: string | NoteLike) {
    const pitch =
      typeof input === "string"
        ? parseNote(input)
        : {
            step: input.step,
            alteration: input.alteration ?? 0,
            octave: input.octave ?? 4,
          };
    this.step = pitch.step;
    this.alteration = pitch.alteration;
    this.octave = pitch.octave;
    Object.freeze(this);
  }

  /** Construct a note from a string (`"C#4"`) or parts. Alias for `new Note`. */
  static from(input: string | NoteLike): Note {
    return input instanceof Note ? input : new Note(input);
  }

  /** Wrap an existing {@link SpelledPitch} as a `Note`. */
  static of(pitch: SpelledPitch): Note {
    return new Note(pitch);
  }

  /**
   * The note for a MIDI number (middle C = 60), spelled with sharps by default.
   * Non-integer input is rounded to the nearest semitone.
   */
  static fromMidi(midi: number, prefer: EnharmonicPreference = "sharp"): Note {
    return new Note(spellChroma(Math.round(midi) - 12, prefer));
  }

  /**
   * The nearest 12-TET note to a frequency in Hz (A4 = 440 by default). Useful
   * for turning a detected pitch into a note; the input is snapped to the
   * closest equal-tempered semitone.
   */
  static fromFrequency(
    frequency: number,
    options: { reference?: PitchReference; prefer?: EnharmonicPreference } = {}
  ): Note {
    const p = pointFromFrequency(frequency, options.reference);
    const midi = Math.round(p.cents / 100) + 12;
    return Note.fromMidi(midi, options.prefer);
  }

  /** The letter name (A–G). */
  get letter(): Letter {
    return letterOf(this);
  }

  /** Pitch class (0–11, C = 0). */
  get pitchClass(): number {
    return pitchClassOf(this);
  }

  /** MIDI note number (middle C = 60). */
  get midi(): number {
    return midiOf(this);
  }

  /** Absolute chromatic position in semitones above C0 (keeps spelling). */
  get chroma(): number {
    return chroma(this);
  }

  /** This note as a tuning-agnostic {@link PitchPoint} under 12-TET. */
  toPitchPoint(): PitchPoint {
    return point(chroma(this) * 100);
  }

  /** Frequency in Hz under 12-TET with A4 = 440. For other tunings or
   * references use `frequencyOfNote` from the tuning module. */
  get frequency(): number {
    return pointToFrequency(this.toPitchPoint());
  }

  /**
   * Transpose by an interval, keeping correct spelling. Accepts a spelled
   * {@link Interval}, an interval name (`"P5"`, `"-m3"`), or a bare semitone
   * count (`3` → up a minor third).
   */
  transpose(iv: IntervalLike): Note {
    return Note.of(transpose(this, asInterval(iv)));
  }

  /** Raise by `n` semitones of alteration (default 1), keeping the letter. */
  sharpen(n = 1): Note {
    return new Note({
      step: this.step,
      alteration: this.alteration + n,
      octave: this.octave,
    });
  }

  /** Lower by `n` semitones of alteration (default 1), keeping the letter. */
  flatten(n = 1): Note {
    return this.sharpen(-n);
  }

  /** The same note in a different octave. */
  withOctave(octave: number): Note {
    return new Note({ step: this.step, alteration: this.alteration, octave });
  }

  /**
   * Respell to the simplest enharmonic equivalent using sharps or flats.
   * E.g. `Note("E#4").enharmonic()` → `F4`; `Note("Db4").enharmonic("sharp")`
   * → `C#4`. The sounding pitch is preserved.
   */
  enharmonic(prefer: EnharmonicPreference = "sharp"): Note {
    return new Note(spellChroma(chroma(this), prefer));
  }

  /** The spelled interval from this note up to `other`. */
  intervalTo(other: NoteLike | string): Interval {
    return intervalBetween(this, Note.from(other));
  }

  /** True when `other` has identical spelling (letter, alteration, octave). */
  equals(other: NoteLike | string): boolean {
    return spelledEquals(this, Note.from(other));
  }

  /** True when `other` sounds the same in 12-TET, regardless of spelling. */
  isEnharmonic(other: NoteLike | string): boolean {
    return pitchesEnharmonic(this, Note.from(other));
  }

  /** Ordering by sounding pitch: negative if this is lower than `other`. */
  compareTo(other: NoteLike | string): number {
    return chroma(this) - chroma(Note.from(other));
  }

  /** Render as scientific pitch notation, e.g. `"C#4"`. */
  toString(options?: FormatOptions): string {
    return formatNote(this, options);
  }

  /** JSON form is the note's string notation. */
  toJSON(): string {
    return this.toString();
  }

  /** Rebuild a note from its {@link toJSON} form: the notation string
   * itself, or the JSON text of one (`'"C#4"'`). */
  static fromJSON(json: string): Note {
    return Note.from(json.startsWith('"') ? JSON.parse(json) : json);
  }
}

/** Functional shorthand for `Note.from`. */
export function note(input: string | NoteLike): Note {
  return Note.from(input);
}

/**
 * Transpose every note in a list by the same interval (spelled interval,
 * interval name, or semitone count), preserving order.
 *
 * @example
 * ```ts
 * import { transposeNotes } from "musictheoryjs";
 * transposeNotes(["C4", "E4", "G4"], "M2").map(String); // => ["D4","F#4","A4"]
 * transposeNotes(["C4", "E4"], -12).map(String); // => ["C3","E3"]
 * ```
 */
export function transposeNotes(
  notes: ReadonlyArray<Note | NoteLike | string>,
  iv: IntervalLike
): Note[] {
  const interval = asInterval(iv);
  return notes.map((n) => Note.from(n).transpose(interval));
}

/**
 * Move a note `count` positions around the circle of fifths, keeping the
 * spelling that the circle implies: sharpwards for positive counts, flatwards
 * for negative. This is how key signatures move, so it stays in the spelled
 * world rather than collapsing to pitch classes — six fifths up from C is F#,
 * six down is Gb.
 *
 * The fifths stack literally, so the register climbs with them: two fifths
 * above C4 is D5, not D4.
 *
 * @example
 * ```ts
 * import { transposeFifths } from "musictheoryjs";
 * transposeFifths("C4", 1).toString(); // => "G4"
 * transposeFifths("C4", 2).toString(); // => "D5"
 * transposeFifths("C4", -1).toString(); // => "F3"
 * transposeFifths("C4", 6).toString({ octave: false }); // => "F#"
 * transposeFifths("C4", -6).toString({ octave: false }); // => "Gb"
 * ```
 */
export function transposeFifths(
  input: Note | NoteLike | string,
  count: number
): Note {
  // Spelling falls out of the diatonic step count: six fifths up spans 24
  // letters and lands on F#, six down lands on Gb.
  return Note.from(input).transpose(intervalFifths(count));
}

/**
 * Sort notes by sounding pitch, low to high. Accepts names or note objects and
 * returns {@link Note} instances; the input array is left untouched.
 *
 * @example
 * ```ts
 * import { sortNotes } from "musictheoryjs";
 * sortNotes(["G4", "C4", "E4"]).map(String); // => ["C4","E4","G4"]
 * sortNotes(["C5", "C4"]).map(String); // => ["C4","C5"]
 * ```
 */
export function sortNotes(
  notes: ReadonlyArray<Note | NoteLike | string>,
  descending = false
): Note[] {
  const sorted = notes
    .map((n) => Note.from(n))
    .sort((a, b) => chroma(a) - chroma(b));
  return descending ? sorted.reverse() : sorted;
}

/**
 * Sort notes by sounding pitch and drop duplicates. Notes that merely *sound*
 * alike are kept apart — C#4 and Db4 are different spellings and both survive;
 * only identical spellings collapse.
 *
 * @example
 * ```ts
 * import { sortNotesUnique } from "musictheoryjs";
 * sortNotesUnique(["G4", "C4", "G4"]).map(String); // => ["C4","G4"]
 * sortNotesUnique(["C#4", "Db4"]).length; // => 2
 * ```
 */
export function sortNotesUnique(
  notes: ReadonlyArray<Note | NoteLike | string>,
  descending = false
): Note[] {
  const seen = new Set<string>();
  const unique: Note[] = [];
  for (const n of sortNotes(notes)) {
    const key = n.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(n);
  }
  return descending ? unique.reverse() : unique;
}
