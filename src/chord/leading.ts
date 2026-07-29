/**
 * Voice leading — connecting chords the way arrangers do.
 *
 * A voicing is an ascending array of octave-specific {@link Note}s; voice 0
 * is the bass and holds the chord's root pitch class, and upper voices cover
 * the remaining tones with priority root > third > seventh > fifth >
 * extensions when there are fewer voices than tones. `nextVoicing` connects
 * a voicing to the next chord with minimal total motion, and in default mode
 * the search rejects parallel fifths and octaves outright — the engine never
 * emits them. Parallels are judged on spelled intervals, so a d5→P5 slide is
 * not a parallel fifth.
 */

import {
  type Interval,
  intervalBetween,
  intervalQuality,
} from "../interval/interval";
import { mod } from "../math/index";
import { Note, type NoteLike } from "../note/note";
import { Chord, type ChordLike } from "./chord";

/** A voicing as the engine accepts it: notes low to high. */
export type VoicingInput = ReadonlyArray<Note | NoteLike | string>;

/** Options shared by the voice-leading functions. */
export interface VoiceLeadingOptions {
  /** Number of voices (default 4, allowed 2–8). */
  readonly voices?: number;
  /** Inclusive overall range as [lowest, highest] (default ["E2", "A5"]). */
  readonly range?: readonly [
    Note | NoteLike | string,
    Note | NoteLike | string,
  ];
  /** Permit parallel fifths/octaves (default false — they are rejected). */
  readonly allowParallels?: boolean;
  /**
   * Largest per-voice motion in semitones when connecting (default 12 — up
   * to the idiomatic octave leap; minimal-motion cost still prefers steps,
   * so wide leaps only appear when nothing closer is legal).
   */
  readonly maxLeap?: number;
}

interface ResolvedOptions {
  readonly voices: number;
  readonly low: number;
  readonly high: number;
  readonly allowParallels: boolean;
  readonly maxLeap: number;
}

function resolveOptions(options: VoiceLeadingOptions = {}): ResolvedOptions {
  const voices = options.voices ?? 4;
  if (!Number.isInteger(voices) || voices < 2 || voices > 8) {
    throw new RangeError(`voices must be an integer 2-8, got ${voices}`);
  }
  const [lowInput, highInput] = options.range ?? ["E2", "A5"];
  const low = Note.from(lowInput).chroma;
  const high = Note.from(highInput).chroma;
  if (low >= high) {
    throw new RangeError(
      `range must run low to high, got [${Note.from(lowInput).toString()}, ${Note.from(highInput).toString()}]`
    );
  }
  const maxLeap = options.maxLeap ?? 12;
  if (!Number.isFinite(maxLeap) || maxLeap < 2) {
    throw new RangeError(
      `maxLeap must be at least 2 semitones, got ${maxLeap}`
    );
  }
  return {
    voices,
    low,
    high,
    allowParallels: options.allowParallels ?? false,
    maxLeap,
  };
}

/** Same spelled pitch class (letter + accidental), octave ignored. */
function samePc(a: Note, b: Note): boolean {
  return a.step === b.step && a.alteration === b.alteration;
}

/** Chord tones in coverage-priority order: root, third, seventh, fifth, rest. */
function tonePriority(c: Chord): Note[] {
  const tones = c.notes;
  const bySimpleStep = (wanted: number): Note | undefined =>
    tones.find((_, i) => mod((c.intervals[i] as Interval).steps, 7) === wanted);
  const ordered: Note[] = [];
  const push = (tone: Note | undefined): void => {
    if (tone !== undefined && !ordered.some((t) => samePc(t, tone))) {
      ordered.push(tone);
    }
  };
  push(tones[0]); // root
  // The quality tone: the third, or — in sus chords, where the suspension IS
  // the identity — the fourth or second standing in for it.
  push(bySimpleStep(2) ?? bySimpleStep(3) ?? bySimpleStep(1));
  push(bySimpleStep(6)); // seventh
  push(bySimpleStep(4)); // fifth
  for (const tone of tones) push(tone);
  return ordered;
}

/** All octave placements of `tone`'s pitch class with chroma in [low, high]. */
function realizationsInRange(tone: Note, low: number, high: number): Note[] {
  const result: Note[] = [];
  for (let octave = -1; octave <= 9; octave++) {
    const candidate = tone.withOctave(octave);
    if (candidate.chroma >= low && candidate.chroma <= high) {
      result.push(candidate);
    }
  }
  return result;
}

/**
 * A deterministic initial voicing: the root in the bass near the bottom of
 * the range, remaining voices stacked upward in close position covering
 * tones by priority (root > third > seventh > fifth > extensions).
 * @throws {RangeError} when the chord cannot fit the range.
 *
 * @example
 * ```ts
 * import { voiceChord } from "musictheoryjs";
 * voiceChord("Cmaj7").map(String); // => ["C3", "E3", "B3", "G4"]
 * voiceChord("C", { voices: 3 }).map(String); // => ["C3", "E3", "G3"]
 * voiceChord("C").map(String); // => ["C3", "E3", "G3", "E4"]
 * ```
 */
export function voiceChord(
  chord: ChordLike,
  options: VoiceLeadingOptions = {}
): Note[] {
  const c = Chord.from(chord);
  const opts = resolveOptions(options);
  const bassChoices = realizationsInRange(
    c.root,
    opts.low,
    Math.min(opts.low + 14, opts.high)
  );
  const bass = bassChoices[0];
  if (bass === undefined) {
    throw new RangeError(
      `no in-range bass placement for ${c.toString()} above ${opts.low}`
    );
  }

  const upperCount = opts.voices - 1;
  const priority = tonePriority(c).filter((t) => !samePc(t, c.root));
  const pool = priority.length > 0 ? priority : [c.root];
  const upperPcs = Array.from(
    { length: upperCount },
    (_, i) => pool[i % pool.length] as Note
  );

  const result = [bass];
  let previous = bass.chroma;
  for (const pc of upperPcs) {
    let octave = Math.floor((previous - pc.withOctave(0).chroma) / 12);
    let candidate = pc.withOctave(octave);
    while (candidate.chroma <= previous) {
      octave += 1;
      candidate = pc.withOctave(octave);
    }
    if (candidate.chroma > opts.high) {
      throw new RangeError(
        `cannot voice ${c.toString()} with ${opts.voices} voices inside the range`
      );
    }
    result.push(candidate);
    previous = candidate.chroma;
  }
  return result;
}

/** A parallel perfect interval between two consecutive voicings. */
export interface ParallelMotion {
  /** Voice indices [lower, upper]. */
  readonly voices: readonly [number, number];
  /** `"P5"` for parallel fifths (incl. twelfths), `"P8"` for octaves/unisons. */
  readonly type: "P5" | "P8";
}

/** Spelled perfect class of the interval between two notes, if any. */
function perfectClass(lower: Note, upper: Note): "P5" | "P8" | null {
  const iv = intervalBetween(lower, upper);
  if (intervalQuality(iv).quality !== "P") return null;
  const simple = mod(Math.abs(iv.steps), 7);
  if (simple === 4) return "P5";
  if (simple === 0) return "P8";
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
 * findParallels(["C3", "G3"], ["D3", "A3"]); // => [{ voices: [0, 1], type: "P5" }]
 * findParallels(["C3", "G3"], ["C3", "A3"]); // => []
 * findParallels(["B2", "F3"], ["C3", "G3"]); // => []
 * findParallels(["C3", "C4"], ["D3", "D4"]); // => [{ voices: [0, 1], type: "P8" }]
 * ```
 */
export function findParallels(
  from: VoicingInput,
  to: VoicingInput
): ParallelMotion[] {
  if (from.length !== to.length) {
    throw new RangeError(
      "findParallels needs two voicings with the same number of voices"
    );
  }
  const f = from.map((n) => Note.from(n));
  const t = to.map((n) => Note.from(n));
  const found: ParallelMotion[] = [];
  for (let i = 0; i < f.length; i++) {
    for (let j = i + 1; j < f.length; j++) {
      const moved =
        (f[i] as Note).chroma !== (t[i] as Note).chroma &&
        (f[j] as Note).chroma !== (t[j] as Note).chroma;
      if (!moved) continue;
      const before = perfectClass(f[i] as Note, f[j] as Note);
      if (before === null) continue;
      if (perfectClass(t[i] as Note, t[j] as Note) === before) {
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
 * voiceLeadingCost(["C3", "E3", "G3", "C4"], ["B2", "D3", "G3", "D4"]); // => 5
 * voiceLeadingCost(["C3", "G3"], ["C3", "G3"]); // => 0
 * ```
 */
export function voiceLeadingCost(from: VoicingInput, to: VoicingInput): number {
  if (from.length !== to.length) {
    throw new RangeError(
      "voiceLeadingCost needs two voicings with the same number of voices"
    );
  }
  let cost = 0;
  for (let i = 0; i < from.length; i++) {
    cost += Math.abs(
      Note.from(to[i] as Note | NoteLike | string).chroma -
        Note.from(from[i] as Note | NoteLike | string).chroma
    );
  }
  return cost;
}

/**
 * Required pitch classes for a chord under `voices` voices: the root plus
 * third and seventh. The fifth (and extensions) are omittable — the
 * classical escape hatch that keeps V7→I and similar motions parallel-free
 * with doubled roots.
 */
function requiredPcs(c: Chord, voices: number): Set<number> {
  const priority = tonePriority(c);
  const required = new Set<number>([c.root.pitchClass]);
  for (const tone of priority.slice(0, 3)) {
    if (required.size >= voices) break;
    required.add(tone.pitchClass);
  }
  return required;
}

/**
 * Connect a voicing to the next chord with minimal total motion. Every
 * candidate keeps voice order (no crossing), stays in range, keeps the root
 * in the bass, covers the chord's priority tones, and — unless
 * `allowParallels` — contains no parallel fifths or octaves.
 * @throws {RangeError} when the constraints are unsatisfiable (very tight
 *   ranges); widen `range` or `maxLeap`.
 *
 * @example
 * ```ts
 * import { findParallels, nextVoicing, voiceChord } from "musictheoryjs";
 * const from = voiceChord("C");
 * nextVoicing(from, "G7").map(String); // => ["G2", "F3", "G3", "B3"]
 * findParallels(from, nextVoicing(from, "G7")); // => []
 * nextVoicing(["C3", "E3", "G3", "C4"], "F").map(String); // => ["F3", "F3", "A3", "C4"]
 * ```
 */
export function nextVoicing(
  from: VoicingInput,
  chord: ChordLike,
  options: VoiceLeadingOptions = {}
): Note[] {
  const c = Chord.from(chord);
  const opts = resolveOptions({ ...options, voices: from.length });
  const fromNotes = from.map((n) => Note.from(n));
  const fromHeights = fromNotes.map((n) => n.chroma);
  const tones = tonePriority(c);

  // Per-voice candidates: realizations of chord tones within the leap window,
  // nearest first. The bass (voice 0) holds the root's pitch class.
  const perVoice: Note[][] = fromNotes.map((_, i) => {
    const height = fromHeights[i] as number;
    const pcs = i === 0 ? [c.root] : tones;
    const candidates: Note[] = [];
    for (const pc of pcs) {
      for (const r of realizationsInRange(pc, opts.low, opts.high)) {
        if (Math.abs(r.chroma - height) <= opts.maxLeap) candidates.push(r);
      }
    }
    candidates.sort(
      (a, b) => Math.abs(a.chroma - height) - Math.abs(b.chroma - height)
    );
    return candidates;
  });
  if (perVoice.some((list) => list.length === 0)) {
    throw new RangeError(
      `no in-range continuation from [${fromNotes.join(", ")}] to ${c.toString()}; widen the range or maxLeap`
    );
  }

  const required = requiredPcs(c, from.length);
  const rootPc = c.root.pitchClass;
  // Doubling any tone but the root is penalized (a doubled third on a
  // dominant is a doubled leading tone); motion cost alone stays the
  // admissible pruning bound.
  const doublingPenalty = (voicing: readonly Note[]): number => {
    const counts = new Map<number, number>();
    for (const n of voicing) {
      counts.set(n.pitchClass, (counts.get(n.pitchClass) ?? 0) + 1);
    }
    let penalty = 0;
    for (const [pc, count] of counts) {
      if (pc !== rootPc && count > 1) penalty += 4 * (count - 1);
    }
    return penalty;
  };

  let best: Note[] | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  const current: Note[] = [];
  // Checking each new voice against the ones already placed prunes parallel
  // branches at the node instead of the leaf — every pair is still examined
  // exactly once, when its upper member is chosen.
  const formsParallel = (voiceIndex: number, candidate: Note): boolean => {
    if (opts.allowParallels) return false;
    const fromHere = fromNotes[voiceIndex] as Note;
    if (fromHere.chroma === candidate.chroma) return false;
    for (let j = 0; j < voiceIndex; j++) {
      const fromLower = fromNotes[j] as Note;
      const toLower = current[j] as Note;
      if (fromLower.chroma === toLower.chroma) continue;
      const before = perfectClass(fromLower, fromHere);
      if (before !== null && perfectClass(toLower, candidate) === before) {
        return true;
      }
    }
    return false;
  };
  const search = (voiceIndex: number, cost: number): void => {
    if (cost >= bestCost) return;
    if (voiceIndex === perVoice.length) {
      const covered = new Set(current.map((n) => n.pitchClass));
      for (const pc of required) {
        if (!covered.has(pc)) return;
      }
      const total = cost + doublingPenalty(current);
      if (total >= bestCost) return;
      bestCost = total;
      best = [...current];
      return;
    }
    for (const candidate of (perVoice as Note[][])[voiceIndex] as Note[]) {
      // No crossing; adjacent-voice unisons are allowed (parallel unisons
      // are still rejected by formsParallel).
      if (
        voiceIndex > 0 &&
        candidate.chroma < (current[voiceIndex - 1] as Note).chroma
      ) {
        continue;
      }
      if (formsParallel(voiceIndex, candidate)) continue;
      current.push(candidate);
      search(
        voiceIndex + 1,
        cost + Math.abs(candidate.chroma - (fromHeights[voiceIndex] as number))
      );
      current.pop();
    }
  };
  search(0, 0);

  if (best === null) {
    throw new RangeError(
      `no valid voice leading from [${fromNotes.join(", ")}] to ${c.toString()} under the given constraints`
    );
  }
  return best;
}

/**
 * Voice a whole progression: an initial voicing for the first chord, then
 * minimal-motion connections. Default mode never contains parallel fifths
 * or octaves between consecutive voicings.
 *
 * @example
 * ```ts
 * import { findParallels, voiceProgression } from "musictheoryjs";
 * const voicings = voiceProgression(["C", "F", "G7", "C"]);
 * voicings[0].map(String); // => ["C3", "E3", "G3", "E4"]
 * voicings.length; // => 4
 * findParallels(voicings[2], voicings[3]); // => []
 * ```
 */
export function voiceProgression(
  chords: ReadonlyArray<ChordLike>,
  options: VoiceLeadingOptions = {}
): Note[][] {
  const first = chords[0];
  if (first === undefined) {
    throw new RangeError("cannot voice an empty progression");
  }
  const result: Note[][] = [voiceChord(first, options)];
  for (let i = 1; i < chords.length; i++) {
    result.push(
      nextVoicing(result[i - 1] as Note[], chords[i] as ChordLike, options)
    );
  }
  return result;
}
