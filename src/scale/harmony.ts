/**
 * Diatonic chords of any scale: stack alternating degrees (root, 3rd, 5th,
 * optionally 7th — by scale position, not fixed interval sizes) on each
 * degree of any template. In the major scale this yields the familiar
 * I ii iii IV V vi vii°; in melodic minor, harmonic major, bebop scales, or
 * your own custom template it yields whatever those scales actually contain,
 * with each chord's quality detected when the dictionary knows it.
 */

import { detectQuality } from "../chord/analysis";
import { Chord } from "../chord/chord";
import { type Interval, intervalBetween } from "../interval/interval";
import { Scale, type ScaleLike } from "./scale";

/** Options for {@link scaleChord} and {@link scaleChords}. */
export interface ScaleChordOptions {
  /** Stack a fourth tone (the seventh-by-position) on top. Default false. */
  readonly seventh?: boolean;
}

/**
 * The chord built on scale degree `n` (1-based) by stacking every other
 * degree of the scale. The chord's quality is detected when the resulting
 * tones match a known template (so degree 2 of C major is `Dm`, degree 7 is
 * `Bdim`); otherwise the chord still builds, just without a symbol.
 *
 * @example
 * ```ts
 * import { scaleChord } from "musictheoryjs";
 * scaleChord("C4 major", 5).toString(); // => "G"
 * scaleChord("C4 major", 5, { seventh: true }).toString(); // => "G7"
 * scaleChord("A4 melodicMinor", 1, { seventh: true }).toString(); // => "AmMaj7"
 * scaleChord("C4 harmonicMajor", 6, { seventh: true }).toString(); // => "Abmaj7#5"
 * ```
 */
export function scaleChord(
  s: ScaleLike,
  n: number,
  options: ScaleChordOptions = {}
): Chord {
  const sc = Scale.from(s);
  const root = sc.degree(n);
  const count = options.seventh ? 4 : 3;
  const tones = Array.from({ length: count }, (_, i) => sc.degree(n + 2 * i));
  const intervals: Interval[] = tones.map((t) => intervalBetween(root, t));
  const quality = detectQuality(intervals.map((iv) => iv.semitones));
  return new Chord(root, intervals, quality);
}

/**
 * The chord on every degree of a scale, in degree order — the scale's
 * diatonic harmony. Works for any template or custom interval set, not only
 * major and minor.
 *
 * @example
 * ```ts
 * import { scaleChords } from "musictheoryjs";
 * scaleChords("C4 major").map(String); // => ["C","Dm","Em","F","G","Am","Bdim"]
 * scaleChords("C4 harmonicMinor").map(String); // => ["Cm","Ddim","Ebaug","Fm","G","Ab","Bdim"]
 * scaleChords("C4 melodicMinor", { seventh: true }).map(String); // => ["CmMaj7","Dm7","Ebmaj7#5","F7","G7","Am7b5","Bm7b5"]
 * ```
 */
export function scaleChords(
  s: ScaleLike,
  options: ScaleChordOptions = {}
): Chord[] {
  const sc = Scale.from(s);
  return Array.from({ length: sc.size }, (_, i) =>
    scaleChord(sc, i + 1, options)
  );
}
