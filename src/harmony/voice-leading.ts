/**
 * @module harmony/voice-leading
 * A voice-leading engine on spelled pitches: initial voicings, minimal-
 * motion connection between chords, and parallel-perfect detection on
 * actual voice pairs. In default mode the search rejects parallel fifths
 * and octaves outright — the engine never emits them (property-tested).
 *
 * Voicings are arrays of octave-specific note names, low to high. Voice 0
 * is the bass and holds the chord's bass pitch class (the root, or the
 * slash bass); upper voices cover the remaining chord tones with priority
 * root > third > seventh > fifth > extensions when there are fewer voices
 * than tones.
 */

import {
  MusicTheoryError,
  Pitch,
  chroma as chromaOf,
  distance,
  interval,
  intervalName,
  note,
  noteName,
  pitch,
  semitoneHeight,
  simplify,
} from "../core";
import { mod } from "../core/util";
import { Chord, chord } from "../chord";

/** A voicing: octave-specific note names, low to high. */
export type Voicing = readonly string[];

export interface VoiceLeadingOptions {
  /** Number of voices (default 4, allowed 2-8). */
  readonly voices?: number;
  /** Inclusive overall range as [lowest, highest] (default ["E2", "A5"]). */
  readonly range?: readonly [string, string];
  /** Permit parallel fifths/octaves (default false — they are rejected). */
  readonly allowParallels?: boolean;
  /** Largest per-voice motion in semitones when connecting (default 9). */
  readonly maxLeap?: number;
}

interface ResolvedOptions {
  readonly voices: number;
  readonly low: number;
  readonly high: number;
  readonly allowParallels: boolean;
  readonly maxLeap: number;
}

function resolveOptions(options?: VoiceLeadingOptions): ResolvedOptions {
  const voices = options?.voices ?? 4;
  if (!Number.isInteger(voices) || voices < 2 || voices > 8) {
    throw new MusicTheoryError(`Invalid voices ${voices}: must be an integer 2-8.`);
  }
  const [lowName, highName] = options?.range ?? ["E2", "A5"];
  const low = semitoneHeight(note(lowName));
  const high = semitoneHeight(note(highName));
  if (low === null || high === null || low >= high) {
    throw new MusicTheoryError(
      `Invalid range [${lowName}, ${highName}]: expected two octave-specific notes, low < high.`
    );
  }
  const maxLeap = options?.maxLeap ?? 9;
  if (!Number.isFinite(maxLeap) || maxLeap < 2) {
    throw new MusicTheoryError(`Invalid maxLeap ${maxLeap}: must be at least 2 semitones.`);
  }
  return { voices, low, high, allowParallels: options?.allowParallels ?? false, maxLeap };
}

/** Chord tones as spelled pitch classes, in coverage-priority order. */
function chordTonePriority(c: Chord): Pitch[] {
  const tones = c.notes.map((n) => note(n));
  const bySimpleStep = (wanted: number): Pitch | undefined =>
    tones.find((_, i) => mod(interval(c.intervals[i]).steps, 7) === wanted);
  const ordered: Pitch[] = [];
  const push = (p: Pitch | undefined): void => {
    if (p !== undefined && !ordered.some((q) => q.step === p.step && q.alt === p.alt)) {
      ordered.push(p);
    }
  };
  push(tones[0]); // root
  push(bySimpleStep(2)); // third (or its suspension replacement stays in rest)
  push(bySimpleStep(6)); // seventh
  push(bySimpleStep(4)); // fifth
  for (const t of tones) push(t);
  return ordered;
}

/** The spelled pitch class voice 0 must hold. */
function bassPitchClass(c: Chord): Pitch {
  return note(c.bass ?? c.root);
}

/** All octave realizations of `pc` with height in [low, high]. */
function realizationsInRange(pc: Pitch, low: number, high: number): Pitch[] {
  const result: Pitch[] = [];
  for (let oct = -1; oct <= 9; oct++) {
    const candidate = pitch(pc.step, pc.alt, oct);
    const h = semitoneHeight(candidate) as number;
    if (h >= low && h <= high) result.push(candidate);
  }
  return result;
}

/**
 * A deterministic initial voicing: bass on the chord's bass pitch class near
 * the bottom of the range, remaining voices stacked upward in close position
 * covering tones by priority. `voiceChord("Cmaj7")` → ["C3", "E3", "B3", "G4"].
 *
 * @example
 * ```ts
 * import { voiceChord } from "musictheoryjs";
 *
 * voiceChord("Cmaj7"); // => ["C3", "E3", "B3", "G4"]
 * voiceChord("G7/B"); // => ["B2", "G3", "F4", "D5"]
 * voiceChord("C", { voices: 3 }); // => ["C3", "E3", "G3"]
 * ```
 */
export function voiceChord(
  chordInput: string | Chord,
  options?: VoiceLeadingOptions
): string[] {
  const c = chord(chordInput);
  const opts = resolveOptions(options);
  const bassPc = bassPitchClass(c);
  const bassChoices = realizationsInRange(bassPc, opts.low, Math.min(opts.low + 14, opts.high));
  if (bassChoices.length === 0) {
    throw new MusicTheoryError(`No in-range bass placement for ${c.symbol}.`);
  }
  const bass = bassChoices[0];

  const upperCount = opts.voices - 1;
  const priority = chordTonePriority(c).filter(
    (p) => !(p.step === bassPc.step && p.alt === bassPc.alt)
  );
  const pool = priority.length > 0 ? priority : [bassPc];
  const upperPcs = Array.from({ length: upperCount }, (_, i) => pool[i % pool.length]);

  const result = [bass];
  let previous = semitoneHeight(bass) as number;
  for (const pc of upperPcs) {
    const base = chromaOf(pc);
    let oct = Math.floor((previous - base) / 12) - 1;
    let candidate = pitch(pc.step, pc.alt, oct);
    while ((semitoneHeight(candidate) as number) <= previous) {
      oct += 1;
      candidate = pitch(pc.step, pc.alt, oct);
    }
    const h = semitoneHeight(candidate) as number;
    if (h > opts.high) {
      throw new MusicTheoryError(
        `Cannot voice ${c.symbol} with ${opts.voices} voices inside the given range.`
      );
    }
    result.push(candidate);
    previous = h;
  }
  return result.map(noteName);
}

/** A parallel perfect interval between two consecutive voicings. */
export interface ParallelMotion {
  /** Voice indices [lower, upper]. */
  readonly voices: readonly [number, number];
  /** "P5" for parallel fifths (incl. twelfths), "P8" for octaves/unisons. */
  readonly type: "P5" | "P8";
}

function perfectClass(a: Pitch, b: Pitch): "P5" | "P8" | null {
  const name = intervalName(simplify(distance(a, b)));
  if (name === "P5") return "P5";
  if (name === "P1" || name === "P8") return "P8";
  return null;
}

/**
 * Parallel fifths and octaves between two voicings of equal size: voice
 * pairs a perfect fifth (or octave/unison) apart in both chords, with both
 * voices moving. Spelled — a d5→P5 slide is not a parallel fifth.
 *
 * @example
 * ```ts
 * import { findParallels } from "musictheoryjs";
 *
 * findParallels(["C3", "G3"], ["D3", "A3"]); // => [{ voices: [0, 1], type: "P5" }]
 * // Oblique motion (one voice holds) is fine:
 * findParallels(["C3", "G3"], ["C3", "A3"]); // => []
 * // Spelled: the d5 in B–F sliding to the P5 in C–G is not a parallel fifth:
 * findParallels(["B2", "F3"], ["C3", "G3"]); // => []
 * ```
 */
export function findParallels(from: Voicing, to: Voicing): ParallelMotion[] {
  if (from.length !== to.length) {
    throw new MusicTheoryError("findParallels needs two voicings with the same number of voices.");
  }
  const f = from.map((n) => note(n));
  const t = to.map((n) => note(n));
  const found: ParallelMotion[] = [];
  for (let i = 0; i < f.length; i++) {
    for (let j = i + 1; j < f.length; j++) {
      const moved =
        (semitoneHeight(f[i]) as number) !== (semitoneHeight(t[i]) as number) &&
        (semitoneHeight(f[j]) as number) !== (semitoneHeight(t[j]) as number);
      if (!moved) continue;
      const before = perfectClass(f[i], f[j]);
      if (before === null) continue;
      if (perfectClass(t[i], t[j]) === before) {
        found.push(Object.freeze({ voices: [i, j] as const, type: before }));
      }
    }
  }
  return found;
}

/**
 * Total absolute motion between two equal-sized voicings, in semitones.
 *
 * @example
 * ```ts
 * import { voiceLeadingCost } from "musictheoryjs";
 *
 * voiceLeadingCost(["C3", "E3", "G3", "C4"], ["B2", "D3", "G3", "D4"]); // => 5
 * voiceLeadingCost(["C3", "G3"], ["C3", "E3", "G3"]); // => throws "same number"
 * ```
 */
export function voiceLeadingCost(from: Voicing, to: Voicing): number {
  if (from.length !== to.length) {
    throw new MusicTheoryError("voiceLeadingCost needs two voicings with the same number of voices.");
  }
  let cost = 0;
  for (let i = 0; i < from.length; i++) {
    cost += Math.abs(
      (semitoneHeight(note(to[i])) as number) - (semitoneHeight(note(from[i])) as number)
    );
  }
  return cost;
}

/**
 * Required pitch classes for a chord under `voices` voices: the bass plus
 * root, third, and seventh. The fifth (and extensions) are omittable — the
 * classical escape hatch that keeps V7→I and similar motions parallel-free
 * with doubled roots.
 */
function requiredPcs(c: Chord, voices: number): Set<number> {
  const priority = chordTonePriority(c);
  const bass = bassPitchClass(c);
  const required = new Set<number>([chromaOf(bass)]);
  for (const p of priority.slice(0, 3)) {
    if (required.size >= voices) break;
    required.add(chromaOf(p));
  }
  return required;
}

/**
 * Connect a voicing to the next chord with minimal total motion. Every
 * candidate keeps voice order (no crossing), stays in range, honors the
 * bass, covers the chord's priority tones, and — unless `allowParallels` —
 * contains no parallel fifths or octaves. Throws when the constraints are
 * unsatisfiable (very tight ranges).
 *
 * @example
 * ```ts
 * import { findParallels, nextVoicing, voiceChord } from "musictheoryjs";
 *
 * const from = voiceChord("C"); // ["C3", "E3", "G3", "E4"]
 * nextVoicing(from, "G7"); // => ["G2", "F3", "G3", "B3"]
 * findParallels(from, nextVoicing(from, "G7")); // => []
 * ```
 */
export function nextVoicing(
  from: Voicing,
  chordInput: string | Chord,
  options?: VoiceLeadingOptions
): string[] {
  const c = chord(chordInput);
  const opts = resolveOptions({ ...options, voices: from.length });
  const fromPitches = from.map((n) => note(n));
  const fromHeights = fromPitches.map((p) => semitoneHeight(p) as number);
  const bassPc = bassPitchClass(c);
  const tones = chordTonePriority(c);

  // Per-voice candidates: realizations of chord tones within the leap window.
  const perVoice: Pitch[][] = fromPitches.map((_, i) => {
    const height = fromHeights[i];
    const pcs = i === 0 ? [bassPc] : tones;
    const candidates: Pitch[] = [];
    for (const pc of pcs) {
      for (const r of realizationsInRange(pc, opts.low, opts.high)) {
        const h = semitoneHeight(r) as number;
        if (Math.abs(h - height) <= opts.maxLeap) candidates.push(r);
      }
    }
    candidates.sort(
      (a, b) =>
        Math.abs((semitoneHeight(a) as number) - height) -
        Math.abs((semitoneHeight(b) as number) - height)
    );
    return candidates;
  });
  if (perVoice.some((list) => list.length === 0)) {
    throw new MusicTheoryError(
      `No in-range continuation from [${from.join(", ")}] to ${c.symbol}; widen the range or maxLeap.`
    );
  }

  const required = requiredPcs(c, from.length);
  const rootPc = chromaOf(note(c.root));
  // Doubling any tone but the root is penalized (a doubled third on a
  // dominant is a doubled leading tone); motion cost alone stays the
  // admissible pruning bound.
  const doublingPenalty = (voicing: readonly Pitch[]): number => {
    const counts = new Map<number, number>();
    for (const p of voicing) {
      const pc = chromaOf(p);
      counts.set(pc, (counts.get(pc) ?? 0) + 1);
    }
    let penalty = 0;
    for (const [pc, count] of counts) {
      if (pc !== rootPc && count > 1) penalty += 4 * (count - 1);
    }
    return penalty;
  };

  let best: Pitch[] | null = null;
  let bestCost = Infinity;

  const current: Pitch[] = [];
  const search = (voiceIndex: number, cost: number): void => {
    if (cost >= bestCost) return;
    if (voiceIndex === perVoice.length) {
      const covered = new Set(current.map((p) => chromaOf(p)));
      for (const pc of required) if (!covered.has(pc)) return;
      if (!opts.allowParallels) {
        if (findParallels(from, current.map(noteName)).length > 0) return;
      }
      const total = cost + doublingPenalty(current);
      if (total >= bestCost) return;
      bestCost = total;
      best = [...current];
      return;
    }
    for (const candidate of perVoice[voiceIndex]) {
      const h = semitoneHeight(candidate) as number;
      // No crossing; adjacent-voice unisons are allowed (parallel unisons
      // are still rejected by the parallel check below).
      if (voiceIndex > 0 && h < (semitoneHeight(current[voiceIndex - 1]) as number)) continue;
      current.push(candidate);
      search(voiceIndex + 1, cost + Math.abs(h - fromHeights[voiceIndex]));
      current.pop();
    }
  };
  search(0, 0);

  if (best === null) {
    throw new MusicTheoryError(
      `No valid voice leading from [${from.join(", ")}] to ${c.symbol} under the given constraints.`
    );
  }
  return (best as Pitch[]).map(noteName);
}

/**
 * Voice a whole progression: an initial voicing for the first chord, then
 * minimal-motion connections. Default mode never contains parallel fifths
 * or octaves between consecutive voicings.
 *
 * @example
 * ```ts
 * import { findParallels, voiceProgression } from "musictheoryjs";
 *
 * const voicings = voiceProgression(["C", "F", "G7", "C"]);
 * voicings[0]; // => ["C3", "E3", "G3", "E4"]
 * voicings[2]; // => ["G3", "B3", "D4", "F4"]
 * findParallels(voicings[2], voicings[3]); // => []
 * ```
 */
export function voiceProgression(
  chords: ReadonlyArray<string | Chord>,
  options?: VoiceLeadingOptions
): string[][] {
  if (chords.length === 0) {
    throw new MusicTheoryError("Cannot voice an empty progression.");
  }
  const result: string[][] = [voiceChord(chords[0], options)];
  for (let i = 1; i < chords.length; i++) {
    result.push(nextVoicing(result[i - 1], chords[i], options));
  }
  return result;
}
