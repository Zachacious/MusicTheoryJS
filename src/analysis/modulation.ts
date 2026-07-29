/**
 * Modulation detection: where a performance changes key.
 *
 * The stream is scanned with overlapping windows; each window's pitch-class
 * histogram (weighted by sounding duration inside the window) is ranked with
 * the Krumhansl–Schmuckler profiles, and runs of windows agreeing on a best
 * key merge into segments. Time is whatever unit the stream uses — seconds,
 * beats, or ticks — as with the rest of the analysis layer.
 */

import type { Key } from "../key/key";
import { Note } from "../note/note";
import { pitchClass as pitchClassOf } from "../pitch/spelled";
import { detectKey } from "./key";
import type { NoteStreamInput } from "./types";

/** A stretch of the stream governed by one key. */
export interface KeySegment {
  readonly key: Key;
  readonly start: number;
  readonly end: number;
  /** Mean best-key correlation over the segment's windows, in [-1, 1]. */
  readonly score: number;
}

/** Options for {@link detectModulations}. */
export interface ModulationOptions {
  /**
   * Window length in the stream's own time unit. The default adapts to the
   * stream: an eighth of its span, widened until a window covers about eight
   * events on average — sparse monophonic lines need wider windows than
   * dense polyphony. Smaller windows react faster but flicker more.
   */
  readonly windowSize?: number;
  /** Hop between window starts. Default: half the window. */
  readonly hopSize?: number;
  /**
   * Segments shorter than this are absorbed into their longer neighbour —
   * single-window blips at ambiguous moments should not read as
   * modulations. Default: the hop size.
   */
  readonly minSegment?: number;
}

interface WindowEstimate {
  readonly start: number;
  readonly end: number;
  readonly tonic: number;
  readonly mode: "major" | "minor";
  readonly key: Key;
  readonly score: number;
}

/**
 * Split a note stream into key segments, detecting where it modulates. Each
 * segment carries the winning {@link Key} and the mean profile correlation
 * that backs it. A stream that never changes key comes back as one segment.
 *
 * @example
 * ```ts
 * import { detectModulations } from "musictheoryjs";
 * const bar = (names, at) => names.map((pitch, i) => ({ pitch, start: at + i, duration: 1 }));
 * const stream = [
 *   ...bar(["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"], 0),
 *   ...bar(["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"], 8),
 * ];
 * const segments = detectModulations(stream, { windowSize: 8, hopSize: 8 });
 * segments.length; // => 2
 * segments[0].key.toString(); // => "C major"
 * segments[1].key.toString(); // => "G major"
 * segments[1].start; // => 8
 * ```
 */
export function detectModulations(
  stream: NoteStreamInput,
  options: ModulationOptions = {}
): KeySegment[] {
  if (stream.length === 0) return [];

  const events = stream.map((e) => ({
    pc: pitchClassOf(Note.from(e.pitch)),
    start: e.start,
    end: e.start + Math.max(0, e.duration),
  }));
  const first = Math.min(...events.map((e) => e.start));
  const last = Math.max(...events.map((e) => e.end));
  const span = last - first;

  const windowSize =
    options.windowSize ??
    (span > 0
      ? Math.max(span / 8, Math.min(span, (span * 8) / events.length))
      : 1);
  if (!(windowSize > 0)) {
    throw new RangeError(`windowSize must be positive, got ${windowSize}`);
  }
  const hopSize = options.hopSize ?? windowSize / 2;
  if (!(hopSize > 0)) {
    throw new RangeError(`hopSize must be positive, got ${hopSize}`);
  }
  const minSegment = options.minSegment ?? hopSize;

  // Estimate the best key window by window; silent windows contribute
  // nothing. The `t === first` arm guarantees one window even when the span
  // is zero (a single chord); nothing extends the loop beyond the span, so
  // a stream of zero-duration events cannot spin it forever.
  const estimates: WindowEstimate[] = [];
  for (let t = first; t === first || t < last; t += hopSize) {
    const end = t + windowSize;
    const weights = new Array(12).fill(0) as number[];
    let total = 0;
    for (const e of events) {
      const overlap = Math.min(end, e.end) - Math.max(t, e.start);
      if (overlap > 0) {
        weights[e.pc] = (weights[e.pc] as number) + overlap;
        total += overlap;
      }
    }
    if (total > 0) {
      const best = detectKey(weights)[0];
      if (best) {
        estimates.push({
          start: Math.max(t, first),
          end: Math.min(end, last),
          tonic: best.tonic,
          mode: best.mode,
          key: best.key,
          score: best.score,
        });
      }
    }
  }

  // Drop transitional windows: one straddling a key change fits *neither*
  // key well, so its best estimate is both wrong and weak. A window whose
  // score falls well below its neighbours', while agreeing with neither of
  // their keys, is noise between segments — not a segment.
  const sameKey = (a: WindowEstimate, b: WindowEstimate): boolean =>
    a.tonic === b.tonic && a.mode === b.mode;
  const windows = estimates.filter((w, i) => {
    const prev = estimates[i - 1];
    const next = estimates[i + 1];
    if (prev === undefined && next === undefined) return true;
    if (prev !== undefined && sameKey(w, prev)) return true;
    if (next !== undefined && sameKey(w, next)) return true;
    const ref = Math.min(
      prev?.score ?? Number.POSITIVE_INFINITY,
      next?.score ?? Number.POSITIVE_INFINITY
    );
    return w.score >= 0.8 * ref;
  });

  // Merge runs of windows that agree on the key.
  const segments: KeySegment[] = [];
  let run: WindowEstimate[] = [];
  const flush = (): void => {
    const head = run[0];
    const tail = run[run.length - 1];
    if (head === undefined || tail === undefined) return;
    segments.push({
      key: head.key,
      start: head.start,
      end: tail.end,
      score: run.reduce((sum, w) => sum + w.score, 0) / run.length,
    });
    run = [];
  };
  for (const w of windows) {
    const prev = run[run.length - 1];
    if (prev !== undefined && !sameKey(prev, w)) {
      flush();
    }
    run.push(w);
  }
  flush();

  // Adjacent segments meet at one boundary: overlapping windows split the
  // difference, and gaps left by dropped transition windows close the same
  // way.
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1] as KeySegment;
    const cur = segments[i] as KeySegment;
    if (cur.start !== prev.end) {
      const boundary = (cur.start + prev.end) / 2;
      segments[i - 1] = { ...prev, end: boundary };
      segments[i] = { ...cur, start: boundary };
    }
  }

  // Absorb blips: a segment too short to be a real modulation joins its
  // longer neighbour, which keeps its own key and swallows the time span.
  let changed = true;
  while (changed && segments.length > 1) {
    changed = false;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i] as KeySegment;
      if (seg.end - seg.start >= minSegment) continue;
      const before = segments[i - 1];
      const after = segments[i + 1];
      const lengthOf = (s: KeySegment | undefined): number =>
        s === undefined ? -1 : s.end - s.start;
      if (before !== undefined && lengthOf(before) >= lengthOf(after)) {
        segments[i - 1] = { ...before, end: seg.end };
      } else if (after !== undefined) {
        segments[i + 1] = { ...after, start: seg.start };
      } else {
        continue;
      }
      segments.splice(i, 1);
      changed = true;
      break;
    }
  }

  // Removing a blip can leave two same-key segments touching — rejoin them.
  const coalesced: KeySegment[] = [];
  for (const seg of segments) {
    const prev = coalesced[coalesced.length - 1];
    if (
      prev !== undefined &&
      prev.key.mode === seg.key.mode &&
      prev.key.tonic.pitchClass === seg.key.tonic.pitchClass
    ) {
      const prevLen = prev.end - prev.start;
      const segLen = seg.end - seg.start;
      coalesced[coalesced.length - 1] = {
        key: prev.key,
        start: prev.start,
        end: seg.end,
        score:
          prevLen + segLen > 0
            ? (prev.score * prevLen + seg.score * segLen) / (prevLen + segLen)
            : prev.score,
      };
    } else {
      coalesced.push(seg);
    }
  }
  return coalesced;
}
