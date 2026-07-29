/**
 * Chord-scale matching: which scales, built on the chord's root, contain
 * the chord — ranked with avoid-note awareness. An avoid note is a scale
 * tone a half step above a chord tone (the classic ♭9 rule); ranking
 * prefers avoid-free scales, then seven-note scales, so `chordScales("Dm7")`
 * leads with dorian and `chordScales("Cmaj7")` with lydian.
 */

import { Chord, type ChordLike } from "../chord/chord";
import { mod } from "../math/index";
import type { Note } from "../note/note";
import { pcsetHas, pcsetIsSubset, pcsetMask } from "../pitch/pcset";
import { pitchClass } from "../pitch/spelled";
import { Scale } from "./scale";
import { SCALE_DEFINITIONS, type ScaleDefinition } from "./templates";

/** One ranked chord-scale fit. */
export interface ChordScaleMatch {
  /** The matching scale, rooted on the chord's root (canonical name). */
  readonly scale: Scale;
  /** Scale tones a half step above a chord tone, correctly spelled. */
  readonly avoidNotes: readonly Note[];
  /** 1 minus avoid-note and size penalties; higher is a better fit. */
  readonly score: number;
}

/** Options for {@link chordScales}. */
export interface ChordScalesOptions {
  /** Maximum matches returned (default 5). */
  readonly maxResults?: number;
}

/** Each canonical scale with its root-relative pitch-class mask. */
const TEMPLATE_MASKS: ReadonlyArray<{
  readonly def: ScaleDefinition;
  readonly mask: number;
}> = SCALE_DEFINITIONS.map((def) => ({
  def,
  mask: pcsetMask(def.intervals.map((iv) => iv.semitones)),
}));

/**
 * Rank the scales that contain a chord, rooted on its root. Containment is
 * a subset test on 12-bit masks; ranking is avoid-note-aware, so dorian
 * (avoid-free) beats aeolian for `Dm7`, lydian beats major (which carries
 * the F avoid note) for `Cmaj7`, and `Bm7b5` leads with locrian ♮2.
 *
 * @example
 * ```ts
 * import { chordScales } from "musictheoryjs";
 * chordScales("Dm7")[0]?.scale.name; // => "dorian"
 * chordScales("Cmaj7")[0]?.scale.name; // => "lydian"
 * chordScales("Bm7b5")[0]?.scale.name; // => "halfDiminished"
 * chordScales("Calt7")[0]?.scale.name; // => "altered"
 * const major = chordScales("Cmaj7", { maxResults: 20 }).find((m) => m.scale.name === "major");
 * major?.avoidNotes.map((n) => n.toString({ octave: false })); // => ["F"]
 * ```
 */
export function chordScales(
  chord: ChordLike,
  options: ChordScalesOptions = {}
): ChordScaleMatch[] {
  const c = Chord.from(chord);
  const maxResults = options.maxResults ?? 5;
  if (!Number.isInteger(maxResults) || maxResults < 0) {
    throw new RangeError(
      `maxResults must be a non-negative integer, got ${maxResults}`
    );
  }

  const chordMask = pcsetMask(c.intervals.map((iv) => iv.semitones));
  const rootPc = c.root.pitchClass;
  const matches: Array<ChordScaleMatch & { order: number }> = [];

  for (let order = 0; order < TEMPLATE_MASKS.length; order++) {
    const { def, mask } = TEMPLATE_MASKS[
      order
    ] as (typeof TEMPLATE_MASKS)[number];
    if (!pcsetIsSubset(chordMask, mask)) continue;
    const scale = Scale.from(c.root, def.name);
    const avoidNotes = scale.notes.filter((n) => {
      const rel = mod(pitchClass(n) - rootPc, 12);
      return !pcsetHas(chordMask, rel) && pcsetHas(chordMask, rel - 1);
    });
    const score =
      1 - 0.15 * avoidNotes.length - 0.02 * Math.abs(def.intervals.length - 7);
    matches.push({
      scale,
      avoidNotes,
      score: Number(score.toFixed(4)),
      order,
    });
  }

  matches.sort((a, b) => b.score - a.score || a.order - b.order);
  return matches
    .slice(0, maxResults)
    .map(({ scale, avoidNotes, score }) => ({ scale, avoidNotes, score }));
}
