---
title: Symbolic Analysis
---

The analysis module turns notes and note streams into music theory: it detects
keys, identifies chords over time, labels progressions with Roman numerals,
finds cadences, and computes set-theory fingerprints. It is **purely symbolic**
— it never touches audio. A client app supplies timed `NoteEvent`s (from MIDI, a
transcriber, a sequencer, live input, …) and gets analysis back.

## The input: note streams

```ts
import type { NoteEvent, NoteStream } from "musictheoryjs";
import { Note } from "musictheoryjs";

const stream: NoteStream = [
  { pitch: new Note("C4"), start: 0, duration: 1, velocity: 100 },
  { pitch: new Note("E4"), start: 0, duration: 1 },
  { pitch: new Note("G4"), start: 0, duration: 1 },
];
```

`start` and `duration` are in whatever unit you choose (seconds, beats, ticks) —
the analysis is unit-agnostic.

## Key detection

`detectKey` uses the Krumhansl–Schmuckler algorithm: it correlates a
pitch-class histogram against major/minor key profiles for all 24 keys and
returns them ranked, best first.

```ts
import { detectKey } from "musictheoryjs";

detectKey(["C4", "E4", "G4", "A4", "D5", "F5"])[0].key.toString(); // "C major"
detectKey(["A4", "C5", "E5"])[0].mode; // "minor"
```

You can pass a note list (counted once each), a raw 12-bin histogram, or a
duration-weighted histogram from a stream:

```ts
import { detectKey, pitchClassWeightsFromStream } from "musictheoryjs";

const weights = pitchClassWeightsFromStream(stream);
detectKey(weights)[0].key.toString();
```

::: tip
Key detection works on pitch-class *distribution*, not cadential order, so short
or ambiguous passages can favour the dominant. Weighting by duration and
emphasising the tonic improves results.
:::

## Chords over time

Find the notes sounding at a moment, or segment a stream into a chord timeline:

```ts
import { detectChordAt, onsetTimes, segmentChords } from "musictheoryjs";

detectChordAt(stream, 0.5)?.toString(); // the chord sounding at t = 0.5

const boundaries = [...onsetTimes(stream), /* final time */ 4];
segmentChords(stream, boundaries);
// [{ start, end, chord: Chord | null }, …]
```

## Full harmonic analysis in one call

`analyzeHarmony` ties it together: detect the key (unless you provide one),
segment into chords, label each with a Roman numeral, and locate cadences.

```ts
import { analyzeHarmony } from "musictheoryjs";

const { key, timeline, cadences } = analyzeHarmony(iiVIStream);
// key:      C major
// timeline: [{ …, roman: "ii" }, { …, roman: "V" }, { …, roman: "I" }]
// cadences: [{ type: "authentic", index: 1 }]
```

Cadence types are `"authentic"` (V→I), `"plagal"` (IV→I), `"deceptive"` (V→vi),
and `"half"` (ending on V). You can also call the pieces directly:

```ts
import { romanProgression, detectCadences, harmonicRhythm } from "musictheoryjs";

romanProgression([Chord.from("C"), Chord.from("G"), Chord.from("Am"), Chord.from("F")], Key.major("C"));
// ["I", "V", "vi", "IV"]
```

## Pitch-class set theory

Transposition/inversion-invariant fingerprints for a sonority:

```ts
import { pitchClasses, intervalClassVector } from "musictheoryjs";

pitchClasses(["C4", "E4", "G4", "C5"]);         // [0, 4, 7]
intervalClassVector(["C4", "E4", "G4"]);        // [0, 0, 1, 1, 1, 0]  (major triad)
intervalClassVector(["C4", "Eb4", "Gb4", "A4"]); // [0, 0, 4, 0, 0, 2]  (dim7)
```

## From MIDI and audio

The pieces that produce a `NoteStream` — reading a MIDI file, or detecting a
pitch from audio samples — live in the [MIDI](/guides/midi/) and
[Audio](/guides/audio/) modules. `Note.fromMidi` and `Note.fromFrequency` bridge
raw numbers into spelled notes.
