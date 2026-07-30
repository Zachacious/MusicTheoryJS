/**
 * End-to-end test of the BUILT package via CommonJS `require`, resolving through
 * package.json `exports` (self-reference by name). Verifies the `require`
 * conditions of the exports map and CJS interop. Run after `bun run build`.
 */

const assert = require("node:assert/strict");

const {
  Note,
  Scale,
  Chord,
  Key,
  detectKey,
  analyzeHarmony,
  frequencyOfNote,
  writeMidi,
  parseMidi,
  noteStreamToMidi,
  midiToNoteStream,
  detectNote,
} = require("musictheoryjs");

// Subpath require (note: scaleFromTuning lives in the scale module)
const { chromagram } = require("musictheoryjs/audio");
const { equalTemperament } = require("musictheoryjs/tuning");
const { scaleFromTuning } = require("musictheoryjs/scale");
const { barTicks, durationTicks } = require("musictheoryjs/rhythm");
const { toABC } = require("musictheoryjs/notation");
const { melody, sequenceToMidi } = require("musictheoryjs/sequence");
const { retuneMidi, justIntonation } = require("musictheoryjs");

function sine(freq, n, sr = 44100) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

assert.deepEqual(Chord.from("G7").noteNames(), ["G4", "B4", "D5", "F5"], "G7");
assert.deepEqual(
  Scale.from("A3", "minor").noteNames(),
  ["A3", "B3", "C4", "D4", "E4", "F4", "G4"],
  "A minor"
);
assert.ok(Math.abs(frequencyOfNote(new Note("A4")) - 440) < 1e-6, "A4 = 440");
assert.equal(
  detectKey(["A4", "C5", "E5"])[0].mode,
  "minor",
  "A minor detection"
);
assert.equal(detectNote(sine(440, 4096), 44100)?.toString(), "A4", "YIN A4");

// Subpath: tuning + audio
assert.ok(
  Math.abs(scaleFromTuning(equalTemperament(24))[1].cents - 50) < 1e-9,
  "24-EDO via /tuning"
);
const chroma = chromagram(sine(440, 8192), 44100);
assert.equal(chroma.indexOf(Math.max(...chroma)), 9, "chroma A via /audio");

// Rhythm via /rhythm
assert.equal(durationTicks("q."), 720, "dotted quarter ticks");
assert.equal(barTicks("6/8", 96), 288, "6/8 bar ticks via /rhythm");

// Notation via /notation, retuning via root
assert.ok(toABC(["D4"]).includes("D2 |]"), "ABC via /notation");
const tuned = retuneMidi(
  {
    format: 0,
    ppq: 480,
    tracks: [
      {
        notes: [
          { note: 64, start: 0, duration: 480, velocity: 96, channel: 0 },
        ],
      },
    ],
  },
  justIntonation()
);
assert.ok(
  Math.abs(tuned.tracks[0].notes[0].bend * 100 + 13.69) < 0.1,
  "JI retune bend"
);

// MIDI round-trip + harmony
const stream = [
  { pitch: new Note("C4"), start: 0, duration: 1 },
  { pitch: new Note("E4"), start: 0, duration: 1 },
  { pitch: new Note("G4"), start: 0, duration: 1 },
];
const back = midiToNoteStream(parseMidi(writeMidi(noteStreamToMidi(stream))));
assert.equal(back[0].pitch.toString(), "C4", "MIDI round-trip");
assert.equal(
  analyzeHarmony(stream, { key: Key.major("C") }).timeline[0].roman,
  "I",
  "roman I"
);

// Sequence subpath resolves under require()
const seq = sequenceToMidi(melody(["C4", "E4"], "q"));
assert.equal(seq.tracks[0].notes[1].start, 480, "sequence beats to ticks");

console.log("E2E (CJS): all assertions passed");
