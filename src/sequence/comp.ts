/**
 * Accompaniment from a chord list: comping patterns and bass lines.
 *
 * `compChords` is the workhorse — chords, a rhythm, a voicing style, out
 * comes a beat-timed stream. `compProgression` is the same thing addressed
 * by Roman numerals in a key, so a played ii–V–I is one call. `bassline`
 * walks (or just roots) underneath.
 */

import type { NoteEvent, NoteStream } from "../analysis/types";
import { Chord, type ChordLike } from "../chord/chord";
import { type VoiceLeadingOptions, voiceProgression } from "../chord/leading";
import { closeVoicing, drop2, drop3, spread } from "../chord/voicing";
import type { KeyLike } from "../key/key";
import { parseProgression } from "../key/progression";
import { Note } from "../note/note";
import {
  type TimeSignatureLike,
  asTimeSignature,
  barWholeNotes,
} from "../rhythm/meter";
import { type RhythmStep, rhythmToOnsets } from "../rhythm/pattern";

/** How comp voicings are built for each chord. */
export type CompVoicing = "led" | "close" | "drop2" | "drop3" | "spread";

/** Options shared by {@link compChords} and {@link compProgression}. */
export interface CompOptions {
  /**
   * The hit pattern within each chord's span, on an even grid — anything the
   * rhythm module produces. Each onset sustains to the next onset (or the
   * end of the span), scaled by `gate`. Default a single whole-span hit.
   */
  readonly rhythm?: readonly RhythmStep[];
  /** Meter; sets the bar length. Default 4/4. */
  readonly timeSignature?: TimeSignatureLike;
  /** Beats each chord occupies. Default one bar of the meter. */
  readonly beatsPerChord?: number;
  /** Voicing style (default `"led"` — voice-led through the changes). */
  readonly voicing?: CompVoicing;
  /** Passed through to the voice-leading engine when `voicing` is `"led"`. */
  readonly leading?: VoiceLeadingOptions;
  /** Fraction of each hit that sounds (default 0.9). */
  readonly gate?: number;
  readonly velocity?: number;
}

/** A chord slot: a chord, or `null` for a silent (N.C.) span. */
export type CompSlot = ChordLike | null;

function voicingsFor(
  slots: readonly CompSlot[],
  style: CompVoicing,
  leading: VoiceLeadingOptions
): Array<Note[] | null> {
  if (style === "led") {
    // Voice-lead through the sounding chords only, then re-insert silences.
    const sounding = slots.filter((c): c is ChordLike => c !== null);
    const led =
      sounding.length === 0 ? [] : voiceProgression(sounding, leading);
    let i = 0;
    return slots.map((c) => (c === null ? null : (led[i++] as Note[])));
  }
  const build =
    style === "close"
      ? closeVoicing
      : style === "drop2"
        ? drop2
        : style === "drop3"
          ? drop3
          : spread;
  return slots.map((c) => (c === null ? null : build(Chord.from(c))));
}

/**
 * Comp a list of chords: each occupies `beatsPerChord` beats (default a
 * bar), hit on the onsets of `rhythm`, each hit sustaining to the next.
 * `null` slots — `"N.C."` in a parsed progression — stay silent but keep
 * their time.
 *
 * @example
 * ```ts
 * import { compChords } from "musictheoryjs";
 * const pad = compChords(["Dm7", "G7"]);
 * pad.map((e) => e.start); // => [0, 0, 0, 0, 4, 4, 4, 4]
 * pad[0]?.duration; // => 3.6
 * const hits = compChords(["C"], { rhythm: [1, 0, 1, 0], gate: 1 });
 * [...new Set(hits.map((e) => e.start))]; // => [0, 2]
 * compChords(["C", null, "G"]).length; // => 8
 * ```
 */
export function compChords(
  chords: readonly CompSlot[],
  options: CompOptions = {}
): NoteStream {
  const ts = asTimeSignature(options.timeSignature ?? "4/4");
  const span = options.beatsPerChord ?? barWholeNotes(ts) * 4;
  if (!(span > 0)) {
    throw new RangeError(`beatsPerChord must be positive, got ${span}`);
  }
  const gate = options.gate ?? 0.9;
  if (!(gate > 0)) {
    throw new RangeError(`gate must be positive, got ${gate}`);
  }
  const pattern = options.rhythm ?? [1];
  const onsets = rhythmToOnsets(pattern);
  const step = span / pattern.length;
  const voicings = voicingsFor(
    chords,
    options.voicing ?? "led",
    options.leading ?? {}
  );

  const events: NoteEvent[] = [];
  voicings.forEach((voicing, slot) => {
    if (voicing === null) return;
    const base = slot * span;
    onsets.forEach((onset, i) => {
      const next =
        i + 1 < onsets.length ? (onsets[i + 1] as number) : pattern.length;
      const hold = (next - onset) * step * gate;
      for (const pitch of voicing) {
        events.push({
          pitch,
          start: base + onset * step,
          duration: hold,
          ...(options.velocity !== undefined
            ? { velocity: options.velocity }
            : {}),
        });
      }
    });
  });
  return events;
}

/**
 * {@link compChords} addressed by Roman numerals (or chord symbols, or a
 * named entry of `COMMON_PROGRESSIONS`) in a key — the progression-to-played
 * one-liner. `"N.C."` slots become silence.
 *
 * @example
 * ```ts
 * import { compProgression } from "musictheoryjs";
 * const played = compProgression("C major", "ii-V-I");
 * played.length; // => 12
 * [...new Set(played.map((e) => e.start))]; // => [0, 4, 8]
 * compProgression("G major", "pop", { beatsPerChord: 2 }).length; // => 16
 * ```
 */
export function compProgression(
  key: KeyLike,
  progression: string | readonly string[],
  options: CompOptions = {}
): NoteStream {
  const slots = parseProgression(key, progression).map((s) => s.chord);
  return compChords(slots, options);
}

/** Bass line styles: repeated roots, root and fifth, or a walking line. */
export type BassStyle = "roots" | "root-fifth" | "walking";

/** Realise a pitch class near a previous bass note: the octave placement
 * with the smallest move, ties resolved downward. */
function nearBass(tone: Note, previous: Note): Note {
  let best: Note | null = null;
  for (let octave = 0; octave <= 4; octave++) {
    const candidate = tone.withOctave(octave);
    if (
      best === null ||
      Math.abs(candidate.midi - previous.midi) <
        Math.abs(best.midi - previous.midi)
    ) {
      best = candidate;
    }
  }
  return best as Note;
}

/**
 * A bass line under a chord list, one note per beat of each chord's span.
 *
 * - `"roots"` — the root, held for the chord's whole span.
 * - `"root-fifth"` — root on the downbeat, fifth halfway.
 * - `"walking"` (default) — quarter notes: root first, chord tones between,
 *   and a chromatic approach into the next chord's root on the last beat.
 *   The line is deterministic; the final chord walks back toward the first
 *   (the turnaround).
 *
 * `null` slots rest. Roots land around the double bass's register (octave 2).
 *
 * @example
 * ```ts
 * import { bassline } from "musictheoryjs";
 * bassline(["C"], { style: "roots" }).map((e) => e.pitch.toString()); // => ["C2"]
 * bassline(["C"], { style: "root-fifth" }).map((e) => e.pitch.toString()); // => ["C2", "G1"]
 * const walk = bassline(["Dm7", "G7"]);
 * walk.length; // => 8
 * walk[0]?.pitch.toString(); // => "D2"
 * walk[4]?.pitch.toString(); // => "G2"
 * ```
 */
export function bassline(
  chords: readonly CompSlot[],
  options: {
    style?: BassStyle;
    timeSignature?: TimeSignatureLike;
    /** Beats each chord occupies. Default one bar of the meter. */
    beatsPerChord?: number;
    /** Fraction of each note that sounds (default 0.95). */
    gate?: number;
    velocity?: number;
  } = {}
): NoteStream {
  const ts = asTimeSignature(options.timeSignature ?? "4/4");
  const span = options.beatsPerChord ?? barWholeNotes(ts) * 4;
  if (!(span > 0)) {
    throw new RangeError(`beatsPerChord must be positive, got ${span}`);
  }
  const gate = options.gate ?? 0.95;
  const style = options.style ?? "walking";
  const parsed = chords.map((c) => (c === null ? null : Chord.from(c)));
  const rootOf = (c: Chord): Note =>
    Note.from(`${c.root.toString({ octave: false })}2`);

  const events: NoteEvent[] = [];
  const emit = (pitch: Note, start: number, duration: number): void => {
    events.push({
      pitch,
      start,
      duration: duration * gate,
      ...(options.velocity !== undefined ? { velocity: options.velocity } : {}),
    });
  };

  parsed.forEach((chord, slot) => {
    if (chord === null) return;
    const base = slot * span;
    const root = rootOf(chord);
    if (style === "roots") {
      emit(root, base, span);
      return;
    }
    if (style === "root-fifth") {
      const fifth = nearBass(chord.notes[2] ?? (chord.notes[0] as Note), root);
      emit(root, base, span / 2);
      emit(fifth, base + span / 2, span / 2);
      return;
    }
    // Walking: root, chord tones, chromatic approach to the next root.
    const beats = Math.max(1, Math.round(span));
    const nextChord =
      parsed.slice(slot + 1).find((c) => c !== null) ??
      parsed.find((c) => c !== null) ??
      chord;
    const nextRoot = rootOf(nextChord);
    let previous = root;
    for (let beat = 0; beat < beats; beat++) {
      let pitch: Note;
      if (beat === 0) {
        pitch = root;
      } else if (beat === beats - 1 && beats > 1) {
        // Chromatic approach: the semitone neighbour of the next root on
        // the side we are coming from (below when at or under it).
        const target = nearBass(nextRoot, previous);
        pitch = Note.fromMidi(
          previous.midi <= target.midi ? target.midi - 1 : target.midi + 1,
          previous.midi <= target.midi ? "sharp" : "flat"
        );
      } else {
        // Middle beats alternate the third and fifth, placed near the line.
        const tone =
          (beat % 2 === 1 ? chord.notes[1] : chord.notes[2]) ??
          (chord.notes[beat % chord.notes.length] as Note);
        pitch = nearBass(tone, previous);
      }
      emit(pitch, base + beat, 1);
      previous = pitch;
    }
  });
  return events;
}
