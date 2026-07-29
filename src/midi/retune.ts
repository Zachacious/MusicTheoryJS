/**
 * Retune a MIDI file to any {@link Tuning} using pitch bends.
 *
 * Each key is mapped to a tuning degree the Scala way — successive MIDI notes
 * are successive degrees, anchored at a root key — then moved to the nearest
 * equal-tempered key with the microtonal remainder as a per-note `bend`
 * (always within ±50 cents, safely inside the GM ±2-semitone bend range).
 * Because bends are per-channel, notes are spread across channels by default
 * so simultaneous notes with different bends don't fight.
 */

import { type Tuning, degreeCents } from "../tuning/tuning";
import type { MidiFile, MidiNote, MidiTrack } from "./types";

export interface RetuneOptions {
  /** The MIDI key mapped to degree 0 of the tuning (and left unbent when the
   * tuning starts at 0 cents). Default 60, middle C. */
  root?: number;
  /** Rotate notes across MIDI channels (skipping the drum channel 9) so
   * overlapping notes carry independent bends. Default true. */
  spreadChannels?: boolean;
}

/** Channels used by the spread rotation — all except 9 (GM drums). */
const SPREAD_CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];

/**
 * Retune every note of a MIDI file to a tuning. For 12-degree tunings this
 * bends each key in place (Just Intonation thirds pull ~14 cents flat); for
 * other sizes the keyboard maps linearly — with a 7-degree maqam, the key an
 * octave above the root sounds degree 12, not a doubled frequency — so play
 * degree numbers, not piano voicings, for non-12 tunings. Notes on the GM
 * percussion channel (9) select drums, not pitches, and pass through
 * untouched.
 *
 * @example
 * ```ts
 * import { retuneMidi, justIntonation, writeMidi } from "musictheoryjs";
 * const file = {
 *   format: 0,
 *   ppq: 480,
 *   tracks: [
 *     { notes: [{ note: 64, start: 0, duration: 480, velocity: 96, channel: 0 }] },
 *   ],
 * };
 * const just = retuneMidi(file, justIntonation());
 * Math.round(just.tracks[0].notes[0].bend * 100); // => -14
 * just.tracks[0].notes[0].note; // => 64
 * writeMidi(just).length > 0; // => true
 * ```
 */
export function retuneMidi(
  file: MidiFile,
  tuning: Tuning,
  options: RetuneOptions = {}
): MidiFile {
  const root = options.root ?? 60;
  const spread = options.spreadChannels ?? true;

  let index = 0;
  const tracks: MidiTrack[] = file.tracks.map((track) => ({
    ...track,
    notes: track.notes.map((n): MidiNote => {
      // Channel 9 is GM percussion: note numbers select drums, not pitches,
      // so retuning or moving them would change the instrument. Pass through.
      if (n.channel === 9) return n;
      // Pitch target in 12-TET semitone space, then the nearest key + bend.
      const target = root + degreeCents(tuning, n.note - root) / 100;
      const note = Math.min(127, Math.max(0, Math.round(target)));
      const bend = target - note;
      const channel = spread
        ? (SPREAD_CHANNELS[index++ % SPREAD_CHANNELS.length] as number)
        : n.channel;
      const { bend: _dropped, ...rest } = n;
      return {
        ...rest,
        note,
        channel,
        ...(bend === 0 ? {} : { bend }),
      };
    }),
  }));

  return { ...file, tracks };
}
