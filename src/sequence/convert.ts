/**
 * Take a beat-timed stream out of the sequence world: to a MIDI file (beats
 * map to ticks exactly — both are defined per quarter note), to a notation
 * {@link Score} for the ABC and MusicXML exporters, or back in from MIDI.
 */

import type { NoteEvent, NoteStream, NoteStreamInput } from "../analysis/types";
import type { KeyLike } from "../key/key";
import {
  DEFAULT_PPQ,
  DEFAULT_TEMPO,
  bpmToTempo,
  tempoToBpm,
} from "../midi/convert";
import type { MidiFile, MidiNote } from "../midi/types";
import type { Score, ScoreEvent } from "../notation/score";
import { type EnharmonicPreference, Note } from "../note/note";
import {
  type Duration,
  type DurationLike,
  durationBeats,
} from "../rhythm/duration";
import type { TimeSignatureLike } from "../rhythm/meter";
import { asTimeSignature } from "../rhythm/meter";
import { asNoteStream } from "./stream";

const EPS = 1e-6;

/** One point of a tempo map: from `beat` on, `bpm` quarter-note beats per
 * minute. Each tempo holds until the next point (no ramps — sample an
 * accelerando as several points); the first point's tempo also applies
 * before it. */
export interface TempoPoint {
  readonly beat: number;
  readonly bpm: number;
}

/** Normalise a tempo argument — a bare BPM or a map — to sorted points. */
function asTempoPoints(
  tempo: number | readonly TempoPoint[]
): readonly TempoPoint[] {
  if (typeof tempo === "number") {
    if (!(tempo > 0)) {
      throw new RangeError(`bpm must be positive, got ${tempo}`);
    }
    return [{ beat: 0, bpm: tempo }];
  }
  if (tempo.length === 0) {
    throw new RangeError("a tempo map needs at least one point");
  }
  for (const p of tempo) {
    if (!(p.bpm > 0)) {
      throw new RangeError(`bpm must be positive, got ${p.bpm}`);
    }
    if (!(p.beat >= 0)) {
      throw new RangeError(`tempo points cannot sit before beat 0 (${p.beat})`);
    }
  }
  return [...tempo].sort((a, b) => a.beat - b.beat);
}

/** Seconds elapsed at a beat, integrating a stepwise tempo map. */
function beatSeconds(beat: number, points: readonly TempoPoint[]): number {
  let seconds = 0;
  let prev = 0;
  let bpm = (points[0] as TempoPoint).bpm;
  for (const p of points) {
    if (p.beat > beat) break;
    seconds += (p.beat - prev) * (60 / bpm);
    prev = p.beat;
    bpm = p.bpm;
  }
  return seconds + (beat - prev) * (60 / bpm);
}

/**
 * A beat-timed stream as a single-track {@link MidiFile}. Beats convert to
 * ticks exactly (`beat × ppq`); the tempo — a BPM, or a {@link TempoPoint}
 * map for music that speeds up or slows down — only stamps the file's
 * playback speed. Events must not start before time zero.
 *
 * @example
 * ```ts
 * import { sequenceToMidi, melody } from "musictheoryjs";
 * const file = sequenceToMidi(melody(["C4", "E4"], "q"), { bpm: 140 });
 * file.tracks[0]?.notes.map((n) => n.start); // => [0, 480]
 * file.tracks[0]?.notes[0]?.duration; // => 480
 * file.tempo; // => 428571
 * ```
 */
export function sequenceToMidi(
  stream: NoteStreamInput,
  options: {
    bpm?: number;
    /** Tempo changes in beats; wins over `bpm` when both are given. */
    tempoMap?: readonly TempoPoint[];
    ppq?: number;
    channel?: number;
    timeSignature?: TimeSignatureLike;
    /** Velocity for events that carry none (default 80). */
    velocity?: number;
    /** Track name meta event. */
    name?: string;
  } = {}
): MidiFile {
  const ppq = options.ppq ?? DEFAULT_PPQ;
  const channel = options.channel ?? 0;
  const fallback = options.velocity ?? 80;
  const notes: MidiNote[] = asNoteStream(stream).map((e) => {
    if (e.start < -EPS) {
      throw new RangeError(
        `event at beat ${e.start} starts before time zero; shift the stream first`
      );
    }
    return {
      note: e.pitch.midi,
      start: Math.round(Math.max(0, e.start) * ppq),
      duration: Math.max(1, Math.round(e.duration * ppq)),
      velocity: e.velocity ?? fallback,
      channel,
    };
  });
  const track =
    options.name === undefined ? { notes } : { name: options.name, notes };
  const points =
    options.tempoMap === undefined
      ? undefined
      : asTempoPoints(options.tempoMap);
  const file: MidiFile = {
    format: 0,
    ppq,
    tempo: bpmToTempo(points?.[0]?.bpm ?? options.bpm ?? 120),
    ...(points === undefined
      ? {}
      : {
          tempoMap: points.map((p) => ({
            tick: Math.round(p.beat * ppq),
            tempo: bpmToTempo(p.bpm),
          })),
        }),
    tracks: [track],
  };
  return options.timeSignature === undefined
    ? file
    : { ...file, timeSignature: asTimeSignature(options.timeSignature) };
}

/**
 * A parsed MIDI file as a beat-timed stream: ticks divide by the file's PPQ,
 * so the result is tempo-independent (unlike `midiToNoteStream`, which
 * gives seconds). All tracks merge unless `track` picks one.
 *
 * @example
 * ```ts
 * import { midiToSequence, sequenceToMidi, melody } from "musictheoryjs";
 * const back = midiToSequence(sequenceToMidi(melody(["C4", "E4"], "q")));
 * back.map((e) => e.start); // => [0, 1]
 * back.map((e) => e.pitch.toString()); // => ["C4", "E4"]
 * ```
 */
export function midiToSequence(
  file: MidiFile,
  options: { track?: number; prefer?: EnharmonicPreference } = {}
): NoteStream {
  const tracks =
    options.track !== undefined
      ? [file.tracks[options.track]].filter(Boolean)
      : file.tracks;
  const events: NoteEvent[] = [];
  for (const track of tracks) {
    for (const n of (track as { notes: MidiNote[] }).notes) {
      events.push({
        pitch: Note.fromMidi(n.note, options.prefer ?? "sharp"),
        start: n.start / file.ppq,
        duration: n.duration / file.ppq,
        velocity: n.velocity,
      });
    }
  }
  events.sort((a, b) => a.start - b.start);
  return events;
}

/**
 * A beat-timed stream in seconds at a tempo — the form Web Audio scheduling
 * and the seconds-based analysis conversions expect. The tempo may be a
 * plain BPM or a {@link TempoPoint} map, integrated stepwise, so a
 * ritardando lands in real time.
 *
 * @example
 * ```ts
 * import { sequenceSeconds, melody } from "musictheoryjs";
 * sequenceSeconds(melody(["C4", "E4"], "q"), 120).map((e) => e.start); // => [0, 0.5]
 * sequenceSeconds(melody(["C4"], "q"), 60)[0]?.duration; // => 1
 * const rit = [{ beat: 0, bpm: 120 }, { beat: 2, bpm: 60 }];
 * sequenceSeconds(melody(["C4", "E4", "G4"], "q"), rit).map((e) => e.start); // => [0, 0.5, 1]
 * sequenceSeconds(melody(["C4", "E4", "G4"], "q"), rit)[2]?.duration; // => 1
 * ```
 */
export function sequenceSeconds(
  stream: NoteStreamInput,
  tempo: number | readonly TempoPoint[]
): NoteStream {
  const points = asTempoPoints(tempo);
  return asNoteStream(stream).map((e) => {
    const start = beatSeconds(e.start, points);
    return {
      ...e,
      start,
      duration: beatSeconds(e.start + e.duration, points) - start,
    };
  });
}

/**
 * A MIDI file's tempo changes in sequence terms: beats and quarter-note
 * BPM, ready to hand to {@link sequenceSeconds}. A file with no tempo
 * events reports the MIDI default, 120.
 *
 * @example
 * ```ts
 * import { midiTempoMap, sequenceToMidi, melody } from "musictheoryjs";
 * const slowing = [{ beat: 0, bpm: 120 }, { beat: 2, bpm: 60 }];
 * const file = sequenceToMidi(melody(["C4", "E4", "G4"], "q"), { tempoMap: slowing });
 * midiTempoMap(file); // => [{ beat: 0, bpm: 120 }, { beat: 2, bpm: 60 }]
 * midiTempoMap({ format: 0, ppq: 480, tracks: [] }); // => [{ beat: 0, bpm: 120 }]
 * ```
 */
export function midiTempoMap(file: MidiFile): TempoPoint[] {
  const map = file.tempoMap;
  if (map === undefined || map.length === 0) {
    return [{ beat: 0, bpm: tempoToBpm(file.tempo ?? DEFAULT_TEMPO) }];
  }
  return map.map((t) => ({
    beat: t.tick / file.ppq,
    bpm: tempoToBpm(t.tempo),
  }));
}

/** Plain, dotted, and common-tuplet durations a single score event can
 * carry, with their spans in beats. */
const NOTATABLE: ReadonlyArray<{ duration: Duration; beats: number }> = (
  [
    ...[0.5, 1, 2, 4, 8, 16, 32, 64, 128].flatMap((value) => [
      { value, dots: 0 },
      { value, dots: 1 },
      { value, dots: 2 },
    ]),
    ...[2, 4, 8, 16].flatMap((value) => [
      { value, dots: 0, tuplet: { actual: 3, normal: 2 } },
      { value, dots: 0, tuplet: { actual: 5, normal: 4 } },
    ]),
  ] as Duration[]
)
  .map((duration) => ({ duration, beats: durationBeats(duration) }))
  // Longest first, so greedy rest decomposition picks the biggest piece.
  .sort((a, b) => b.beats - a.beats);

function notatable(beats: number): Duration | null {
  const hit = NOTATABLE.find((c) => Math.abs(c.beats - beats) < EPS);
  return hit === null || hit === undefined ? null : hit.duration;
}

/**
 * A beat-timed stream as a notation {@link Score}, ready for the ABC and
 * MusicXML exporters. Events that share a start and duration become one
 * chord; gaps become rests. The stream must be sequential — overlapping
 * events, or simultaneous events of different lengths, need voices that the
 * score model doesn't have, and each event's length must be a plain, dotted,
 * or triplet/quintuplet value. Quantize first when it isn't.
 *
 * @example
 * ```ts
 * import { sequenceToScore, melody, toABC } from "musictheoryjs";
 * const score = sequenceToScore(melody(["C4", null, "E4"], "q"), { key: "C major" });
 * score.events.length; // => 3
 * score.events[1]?.notes?.length; // => 0
 * toABC(score).includes("z"); // => true
 * ```
 */
export function sequenceToScore(
  stream: NoteStreamInput,
  options: {
    title?: string;
    key?: KeyLike;
    timeSignature?: TimeSignatureLike;
    /** Tempo in quarter-note beats per minute. */
    tempo?: number;
  } = {}
): Score {
  const events = asNoteStream(stream);
  const scoreEvents: ScoreEvent[] = [];
  let at = 0;

  const pushRest = (span: number): void => {
    // Rests can split freely — no tie needed — so any gap decomposes.
    let rest = span;
    while (rest > EPS) {
      const piece =
        NOTATABLE.find((c) => c.beats <= rest + EPS) ??
        NOTATABLE[NOTATABLE.length - 1];
      if (piece === undefined || piece.beats > rest + EPS) break;
      scoreEvents.push({ notes: [], duration: piece.duration });
      rest -= piece.beats;
    }
  };

  let i = 0;
  while (i < events.length) {
    const head = events[i] as NoteEvent;
    if (head.start > at + EPS) pushRest(head.start - at);
    if (head.start < at - EPS) {
      throw new RangeError(
        `events overlap at beat ${head.start}; a score has no voices — quantize or split the stream`
      );
    }
    // Gather the chord: every event sharing this start.
    const group: NoteEvent[] = [head];
    while (
      i + 1 < events.length &&
      Math.abs((events[i + 1] as NoteEvent).start - head.start) < EPS
    ) {
      group.push(events[++i] as NoteEvent);
    }
    if (group.some((e) => Math.abs(e.duration - head.duration) > EPS)) {
      throw new RangeError(
        `simultaneous events of different lengths at beat ${head.start}; a score has no voices`
      );
    }
    const duration = notatable(head.duration);
    if (duration === null) {
      throw new RangeError(
        `duration ${head.duration} beats at beat ${head.start} is not a notatable value; quantize first`
      );
    }
    scoreEvents.push({ notes: group.map((e) => e.pitch), duration });
    at = head.start + head.duration;
    i++;
  }

  return {
    ...(options.title !== undefined ? { title: options.title } : {}),
    ...(options.key !== undefined ? { key: options.key } : {}),
    timeSignature: asTimeSignature(options.timeSignature ?? "4/4"),
    ...(options.tempo !== undefined ? { tempo: options.tempo } : {}),
    events: scoreEvents,
  };
}
