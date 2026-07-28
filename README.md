# MusicTheoryJS

[![npm](https://img.shields.io/npm/v/musictheoryjs.svg?color=6d28d9)](https://www.npmjs.com/package/musictheoryjs)
[![CI](https://github.com/Zachacious/MusicTheoryJS/actions/workflows/ci.yml/badge.svg)](https://github.com/Zachacious/MusicTheoryJS/actions/workflows/ci.yml)
[![types](https://img.shields.io/npm/types/musictheoryjs.svg?color=6d28d9)](https://www.npmjs.com/package/musictheoryjs)
[![no dependencies](https://img.shields.io/badge/dependencies-none-6d28d9.svg)](package.json)
[![license](https://img.shields.io/npm/l/musictheoryjs.svg?color=6d28d9)](LICENSE.txt)

A music theory library for JavaScript and TypeScript. It handles notes, intervals,
scales, chords, and keys while keeping track of how each note is spelled, so an
`E#` stays an `E#` instead of silently becoming an `F`. On top of the Western
essentials it covers non-standard tunings, microtonal scales, reading and writing
MIDI files, and basic audio analysis.

**Documentation:** https://zachacious.github.io/MusicTheoryJS/

> v3 is a rewrite and is not API-compatible with v2. If you're on v2, pin it or
> follow the guides before upgrading.

## What makes it different

Plenty of small libraries store a note as a number from 0 to 11. That's enough to
sound the right pitch, but it discards the spelling, and a lot of theory lives in
the spelling. `C#` and `Db` are the same piano key, yet they're different notes:
they belong to different scales, form different intervals, and appear in different
keys. MusicTheoryJS keeps the letter and the accidental apart, so what comes out
matches what you'd write on paper.

```ts
import { Note, Scale, Chord } from "musictheoryjs";

new Note("E#4").equals("F4");        // false — different notes
new Note("E#4").isEnharmonic("F4");  // true  — same pitch

Scale.from("C4", "major").noteNames(); // ["C4","D4","E4","F4","G4","A4","B4"]
Chord.from("Bdim7").noteNames();        // ["B4","D5","F5","Ab5"]  (Ab, not G#)
```

The other thing worth knowing up front: frequency comes from a tuning, and the
tuning is swappable. 12-tone equal temperament is the default because that's what
most people want, but it isn't hard-wired. Quarter tones, a Pythagorean scale, or
a maqam defined in cents are all tunings you pass in rather than special cases.

```ts
import { equalTemperament, centsTuning, scaleFromTuning } from "musictheoryjs";

scaleFromTuning(equalTemperament(24)); // 24 equal divisions of the octave

const rast = centsTuning([0, 204, 355, 498, 702, 906, 1057], { name: "Rast" });
scaleFromTuning(rast, { frequency: 264 }, true); // a maqam, anchored to real Hz
```

## Install

```bash
bun add musictheoryjs   # or npm i / pnpm add / yarn add
```

It ships ESM and CommonJS with type declarations and no runtime dependencies.

```ts
import { Note } from "musictheoryjs";          // ESM
const { Note } = require("musictheoryjs");      // CommonJS
```

## A few things it does

Keys, Roman numerals, and progressions:

```ts
import { Key } from "musictheoryjs";

Key.major("C").progression("ii7 V7 Imaj7").map(String); // ["Dm7","G7","Cmaj7"]
Key.major("C").romanNumeral(Chord.from("Bb"));          // "bVII"
Key.minor("A").relative().toString();                    // "C major"
```

Analysis of a note stream (from a sequencer, MIDI, or a transcriber you supply):

```ts
import { analyzeHarmony, detectKey } from "musictheoryjs";

detectKey(["C4", "E4", "G4"])[0].key.toString();  // "C major"
const { key, timeline, cadences } = analyzeHarmony(noteStream);
```

MIDI files, and audio you feed in as samples:

```ts
import { parseMidi, midiToNoteStream, detectNote } from "musictheoryjs";

analyzeHarmony(midiToNoteStream(parseMidi(midiBytes)));
detectNote(float32Samples, 44100)?.toString();   // "A4"  (monophonic)
```

Audio capture and polyphonic transcription aren't in scope; they need a model or
a platform API, so the library takes the notes and hands back the theory.

## Entry points

Everything is exported from the root, and each area is also its own import path so
bundlers can drop what you don't use:

| Import | Covers |
| --- | --- |
| `musictheoryjs/note` | notes |
| `musictheoryjs/interval` | intervals, transposition |
| `musictheoryjs/scale` | scales, modes, detection (46 templates) |
| `musictheoryjs/chord` | chords, symbol parsing, detection, voicings (32 qualities) |
| `musictheoryjs/key` | keys, signatures, Roman numerals, progressions |
| `musictheoryjs/tuning` | tuning systems (EDO, JI, historical, custom, Scala) |
| `musictheoryjs/analysis` | key detection, chord timelines, set theory |
| `musictheoryjs/midi` | Standard MIDI File read/write |
| `musictheoryjs/audio` | FFT, pitch, chroma, onset detection |

The [documentation](https://zachacious.github.io/MusicTheoryJS/) has a guide for
each of these plus a full API reference.

## Development

```bash
bun install
bun test          # test suite
bun run typecheck
bun run lint
bun run build     # ESM + CJS + .d.ts
bun run e2e       # exercises the built package (ESM and CJS)
```

The docs site lives in [`docs/`](docs) and is a separate Astro project:
`bun run docs:dev` to work on it, `bun run docs:build` to build it.

Releases go through Changesets. See [RELEASING.md](RELEASING.md), and
[ROADMAP.md](ROADMAP.md) for what's planned.

## License

[ISC](LICENSE.txt) © 2021-2026 Zach Moore
