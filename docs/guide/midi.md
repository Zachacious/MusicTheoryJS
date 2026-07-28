# MIDI Files

MusicTheoryJS reads and writes **Standard MIDI Files** with a pure, dependency-free
byte codec, and converts between MIDI ticks and the symbolic
[`NoteStream`](/guide/analysis) (in seconds). This is the bridge between the
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
seconds-based stream back to ticks.

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
- Tempo and track-name meta events
- Multi-byte variable-length delta times

Everything round-trips: `parseMidi(writeMidi(file))` reproduces the notes.
