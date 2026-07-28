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
import { type Interval, addIntervals, transpose } from "../interval/interval";
import { mod } from "../math/index";
import { Note, type NoteLike } from "../note/note";
import { pitchClass as pitchClassOf } from "../pitch/spelled";
import {
  type Tuning,
  type TuningAnchor,
  degreeCents,
  frequencyOfDegree,
} from "../tuning/tuning";
import { SCALE_TEMPLATES, type ScaleName } from "./templates";

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

  /** Build a scale from a built-in template name, e.g. `Scale.from("D4", "dorian")`. */
  static from(tonic: Note | NoteLike | string, template: ScaleName): Scale {
    return new Scale(tonic, SCALE_TEMPLATES[template], template);
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
