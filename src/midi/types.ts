/**
 * Standard MIDI File (SMF) types.
 *
 * The model is note-centric: rather than exposing raw note-on/note-off pairs,
 * a parsed file gives {@link MidiNote}s with a start tick and a duration. Times
 * are in MIDI ticks; divide by `ppq` to get quarter notes, and combine with a
 * tempo to get seconds (see the `convert` module).
 */

import type { TimeSignature } from "../rhythm/meter";

/** A note with tick timing, as read from or written to a MIDI file. */
export interface MidiNote {
  /** MIDI note number, 0–127 (middle C = 60). */
  readonly note: number;
  /** Start time in ticks from the beginning of the track. */
  readonly start: number;
  /** Duration in ticks. */
  readonly duration: number;
  /** Note-on velocity, 1–127. */
  readonly velocity: number;
  /** MIDI channel, 0–15. */
  readonly channel: number;
  /**
   * Pitch-bend offset in semitones in effect at the note's start, assuming
   * the General MIDI ±2-semitone bend range. Absent means centred (no bend).
   * Written as a pitch-bend event just before the note-on; see `retuneMidi`.
   */
  readonly bend?: number;
}

/** One track of a MIDI file. */
export interface MidiTrack {
  /** Track name from an FF 03 meta event, if present. */
  readonly name?: string;
  readonly notes: MidiNote[];
}

/** A parsed (or to-be-written) MIDI file. */
export interface MidiFile {
  /** SMF format: 0 (single track), 1 (simultaneous tracks), or 2 (independent). */
  readonly format: number;
  /** Pulses (ticks) per quarter note. */
  readonly ppq: number;
  readonly tracks: MidiTrack[];
  /** Tempo in microseconds per quarter note (500000 = 120 BPM) if the file set one. */
  readonly tempo?: number;
  /** Time signature from the first FF 58 meta event, if the file set one. */
  readonly timeSignature?: TimeSignature;
}
