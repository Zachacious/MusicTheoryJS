/**
 * Modes: rotations of a scale that treat each degree as a new tonic.
 * The modes of the major scale are the familiar ionian…locrian; the same
 * rotation applies to any scale.
 */

import { type Interval, intervalBetween } from "../interval/interval";
import type { Note } from "../note/note";
import { Scale, type ScaleLike } from "./scale";

/**
 * The mode of `scale` starting on its (1-based) degree `n`. The returned scale
 * is rooted on that degree with intervals recomputed from the new tonic.
 */
export function mode(scale: ScaleLike, n: number): Scale {
  const s = Scale.from(scale);
  const size = s.size;
  const tonic = s.degree(n);
  const tones: Note[] = Array.from({ length: size }, (_, i) => s.degree(n + i));
  const intervals: Interval[] = tones.map((t) => intervalBetween(tonic, t));
  const name = s.name ? `${s.name}:mode${n}` : undefined;
  return new Scale(tonic, intervals, name);
}

/** All modes of `scale`, one per degree. */
export function modes(scale: ScaleLike): Scale[] {
  const s = Scale.from(scale);
  return Array.from({ length: s.size }, (_, i) => mode(s, i + 1));
}
