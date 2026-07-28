---
layout: home

hero:
  name: MusicTheoryJS
  text: Music theory, done right
  tagline: A modern, immutable, tree-shakable library for notes, scales, chords, keys, tunings, MIDI, and audio analysis — with first-class microtonal and non-Western support.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Core Concepts
      link: /guide/concepts
    - theme: alt
      text: API Reference
      link: /api/

features:
  - icon: "♯"
    title: Correct by construction
    details: Notes carry their spelling, so E♯ ≠ F, a C-major scale spells C D E F G A B, and a diminished-seventh chord spells its seventh as A♭ — not G♯.
  - icon: "🌍"
    title: Microtonal & non-Western
    details: 12-TET is just one tuning. n-EDO, Pythagorean, meantone, Just Intonation, maqam cents tables, and Scala files are all first-class citizens.
  - icon: "🧊"
    title: Immutable & tree-shakable
    details: Every operation returns a new value; nothing mutates. Import only what you use across eight subpaths. Zero runtime dependencies.
  - icon: "🎹"
    title: Analysis, MIDI & audio
    details: Key detection, chord-over-time, Roman numerals, cadences, Standard MIDI File read/write, and dependency-free DSP (FFT, pitch, chroma, onset).
  - icon: "🧩"
    title: Dual ESM + CJS, fully typed
    details: Ships ESM and CommonJS with complete type declarations and provenance. Works everywhere modern JavaScript runs.
  - icon: "⚡"
    title: Ergonomic API
    details: Fluent immutable value objects backed by pure functions. Build a scale, name an interval, or analyze a progression in a line.
---

## Quick taste

```ts
import { Scale, Chord, Note, Key, detectKey } from "musictheoryjs";

Scale.from("C4", "major").noteNames();     // ["C4","D4","E4","F4","G4","A4","B4"]
Chord.from("Cmaj7").noteNames();            // ["C4","E4","G4","B4"]
new Note("E#4").isEnharmonic("F4");         // true  (same pitch)
new Note("E#4").equals("F4");               // false (different spelling)

Key.major("C").progression("ii7 V7 Imaj7"); // [Dm7, G7, Cmaj7]
detectKey(["C4", "E4", "G4"])[0].key.toString(); // "C major"
```

Then reach past 12 equal divisions when you need to:

```ts
import { equalTemperament, centsTuning, scaleFromTuning } from "musictheoryjs";

scaleFromTuning(equalTemperament(24));       // 24-EDO quarter-tone scale
const rast = centsTuning([0, 204, 355, 498, 702, 906, 1057], { name: "Rast" });
scaleFromTuning(rast, { frequency: 264 }, true); // a maqam, anchored to real Hz
```
