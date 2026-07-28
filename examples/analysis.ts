/**
 * Symbolic analysis: key detection, chord-over-time, and set theory.
 * The library never touches audio — a client app supplies NoteEvents (from MIDI,
 * a transcriber, a sequencer, …) and gets music theory back.
 *
 * Run with: `bun run examples/analysis.ts`
 */

import {
  Note,
  detectKey,
  intervalClassVector,
  onsetTimes,
  segmentChords,
} from "../src/index";
import type { NoteStream } from "../src/index";

// Key detection from a set of notes (Krumhansl-Schmuckler)
const [bestKey] = detectKey(["C4", "E4", "G4", "A4", "D5", "F5"]);
console.log(
  "Detected key:",
  bestKey?.key.toString(),
  "score",
  bestKey?.score.toFixed(3)
);

// Turn a detected pitch (Hz) or a MIDI number into a note
console.log("442 Hz ->", Note.fromFrequency(442).toString());
console.log("MIDI 60 ->", Note.fromMidi(60).toString());

// Set-theory fingerprint (transposition/inversion-invariant)
console.log("dim7 IC vector:", intervalClassVector(["C4", "Eb4", "Gb4", "A4"]));

// A ii-V-I in C as a timed note stream, then a chord timeline + Roman numerals
const stream: NoteStream = [
  { pitch: new Note("D4"), start: 0, duration: 4 },
  { pitch: new Note("F4"), start: 0, duration: 4 },
  { pitch: new Note("A4"), start: 0, duration: 4 },
  { pitch: new Note("G4"), start: 4, duration: 4 },
  { pitch: new Note("B4"), start: 4, duration: 4 },
  { pitch: new Note("D5"), start: 4, duration: 4 },
  { pitch: new Note("C4"), start: 8, duration: 4 },
  { pitch: new Note("E4"), start: 8, duration: 4 },
  { pitch: new Note("G4"), start: 8, duration: 4 },
];

const boundaries = [...onsetTimes(stream), 12];
const timeline = segmentChords(stream, boundaries);
console.log(
  "Chord timeline:",
  timeline
    .map((s) => `${s.start}-${s.end}: ${s.chord?.toString() ?? "-"}`)
    .join("  ")
);
