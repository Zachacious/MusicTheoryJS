/**
 * End-to-end test of the BUILT package as a real consumer sees it: imports
 * resolve through package.json `exports` (self-reference by name), exercising a
 * full cross-module pipeline in ESM. Run after `bun run build`.
 *
 * This catches packaging/exports/build regressions that in-source unit tests
 * cannot (e.g. output paths not matching the exports map).
 */

import assert from "node:assert/strict";

// Main entry (bare specifier -> exports ".")
import {
  Chord,
  Key,
  Note,
  Scale,
  analyzeHarmony,
  detectKey,
  detectNote,
  equalTemperament,
  frequencyOfNote,
  midiToNoteStream,
  noteStreamToMidi,
  parseMidi,
  scaleFromTuning,
  writeMidi,
} from "musictheoryjs";

import { intervalClassVector } from "musictheoryjs/analysis";
import { cqtChroma, detectPitch } from "musictheoryjs/audio";
// Subpath entries
import { parseChordSymbol } from "musictheoryjs/chord";
import { toABC, toMusicXML } from "musictheoryjs/notation";
import {
  durationName,
  durationTicks,
  quantizeTick,
  tickToPosition,
} from "musictheoryjs/rhythm";
import { justDeviations, maqamTuning } from "musictheoryjs/tuning";

function sine(freq, n, sr = 44100) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

// --- Core theory ---
assert.deepEqual(
  Scale.from("C4", "major").noteNames(),
  ["C4", "D4", "E4", "F4", "G4", "A4", "B4"],
  "C major scale"
);
assert.deepEqual(
  Chord.from("Cmaj7").noteNames(),
  ["C4", "E4", "G4", "B4"],
  "Cmaj7"
);
assert.equal(new Note("E#4").isEnharmonic("F4"), true, "E# ~ F");
assert.equal(parseChordSymbol("F#m7").quality, "min7", "chord parse subpath");
assert.ok(Math.abs(frequencyOfNote(new Note("A4")) - 440) < 1e-6, "A4 = 440");

// --- Tuning / microtonal ---
assert.ok(
  Math.abs(scaleFromTuning(equalTemperament(24))[1].cents - 50) < 1e-9,
  "24-EDO step = 50 cents"
);

// --- Analysis ---
assert.equal(
  detectKey(["C4", "E4", "G4"])[0].key.toString(),
  "C major",
  "key detection"
);
assert.deepEqual(
  intervalClassVector(["C4", "Eb4", "Gb4", "A4"]),
  [0, 0, 4, 0, 0, 2],
  "dim7 IC vector"
);

// --- Rhythm (via subpath) ---
assert.equal(durationTicks("8t"), 160, "eighth triplet ticks");
assert.equal(durationName("q."), "dotted quarter", "duration name");
assert.equal(quantizeTick(933, "16"), 960, "quantize to sixteenths");
assert.deepEqual(
  tickToPosition(1500, "6/8"),
  { bar: 2, beat: 1, offset: 60 },
  "6/8 position"
);

// --- Notation (via subpath) ---
assert.ok(
  toABC(["C4", "E4", "G4"]).endsWith("K:C\nC2 E2 G2 |]"),
  "ABC triad run"
);
assert.ok(
  toMusicXML(["F#4"], { key: "D major" }).includes("<fifths>2</fifths>"),
  "MusicXML key signature"
);

// --- Tuning presets and comparison ---
assert.equal(maqamTuning("rast").centsForDegree(2), 350, "rast neutral third");
assert.ok(
  Math.abs(justDeviations()[4].difference - 13.69) < 0.1,
  "12-TET third vs just"
);

// --- Audio DSP ---
assert.equal(detectNote(sine(440, 4096), 44100)?.toString(), "A4", "YIN A4");
assert.ok(detectPitch(sine(220, 4096), 44100) > 218, "YIN 220 via subpath");
const cq = cqtChroma(sine(440, 8192), 44100);
assert.equal(cq.indexOf(Math.max(...cq)), 9, "CQT chroma A");

// --- Full pipeline: notes -> MIDI bytes -> notes, + harmonic analysis ---
const stream = [
  { pitch: new Note("D4"), start: 0, duration: 1 },
  { pitch: new Note("F4"), start: 0, duration: 1 },
  { pitch: new Note("A4"), start: 0, duration: 1 },
  { pitch: new Note("G4"), start: 1, duration: 1 },
  { pitch: new Note("B4"), start: 1, duration: 1 },
  { pitch: new Note("D5"), start: 1, duration: 1 },
  { pitch: new Note("C4"), start: 2, duration: 1 },
  { pitch: new Note("E4"), start: 2, duration: 1 },
  { pitch: new Note("G4"), start: 2, duration: 1 },
];
const bytes = writeMidi(
  noteStreamToMidi(stream, { tempo: 500000, timeSignature: "4/4" })
);
const back = midiToNoteStream(parseMidi(bytes));
assert.equal(back.length, 9, "MIDI round-trip note count");
assert.deepEqual(
  parseMidi(bytes).timeSignature,
  { numerator: 4, denominator: 4 },
  "time signature survives the MIDI round-trip"
);

const analysis = analyzeHarmony(stream, { key: Key.major("C") });
assert.deepEqual(
  analysis.timeline.map((s) => s.roman),
  ["ii", "V", "I"],
  "ii-V-I roman analysis"
);
assert.ok(
  analysis.cadences.some((c) => c.type === "authentic"),
  "authentic cadence"
);

console.log("E2E (ESM): all assertions passed");
