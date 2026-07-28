/**
 * Harmonic analysis over time: which chord is sounding when.
 *
 * Given a {@link NoteStream}, these functions find the notes active at a moment
 * or within a span and identify the chord they form (via {@link detectChord}),
 * producing a chord timeline a client can display, re-harmonise, or label with
 * Roman numerals through a {@link Key}.
 */

import { type Chord, detectChord } from "../chord/index";
import type { Note } from "../note/note";
import type { NoteEvent, NoteStream } from "./types";

const END = (e: NoteEvent) => e.start + e.duration;

/** The notes sounding at `time` (event active when `start <= time < end`). */
export function notesSoundingAt(stream: NoteStream, time: number): Note[] {
  return stream
    .filter((e) => e.start <= time && time < END(e))
    .map((e) => e.pitch);
}

/** The chord formed by the notes sounding at `time`, or `null` if none matches. */
export function detectChordAt(stream: NoteStream, time: number): Chord | null {
  const notes = notesSoundingAt(stream, time);
  return notes.length === 0 ? null : detectChord(notes);
}

/** The distinct onset times in the stream, ascending. */
export function onsetTimes(stream: NoteStream): number[] {
  return [...new Set(stream.map((e) => e.start))].sort((a, b) => a - b);
}

/** A chord identified over a time span. */
export interface ChordSpan {
  readonly start: number;
  readonly end: number;
  /** The detected chord, or `null` if the notes in the span form no known chord. */
  readonly chord: Chord | null;
}

/**
 * Split the stream at the given ascending `boundaries` and identify the chord
 * in each `[boundaries[i], boundaries[i+1])` span. A note counts toward a span
 * if it overlaps it at all. Pass {@link onsetTimes} for onset-based segmentation.
 */
export function segmentChords(
  stream: NoteStream,
  boundaries: readonly number[]
): ChordSpan[] {
  const spans: ChordSpan[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i] as number;
    const end = boundaries[i + 1] as number;
    const notes = stream
      .filter((e) => e.start < end && END(e) > start)
      .map((e) => e.pitch);
    spans.push({
      start,
      end,
      chord: notes.length === 0 ? null : detectChord(notes),
    });
  }
  return spans;
}
