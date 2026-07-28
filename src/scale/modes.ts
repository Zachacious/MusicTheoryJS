/**
 * Modes: rotations of a scale that treat each degree as a new tonic.
 * The modes of the major scale are the familiar ionian…locrian; the same
 * rotation applies to any scale.
 */

import { type Interval, intervalBetween } from "../interval/interval";
import type { Note } from "../note/note";
import { Scale } from "./scale";

/**
 * The mode of `scale` starting on its (1-based) degree `n`. The returned scale
 * is rooted on that degree with intervals recomputed from the new tonic.
 */
export function mode(scale: Scale, n: number): Scale {
  const size = scale.size;
  const tonic = scale.degree(n);
  const tones: Note[] = Array.from({ length: size }, (_, i) =>
    scale.degree(n + i)
  );
  const intervals: Interval[] = tones.map((t) => intervalBetween(tonic, t));
  const name = scale.name ? `${scale.name}:mode${n}` : undefined;
  return new Scale(tonic, intervals, name);
}

/** All modes of `scale`, one per degree. */
export function modes(scale: Scale): Scale[] {
  return Array.from({ length: scale.size }, (_, i) => mode(scale, i + 1));
}
