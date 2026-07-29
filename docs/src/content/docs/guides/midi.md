---
title: MIDI Files
---

MusicTheoryJS reads and writes **Standard MIDI Files** with a pure, dependency-free
byte codec, and converts between MIDI ticks and the symbolic
[`NoteStream`](/guides/analysis/) (in seconds). This is the bridge between the
theory engine and sequencers, DAWs, and `.mid` files.

## Reading a MIDI file

`parseMidi` accepts a `Uint8Array`, `ArrayBuffer`, or byte array and returns a
note-centric structure (note-on/off pairs are matched into notes with a start
tick and duration):

```ts
import { parseMidi } from "musictheoryjs";

// bytes: Uint8Array from fs.readFile / fetch / a file input
const file = parseMidi(bytes);

file.format;                  // 0, 1, or 2
file.ppq;                     // ticks per quarter note
file.tempo;                   // µs per quarter (if the file set one)
file.timeSignature;           // { numerator, denominator } (if the file set one)
file.tracks[0].name;          // track name, if present
file.tracks[0].notes;         // MidiNote[] — { note, start, duration, velocity, channel }
```

## Writing a MIDI file

```ts
import { writeMidi } from "musictheoryjs";

const bytes = writeMidi({
  format: 1,
  ppq: 480,
  tempo: 500000, // 120 BPM
  timeSignature: { numerator: 6, denominator: 8 }, // optional, emitted as FF 58
  tracks: [
    {
      name: "Lead",
      notes: [
        { note: 60, start: 0,   duration: 480, velocity: 100, channel: 0 },
        { note: 64, start: 480, duration: 480, velocity: 90,  channel: 0 },
      ],
    },
  ],
});
// bytes: Uint8Array — write it to a .mid file
```

## Bridging to the theory engine

Convert a parsed file to a `NoteStream` (seconds, spelled notes), analyze it, and
convert back:

```ts
import {
  parseMidi, writeMidi, midiToNoteStream, noteStreamToMidi, analyzeHarmony,
} from "musictheoryjs";

// MIDI → symbolic
const stream = midiToNoteStream(parseMidi(bytes));
const { key, timeline } = analyzeHarmony(stream);

// symbolic → MIDI
const out = writeMidi(noteStreamToMidi(stream, { tempo: 500000 }));
```

`midiToNoteStream` spells each MIDI note number as a `Note` and times everything
in seconds using the file's PPQ and tempo. `noteStreamToMidi` quantises a
seconds-based stream back to ticks, and takes a `timeSignature` option
(`"6/8"`, `[3, 4]`, or an object) to stamp on the file.

To snap a performance to a grid — sixteenths, triplets, any duration — see
quantization in the [rhythm guide](/guides/rhythm/); `quantizeMidi` works on
parsed files directly, and `tickToPosition` turns ticks into bar/beat
positions.

## Retuning a MIDI file

`retuneMidi` plays a file in any [tuning](/guides/tuning/) — Just Intonation,
a maqam, gamelan slendro, 31-EDO — by moving each note to the nearest key and
carrying the microtonal remainder as a per-note pitch bend (always within
±50 cents, safely inside the GM ±2-semitone range). Notes spread across MIDI
channels by default so simultaneous bends don't collide.

```ts
import { parseMidi, writeMidi, retuneMidi, justIntonation, maqamTuning } from "musictheoryjs";

const just = retuneMidi(parseMidi(bytes), justIntonation());
writeMidi(just); // thirds now sit 14 cents flat, as pure 5/4s

retuneMidi(parseMidi(bytes), maqamTuning("rast"), { root: 62 });
```

Reading is symmetric: `parseMidi` folds pitch-bend events into the notes they
affect, as a `bend` field in semitones. For 12-degree tunings keys stay where
they are; for other sizes the keyboard maps linearly (successive keys are
successive degrees from `root`), the same convention Scala keyboard mappings
use.

## Tempo helpers

```ts
import { bpmToTempo, tempoToBpm, secondsPerTick } from "musictheoryjs";

bpmToTempo(120);          // 500000  (µs per quarter)
tempoToBpm(500000);       // 120
secondsPerTick(480, 500000); // seconds per tick at 480 PPQ, 120 BPM
```

## What's supported

- SMF formats 0, 1, and 2 with metrical (PPQ) division
- Running status, note-on-velocity-0-as-off, interleaved meta/sysex events
- Tempo, time-signature, and track-name meta events
- Pitch bends, folded into notes on read and emitted per note on write
- Multi-byte variable-length delta times

Everything round-trips: `parseMidi(writeMidi(file))` reproduces the notes.

## Try it live

A full write → parse round-trip on real bytes, no file needed:

```ts live
const file = noteStreamToMidi(
  [{ pitch: "C4", start: 0, duration: 0.5 }],
  { timeSignature: "3/4" }
);
const back = parseMidi(writeMidi(file));
log("ppq:", back.ppq, "· time signature:", formatTimeSignature(back.timeSignature));
log(back.tracks[0].notes);
```
