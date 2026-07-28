<div align="center">

# MusicTheoryJS

**Music theory, done right.**

A modern, immutable, tree-shakable library for notes, scales, chords, keys,
tunings, MIDI, and audio analysis — with first-class microtonal and non-Western
support.

[![npm version](https://img.shields.io/npm/v/musictheoryjs.svg?color=8b5cf6)](https://www.npmjs.com/package/musictheoryjs)
[![CI](https://github.com/Zachacious/MusicTheoryJS/actions/workflows/ci.yml/badge.svg)](https://github.com/Zachacious/MusicTheoryJS/actions/workflows/ci.yml)
[![types](https://img.shields.io/npm/types/musictheoryjs.svg?color=8b5cf6)](https://www.npmjs.com/package/musictheoryjs)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-8b5cf6.svg)](package.json)
[![license](https://img.shields.io/npm/l/musictheoryjs.svg?color=8b5cf6)](LICENSE.txt)

### 📖 [Documentation & Guides](https://zachacious.github.io/MusicTheoryJS/) &nbsp;·&nbsp; [API Reference](https://zachacious.github.io/MusicTheoryJS/api/) &nbsp;·&nbsp; [Getting Started](https://zachacious.github.io/MusicTheoryJS/guide/getting-started)

</div>

---

> **v3 is a ground-up rewrite.** It is not API-compatible with v2. See the
> [documentation](https://zachacious.github.io/MusicTheoryJS/) to get started.

## Why

Most theory libraries collapse a note to a number 0–11 and lose its **spelling**
— so `E♯` and `F` become indistinguishable, and everything downstream (interval
naming, key signatures, chord spelling) gets it subtly wrong. MusicTheoryJS keeps
the spelling, models frequency through a **pluggable tuning system**, and stays
**immutable** and **dependency-free** throughout.

- **♯ Correct by construction** — `E♯ ≠ F`; a C-major scale spells `C D E F G A B`;
  `Bdim7` spells its seventh as `A♭`, not `G♯`.
- **🌍 Microtonal & non-Western** — 12-TET is just the default. n-EDO,
  Pythagorean, meantone, Just Intonation, maqam cents tables, and Scala files are
  all first-class tunings.
- **🧊 Immutable & tree-shakable** — every operation returns a new value; import
  only what you use across **9 subpaths**; **zero runtime dependencies**.
- **🎹 Analysis, MIDI & audio** — key detection, chord-over-time, Roman numerals,
  cadences, Standard MIDI File read/write, and dependency-free DSP (FFT, pitch,
  chroma, onset).
- **🧩 Dual ESM + CJS**, fully typed, published with provenance.

## Install

```bash
bun add musictheoryjs     # or: npm i musictheoryjs · pnpm add musictheoryjs · yarn add musictheoryjs
```

```ts
import { Note, Scale, Chord, Key } from "musictheoryjs";   // ESM
const { Note, Scale, Chord, Key } = require("musictheoryjs"); // CJS
```

## Quick start

```ts
import { Scale, Chord, Note, Key, detectKey } from "musictheoryjs";

// Scales and chords spell correctly
Scale.from("C4", "major").noteNames();  // ["C4","D4","E4","F4","G4","A4","B4"]
Chord.from("Cmaj7").noteNames();         // ["C4","E4","G4","B4"]
Chord.from("Bdim7").noteNames();         // ["B4","D5","F5","Ab5"]

// Spelling is preserved, so enharmonics are distinguished
new Note("E#4").isEnharmonic("F4");      // true  (same pitch)
new Note("E#4").equals("F4");            // false (different spelling)

// Keys, Roman numerals, and progressions
Key.major("C").progression("ii7 V7 Imaj7").map(String); // ["Dm7","G7","Cmaj7"]
detectKey(["C4", "E4", "G4"])[0].key.toString();        // "C major"
```

### Beyond 12-TET

```ts
import { equalTemperament, centsTuning, scaleFromTuning, justIntonation } from "musictheoryjs";

scaleFromTuning(equalTemperament(24));   // 24-EDO quarter-tone scale
justIntonation().centsForDegree(4);      // 386.31  (pure major third, 5/4)

// A maqam Rast as a cents table, anchored so its tonic sounds at 264 Hz
const rast = centsTuning([0, 204, 355, 498, 702, 906, 1057], { name: "Rast" });
scaleFromTuning(rast, { frequency: 264 }, true);
```

### Analysis, MIDI & audio

```ts
import { analyzeHarmony, parseMidi, midiToNoteStream, detectNote } from "musictheoryjs";

// Full harmonic analysis of a timed note stream
const { key, timeline, cadences } = analyzeHarmony(noteStream);

// Read a MIDI file → symbolic notes → theory
analyzeHarmony(midiToNoteStream(parseMidi(midiBytes)));

// Detect a note from audio samples the client supplies (monophonic, YIN)
detectNote(float32Samples, 44100)?.toString(); // "A4"
```

## Subpaths

Everything is exported from the root, but each area is its own subpath for
minimal bundles:

```ts
import { Note } from "musictheoryjs/note";
import { detectKey } from "musictheoryjs/analysis";
import { parseMidi } from "musictheoryjs/midi";
import { detectPitch } from "musictheoryjs/audio";
```

| Subpath | Contents |
| --- | --- |
| [`/note`](https://zachacious.github.io/MusicTheoryJS/guide/notes) | The `Note` value object |
| [`/interval`](https://zachacious.github.io/MusicTheoryJS/guide/intervals) | Spelled intervals, transposition, constants |
| [`/scale`](https://zachacious.github.io/MusicTheoryJS/guide/scales) | Scales (46 templates), modes, detection |
| [`/chord`](https://zachacious.github.io/MusicTheoryJS/guide/chords) | Chords (32 qualities), symbol parsing, detection, voicings |
| [`/key`](https://zachacious.github.io/MusicTheoryJS/guide/keys) | Keys, signatures, Roman numerals, progressions |
| [`/tuning`](https://zachacious.github.io/MusicTheoryJS/guide/tuning) | Tuning systems (EDO, JI, historical, custom, Scala) |
| [`/analysis`](https://zachacious.github.io/MusicTheoryJS/guide/analysis) | Key detection, chord-over-time, set theory |
| [`/midi`](https://zachacious.github.io/MusicTheoryJS/guide/midi) | Standard MIDI File read/write |
| [`/audio`](https://zachacious.github.io/MusicTheoryJS/guide/audio) | Dependency-free DSP (FFT, pitch, chroma, onset) |

> **Scope:** the library is purely symbolic + dependency-free DSP. Audio capture
> and **polyphonic** transcription (which need a model) are the client app's job —
> feed the resulting notes in and get theory back.

## Documentation

The full documentation site has narrative guides with runnable examples for every
module, plus a complete API reference:

**→ https://zachacious.github.io/MusicTheoryJS/**

## Development

```bash
bun install
bun test          # 238 tests
bun run typecheck # tsc --noEmit
bun run lint      # biome
bun run build     # ESM + CJS + .d.ts
bun run e2e       # end-to-end checks against the built package
bun run docs:dev  # docs site locally
```

Releases are automated with Changesets — see [RELEASING.md](RELEASING.md).

## License

[ISC](LICENSE.txt) © 2021-2026 Zach Moore
