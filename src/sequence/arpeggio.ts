/**
 * Arpeggios and strums: a chord unfolded in time.
 *
 * Both take anything {@link Chord.from} takes — a symbol, a Chord, a spec —
 * or a plain array of pitches for shapes that aren't a dictionary chord (a
 * voicing from the voice-leading module, say). Both return beat-timed
 * {@link NoteStream}s like everything else in the sequence module.
 */

import type { NoteEvent, NoteStream } from "../analysis/types";
import { Chord, type ChordLike } from "../chord/chord";
import { Note } from "../note/note";
import { type DurationLike, durationBeats } from "../rhythm/duration";
import type { PitchInput } from "./stream";

/**
 * The order an arpeggio visits its tones: a named contour, or explicit
 * 0-based indices into the (octave-extended) tone list. `"updown"` and
 * `"downup"` turn around without repeating the endpoints, the way the
 * figures are actually played.
 */
export type ArpeggioPattern =
  | "up"
  | "down"
  | "updown"
  | "downup"
  | readonly number[];

/** A chord input or a literal list of pitches, low to high. */
export type ToneInput = ChordLike | readonly PitchInput[];

function tonesOf(input: ToneInput, octaves: number): Note[] {
  if (!Number.isInteger(octaves) || octaves < 1) {
    throw new RangeError(`octaves must be a positive integer, got ${octaves}`);
  }
  const base = Array.isArray(input)
    ? (input as readonly PitchInput[]).map((p) => Note.from(p))
    : Chord.from(input as ChordLike).notes;
  if (base.length === 0) {
    throw new RangeError("cannot arpeggiate an empty set of tones");
  }
  const tones: Note[] = [];
  for (let o = 0; o < octaves; o++) {
    for (const tone of base) {
      tones.push(o === 0 ? tone : tone.withOctave(tone.octave + o));
    }
  }
  return tones;
}

function indicesOf(pattern: ArpeggioPattern, count: number): number[] {
  if (Array.isArray(pattern)) {
    const indices = pattern as readonly number[];
    for (const i of indices) {
      if (!Number.isInteger(i) || i < 0 || i >= count) {
        throw new RangeError(
          `arpeggio index ${i} is out of range for ${count} tones`
        );
      }
    }
    return [...indices];
  }
  const up = Array.from({ length: count }, (_, i) => i);
  switch (pattern) {
    case "up":
      return up;
    case "down":
      return up.slice().reverse();
    case "updown":
      // Rise then fall, skipping the repeated top and bottom: 0 1 2 1.
      return up.concat(up.slice(1, -1).reverse());
    case "downup":
      return up.slice().reverse().concat(up.slice(1, -1));
    default:
      throw new RangeError(
        `unknown arpeggio pattern: ${JSON.stringify(pattern)}`
      );
  }
}

/**
 * Unfold a chord into an arpeggio. The tone list is the chord's notes,
 * extended upward when `octaves` is more than 1; `pattern` picks the order;
 * `notes` cuts or cycles the figure to an exact count (a bar of sixteenths
 * from a triad, say).
 *
 * @example
 * ```ts
 * import { arpeggiate } from "musictheoryjs";
 * arpeggiate("C").map((e) => e.pitch.toString()); // => ["C4", "E4", "G4"]
 * arpeggiate("C", { pattern: "updown" }).map((e) => e.pitch.toString()); // => ["C4", "E4", "G4", "E4"]
 * arpeggiate("Am", { octaves: 2 }).length; // => 6
 * arpeggiate("C", { pattern: [0, 2, 1], duration: "16" }).map((e) => e.start); // => [0, 0.25, 0.5]
 * arpeggiate("C", { notes: 5 }).map((e) => e.pitch.toString()); // => ["C4", "E4", "G4", "C4", "E4"]
 * ```
 */
export function arpeggiate(
  input: ToneInput,
  options: {
    pattern?: ArpeggioPattern;
    /** Octaves the tone list spans (default 1 — just the chord). */
    octaves?: number;
    /** Duration of each note. Default an eighth. */
    duration?: DurationLike;
    /** Fraction of each duration that sounds (default 1). */
    gate?: number;
    /** Total number of notes; the pattern cycles or truncates to fit.
     * Default one full pass. */
    notes?: number;
    start?: number;
    velocity?: number;
  } = {}
): NoteStream {
  const tones = tonesOf(input, options.octaves ?? 1);
  const order = indicesOf(options.pattern ?? "up", tones.length);
  if (order.length === 0) {
    throw new RangeError("arpeggio pattern selects no tones");
  }
  const count = options.notes ?? order.length;
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`notes must be a non-negative integer, got ${count}`);
  }
  const step = durationBeats(options.duration ?? 8);
  const gate = options.gate ?? 1;
  if (!(gate > 0)) {
    throw new RangeError(`gate must be positive, got ${gate}`);
  }
  const events: NoteEvent[] = [];
  for (let i = 0; i < count; i++) {
    events.push({
      pitch: tones[order[i % order.length] as number] as Note,
      start: (options.start ?? 0) + i * step,
      duration: step * gate,
      ...(options.velocity !== undefined ? { velocity: options.velocity } : {}),
    });
  }
  return events;
}

/**
 * Strum a chord: every voice sounds, staggered by `spread` beats per voice,
 * and all ring together until the chord's duration is up. A downstroke
 * (default) reaches the low voice first, an upstroke the high one — as the
 * pick actually travels.
 *
 * @example
 * ```ts
 * import { strum } from "musictheoryjs";
 * strum("C", { spread: 0.05 }).map((e) => e.start); // => [0, 0.05, 0.1]
 * strum("C", { spread: 0.05, direction: "up" }).map((e) => e.pitch.toString()); // => ["G4", "E4", "C4"]
 * strum("C", { duration: "h" })[0]?.duration; // => 2
 * ```
 */
export function strum(
  input: ToneInput,
  options: {
    /** How long the chord rings, from the first voice. Default a quarter. */
    duration?: DurationLike;
    /** Beats between successive voices (default 0.03 — about 15 ms at 120
     * BPM). */
    spread?: number;
    /** `"down"` (low voice first, default) or `"up"`. */
    direction?: "down" | "up";
    start?: number;
    velocity?: number;
  } = {}
): NoteStream {
  const tones = tonesOf(input, 1);
  const spread = options.spread ?? 0.03;
  if (spread < 0) {
    throw new RangeError(`spread must be non-negative, got ${spread}`);
  }
  const ring = durationBeats(options.duration ?? 4);
  const start = options.start ?? 0;
  if ((tones.length - 1) * spread >= ring) {
    throw new RangeError(
      `spread ${spread} over ${tones.length} voices exceeds the duration (${ring} beats)`
    );
  }
  const order =
    (options.direction ?? "down") === "down" ? tones : tones.slice().reverse();
  return order.map((pitch, i) => ({
    pitch,
    start: start + i * spread,
    // Every voice releases together at the end of the ring.
    duration: ring - i * spread,
    ...(options.velocity !== undefined ? { velocity: options.velocity } : {}),
  }));
}
