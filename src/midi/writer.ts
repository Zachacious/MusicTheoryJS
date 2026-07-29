/**
 * Writing Standard MIDI Files. Pure byte assembly — no dependencies.
 *
 * Notes are expanded into note-on/note-off events, ordered by tick (note-offs
 * before note-ons at the same tick to avoid stuck notes), delta-timed, and
 * written as SMF format-1 (or format-0 for a single track). An optional tempo,
 * time signature, and per-track name are emitted as meta events; note `bend`
 * fields become pitch-bend events just before their note-ons.
 */

import { wholeNotes } from "../rhythm/duration";
import { type TimeSignature, beatUnit } from "../rhythm/meter";
import type { MidiFile, MidiNote, MidiTrack } from "./types";

/** A growable byte buffer. */
class ByteWriter {
  private buf: number[] = [];
  u8(v: number): void {
    this.buf.push(v & 0xff);
  }
  u16(v: number): void {
    this.u8(v >> 8);
    this.u8(v);
  }
  u32(v: number): void {
    this.u8(Math.floor(v / 2 ** 24));
    this.u8(v >> 16);
    this.u8(v >> 8);
    this.u8(v);
  }
  bytes(b: readonly number[]): void {
    for (const x of b) this.u8(x);
  }
  ascii(s: string): void {
    for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i));
  }
  /** Write a MIDI variable-length quantity. */
  varlen(value: number): void {
    if (value < 0)
      throw new RangeError("varlen cannot encode a negative value");
    const bytes = [value & 0x7f];
    let v = Math.floor(value / 128);
    while (v > 0) {
      bytes.push((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    bytes.reverse();
    this.bytes(bytes);
  }
  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.buf);
  }
  get length(): number {
    return this.buf.length;
  }
}

interface TickEvent {
  tick: number;
  /** Sort key within a tick: -1 meta, 0 note-off, 0.5 pitch bend, 1 note-on —
   * bends land after the offs and just before the ons they affect. */
  order: number;
  bytes: number[];
}

function trackEvents(
  track: MidiTrack,
  tempo?: number,
  timeSignature?: TimeSignature
): number[] {
  const events: TickEvent[] = [];

  if (track.name !== undefined) {
    const name = [...track.name].map((c) => c.charCodeAt(0));
    events.push({
      tick: 0,
      order: -1,
      bytes: [0xff, 0x03, name.length, ...name],
    });
  }
  if (tempo !== undefined) {
    events.push({
      tick: 0,
      order: -1,
      bytes: [
        0xff,
        0x51,
        0x03,
        (tempo >> 16) & 0xff,
        (tempo >> 8) & 0xff,
        tempo & 0xff,
      ],
    });
  }
  if (timeSignature !== undefined) {
    const dd = Math.log2(timeSignature.denominator);
    if (!Number.isInteger(dd) || dd < 0) {
      throw new RangeError(
        `time signature denominator must be a power of two, got ${timeSignature.denominator}`
      );
    }
    // cc = MIDI clocks per metronome click (whole note = 96): 24 for a
    // quarter-note beat, 36 for the dotted-quarter beat of compound meters.
    const cc = Math.round(96 * wholeNotes(beatUnit(timeSignature)));
    events.push({
      tick: 0,
      order: -1,
      bytes: [0xff, 0x58, 0x04, timeSignature.numerator & 0xff, dd, cc, 8],
    });
  }

  for (const n of track.notes) {
    const ch = n.channel & 0x0f;
    events.push({
      tick: n.start,
      order: 1,
      bytes: [0x90 | ch, n.note & 0x7f, clampVel(n.velocity)],
    });
    events.push({
      tick: n.start + n.duration,
      order: 0,
      bytes: [0x80 | ch, n.note & 0x7f, 0],
    });
  }

  // Pitch bends: one event per change, per channel, in note-start order
  // (GM ±2-semitone range; simultaneous same-channel notes share a bend).
  const byChannel = new Map<number, MidiNote[]>();
  for (const n of track.notes) {
    const ch = n.channel & 0x0f;
    const list = byChannel.get(ch);
    if (list) list.push(n);
    else byChannel.set(ch, [n]);
  }
  for (const [ch, notes] of byChannel) {
    let last = 0;
    for (const n of [...notes].sort((a, b) => a.start - b.start)) {
      const bend = n.bend ?? 0;
      if (bend === last) continue;
      last = bend;
      const value = Math.min(
        16383,
        Math.max(0, Math.round(8192 + (bend / 2) * 8192))
      );
      events.push({
        tick: n.start,
        order: 0.5,
        bytes: [0xe0 | ch, value & 0x7f, (value >> 7) & 0x7f],
      });
    }
  }

  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const w = new ByteWriter();
  let prev = 0;
  for (const e of events) {
    w.varlen(e.tick - prev);
    w.bytes(e.bytes);
    prev = e.tick;
  }
  // End-of-track meta.
  w.varlen(0);
  w.bytes([0xff, 0x2f, 0x00]);
  return [...w.toUint8Array()];
}

function clampVel(v: number): number {
  if (v < 1) return 1;
  if (v > 127) return 127;
  return Math.round(v);
}

/** Serialise a {@link MidiFile} to Standard MIDI File bytes. */
export function writeMidi(file: MidiFile): Uint8Array {
  const w = new ByteWriter();
  const format =
    file.tracks.length > 1 ? Math.max(file.format, 1) : file.format;

  w.ascii("MThd");
  w.u32(6);
  w.u16(format);
  w.u16(file.tracks.length);
  w.u16(file.ppq);

  file.tracks.forEach((track, i) => {
    // Tempo and time signature go on the first track only.
    const body = trackEvents(
      track,
      i === 0 ? file.tempo : undefined,
      i === 0 ? file.timeSignature : undefined
    );
    w.ascii("MTrk");
    w.u32(body.length);
    w.bytes(body);
  });

  return w.toUint8Array();
}
