/**
 * Audio DSP (pitch/chroma/onset) and MIDI file I/O.
 * The library never captures audio — the client supplies sample buffers (here
 * synthetic) and MIDI bytes. Run with: `bun run examples/audio-midi.ts`
 */

import {
  Note,
  chromagram,
  detectNote,
  detectOnsets,
  midiToNoteStream,
  noteStreamToMidi,
  parseMidi,
  writeMidi,
} from "../src/index";
import type { NoteStream } from "../src/index";

const SR = 44100;
const sine = (freq: number, n: number) =>
  Float32Array.from({ length: n }, (_, i) =>
    Math.sin((2 * Math.PI * freq * i) / SR)
  );

// --- Audio: a synthetic 440 Hz tone (client would supply real samples) ---
const tone = sine(440, 8192);
console.log("Detected pitch:", detectNote(tone, SR)?.toString());
const chroma = chromagram(tone, SR);
console.log(
  "Chroma argmax pc:",
  chroma.indexOf(Math.max(...chroma)),
  "(9 = A)"
);

// Onset where a tone starts after silence
const clip = new Float32Array(16384);
clip.set(sine(330, 8192), 8192);
console.log(
  "Onsets (s):",
  detectOnsets(clip, SR).map((t) => t.toFixed(3))
);

// --- MIDI: build a stream, write a .mid, read it back ---
const stream: NoteStream = [
  { pitch: new Note("C4"), start: 0, duration: 0.5, velocity: 100 },
  { pitch: new Note("E4"), start: 0.5, duration: 0.5, velocity: 90 },
  { pitch: new Note("G4"), start: 1.0, duration: 1.0, velocity: 80 },
];
const bytes = writeMidi(noteStreamToMidi(stream, { tempo: 500000 }));
console.log("MIDI file:", bytes.length, "bytes");

const roundTrip = midiToNoteStream(parseMidi(bytes));
console.log(
  "Read back:",
  roundTrip.map((e) => `${e.pitch}@${e.start.toFixed(2)}s`).join(" ")
);
