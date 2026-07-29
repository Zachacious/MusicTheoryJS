---
title: Notation (ABC & MusicXML)
---

MusicTheoryJS exports notes, chords, scales, and full scores as **ABC
notation** and **MusicXML** — the two formats nearly every notation program,
converter, and renderer reads — and reads ABC back in, so a tune can round-trip.
Durations, dots, and tuplets come from the [rhythm module](/guides/rhythm/);
spelling, key signatures, and accidentals from the theory core.

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

## Reading ABC back

`fromABC` parses a tune: its header fields and every note of its body.

```ts
import { fromABC } from "musictheoryjs";

const tune = fromABC("X:1\nT:Scale\nM:4/4\nK:D\nD2 E2 F2 G2 |]");

tune.title;             // "Scale"
tune.key;               // "D"
tune.meter;             // "4/4"
tune.notes.map(String); // ["D4", "E4", "F#4", "G4"]
```

Notice the F♯. The `K:D` field puts two sharps in the key signature, and the
importer applies them the way a player would — including ABC's rule that an
accidental persists to the end of its measure and resets at the barline:

```ts
import { fromABC } from "musictheoryjs";

fromABC("K:C\n^F F | F |]").notes.map(String);
// ["F#4", "F#4", "F4"] — the sharp carries, then the barline clears it
```

Modal key fields work too, resolved to the signature they actually carry:

```ts
import { fromABC } from "musictheoryjs";

// E dorian shares D major's two sharps.
fromABC("K:Edor\nE2 F2 C2 |]").notes.map(String); // ["E4", "F#4", "C#4"]
```

Rests, bar lines, chord symbols in quotes, and decorations are skipped rather
than mistaken for notes; notes inside a `[CEG]` chord are all collected. What it
reads is the pitch content of a tune, not every ornament — slurs, grace notes,
and lyrics are ignored.

For a single pitch, `abcToNote` and `noteToABC` convert both ways. ABC writes
middle C as `C`, the octave above as `c`, and moves further with commas and
apostrophes:

```ts
import { abcToNote, noteToABC } from "musictheoryjs";

abcToNote("C").toString();   // "C4"
abcToNote("c").toString();   // "C5"
abcToNote("C,").toString();  // "C3"
abcToNote("^F").toString();  // "F#4"
abcToNote("F", { F: 1 }).toString(); // "F#4" — with a supplied signature

noteToABC("Bb5");            // "_b"
```

`tokenizeABC` splits a pitch into its parts without interpreting them, which is
useful for validating input as a user types:

```ts
import { tokenizeABC } from "musictheoryjs";

tokenizeABC("^F");  // { accidental: "^", letter: "F", octave: "" }
tokenizeABC("x");   // null — not a pitch
```

## Round-tripping

What `toABC` writes, `fromABC` reads:

```ts
import { toABC, fromABC } from "musictheoryjs";

const notes = ["C4", "D4", "E4", "F#4", "G4"];
fromABC(toABC(notes)).notes.map(String); // ["C4","D4","E4","F#4","G4"]
```

That makes ABC a usable storage format for melodies, and pairs with
[MIDI](/guides/midi/) for getting music in and out: read a tune from ABC,
analyze it, and write a MIDI file — or the reverse.

## Use cases

**Importing a tune collection.** ABC is the format folk and traditional
repertoire is archived in. Read a tune, run [key detection](/guides/analysis/)
on its notes, and file it.

**A notation-backed exercise app.** Store exercises as ABC, read them into
notes, and check a student's played MIDI against them.

**Format conversion.** ABC in, MusicXML out, with the theory layer available in
between to transpose, respell, or re-key.

## Try it live

```ts live
log(toABC(Scale.from("C4", "major"), { title: "C major" }));
log("read back:", fromABC(toABC(["C4", "E4", "G4"])).notes.map(String));
log("with a key signature:", fromABC("K:D\nD2 E2 F2 |]").notes.map(String));
```
