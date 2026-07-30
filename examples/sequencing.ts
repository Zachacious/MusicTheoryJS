/**
 * Sequencing: from a progression to a played arrangement.
 * Run with: `bun run examples/sequencing.ts`
 */

import {
  arpeggiate,
  bassline,
  compProgression,
  diatonicSequence,
  fromABC,
  fromMusicXML,
  invertMelody,
  melody,
  mergeStreams,
  rampVelocity,
  retrograde,
  sequenceToMidi,
  sequenceToScore,
  sliceStream,
  songForm,
  streamDuration,
  swing,
  toABC,
  toMusicXML,
  transposeStream,
  writeMidi,
} from "../src/index";

// A played ii-V-I: comped hits, voice-led through the changes.
const comp = compProgression("C major", "ii-V-I", {
  rhythm: [1, 0, 0, 1, 0, 0, 1, 0],
});
console.log("comp events:", comp.length);

// A walking bass under it, dropped an octave.
const bass = transposeStream(bassline(["Dm7", "G7", "Cmaj7"]), -12);
console.log("bass line:", bass.map((e) => e.pitch.toString()).join(" "));

// Swing the comp, merge, and render a real MIDI file.
const song = mergeStreams(swing(comp), bass);
const bytes = writeMidi(sequenceToMidi(song, { bpm: 140 }));
console.log("MIDI bytes:", bytes.length, "— beats:", streamDuration(song));

// Motif work: a figure, its mirror, its retrograde, its sequence.
const motif = melody(["C4", "E4", "D4"], "8");
console.log(
  "inverted:",
  invertMelody(motif, "C4", "C4 major")
    .map((e) => e.pitch.toString())
    .join(" ")
);
console.log(
  "retrograde:",
  retrograde(motif)
    .map((e) => e.pitch.toString())
    .join(" ")
);
console.log(
  "sequenced down:",
  diatonicSequence(motif, "C4 major", -1)
    .map((e) => e.pitch.toString())
    .join(" ")
);

// Song form: sections onto one timeline.
const a = arpeggiate("Am", { pattern: "updown", duration: "8" });
const b = arpeggiate("F", { pattern: "updown", duration: "8" });
const tune = songForm("AAB", { A: a, B: b });
console.log(
  "form:",
  tune.sections.map((s) => `${s.name}@${s.start}`).join(" ")
);

// A window out of the timeline, and a crescendo across it.
const chorus = sliceStream(tune.stream, 2, 6);
const swell = rampVelocity(chorus, 50, 110);
console.log(
  "sliced and swelled:",
  swell.map((e) => `${e.pitch}@${e.velocity}`).join(" ")
);

// Out to notation and back in.
const xml = toMusicXML(sequenceToScore(melody(["C4", "E4", "G4"], "q")));
console.log(
  "MusicXML round-trip:",
  fromMusicXML(xml)
    .stream.map((e) => e.pitch.toString())
    .join(" ")
);
console.log(toABC(sequenceToScore(melody(["C4", null, "E4"], "q"))));

// ABC reads rhythm too: a tune lands as the same beat-timed stream.
const reel = fromABC("X:1\nT:Reel\nM:4/4\nK:G\nG2 A2 B2- B2 |]");
console.log(
  "ABC round-trip:",
  reel.stream.map((e) => `${e.pitch}@${e.start}x${e.duration}`).join(" ")
);
