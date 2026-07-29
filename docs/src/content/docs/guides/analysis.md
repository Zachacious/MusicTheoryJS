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

## Modulation detection

Where does the music change key? `detectModulations` scans the stream with
overlapping windows, ranks each window's pitch-class histogram against the
key profiles, and merges agreeing windows into segments — transitional
windows that fit neither key are recognized as such rather than reported as
spurious keys:

```ts
import { detectModulations } from "musictheoryjs";

const segments = detectModulations(stream);
// [{ key: C major, start: 0, end: 8, score: 0.9 },
//  { key: G major, start: 8, end: 16, score: 0.9 }]
```

Window and hop sizes adapt to the stream's density by default and can be set
explicitly (`{ windowSize, hopSize, minSegment }`); time stays in whatever
unit the stream uses.

## Pitch-class set theory

Transposition/inversion-invariant fingerprints for a sonority:

```ts
import { pitchClasses, intervalClassVector } from "musictheoryjs";

pitchClasses(["C4", "E4", "G4", "C5"]);         // [0, 4, 7]
intervalClassVector(["C4", "E4", "G4"]);        // [0, 0, 1, 1, 1, 0]  (major triad)
intervalClassVector(["C4", "Eb4", "Gb4", "A4"]); // [0, 0, 4, 0, 0, 2]  (dim7)
```

A pitch-class set is also available as a **12-bit mask** — bit *n* set means
pitch class *n* is present — which turns set comparisons into single integer
operations. Chord and scale detection run on these masks internally, and
they're handy for your own subset queries:

```ts
import { pcsetOf, pcsetMask, pcsetIsSubset, pcsetTranspose, pcsetSize } from "musictheoryjs";

const triad = pcsetOf(["C4", "E4", "G4"]);   // === pcsetMask([0, 4, 7])
const scale = pcsetMask([0, 2, 4, 5, 7, 9, 11]);

pcsetIsSubset(triad, scale);                 // true — C major contains C E G
pcsetTranspose(triad, 2) === pcsetMask([2, 6, 9]); // true — up a whole step
pcsetSize(scale);                            // 7
```

### Rotations, snapping, and walking a set

A set's rotations are its modes. By default only rotations that begin on a pitch
class actually present are returned, which for a seven-note scale gives the
seven modes:

```ts
import { pcsetMask, pcsetModes, pcsetPitchClasses } from "musictheoryjs";

const major = pcsetMask([0, 2, 4, 5, 7, 9, 11]);
pcsetModes(major).length;                          // 7
pcsetPitchClasses(pcsetModes(major)[1]);           // [0,2,3,5,7,9,10] — dorian
pcsetModes(major, false).length;                   // 12 — every rotation
```

`pcsetNearest` snaps a MIDI note to the closest member of a set, which is how
you constrain arbitrary input — a controller, a random generator, a detected
pitch — to a scale or chord. Ties resolve upward:

```ts
import { pcsetMask, pcsetNearest } from "musictheoryjs";

const triad = pcsetMask([0, 4, 7]);
pcsetNearest(triad, 61); // 60 — C♯ snaps down to C
pcsetNearest(triad, 66); // 67 — F♯ snaps up to G
```

`pcsetStep` and `pcsetDegree` walk a set as though it were a scale, climbing
through octaves indefinitely. `pcsetStep` counts from 0; `pcsetDegree` numbers
the way musicians do, from 1, and rejects 0 rather than guessing:

```ts
import { pcsetMask, pcsetStep, pcsetDegree } from "musictheoryjs";

const triad = pcsetMask([0, 4, 7]);
pcsetStep(triad, 60, 1);    // 64 — one step up from C4 is E4
pcsetStep(triad, 60, 3);    // 72 — a full turn is exactly an octave
pcsetStep(triad, 60, -1);   // 55 — negative steps descend
pcsetDegree(triad, 60, 4);  // 72 — the same note, numbered from 1
```

Together these are an arpeggiator in three functions: pick a set, walk it by
step, and let a [rhythm pattern](/guides/patterns/) decide the timing.

## From MIDI and audio

The pieces that produce a `NoteStream` — reading a MIDI file, or detecting a
pitch from audio samples — live in the [MIDI](/guides/midi/) and
[Audio](/guides/audio/) modules. `Note.fromMidi` and `Note.fromFrequency` bridge
raw numbers into spelled notes.

## Try it live

```ts live
const melody = [
  { pitch: "C4", start: 0, duration: 0.4 },
  { pitch: "E4", start: 0.4, duration: 0.4 },
  { pitch: "G4", start: 0.8, duration: 0.6 },
];
log("key:", detectKey(["C4", "E4", "G4"])[0].key.toString());
play(melody);
```
