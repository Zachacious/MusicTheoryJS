# MusicTheoryJS

[![npm](https://img.shields.io/npm/v/musictheoryjs.svg?color=6d28d9)](https://www.npmjs.com/package/musictheoryjs)
[![CI](https://github.com/Zachacious/MusicTheoryJS/actions/workflows/ci.yml/badge.svg)](https://github.com/Zachacious/MusicTheoryJS/actions/workflows/ci.yml)
[![types](https://img.shields.io/npm/types/musictheoryjs.svg?color=6d28d9)](https://www.npmjs.com/package/musictheoryjs)
[![no dependencies](https://img.shields.io/badge/dependencies-none-6d28d9.svg)](package.json)
[![license](https://img.shields.io/npm/l/musictheoryjs.svg?color=6d28d9)](LICENSE.txt)

A music theory library for JavaScript and TypeScript. Build and analyze notes,
intervals, scales, chords, and keys — parse a chord symbol, spell a scale, name a
Roman numeral, detect the key of a melody, read a MIDI file, find the pitch in an
audio buffer.

- **Zero runtime dependencies.** Nothing gets pulled into your tree but the code you call.
- **Tree-shakable to the function.** Import `Note` alone and you ship ~1.5 KB gzipped; the whole library is ~11 KB. Nine subpaths (`musictheoryjs/note`, `/chord`, `/audio`, …) let a bundler drop what you don't touch.
- **Written in TypeScript.** Types ship in the package. `.d.ts` for every export, no `@types` install, no `any` at the edges.
- **ESM and CommonJS.** `import` or `require`, both resolve to real builds with their own type declarations.
- **Immutable values.** Every operation returns a new object, so notes and chords are safe to share, compare, and memoize.

```bash
bun add musictheoryjs   # or: npm i · pnpm add · yarn add
```

```ts
import { Note, Scale, Chord, Key, interval } from "musictheoryjs";

Scale.from("C4", "major").noteNames();        // ["C4","D4","E4","F4","G4","A4","B4"]
Chord.from("Cmaj7").noteNames();              // ["C4","E4","G4","B4"]
Key.major("C").progression("ii7 V7 Imaj7");   // [Dm7, G7, Cmaj7]
new Note("C4").transpose(interval(5, "P")).toString(); // "G4"
```

**Docs:** https://zachacious.github.io/MusicTheoryJS/

> v3 is a rewrite and is not API-compatible with v2. On v2, pin it or read the
> migration notes before upgrading.

## Bundle size

Measured by bundling a real import with `bun build --minify` and gzipping the
output. Your numbers depend on your bundler, but the shape holds: you pay for
what you import.

| You import | Minified | Gzipped |
| --- | --- | --- |
| `Note` | 3.2 KB | **1.5 KB** |
| `Note`, `Scale`, `Chord` | 9.6 KB | **3.6 KB** |
| `Key` + progressions | 12.3 KB | **4.6 KB** |
| MIDI read | 5.6 KB | **2.5 KB** |
| Everything | 29.5 KB | **11.1 KB** |

The package is marked `sideEffects: false`, so unused areas never make it into
the bundle in the first place.

## What it does

**Notes, intervals, and the spelling behind them.** A note here is a letter, an
accidental, and an octave — not a number from 0 to 11. That distinction is the
one thing most small libraries drop, and it's the thing theory is built on. `C#`
and `Db` are the same key on a piano and different notes everywhere else: they
belong to different scales, form different intervals, and get named differently.
Keep them apart and the output matches what you'd write by hand.

```ts
import { Note, interval } from "musictheoryjs";

new Note("E#4").equals("F4");        // false — different notes
new Note("E#4").isEnharmonic("F4");  // true  — same pitch
new Note("C4").transpose(interval(4, "d")).toString(); // "Fb4"  (a diminished fourth, spelled right)
```

**Scales and chords, in and out.** Construct them from names or symbols, or hand
the library a set of notes and let it tell you what they are. 46 scale templates,
32 chord qualities, voicings, and detection both directions.

```ts
import { Scale, Chord, detectChord, detectScales, drop2 } from "musictheoryjs";

Scale.from("D4", "dorian").noteNames();
detectScales(["C4", "D4", "E4", "G4", "A4"]);       // major pentatonic, …
detectChord(["G4", "B4", "D5", "F5"])?.toString();  // "G7"
drop2(Chord.from("Cmaj7")).map(String);             // ["G3","C4","E4","B4"]
```

**Keys, Roman numerals, and progressions.**

```ts
import { Key, Chord } from "musictheoryjs";

Key.major("C").progression("ii7 V7 Imaj7").map(String); // ["Dm7","G7","Cmaj7"]
Key.major("C").romanNumeral(Chord.from("G7"));          // "V7"
Key.minor("A").relative().toString();                    // "C major"
```

**Analysis.** Point it at a set of notes or a stream of timed notes and it works
backward: detects the key (Krumhansl–Schmuckler), segments a chord timeline,
labels each chord with a Roman numeral, and marks cadences.

```ts
import { detectKey, analyzeHarmony } from "musictheoryjs";

detectKey(["C4", "E4", "G4"])[0].key.toString();  // "C major"
const { key, timeline, cadences } = analyzeHarmony(noteStream);
```

**MIDI and audio, no extra packages.** Read and write Standard MIDI Files with a
byte codec, and pull pitch, chroma, and onsets out of audio samples with a
dependency-free DSP layer.

```ts
import { parseMidi, midiToNoteStream, detectNote } from "musictheoryjs";

analyzeHarmony(midiToNoteStream(parseMidi(midiBytes)));
detectNote(float32Samples, 44100)?.toString();   // "A4"  (monophonic, YIN)
```

Capturing audio and transcribing polyphony need a platform API or a model, so
those stay in your app — the library takes the notes and hands back the theory.

**Any tuning, not just 12-TET.** Frequency comes from a tuning you pass in.
Twelve-tone equal temperament is the default because it's what most people want,
but it isn't wired into the core. Equal temperaments of any size, Pythagorean,
meantone, Just Intonation, a maqam defined in cents, or a Scala file are all
ordinary tunings.

```ts
import { equalTemperament, centsTuning, scaleFromTuning } from "musictheoryjs";

scaleFromTuning(equalTemperament(24)); // quarter tones — 24 equal divisions

const rast = centsTuning([0, 204, 355, 498, 702, 906, 1057], { name: "Rast" });
scaleFromTuning(rast, { frequency: 264 }, true); // a maqam, anchored to real Hz
```

## Classes or functions

`Note`, `Scale`, `Chord`, and `Key` are ergonomic wrappers over plain functions,
and the functions are exported too. Use whichever fits — the functional layer is
there when you want a functional style or the absolute smallest bundle.

```ts
import { transpose, interval } from "musictheoryjs/interval";
import { spelled } from "musictheoryjs";

transpose(spelled(0, 0, 4), interval(5, "P")); // a SpelledPitch for G4
```

## Entry points

Everything is exported from the root. Each area is also its own import path, so
bundlers can split on the boundaries.

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

The [docs](https://zachacious.github.io/MusicTheoryJS/) have a guide for each
plus a full API reference.

## Development

```bash
bun install
bun test          # test suite
bun run typecheck
bun run lint
bun run build     # ESM + CJS + .d.ts
bun run e2e       # exercises the built package (ESM and CJS)
```

The docs site in [`docs/`](docs) is a separate Astro project: `bun run docs:dev`
to work on it, `bun run docs:build` to build it.

Releases go through Changesets — see [RELEASING.md](RELEASING.md), and
[ROADMAP.md](ROADMAP.md) for what's planned.

## License

[ISC](LICENSE.txt) © 2021-2026 Zach Moore
