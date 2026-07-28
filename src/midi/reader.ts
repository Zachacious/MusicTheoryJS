/**
 * Reading Standard MIDI Files. Pure byte parsing — no dependencies.
 *
 * Supports SMF formats 0–2 with metrical (PPQ) division. Note-on/note-off pairs
 * are matched into {@link MidiNote}s; a note-on with velocity 0 counts as a
 * note-off (as the spec allows). The first tempo meta event is surfaced on the
 * file. Running status and interleaved meta/sysex events are handled.
 */

import type { MidiFile, MidiNote, MidiTrack } from "./types";

/** A bounds-checked forward cursor over the file bytes. */
class ByteReader {
  pos = 0;
  constructor(private readonly data: Uint8Array) {}

  private need(n: number): void {
    if (this.pos + n > this.data.length) {
      throw new SyntaxError("unexpected end of MIDI data");
    }
  }

  u8(): number {
    this.need(1);
    return this.data[this.pos++] as number;
  }
  u16(): number {
    return (this.u8() << 8) | this.u8();
  }
  u32(): number {
    return (
      this.u8() * 2 ** 24 + (this.u8() << 16) + (this.u8() << 8) + this.u8()
    );
  }
  bytes(n: number): Uint8Array {
    this.need(n);
    const b = this.data.subarray(this.pos, this.pos + n);
    this.pos += n;
    return b;
  }
  /** MIDI variable-length quantity (7 bits per byte, high bit = continue). */
  varlen(): number {
    let value = 0;
    let byte: number;
    do {
      byte = this.u8();
      value = (value << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return value;
  }
  ascii(n: number): string {
    return String.fromCharCode(...this.bytes(n));
  }
  get done(): boolean {
    return this.pos >= this.data.length;
  }
}

/** Normalise input to a `Uint8Array`. */
function toBytes(data: Uint8Array | ArrayBuffer | number[]): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return Uint8Array.from(data);
}

interface OpenNote {
  start: number;
  velocity: number;
}

function parseTrack(
  r: ByteReader,
  length: number,
  onTempo: (t: number) => void
): MidiTrack {
  const end = r.pos + length;
  const notes: MidiNote[] = [];
  // Open note-ons keyed by channel*128 + note.
  const open = new Map<number, OpenNote>();
  let tick = 0;
  let status = 0;
  let name: string | undefined;

  while (r.pos < end) {
    tick += r.varlen();
    let byte = r.u8();
    if (byte & 0x80) {
      status = byte; // new status
    } else {
      // Running status: `byte` is actually the first data byte.
      r.pos -= 1;
      byte = status;
    }

    const type = byte & 0xf0;
    const channel = byte & 0x0f;

    if (byte === 0xff) {
      // Meta event
      const metaType = r.u8();
      const len = r.varlen();
      const data = r.bytes(len);
      if (metaType === 0x51 && len === 3) {
        onTempo(
          (data[0] as number) * 65536 +
            (data[1] as number) * 256 +
            (data[2] as number)
        );
      } else if (metaType === 0x03) {
        name = String.fromCharCode(...data);
      }
      continue;
    }
    if (byte === 0xf0 || byte === 0xf7) {
      // Sysex — skip
      const len = r.varlen();
      r.bytes(len);
      continue;
    }

    switch (type) {
      case 0x90: {
        // Note on (velocity 0 = note off)
        const note = r.u8();
        const velocity = r.u8();
        const key = channel * 128 + note;
        if (velocity === 0) {
          closeNote(open, notes, key, note, channel, tick);
        } else {
          open.set(key, { start: tick, velocity });
        }
        break;
      }
      case 0x80: {
        // Note off
        const note = r.u8();
        r.u8(); // release velocity, ignored
        closeNote(open, notes, channel * 128 + note, note, channel, tick);
        break;
      }
      case 0xa0: // poly aftertouch (2 data)
      case 0xb0: // control change (2 data)
      case 0xe0: // pitch bend (2 data)
        r.u8();
        r.u8();
        break;
      case 0xc0: // program change (1 data)
      case 0xd0: // channel aftertouch (1 data)
        r.u8();
        break;
      default:
        throw new SyntaxError(
          `unexpected MIDI status byte 0x${byte.toString(16)}`
        );
    }
  }

  r.pos = end; // tolerate trailing bytes
  return name === undefined ? { notes } : { name, notes };
}

function closeNote(
  open: Map<number, OpenNote>,
  notes: MidiNote[],
  key: number,
  note: number,
  channel: number,
  tick: number
): void {
  const on = open.get(key);
  if (!on) return;
  open.delete(key);
  notes.push({
    note,
    start: on.start,
    duration: tick - on.start,
    velocity: on.velocity,
    channel,
  });
}

/** Parse a Standard MIDI File into a {@link MidiFile}. */
export function parseMidi(data: Uint8Array | ArrayBuffer | number[]): MidiFile {
  const r = new ByteReader(toBytes(data));

  if (r.ascii(4) !== "MThd") {
    throw new SyntaxError("not a MIDI file (missing MThd header)");
  }
  const headerLen = r.u32();
  const format = r.u16();
  const ntracks = r.u16();
  const division = r.u16();
  // Skip any extra header bytes beyond the standard 6.
  if (headerLen > 6) r.bytes(headerLen - 6);
  if (division & 0x8000) {
    throw new SyntaxError("SMPTE time division is not supported");
  }
  const ppq = division;

  let tempo: number | undefined;
  const tracks: MidiTrack[] = [];
  for (let i = 0; i < ntracks && !r.done; i++) {
    if (r.ascii(4) !== "MTrk") {
      throw new SyntaxError("malformed MIDI track (missing MTrk)");
    }
    const len = r.u32();
    tracks.push(
      parseTrack(r, len, (t) => {
        if (tempo === undefined) tempo = t;
      })
    );
  }

  return tempo === undefined
    ? { format, ppq, tracks }
    : { format, ppq, tracks, tempo };
}
