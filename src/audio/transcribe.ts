/**
 * Monophonic melody transcription: audio in, {@link NoteStream} out.
 *
 * Built from the existing pieces — YIN pitch detection frame by frame, an RMS
 * silence gate, and spectral-flux onsets to separate repeated notes. Frames
 * that agree on a pitch merge into notes; blips shorter than the minimum are
 * dropped. Strictly monophonic: one voice at a time (polyphony belongs to a
 * client app with a suitable model).
 */

import type { NoteEvent, NoteStream } from "../analysis/types";
import { type EnharmonicPreference, Note } from "../note/note";
import { detectOnsets } from "./onset";
import { type PitchOptions, detectPitch } from "./pitch";

export interface TranscribeOptions extends PitchOptions {
  /** Analysis frame size in samples. Default 2048. */
  frameSize?: number;
  /** Hop between frames in samples. Default 256. */
  hop?: number;
  /** RMS below which a frame counts as silence. Default 0.01. */
  silenceThreshold?: number;
  /** Drop notes shorter than this many seconds. Default 0.06. */
  minNoteDuration?: number;
  /** Onset peak sensitivity (see the onset module). Default 1.5. */
  onsetSensitivity?: number;
  /** Accidental preference when spelling detected notes. Default sharps. */
  prefer?: EnharmonicPreference;
}

/** One frame of a pitch track. */
export interface PitchFrame {
  /** Frame start time in seconds. */
  readonly time: number;
  /** Detected fundamental in Hz, or `null` when silent/unpitched. */
  readonly frequency: number | null;
  /** Root-mean-square level of the frame. */
  readonly rms: number;
}

/**
 * Track pitch over time: YIN on successive frames with an RMS silence gate.
 * The raw material for {@link transcribeMelody}, exposed for callers who want
 * the continuous track (vibrato, glides, tuning drift) rather than notes.
 *
 * @example
 * ```ts
 * import { trackPitch } from "musictheoryjs";
 * const sr = 44100;
 * const tone = Float32Array.from({ length: 8192 }, (_, i) =>
 *   Math.sin((2 * Math.PI * 440 * i) / sr)
 * );
 * const track = trackPitch(tone, sr);
 * track.length > 20; // => true
 * Math.round(track[0].frequency); // => 440
 * trackPitch(new Float32Array(8192), sr)[0].frequency; // => null
 * ```
 */
export function trackPitch(
  samples: Float32Array | Float64Array,
  sampleRate: number,
  options: TranscribeOptions = {}
): PitchFrame[] {
  const frameSize = options.frameSize ?? 2048;
  const hop = options.hop ?? 256;
  const gate = options.silenceThreshold ?? 0.01;

  const frames: PitchFrame[] = [];
  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    const frame = samples.subarray(start, start + frameSize);
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      const s = frame[i] as number;
      sum += s * s;
    }
    const rms = Math.sqrt(sum / frame.length);
    const frequency =
      rms < gate ? null : detectPitch(frame, sampleRate, options);
    frames.push({ time: start / sampleRate, frequency, rms });
  }
  return frames;
}

/** Nearest MIDI number for a frequency, or null. */
function midiOf(frequency: number | null): number | null {
  return frequency === null
    ? null
    : Math.round(69 + 12 * Math.log2(frequency / 440));
}

/**
 * Transcribe a monophonic melody to a {@link NoteStream} (seconds): pitch is
 * tracked frame by frame, frames agreeing on a semitone merge into notes,
 * silence and spectral-flux onsets split them, and blips shorter than
 * `minNoteDuration` are dropped. Velocity reflects each note's level relative
 * to the loudest note.
 *
 * @example
 * ```ts
 * import { transcribeMelody } from "musictheoryjs";
 * const sr = 44100;
 * const tone = (f, n) =>
 *   Float64Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * f * i) / sr));
 * const audio = new Float64Array([...tone(440, 8192), ...tone(523.25, 8192)]);
 * const notes = transcribeMelody(audio, sr);
 * notes.map((e) => e.pitch.toString()); // => ["A4", "C5"]
 * notes[0].start; // => 0
 * notes[1].duration > 0.1; // => true
 * ```
 */
export function transcribeMelody(
  samples: Float32Array | Float64Array,
  sampleRate: number,
  options: TranscribeOptions = {}
): NoteStream {
  const hop = options.hop ?? 256;
  const minDuration = options.minNoteDuration ?? 0.06;
  const frames = trackPitch(samples, sampleRate, options);
  if (frames.length === 0) return [];

  const midi = frames.map((f) => midiOf(f.frequency));
  // Despeckle: a single frame differing from two agreeing neighbours is noise.
  for (let i = 1; i < midi.length - 1; i++) {
    if (midi[i] !== midi[i - 1] && midi[i - 1] === midi[i + 1]) {
      midi[i] = midi[i - 1] as number | null;
    }
  }

  // Onsets (seconds) -> pitch-frame indices, to split repeated notes.
  const onsetFrames = new Set(
    detectOnsets(samples, sampleRate, {
      sensitivity: options.onsetSensitivity ?? 1.5,
    }).map((t) => Math.round((t * sampleRate) / hop))
  );

  interface Segment {
    midi: number;
    from: number;
    to: number; // frame indices, [from, to)
  }
  const segments: Segment[] = [];
  let open: Segment | null = null;
  for (let i = 0; i < midi.length; i++) {
    const m = midi[i] as number | null;
    if (open !== null && (m !== open.midi || onsetFrames.has(i))) {
      open.to = i;
      segments.push(open);
      open = null;
    }
    if (open === null && m !== null) {
      open = { midi: m, from: i, to: midi.length };
    }
  }
  if (open !== null) segments.push(open);

  const spt = hop / sampleRate; // seconds per frame step
  const kept = segments.filter((s) => (s.to - s.from) * spt >= minDuration);

  const level = (s: Segment) => {
    let sum = 0;
    for (let i = s.from; i < s.to; i++) sum += (frames[i] as PitchFrame).rms;
    return sum / (s.to - s.from);
  };
  const peak = Math.max(...kept.map(level), 0);

  return kept.map(
    (s): NoteEvent => ({
      pitch: Note.fromMidi(s.midi, options.prefer ?? "sharp"),
      start: s.from * spt,
      duration: (s.to - s.from) * spt,
      velocity:
        peak === 0 ? 1 : Math.max(1, Math.round((level(s) / peak) * 127)),
    })
  );
}
