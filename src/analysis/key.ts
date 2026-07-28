/**
 * Key detection via the Krumhansl–Schmuckler algorithm.
 *
 * The idea: build a 12-bin histogram of how much each pitch class is present
 * (by count or by sounding duration), then correlate it against empirically
 * derived major and minor "key profiles" rotated to each of the 12 tonics. The
 * best-correlating rotation is the most likely key. Pure arithmetic — no audio,
 * no dependencies.
 */

import { Key, type Mode } from "../key/key";
import { mod } from "../math/index";
import { Note, type NoteLike } from "../note/note";
import { pitchClass as pitchClassOf } from "../pitch/spelled";
import type { NoteStream } from "./types";

// Krumhansl–Kessler probe-tone profiles (tonic-relative weights).
const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];
const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

/** A candidate key with the correlation score that produced it. */
export interface KeyEstimate {
  /** Tonic pitch class (0–11). */
  readonly tonic: number;
  readonly mode: Mode;
  /** Pearson correlation with the key profile in [-1, 1]; higher is better. */
  readonly score: number;
  /** The key as a spelled {@link Key} (tonic spelled to minimise accidentals). */
  readonly key: Key;
}

/** A 12-bin pitch-class histogram counting each note once. */
export function pitchClassWeights(
  notes: ReadonlyArray<Note | NoteLike | string>
): number[] {
  const w = new Array(12).fill(0);
  for (const n of notes) w[pitchClassOf(Note.from(n))] += 1;
  return w;
}

/** A 12-bin pitch-class histogram weighted by each event's sounding duration. */
export function pitchClassWeightsFromStream(stream: NoteStream): number[] {
  const w = new Array(12).fill(0);
  for (const e of stream) {
    w[pitchClassOf(e.pitch)] += Math.max(0, e.duration);
  }
  return w;
}

/** Pearson correlation of two equal-length vectors (0 if a vector is constant). */
function pearson(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < n; i++) {
    sa += a[i] as number;
    sb += b[i] as number;
  }
  const ma = sa / n;
  const mb = sb / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = (a[i] as number) - ma;
    const xb = (b[i] as number) - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const denom = Math.sqrt(da * db);
  return denom === 0 ? 0 : num / denom;
}

/** Spell a tonic pitch class so its key signature has the fewest accidentals. */
function tonicNote(pc: number, mode: Mode): Note {
  const sharp = Note.fromMidi(pc + 60, "sharp");
  const flat = Note.fromMidi(pc + 60, "flat");
  const sharpCount = Math.abs(new Key(sharp, mode).signature.count);
  const flatCount = Math.abs(new Key(flat, mode).signature.count);
  return flatCount <= sharpCount ? flat : sharp;
}

/**
 * Rank all 24 keys against a pitch-class weight histogram, best first.
 * Accepts either a raw 12-bin histogram or a list of notes (counted once each);
 * for duration-weighting, pass {@link pitchClassWeightsFromStream}'s output.
 */
export function detectKey(
  input: readonly number[] | ReadonlyArray<Note | NoteLike | string>
): KeyEstimate[] {
  const weights: readonly number[] =
    input.length === 12 && input.every((x) => typeof x === "number")
      ? (input as readonly number[])
      : pitchClassWeights(input as ReadonlyArray<Note | NoteLike | string>);

  const estimates: KeyEstimate[] = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const [mode, profile] of [
      ["major", MAJOR_PROFILE],
      ["minor", MINOR_PROFILE],
    ] as const) {
      const rotated = profile.map(
        (_, i) => profile[mod(i - tonic, 12)] as number
      );
      const score = pearson(weights, rotated);
      estimates.push({
        tonic,
        mode,
        score,
        key: new Key(tonicNote(tonic, mode), mode),
      });
    }
  }
  return estimates.sort((a, b) => b.score - a.score);
}
