/**
 * Higher-level harmonic analysis: label a chord timeline with Roman numerals in
 * a key, find cadences, and measure harmonic rhythm. Builds on key detection
 * and chord-over-time segmentation.
 */

import type { Chord } from "../chord/chord";
import { Key } from "../key/key";
import { type ChordSpan, onsetTimes, segmentChords } from "./chords";
import { detectKey, pitchClassWeightsFromStream } from "./key";
import type { NoteStream } from "./types";

/** The diatonic scale degree (1–7) of a chord's root in `key`, or `null`. */
function rootDegree(key: Key, chord: Chord): number | null {
  const idx = key.scale.notes.findIndex((n) => n.letter === chord.root.letter);
  return idx === -1 ? null : idx + 1;
}

/** Roman numeral for each chord (null entries preserved). */
export function romanProgression(
  chords: ReadonlyArray<Chord | null>,
  key: Key
): (string | null)[] {
  return chords.map((c) => (c ? key.romanNumeral(c) : null));
}

export type CadenceType = "authentic" | "plagal" | "deceptive" | "half";

/** A cadence located at chord index `index` (the first chord of the motion). */
export interface Cadence {
  readonly type: CadenceType;
  readonly index: number;
}

/**
 * Find cadences in a chord sequence relative to `key`:
 * authentic (V→I), plagal (IV→I), deceptive (V→vi), and a half cadence when the
 * sequence ends on V.
 */
export function detectCadences(
  chords: ReadonlyArray<Chord>,
  key: Key
): Cadence[] {
  const cadences: Cadence[] = [];
  for (let i = 0; i < chords.length - 1; i++) {
    const a = rootDegree(key, chords[i] as Chord);
    const b = rootDegree(key, chords[i + 1] as Chord);
    if (a === 5 && b === 1) cadences.push({ type: "authentic", index: i });
    else if (a === 4 && b === 1) cadences.push({ type: "plagal", index: i });
    else if (a === 5 && b === 6) cadences.push({ type: "deceptive", index: i });
  }
  const last = chords.length - 1;
  if (last >= 0 && rootDegree(key, chords[last] as Chord) === 5) {
    // Only a half cadence if it isn't already the resolution of a listed motion.
    if (!cadences.some((c) => c.index === last - 1)) {
      cadences.push({ type: "half", index: last });
    }
  }
  return cadences;
}

/** Harmonic rhythm: the duration of each chord span and their average. */
export function harmonicRhythm(spans: ReadonlyArray<ChordSpan>): {
  durations: number[];
  mean: number;
} {
  const durations = spans.map((s) => s.end - s.start);
  const mean =
    durations.length === 0
      ? 0
      : durations.reduce((a, b) => a + b, 0) / durations.length;
  return { durations, mean };
}

/** A fully labelled harmonic timeline entry. */
export interface AnalyzedSpan extends ChordSpan {
  readonly roman: string | null;
}

/** The result of {@link analyzeHarmony}. */
export interface HarmonicAnalysis {
  readonly key: Key;
  readonly timeline: AnalyzedSpan[];
  readonly cadences: Cadence[];
}

/**
 * End-to-end harmonic analysis of a note stream: detect the key (unless one is
 * given), segment into chords (by note onsets unless boundaries are given),
 * label each with a Roman numeral, and locate cadences.
 */
export function analyzeHarmony(
  stream: NoteStream,
  options: { key?: Key; boundaries?: readonly number[] } = {}
): HarmonicAnalysis {
  const key =
    options.key ?? detectKey(pitchClassWeightsFromStream(stream))[0]?.key;
  if (!key) {
    return { key: Key.major("C"), timeline: [], cadences: [] };
  }

  const maxEnd = stream.reduce((m, e) => Math.max(m, e.start + e.duration), 0);
  const boundaries = options.boundaries ?? [...onsetTimes(stream), maxEnd];
  const spans = segmentChords(stream, boundaries);

  const timeline: AnalyzedSpan[] = spans.map((s) => ({
    ...s,
    roman: s.chord ? key.romanNumeral(s.chord) : null,
  }));
  const chords = spans
    .map((s) => s.chord)
    .filter((c): c is Chord => c !== null);

  return { key, timeline, cadences: detectCadences(chords, key) };
}
