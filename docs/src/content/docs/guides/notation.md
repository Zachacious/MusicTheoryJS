---
title: Notation Export
---

MusicTheoryJS exports notes, chords, scales, and full scores as **ABC
notation** and **MusicXML** — the two formats nearly every notation program,
converter, and renderer reads. Durations, dots, and tuplets come from the
[rhythm module](/guides/rhythm/); spelling, key signatures, and accidentals
from the theory core.

## What the exporters take

Both `toABC` and `toMusicXML` accept the same inputs:

```ts
import { toABC, toMusicXML, Scale, Chord } from "musictheoryjs";

toABC(Scale.from("D4", "dorian"));       // a run of the scale's notes
toMusicXML(Chord.from("Cmaj7"));         // one whole-note chord
toABC(["C4", "E4", "G4"]);               // a melody of quarter notes

// Full control: events with durations, chords, and rests
toABC(
  [
    { notes: ["C4"], duration: "q." },
    { notes: ["D4"], duration: "8" },
    { chord: "G7", duration: "h" },
    { duration: "q" },                   // no notes = a rest
  ],
  { key: "C major", timeSignature: "4/4", tempo: 96, title: "Cadence" }
);
```

An event with no `notes` and no `chord` is a rest. Durations are any
[`DurationLike`](/guides/rhythm/) — `"q."`, `"8t"`, `{ value: 4, dots: 1 }`.

## ABC

`toABC` produces a complete tune — header fields, then measures:

```ts
import { toABC, Scale } from "musictheoryjs";

toABC(Scale.from("C4", "major"), { title: "C major", tempo: 96 });
```

```text
X:1
T:C major
M:4/4
L:1/8
Q:1/4=96
K:C
C2 D2 E2 F2 | G2 A2 B2 |]
```

The details follow ABC's actual rules, not just its surface: accidentals carry
to the end of the measure, so an F♮ after an F♯ is written `=F`; notes in the
key signature aren't re-marked; triplets and other tuplets come out as
`(p:q:r` groups; and an event that crosses a barline is split into tied
pieces.

## MusicXML

`toMusicXML` produces a single-part `score-partwise` document (MusicXML 4.0)
that imports cleanly into notation software: key/time/clef attributes, chords
via `<chord/>`, `<time-modification>` for tuplets, ties across barlines, and
the final measure padded with rests so every measure is full.

```ts
import { toMusicXML } from "musictheoryjs";

const xml = toMusicXML(
  [
    { notes: ["C4"], duration: "h." },
    { notes: ["D4"], duration: "1" }, // crosses the barline -> tied
  ],
  { timeSignature: "4/4", key: "C major" }
);
// -> "<?xml version..." with <tie type="start"/> / <tied type="stop"/> pairs
```

## Round trips with the rest of the library

Because the exporters take plain events, anything that produces notes can be
notated: a progression from the [key module](/guides/keys/), a melody
transcribed from audio, or a MIDI file's notes quantized through the
[rhythm module](/guides/rhythm/) first.

One caveat by design: a tuplet split across a barline has no plain notation,
so the exporters throw rather than guess — re-group the tuplet or change the
meter.

## Try it live

```ts live
log(toABC(Scale.from("C4", "major"), { title: "C major" }));
```
