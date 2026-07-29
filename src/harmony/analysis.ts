/**
 * @module harmony/analysis
 * Progression-level analysis in a key: cadence detection (authentic /
 * plagal / deceptive / evaded, plus half cadences at phrase ends), borrowed-
 * chord identification against the parallel key, and windowed modulation
 * detection over the Krumhansl–Schmuckler engine.
 */

import { Chord, chord } from "../chord";
import { Key, KeyHarmony, key, majorKey, minorKey } from "../key";
import { RomanNumeral } from "../roman";
import { ProgressionStep, parseProgression } from "../progression";
import { KeyDetection, WeightedNote, detectKeys } from "./key-detection";
import { MusicTheoryError } from "../core";

export type CadenceType = "authentic" | "plagal" | "deceptive" | "half" | "evaded";

export interface Cadence {
  readonly type: CadenceType;
  /** Index of the cadence's final chord within the progression. */
  readonly index: number;
  /** For authentic cadences: both chords root-position (PAC-style). */
  readonly perfect?: boolean;
}

/** V or V7-family, in the home key (not applied). */
function isDominantOf(r: RomanNumeral): boolean {
  return (
    r.degree === 5 &&
    r.accidental === 0 &&
    r.secondary === null &&
    (r.chordType === "major" || r.chordType.startsWith("dominant"))
  );
}

function isTonic(r: RomanNumeral): boolean {
  return r.degree === 1 && r.accidental === 0 && r.secondary === null;
}

function classifyPair(
  prev: RomanNumeral,
  final: RomanNumeral,
  index: number,
  atEnd: boolean
): Cadence | null {
  if (isDominantOf(prev)) {
    if (isTonic(final) && final.inversion === 0) {
      return Object.freeze({
        type: "authentic" as const,
        index,
        perfect: prev.inversion === 0,
      });
    }
    if (isTonic(final) && final.inversion > 0) {
      return Object.freeze({ type: "evaded" as const, index });
    }
    if (final.degree === 6 && final.secondary === null) {
      return Object.freeze({ type: "deceptive" as const, index });
    }
  }
  if (
    prev.degree === 4 &&
    prev.accidental === 0 &&
    prev.secondary === null &&
    isTonic(final)
  ) {
    return Object.freeze({ type: "plagal" as const, index });
  }
  // A phrase ending on V is a half cadence; mid-progression motion onto V
  // (ii→V…) is just progress, so "half" only applies at the end.
  if (atEnd && isDominantOf(final) && final.inversion === 0) {
    return Object.freeze({ type: "half" as const, index });
  }
  return null;
}

function romanSteps(k: Key, progression: string | readonly string[]): ProgressionStep[] {
  return parseProgression(k, progression).filter((s) => s.roman !== null);
}

/**
 * Classify the cadence formed by a progression's final two chords:
 * `detectCadence("C major", "ii7 V7 I")` → authentic (perfect). Returns
 * `null` when the ending is not cadential.
 *
 * @example
 * ```ts
 * import { detectCadence } from "musictheoryjs";
 *
 * detectCadence("C major", "ii7 V7 I").type; // => "authentic"
 * detectCadence("C major", "ii7 V7 I").perfect; // => true
 * detectCadence("C major", "I IV V vi").type; // => "deceptive"
 * detectCadence("F major", "I IV I").type; // => "plagal"
 * detectCadence("A minor", "iv V").type; // => "half"
 * ```
 */
export function detectCadence(
  keyInput: string | Key,
  progression: string | readonly string[]
): Cadence | null {
  const steps = romanSteps(key(keyInput), progression);
  if (steps.length < 2) return null;
  const prev = steps[steps.length - 2].roman as RomanNumeral;
  const final = steps[steps.length - 1].roman as RomanNumeral;
  return classifyPair(prev, final, steps.length - 1, true);
}

/**
 * All cadence points in a progression: every adjacent pair forming an
 * authentic / plagal / deceptive / evaded cadence, plus a final half
 * cadence when the progression ends on V.
 *
 * @example
 * ```ts
 * import { analyzeCadences } from "musictheoryjs";
 *
 * const cadences = analyzeCadences("C major", "I IV V vi ii V7 I");
 * cadences.map((c) => c.type); // => ["deceptive", "authentic"]
 * cadences[1].index; // => 6
 * cadences[1].perfect; // => true
 * ```
 */
export function analyzeCadences(
  keyInput: string | Key,
  progression: string | readonly string[]
): Cadence[] {
  const steps = romanSteps(key(keyInput), progression);
  const cadences: Cadence[] = [];
  for (let i = 1; i < steps.length; i++) {
    const found = classifyPair(
      steps[i - 1].roman as RomanNumeral,
      steps[i].roman as RomanNumeral,
      i,
      i === steps.length - 1
    );
    if (found !== null) cadences.push(found);
  }
  return cadences;
}

function harmonies(k: Key): readonly KeyHarmony[] {
  return k.type === "major" ? [k] : [k.natural, k.harmonic, k.melodic];
}

function diatonicIn(k: Key, symbol: string): boolean {
  return harmonies(k).some(
    (h) => h.triads.includes(symbol) || h.chords.includes(symbol)
  );
}

/**
 * Where a chord is borrowed from, relative to a key: `"parallel minor"`
 * for Fm or Ab in C major, `"parallel major"` for a Picardy F# major in
 * F# minor contexts, `null` when the chord is diatonic (or not explainable
 * by mode mixture — applied dominants are a different mechanism; see
 * `chordToRoman`).
 *
 * @example
 * ```ts
 * import { borrowedFrom } from "musictheoryjs";
 *
 * borrowedFrom("Fm", "C major"); // => "parallel minor"
 * borrowedFrom("Ab", "C major"); // => "parallel minor"
 * borrowedFrom("F#", "F# minor"); // => "parallel major"
 * borrowedFrom("G7", "C major"); // => null
 * ```
 */
export function borrowedFrom(
  chordInput: string | Chord,
  keyInput: string | Key
): "parallel minor" | "parallel major" | null {
  const c = chord(chordInput);
  const k = key(keyInput);
  const plain = c.bass === undefined ? c.symbol : c.symbol.slice(0, c.symbol.lastIndexOf("/"));
  if (diatonicIn(k, plain)) return null;
  const parallel = k.type === "major" ? minorKey(k.tonic) : majorKey(k.tonic);
  if (diatonicIn(parallel, plain)) {
    return k.type === "major" ? "parallel minor" : "parallel major";
  }
  return null;
}

export interface ModulationSegment {
  /** First chord index of the segment. */
  readonly start: number;
  /** Last chord index of the segment (inclusive). */
  readonly end: number;
  /** Detected key name, e.g. "G major". */
  readonly key: string;
  /** Mean correlation of the segment's windows. */
  readonly correlation: number;
}

export interface DetectModulationsOptions {
  /** Chords per detection window (default 4, minimum 2). */
  readonly windowSize?: number;
  /** Windows a key must hold to count as a segment (default 2); shorter
   * runs are treated as transition and absorbed by the following key. */
  readonly minWindows?: number;
}

/**
 * Segment a chord progression by local key: a sliding window of chord tones
 * (roots double-weighted) runs through K–S detection; consecutive windows
 * agreeing on a key form segments, and short transitional runs are absorbed
 * into the key that follows them. Segments partition the chord indices:
 * `detectModulations(["C","Am","Dm7","G7","C","A7","D","Bm","Em7","A7","D"])`
 * → C major for the first chords, D major for the rest.
 *
 * @example
 * ```ts
 * import { detectModulations } from "musictheoryjs";
 *
 * const segments = detectModulations(["C", "Am", "Dm7", "G7", "C", "A7", "D", "Bm", "Em7", "A7", "D"]);
 * segments.map((s) => s.key); // => ["C major", "D major"]
 * segments.map((s) => [s.start, s.end]); // => [[0, 3], [4, 10]]
 * ```
 */
export function detectModulations(
  chords: ReadonlyArray<string | Chord>,
  options?: DetectModulationsOptions
): ModulationSegment[] {
  const windowSize = options?.windowSize ?? 4;
  if (!Number.isInteger(windowSize) || windowSize < 2) {
    throw new MusicTheoryError(`Invalid windowSize ${windowSize}: must be an integer ≥ 2.`);
  }
  const minWindows = options?.minWindows ?? 2;
  if (!Number.isInteger(minWindows) || minWindows < 1) {
    throw new MusicTheoryError(`Invalid minWindows ${minWindows}: must be a positive integer.`);
  }
  const parsed = chords.map((c) => chord(c));
  if (parsed.length === 0) {
    throw new MusicTheoryError("Cannot detect modulations in an empty progression.");
  }
  const effective = Math.min(windowSize, parsed.length);

  const windows: KeyDetection[] = [];
  for (let start = 0; start + effective <= parsed.length; start++) {
    const weighted: WeightedNote[] = [];
    for (const c of parsed.slice(start, start + effective)) {
      weighted.push({ note: c.root, weight: 2 });
      for (const n of c.notes) weighted.push({ note: n, weight: 1 });
    }
    const detection = detectKeys(weighted, { maxResults: 1 })[0];
    if (detection !== undefined) windows.push(detection);
  }
  if (windows.length === 0) {
    throw new MusicTheoryError("Not enough tonal content to detect modulations.");
  }

  // Runs of consecutive windows agreeing on a key.
  interface Run { key: string; firstWindow: number; count: number; sum: number }
  const runs: Run[] = [];
  windows.forEach((w, i) => {
    const last = runs[runs.length - 1];
    if (last !== undefined && last.key === w.name) {
      last.count += 1;
      last.sum += w.correlation;
    } else {
      runs.push({ key: w.name, firstWindow: i, count: 1, sum: w.correlation });
    }
  });

  // Absorb sub-threshold runs into the following run (transition zones lean
  // toward the arriving key); a trailing short run joins the previous one.
  const kept: Run[] = [];
  for (const run of runs) {
    if (run.count >= minWindows || kept.length === 0) {
      kept.push({ ...run });
    } else {
      continue; // dropped: its windows fall into the next kept run's span
    }
  }

  // Segments partition the chord range: each kept run starts where its first
  // window starts (the very first at 0) and ends where the next begins.
  return kept.map((run, i) =>
    Object.freeze({
      start: i === 0 ? 0 : run.firstWindow,
      end: i === kept.length - 1 ? parsed.length - 1 : kept[i + 1].firstWindow - 1,
      key: run.key,
      correlation: run.sum / run.count,
    })
  );
}
