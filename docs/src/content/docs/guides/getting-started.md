---
title: Getting started
description: Install MusicTheoryJS and make your first notes, scales, and chords.
---

MusicTheoryJS is a music theory library for JavaScript and TypeScript. It models
notes, intervals, scales, chords, and keys — parse a chord symbol, spell a scale,
name a Roman numeral, detect the key of a melody. It's written in TypeScript,
has no runtime dependencies, ships ESM and CommonJS, and tree-shakes down to
about 2 KB gzipped if all you import is `Note`. Non-standard tunings, MIDI
files, and audio analysis are in the same package.

## Install

```bash
bun add musictheoryjs   # npm i musictheoryjs · pnpm add musictheoryjs · yarn add musictheoryjs
```

The package has no runtime dependencies and ships both ESM and CommonJS with
TypeScript types.

```ts
import { Note, Scale, Chord } from "musictheoryjs";   // ESM
const { Note, Scale, Chord } = require("musictheoryjs"); // CommonJS
```

## A first look

```ts
import { Note, Scale, Chord } from "musictheoryjs";

// Notes know their letter, accidental, octave, MIDI number, and frequency.
new Note("C4").midi;   // 60

// Scales come out spelled correctly.
Scale.from("C4", "major").noteNames();
// ["C4", "D4", "E4", "F4", "G4", "A4", "B4"]

// Chords parse from the symbols you'd actually type.
Chord.from("Cmaj7").noteNames();
// ["C4", "E4", "G4", "B4"]
```

## Try it right here

Blocks like the one below run the real library in your browser — edit the
code, press **Run**. `log(…)` prints to the panel underneath, `play(…)` plays
notes, chords, and scales through your speakers, and the whole public API is
already in scope. Every guide has at least one.

```ts live
const scale = Scale.from("D4", "dorian");
log(scale.noteNames());
log(Chord.from("Dm7").noteNames());
play(scale);
```

If you read one more page, make it [Core concepts](/guides/concepts/).
Two ideas there (spelled pitch, and tuning as something separate from spelling)
explain why the rest of the API behaves the way it does.

## Importing only what you need

Everything is available from the package root. Each area also has its own import
path, so a bundler can leave out the parts you don't touch.

```ts
import { Note } from "musictheoryjs/note";
import { Chord } from "musictheoryjs/chord";
import { Key } from "musictheoryjs/key";
import { detectKey } from "musictheoryjs/analysis";
import { equalTemperament } from "musictheoryjs/tuning";
import { parseMidi } from "musictheoryjs/midi";
import { detectPitch } from "musictheoryjs/audio";
```

| Import path | What's in it |
| --- | --- |
| `musictheoryjs/note` | the `Note` value object |
| `musictheoryjs/interval` | spelled intervals, transposition, constants |
| `musictheoryjs/scale` | scales, modes, scale detection |
| `musictheoryjs/chord` | chords, symbol parsing, detection, voicings |
| `musictheoryjs/key` | keys, signatures, Roman numerals, progressions |
| `musictheoryjs/tuning` | tuning systems (EDO, JI, historical, custom, Scala) |
| `musictheoryjs/analysis` | key detection, chord timelines, set theory |
| `musictheoryjs/midi` | Standard MIDI File read and write |
| `musictheoryjs/audio` | FFT, pitch, chroma, onset detection |

## Where to go next

Read [Core concepts](/guides/concepts/), then pick whichever topic
guide matches what you're building. [Notes](/guides/notes/),
[Intervals](/guides/intervals/),
[Scales](/guides/scales/),
[Chords](/guides/chords/), and
[Keys](/guides/keys/) cover the Western essentials.
[Tuning](/guides/tuning/) is where microtonal and non-Western
music comes in. [Analysis](/guides/analysis/),
[MIDI](/guides/midi/), and [Audio](/guides/audio/)
go the other direction, turning performances and signals back into theory.
