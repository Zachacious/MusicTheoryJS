# musictheoryjs

## 3.0.1

### Patch Changes

- 1b0b9c2: Rewrite README for a JavaScript-developer audience and point the package homepage at musictheoryjs.com

## 3.0.0

### Major Changes

- e6acce2: v3 — a ground-up rewrite.

  - Immutable, correctly-spelled `Note`, `Interval`, `Scale`, and `Chord` value
    objects (enharmonics preserved: `E#` ≠ `F`, C major spells `C D E F G A B`).
  - Tuning-agnostic core with a pluggable `Tuning` system: `n`-EDO, Pythagorean,
    quarter-comma meantone, Just Intonation, custom cents/ratio tables, and Scala
    `.scl` import — first-class support for microtonal and non-Western music.
  - Harmony & analysis: `Key` (signatures, diatonic chords, Roman numerals,
    progressions, relative/parallel), chord detection, chord voicings
    (drop2/drop3/spread), scale modes, and scale detection.
  - Tree-shakable, zero runtime dependencies, dual ESM/CJS output, full types.
  - Bun + `bun test` + Biome toolchain.

  This is a full rewrite; the v2 API is not preserved.
