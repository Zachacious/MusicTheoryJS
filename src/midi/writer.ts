/**
 * Writing Standard MIDI Files. Pure byte assembly — no dependencies.
 *
 * Notes are expanded into note-on/note-off events, ordered by tick (note-offs
 * before note-ons at the same tick to avoid stuck notes), delta-timed, and
 * written as SMF format-1 (or format-0 for a single track). An optional tempo
 * and per-track name are emitted as meta events.
 */

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
  /** 0 = note-off (sorted first), 1 = note-on. */
  order: number;
  bytes: number[];
}

function trackEvents(track: MidiTrack, tempo?: number): number[] {
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
    // Tempo goes on the first track only.
    const body = trackEvents(track, i === 0 ? file.tempo : undefined);
    w.ascii("MTrk");
    w.u32(body.length);
    w.bytes(body);
  });

  return w.toUint8Array();
}
