/**
 * `Scale` — a tonic plus an ordered set of intervals, yielding correctly
 * spelled notes.
 *
 * A scale is defined by spelled intervals from its tonic, so `Scale.major("C4")`
 * produces C D E F G A B with the right letters and accidentals. Scale degrees
 * wrap across octaves, so degree 8 is the tonic an octave up.
 *
 * For microtonal/non-Western scales that can't be spelled on the 7-letter staff
 * (neutral thirds, etc.), use {@link scaleFromTuning}, which sources degrees
 * from a {@link Tuning} as cents/frequencies rather than spelled notes.
 */

import { PERFECT_OCTAVE } from "../interval/constants";
import {
  type Interval,
  addIntervals,
  intervalBetween,
  intervalName,
  transpose,
} from "../interval/interval";
import {
  type IntervalLike,
  asInterval,
  intervalFromSemitones,
} from "../interval/parse";
import { mod } from "../math/index";
import { type EnharmonicPreference, Note, type NoteLike } from "../note/note";
import { tryParseNote } from "../pitch/parse";
import { pitchClass as pitchClassOf } from "../pitch/spelled";
import {
  type Tuning,
  type TuningAnchor,
  degreeCents,
  frequencyOfDegree,
} from "../tuning/tuning";
import { SCALE_TEMPLATES, type ScaleName, isScaleName } from "./templates";

/** A scale described as plain data: a tonic plus a template name and/or
 * explicit intervals (spelled or named). */
export interface ScaleSpec {
  readonly tonic: Note | NoteLike | string;
  readonly name?: string;
  readonly intervals?: ReadonlyArray<Interval | string>;
}

/** Anything the ergonomic layer accepts as a scale: a {@link Scale}, a string
 * like `"C4 major"` or `"D dorian"`, or a {@link ScaleSpec} object. */
export type ScaleLike = Scale | string | ScaleSpec;

function scaleFromString(input: string): Scale {
  const parts = input.trim().split(/\s+/);
  const [tonicRaw = "", ...nameParts] = parts;
  const name = nameParts.join(" ");
  const tonic = tryParseNote(tonicRaw);
  if (!tonic || !isScaleName(name)) {
    throw new SyntaxError(
      `invalid scale: "${input}" (expected "<tonic> <template>", e.g. "C4 major")`
    );
  }
  return new Scale(Note.of(tonic), SCALE_TEMPLATES[name], name);
}

function scaleFromSpec(spec: ScaleSpec): Scale {
  if (spec.intervals !== undefined) {
    return new Scale(spec.tonic, spec.intervals.map(asInterval), spec.name);
  }
  if (spec.name !== undefined && isScaleName(spec.name)) {
    return new Scale(spec.tonic, SCALE_TEMPLATES[spec.name], spec.name);
  }
  throw new RangeError(
    `scale spec needs intervals or a known template name, got "${spec.name}"`
  );
}

export class Scale {
  readonly tonic: Note;
  readonly intervals: readonly Interval[];
  readonly name: string | undefined;

  constructor(
    tonic: Note | NoteLike | string,
    intervals: readonly Interval[],
    name?: string
  ) {
    this.tonic = Note.from(tonic);
    this.intervals = intervals;
    this.name = name;
  }

  /**
   * Build a scale from a tonic and template name (`Scale.from("D4", "dorian")`),
   * or from any {@link ScaleLike}: an existing scale, a string like
   * `"C4 major"`, or a `{tonic, name}` / `{tonic, intervals}` object.
   */
  static from(input: ScaleLike): Scale;
  static from(tonic: Note | NoteLike | string, template: ScaleName): Scale;
  static from(a: ScaleLike | Note | NoteLike, template?: ScaleName): Scale {
    if (template !== undefined) {
      return new Scale(
        a as Note | NoteLike | string,
        SCALE_TEMPLATES[template],
        template
      );
    }
    if (a instanceof Scale) return a;
    if (typeof a === "string") return scaleFromString(a);
    if ("tonic" in a) return scaleFromSpec(a as ScaleSpec);
    throw new RangeError(
      "Scale.from needs a template name when given a bare tonic"
    );
  }

  /**
   * Build a scale from a tonic and semitone offsets, e.g.
   * `Scale.fromSemitones("C4", [0, 2, 4, 5, 7, 9, 11])`. Each offset is
   * spelled conventionally (see `intervalFromSemitones`); pass
   * `prefer: "flat"` to read 6 semitones as a d5 instead of an A4.
   */
  static fromSemitones(
    tonic: Note | NoteLike | string,
    semitones: readonly number[],
    options: { name?: string; prefer?: EnharmonicPreference } = {}
  ): Scale {
    const intervals = semitones.map((s) =>
      intervalFromSemitones(s, options.prefer)
    );
    return new Scale(tonic, intervals, options.name);
  }

  /** The scale's notes within the tonic's octave, correctly spelled. */
  get notes(): Note[] {
    return this.intervals.map((iv) => Note.of(transpose(this.tonic, iv)));
  }

  /** Number of notes per octave. */
  get size(): number {
    return this.intervals.length;
  }

  /**
   * The note at scale degree `n` (1-based). Degrees beyond the scale size wrap
   * to higher octaves, and degrees below 1 wrap lower — degree 8 is the tonic
   * one octave up.
   */
  degree(n: number): Note {
    const index = mod(n - 1, this.size);
    const octaveShift = Math.floor((n - 1) / this.size);
    const base = Note.of(
      transpose(this.tonic, this.intervals[index] as Interval)
    );
    return octaveShift === 0
      ? base
      : base.withOctave(base.octave + octaveShift);
  }

  /** Note names within the tonic's octave, e.g. `["C4","D4",...]`. */
  noteNames(): string[] {
    return this.notes.map((n) => n.toString());
  }

  /** True if `note`'s pitch class belongs to the scale (octave-agnostic). */
  contains(note: Note | NoteLike | string): boolean {
    const pc = pitchClassOf(Note.from(note));
    return this.notes.some((n) => n.pitchClass === pc);
  }

  /** The 1-based degree whose pitch class matches `note`, or `null` when the
   * note is not in the scale (octave-agnostic). */
  degreeOf(note: Note | NoteLike | string): number | null {
    const pc = pitchClassOf(Note.from(note));
    const index = this.notes.findIndex((n) => n.pitchClass === pc);
    return index === -1 ? null : index + 1;
  }

  /**
   * Move a note `steps` scale degrees up (or down, when negative), staying in
   * the scale and keeping the note's own octave register — in C major,
   * `step("E5", 2)` is G5 and `step("C4", -1)` is B3.
   * @throws {RangeError} when `note` is not in the scale.
   */
  step(note: Note | NoteLike | string, steps: number): Note {
    const start = Note.from(note);
    const degree = this.degreeOf(start);
    if (degree === null) {
      throw new RangeError(
        `${start.toString()} is not in ${this.name ?? "this scale"}; cannot step diatonically`
      );
    }
    // Measure the move at the scale's own register, then replay it from the
    // input note so its octave (and spelling) carry through.
    const motion = intervalBetween(
      this.degree(degree),
      this.degree(degree + steps)
    );
    return start.transpose(motion);
  }

  /** The same scale on a transposed tonic. Accepts a spelled interval, an
   * interval name (`"P4"`), or a semitone count. */
  transpose(iv: IntervalLike): Scale {
    return new Scale(
      this.tonic.transpose(asInterval(iv)),
      this.intervals,
      this.name
    );
  }

  /** Plain-data form: tonic notation, interval names, and the template name
   * when there is one. Round-trips through {@link Scale.fromJSON}. */
  toJSON(): { tonic: string; intervals: string[]; name?: string } {
    const data: { tonic: string; intervals: string[]; name?: string } = {
      tonic: this.tonic.toString(),
      intervals: this.intervals.map((iv) => intervalName(iv)),
    };
    if (this.name !== undefined) data.name = this.name;
    return data;
  }

  /** Rebuild a scale from its {@link toJSON} form (object or JSON string). */
  static fromJSON(json: string | ScaleSpec): Scale {
    const spec: ScaleSpec = typeof json === "string" ? JSON.parse(json) : json;
    return scaleFromSpec(spec);
  }
}

/**
 * Functional shorthand for {@link Scale.from}.
 *
 * @example
 * ```ts
 * import { scale } from "musictheoryjs";
 * scale("D4", "dorian").noteNames(); // => ["D4","E4","F4","G4","A4","B4","C5"]
 * scale("C4 major").name; // => "major"
 * ```
 */
export function scale(input: ScaleLike): Scale;
export function scale(
  tonic: Note | NoteLike | string,
  template: ScaleName
): Scale;
export function scale(
  a: ScaleLike | Note | NoteLike,
  template?: ScaleName
): Scale {
  return template === undefined
    ? Scale.from(a as ScaleLike)
    : Scale.from(a as Note | NoteLike | string, template);
}

/**
 * The notes of any {@link ScaleLike} within its tonic's octave.
 *
 * @example
 * ```ts
 * import { scaleNotes } from "musictheoryjs";
 * scaleNotes("A4 minor").map(String); // => ["A4","B4","C5","D5","E5","F5","G5"]
 * ```
 */
export function scaleNotes(s: ScaleLike): Note[] {
  return Scale.from(s).notes;
}

/**
 * The note names of any {@link ScaleLike}.
 *
 * @example
 * ```ts
 * import { scaleNoteNames } from "musictheoryjs";
 * scaleNoteNames({ tonic: "E4", name: "phrygian" }); // => ["E4","F4","G4","A4","B4","C5","D5"]
 * ```
 */
export function scaleNoteNames(s: ScaleLike): string[] {
  return Scale.from(s).noteNames();
}

/**
 * The note at a (1-based, octave-wrapping) degree of any {@link ScaleLike}.
 *
 * @example
 * ```ts
 * import { scaleDegree } from "musictheoryjs";
 * scaleDegree("C4 major", 5).toString(); // => "G4"
 * scaleDegree("C4 major", 8).toString(); // => "C5"
 * ```
 */
export function scaleDegree(s: ScaleLike, n: number): Note {
  return Scale.from(s).degree(n);
}

/**
 * True if the note's pitch class belongs to the scale.
 *
 * @example
 * ```ts
 * import { scaleContains } from "musictheoryjs";
 * scaleContains("C4 major", "F#4"); // => false
 * scaleContains("G4 major", "F#2"); // => true
 * ```
 */
export function scaleContains(
  s: ScaleLike,
  note: Note | NoteLike | string
): boolean {
  return Scale.from(s).contains(note);
}

/**
 * Diatonic step motion within any {@link ScaleLike} — see {@link Scale.step}.
 *
 * @example
 * ```ts
 * import { scaleStep } from "musictheoryjs";
 * scaleStep("C4 major", "E5", 2).toString(); // => "G5"
 * scaleStep("C4 major", "C4", -1).toString(); // => "B3"
 * ```
 */
export function scaleStep(
  s: ScaleLike,
  note: Note | NoteLike | string,
  steps: number
): Note {
  return Scale.from(s).step(note, steps);
}

/**
 * A scale degree sourced from a {@link Tuning}, for microtonal/non-Western
 * scales. Rather than a spelled note, each degree is an exact pitch given as
 * cents above the tonic and (optionally anchored) frequency in Hz.
 */
export interface TunedDegree {
  /** 0-based degree index. */
  readonly degree: number;
  /** Cents above the tonic. */
  readonly cents: number;
  /** Frequency in Hz under the supplied anchor. */
  readonly frequency: number;
}

/**
 * Realise one period of a tuning as a scale of exact pitches. This is the path
 * for maqam, gamelan, EDO, and other scales whose degrees don't map onto the
 * 7-letter staff.
 *
 * @param tuning - The tuning defining the scale's degrees.
 * @param anchor - Anchors the tonic (degree 0) to a frequency (default 440 Hz).
 * @param includePeriod - If true, append the period (e.g. the octave) as a
 *   closing degree. Default false.
 */
export function scaleFromTuning(
  tuning: Tuning,
  anchor: TuningAnchor = {},
  includePeriod = false
): TunedDegree[] {
  const count = includePeriod ? tuning.size + 1 : tuning.size;
  const degrees: TunedDegree[] = [];
  for (let degree = 0; degree < count; degree++) {
    degrees.push({
      degree,
      cents: degreeCents(tuning, degree),
      frequency: frequencyOfDegree(tuning, degree, anchor),
    });
  }
  return degrees;
}

/** Transpose an interval up one octave (used for octave-spanning helpers). */
export function raiseOctave(iv: Interval): Interval {
  return addIntervals(iv, PERFECT_OCTAVE);
}
