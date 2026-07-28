# Getting Started

MusicTheoryJS is a music theory toolkit for JavaScript and TypeScript. It models
notes, intervals, scales, chords, and keys the way theory actually works —
keeping the *spelling* of every pitch — and extends cleanly to non-standard
tunings, microtonal music, MIDI files, and audio analysis.

## Installation

::: code-group

```bash [bun]
bun add musictheoryjs
```

```bash [npm]
npm install musictheoryjs
```

```bash [pnpm]
pnpm add musictheoryjs
```

```bash [yarn]
yarn add musictheoryjs
```

:::

The package ships both **ESM** and **CommonJS** with full TypeScript types and
zero runtime dependencies.

```ts
// ESM
import { Note, Scale, Chord } from "musictheoryjs";
```

```js
// CommonJS
const { Note, Scale, Chord } = require("musictheoryjs");
```

## Your first notes, scales, and chords

```ts
import { Note, Scale, Chord } from "musictheoryjs";

// A note knows its letter, accidental, octave — and its MIDI/frequency.
const c = new Note("C4");
c.midi;          // 60
c.transpose;     // (see the Intervals guide)

// Scales spell correctly.
Scale.from("C4", "major").noteNames();
// ["C4", "D4", "E4", "F4", "G4", "A4", "B4"]

// Chords parse from symbols.
Chord.from("Cmaj7").noteNames();
// ["C4", "E4", "G4", "B4"]
```

## Tree-shaking with subpaths

Everything is exported from the package root, but each area is also its own
subpath. Importing from a subpath keeps unrelated code out of your bundle:

```ts
import { Note } from "musictheoryjs/note";
import { Chord } from "musictheoryjs/chord";
import { Key } from "musictheoryjs/key";
import { detectKey } from "musictheoryjs/analysis";
import { equalTemperament } from "musictheoryjs/tuning";
import { parseMidi } from "musictheoryjs/midi";
import { detectPitch } from "musictheoryjs/audio";
```

| Subpath | What's inside |
| --- | --- |
| `musictheoryjs/note` | The `Note` value object |
| `musictheoryjs/interval` | Spelled intervals, transposition, constants |
| `musictheoryjs/scale` | Scales, modes, detection |
| `musictheoryjs/chord` | Chords, symbol parsing, detection, voicings |
| `musictheoryjs/key` | Keys, signatures, Roman numerals, progressions |
| `musictheoryjs/tuning` | Tuning systems (EDO, JI, historical, custom, Scala) |
| `musictheoryjs/analysis` | Key detection, chord-over-time, set theory |
| `musictheoryjs/midi` | Standard MIDI File read/write |
| `musictheoryjs/audio` | Dependency-free DSP (FFT, pitch, chroma, onset) |

## Where to next

- **[Core Concepts](/guide/concepts)** — the two ideas that make everything else
  click: spelled pitch and tuning-agnostic pitch.
- **[Notes](/guide/notes)**, **[Intervals](/guide/intervals)**,
  **[Scales](/guide/scales)**, **[Chords](/guide/chords)**,
  **[Keys & Harmony](/guide/keys)** — the Western essentials.
- **[Tuning & Microtonal](/guide/tuning)** — go beyond 12 equal divisions.
- **[Analysis](/guide/analysis)**, **[MIDI](/guide/midi)**,
  **[Audio](/guide/audio)** — turn performances and signals into theory.
