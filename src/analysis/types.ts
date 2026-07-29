/**
 * Symbolic input types for analysis.
 *
 * These form the boundary between the outside world and the theory engine: a
 * client app (from MIDI, audio transcription, notation, a sequencer, …) produces
 * {@link NoteEvent}s, and the analysis functions turn them into music theory.
 * The library never touches audio itself — it works on these symbolic events.
 */

import type { Note, NoteLike } from "../note/note";

/**
 * A single sounded note positioned in time. `start` and `duration` are in
 * whatever time unit the caller uses (seconds, beats, or MIDI ticks) — the
 * analysis is unit-agnostic as long as it is consistent.
 */
export interface NoteEvent {
  readonly pitch: Note;
  readonly start: number;
  readonly duration: number;
  /** Optional MIDI-style velocity (0–127). */
  readonly velocity?: number;
}

/** A time-ordered (or unordered) collection of note events. */
export type NoteStream = readonly NoteEvent[];

/**
 * A note event as the analysis functions *accept* it: the pitch may be a
 * {@link Note}, a plain `{step, alteration, octave}` object, or a notation
 * string like `"C#4"` — no class construction required.
 */
export interface NoteEventInput {
  readonly pitch: Note | NoteLike | string;
  readonly start: number;
  readonly duration: number;
  /** Optional MIDI-style velocity (0–127). */
  readonly velocity?: number;
}

/** What stream-consuming functions accept. Streams the library *produces*
 * (e.g. from the midi module) are always concrete {@link NoteEvent}s. */
export type NoteStreamInput = readonly NoteEventInput[];
