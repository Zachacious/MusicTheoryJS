/**
 * Bridging MIDI (ticks) and the symbolic analysis layer (seconds).
 *
 * A {@link MidiFile} times notes in ticks; the analysis {@link NoteStream} times
 * them in seconds. These converters translate between the two using the file's
 * PPQ and tempo, and map MIDI note numbers to spelled {@link Note}s.
 */

import type { NoteEvent, NoteStream, NoteStreamInput } from "../analysis/types";
import { type EnharmonicPreference, Note } from "../note/note";
import { type TimeSignatureLike, asTimeSignature } from "../rhythm/meter";
import type { MidiFile, MidiNote, MidiTempoEvent } from "./types";

/** Default MIDI tempo: 500000 µs/quarter = 120 BPM. */
export const DEFAULT_TEMPO = 500000;
/** Default ticks-per-quarter used when writing if none is given. */
export const DEFAULT_PPQ = 480;

/** Seconds per tick for a given PPQ and tempo (µs per quarter note). */
export function secondsPerTick(ppq: number, tempo = DEFAULT_TEMPO): number {
  return tempo / 1e6 / ppq;
}

/** Convert beats-per-minute to a MIDI tempo (µs per quarter note). */
export function bpmToTempo(bpm: number): number {
  return Math.round(60_000_000 / bpm);
}

/** Convert a MIDI tempo (µs per quarter note) to beats-per-minute. */
export function tempoToBpm(tempo: number): number {
  return 60_000_000 / tempo;
}

/** Seconds elapsed at an absolute tick, integrating a tempo map (each tempo
 * holds until the next change; before the first change, the first applies). */
function tickSeconds(
  tick: number,
  ppq: number,
  map: readonly MidiTempoEvent[]
): number {
  let seconds = 0;
  let prevTick = 0;
  let tempo = map[0]?.tempo ?? DEFAULT_TEMPO;
  for (const change of map) {
    if (change.tick > tick) break;
    seconds += (change.tick - prevTick) * secondsPerTick(ppq, tempo);
    prevTick = change.tick;
    tempo = change.tempo;
  }
  return seconds + (tick - prevTick) * secondsPerTick(ppq, tempo);
}

/**
 * Convert a parsed MIDI file to a {@link NoteStream} in seconds, spelling each
 * note. A file with tempo changes is integrated over its tempo map, so times
 * stay honest through a ritardando. By default all tracks are merged; pass
 * `track` to take just one.
 */
export function midiToNoteStream(
  file: MidiFile,
  options: { track?: number; prefer?: EnharmonicPreference } = {}
): NoteStream {
  const map = file.tempoMap;
  let toSeconds: (tick: number) => number;
  if (map !== undefined && map.length > 1) {
    toSeconds = (tick) => tickSeconds(tick, file.ppq, map);
  } else {
    const spt = secondsPerTick(file.ppq, file.tempo ?? DEFAULT_TEMPO);
    toSeconds = (tick) => tick * spt;
  }
  const tracks =
    options.track !== undefined
      ? [file.tracks[options.track]].filter(Boolean)
      : file.tracks;

  const events: NoteEvent[] = [];
  for (const track of tracks) {
    for (const n of (track as { notes: MidiNote[] }).notes) {
      const start = toSeconds(n.start);
      events.push({
        pitch: Note.fromMidi(n.note, options.prefer ?? "sharp"),
        start,
        duration: toSeconds(n.start + n.duration) - start,
        velocity: n.velocity,
      });
    }
  }
  events.sort((a, b) => a.start - b.start);
  return events;
}

/**
 * Convert a {@link NoteStream} (seconds) to a single-track {@link MidiFile}.
 * Times are quantised to ticks at the chosen PPQ; every note lasts at least one
 * tick. Pass `timeSignature` (`"6/8"`, `[3, 4]`, or an object) to stamp a
 * time-signature meta event on the file.
 */
export function noteStreamToMidi(
  stream: NoteStreamInput,
  options: {
    ppq?: number;
    tempo?: number;
    channel?: number;
    timeSignature?: TimeSignatureLike;
  } = {}
): MidiFile {
  const ppq = options.ppq ?? DEFAULT_PPQ;
  const tempo = options.tempo ?? DEFAULT_TEMPO;
  const channel = options.channel ?? 0;
  const spt = secondsPerTick(ppq, tempo);

  const notes: MidiNote[] = stream.map((e) => ({
    note: Note.from(e.pitch).midi,
    start: Math.round(e.start / spt),
    duration: Math.max(1, Math.round(e.duration / spt)),
    velocity: e.velocity ?? 80,
    channel,
  }));

  const file: MidiFile = { format: 0, ppq, tempo, tracks: [{ notes }] };
  return options.timeSignature === undefined
    ? file
    : { ...file, timeSignature: asTimeSignature(options.timeSignature) };
}
